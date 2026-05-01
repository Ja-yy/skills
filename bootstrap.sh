#!/usr/bin/env bash
set -euo pipefail

# One-shot installer for Ja-yy/skills.
# Usage on a fresh machine:
#   curl -fsSL https://raw.githubusercontent.com/Ja-yy/skills/main/bootstrap.sh | bash
# Multiple agents:
#   bash bootstrap.sh --agent claude-code --agent codex --agent cursor

SCOPE_FLAG="-g"
INCLUDE_EXTERNAL=true
LIST_ONLY=false
AGENTS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)      SCOPE_FLAG=""; shift ;;
    --no-external)  INCLUDE_EXTERNAL=false; shift ;;
    --list)         LIST_ONLY=true; shift ;;
    --agent)        AGENTS+=("$2"); shift 2 ;;
    -h|--help)
      cat <<EOF
Usage: bootstrap.sh [--project] [--no-external] [--list] [--agent NAME]...

  --project       Install at project scope instead of global (~/.claude/skills)
  --no-external   Skip external skills, install only Ja-yy/skills
  --list          Print what would be installed, install nothing
  --agent NAME    Target this coding agent (repeatable). Default: claude-code
                  Examples: claude-code, codex, cursor, amp, cline, opencode,
                            gemini-cli, github-copilot, warp, kimi-cli
EOF
      exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

if [ ${#AGENTS[@]} -eq 0 ]; then
  AGENTS=("claude-code")
fi

AGENT_FLAGS=()
for a in "${AGENTS[@]}"; do
  AGENT_FLAGS+=(-a "$a")
done

if ! command -v npx >/dev/null 2>&1; then
  echo "error: npx not found. Install Node.js (>=18) first." >&2
  exit 1
fi

INSTALLED=()
FAILED=()
FAIL_LOGS=()

add() {
  local src="$1"
  local name
  name="$(basename "$src")"

  if $LIST_ONLY; then
    printf "  would install: %-35s  %s\n" "$name" "$src"
    return 0
  fi

  local log
  log="$(mktemp)"
  if npx -y skills@latest add "$src" $SCOPE_FLAG -y "${AGENT_FLAGS[@]}" >"$log" 2>&1; then
    INSTALLED+=("$name")
    printf "  [ok]   %s\n" "$name"
    rm -f "$log"
  else
    FAILED+=("$name")
    FAIL_LOGS+=("$log")
    printf "  [FAIL] %s\n" "$name" >&2
  fi
}

echo "==> Target agents: ${AGENTS[*]}"
echo "==> Scope: ${SCOPE_FLAG:-project}"
echo

echo "==> Installing Ja-yy/skills"
add Ja-yy/skills

if $INCLUDE_EXTERNAL; then
  echo
  echo "==> Installing external skills"

  # caveman family — JuliusBrussee/caveman
  add https://github.com/JuliusBrussee/caveman/tree/main/caveman

  # skill discovery — vercel-labs/skills
  add https://github.com/vercel-labs/skills/tree/main/skills/find-skills

  # mattpocock/skills — engineering pack
  # NOTE: run /setup-matt-pocock-skills once per repo before first use of the engineering skills below.
  add https://github.com/mattpocock/skills/tree/main/skills/engineering/setup-matt-pocock-skills
  add https://github.com/mattpocock/skills/tree/main/skills/engineering/diagnose
  add https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs
  add https://github.com/mattpocock/skills/tree/main/skills/engineering/triage
  add https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture
  add https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd
  add https://github.com/mattpocock/skills/tree/main/skills/engineering/to-issues
  add https://github.com/mattpocock/skills/tree/main/skills/engineering/to-prd
  add https://github.com/mattpocock/skills/tree/main/skills/engineering/zoom-out

  # mattpocock/skills — productivity pack
  # SKIPPED: skills/productivity/caveman — conflicts with JuliusBrussee/caveman above (same skill name).
  add https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me
  add https://github.com/mattpocock/skills/tree/main/skills/productivity/write-a-skill
fi

if $LIST_ONLY; then
  echo
  echo "==> Dry-run complete. Re-run without --list to actually install."
  exit 0
fi

echo
echo "==> Summary"
echo "    ok:     ${#INSTALLED[@]}"
echo "    failed: ${#FAILED[@]}"

if [ "${#FAILED[@]}" -gt 0 ]; then
  echo
  echo "==> Failure details"
  for i in "${!FAILED[@]}"; do
    echo "  --- ${FAILED[$i]} ---"
    sed 's/^/    /' "${FAIL_LOGS[$i]}"
    rm -f "${FAIL_LOGS[$i]}"
  done
fi

echo
echo "==> Currently installed skills"
echo
npx -y skills@latest list $SCOPE_FLAG || true

if [ "${#FAILED[@]}" -gt 0 ]; then
  exit 1
fi
