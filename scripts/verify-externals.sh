#!/usr/bin/env bash
set -euo pipefail

# Pings every github.com/<owner>/<repo>/tree/<branch>/<path> URL referenced
# in bootstrap.sh and verifies the path still resolves upstream.
#
# Run any time you want to confirm external skills haven't been renamed,
# moved, or deleted by their authors. Exits non-zero if anything is dead.
#
# Requires: gh CLI authenticated (`gh auth status`).

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BOOTSTRAP="$REPO_DIR/bootstrap.sh"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI not found. Install from https://cli.github.com/" >&2
  exit 1
fi

dead=0
checked=0

while IFS= read -r url; do
  if [[ "$url" =~ github\.com/([^/]+)/([^/]+)/tree/([^/]+)/(.+) ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
    branch="${BASH_REMATCH[3]}"
    path="${BASH_REMATCH[4]%/}"
    checked=$((checked + 1))
    if gh api "repos/$owner/$repo/contents/$path?ref=$branch" >/dev/null 2>&1; then
      printf "  ok    %s\n" "$url"
    else
      printf "  DEAD  %s\n" "$url" >&2
      dead=$((dead + 1))
    fi
  fi
done < <(grep -oE 'https://github\.com/[^ ]+' "$BOOTSTRAP" | sort -u)

echo
echo "checked $checked URL(s), $dead dead"
exit $dead
