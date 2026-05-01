#!/usr/bin/env bash
# Claude Code statusline — shows total tokens used in the current session.
#
# Reads context_window.current_usage from the stdin JSON Claude Code passes
# in (per https://code.claude.com/docs/en/statusline.md). Falls back to
# parsing the transcript JSONL if context_window is absent (older versions).
#
# Install:
#   ./scripts/install-statusline.sh
# Or manually wire ~/.claude/settings.json:
#   "statusLine": { "type": "command",
#                   "command": "bash ~/.claude/statusline-tokens.sh" }

set -u
export STATUSLINE_INPUT="$(cat)"

python3 - <<'PY'
import json, os

try:
    payload = json.loads(os.environ.get("STATUSLINE_INPUT") or "{}")
except Exception:
    payload = {}

usage = ((payload.get("context_window") or {}).get("current_usage")) or {}

# Fallback: walk the transcript if the live JSON didn't carry usage.
if not usage:
    tp = payload.get("transcript_path")
    if tp and os.path.isfile(tp):
        try:
            with open(tp, "r", encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except Exception:
                        continue
                    u = (obj.get("message") or {}).get("usage")
                    if isinstance(u, dict):
                        usage = u
        except Exception:
            pass

total = (
    int(usage.get("input_tokens") or 0)
    + int(usage.get("output_tokens") or 0)
    + int(usage.get("cache_creation_input_tokens") or 0)
    + int(usage.get("cache_read_input_tokens") or 0)
)

if total >= 1_000_000:
    num = f"{total/1_000_000:.1f}M"
elif total >= 1_000:
    num = f"{total/1_000:.1f}K"
else:
    num = f"{total}"

# Cyan number, dim "tk" suffix.
print(f"\033[01;36m{num}\033[00m \033[02mtk\033[00m", end="")
PY
