#!/usr/bin/env bash
set -euo pipefail

# Installs scripts/statusline-tokens.sh into ~/.claude/ and patches
# ~/.claude/settings.json to use it as the active statusline.
#
# Idempotent. Backs up settings.json before writing.

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_DIR/scripts/statusline-tokens.sh"
DEST_DIR="$HOME/.claude"
DEST="$DEST_DIR/statusline-tokens.sh"
SETTINGS="$DEST_DIR/settings.json"

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 is required (used by the statusline itself)." >&2
  exit 1
fi

mkdir -p "$DEST_DIR"

echo "==> Copying statusline script to $DEST"
install -m 0755 "$SRC" "$DEST"

echo "==> Patching $SETTINGS"
if [ -f "$SETTINGS" ]; then
  cp "$SETTINGS" "$SETTINGS.bak.$(date +%Y%m%d%H%M%S)"
  python3 - "$SETTINGS" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f:
    cfg = json.load(f)
cfg["statusLine"] = {
    "type": "command",
    "command": "bash ~/.claude/statusline-tokens.sh",
}
with open(path, "w") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
PY
else
  cat > "$SETTINGS" <<'JSON'
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/statusline-tokens.sh"
  }
}
JSON
fi

echo "==> Done. Restart Claude Code to see the new statusline."
