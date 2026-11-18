#!/bin/bash
# Fails if a Firebase credentials file (google-services.json or GoogleService-Info.plist) is
# tracked or staged anywhere in the repo. The repo is public, and .gitignore does not stop
# `git add -f`, so this runs in the husky pre-commit hook and in CI.
# `git ls-files` lists the index, so it catches both already-tracked and newly staged files.
set -euo pipefail

cd "$(dirname "$0")/.."

# Case-insensitive because macOS filesystems (and git's core.ignorecase there) are too.
if tracked=$(git ls-files | grep -iE '(^|/)(google-services\.json|GoogleService-Info\.plist)$'); then
  echo "error: Firebase credentials must never be committed. Unstage/untrack these files:" >&2
  echo "$tracked" | sed 's/^/  /' >&2
  echo "Run: git rm --cached <file>  (see example/README.md, Firebase credentials)" >&2
  exit 1
fi
