#!/usr/bin/env bash
# Claude Code statusline — minimal: tokens + 5-hour session %.
#
# Output example:  50K 5%
#
# Reads stdin JSON per https://code.claude.com/docs/en/statusline.md.
# Falls back to walking the transcript JSONL if context_window is missing.
#
# Install:
#   ./scripts/install-statusline.sh

set -u
export STATUSLINE_INPUT="$(cat)"

python3 - <<'PY'
import json, os

try:
    payload = json.loads(os.environ.get("STATUSLINE_INPUT") or "{}")
except Exception:
    payload = {}

usage = ((payload.get("context_window") or {}).get("current_usage")) or {}

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

total_tokens = (
    int(usage.get("input_tokens") or 0)
    + int(usage.get("output_tokens") or 0)
    + int(usage.get("cache_read_input_tokens") or 0)
    + int(usage.get("cache_creation_input_tokens") or 0)
)

five_h_pct = ((payload.get("rate_limits") or {}).get("five_hour") or {}).get("used_percentage")

def fmt_tokens(n):
    if n >= 1_000_000: return f"{n/1_000_000:.1f}M"
    if n >= 1_000:     return f"{n/1_000:.0f}K"
    return str(n)

# Dim ANSI colors — readable but not eye-catching.
TOK_COLOR = "\033[2;36m"   # dim cyan   (tokens)
PCT_COLOR = "\033[2;35m"   # dim magenta (session %)
RESET     = "\033[0m"

parts = []
if total_tokens:
    parts.append(f"{TOK_COLOR}{fmt_tokens(total_tokens)}{RESET}")
if five_h_pct is not None:
    parts.append(f"{PCT_COLOR}{float(five_h_pct):.0f}%{RESET}")

if parts:
    print(" ".join(parts), end="")
PY
