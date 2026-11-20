#!/bin/bash
# Fails if a Firebase credentials file (google-services.json or GoogleService-Info.plist) is
# tracked or staged anywhere in the repo. The repo is public, and .gitignore does not stop
# `git add -f`, so this runs in the husky pre-commit hook and in CI.
# `git ls-files` lists the index, so it catches both already-tracked and newly staged files.
set -euo pipefail

cd "$(dirname "$0")/.."

# Pathspecs match the real paths, not `git ls-files` output, which quotes names with non-ASCII
# characters or tabs. `icase` because macOS filesystems (and git's core.ignorecase there) are too.
tracked=$(git ls-files -- ':(glob,icase)**/google-services.json' ':(glob,icase)**/GoogleService-Info.plist')
if [ -n "$tracked" ]; then
  echo "error: Firebase credentials must never be committed. Unstage/untrack these files:" >&2
  echo "$tracked" | sed 's/^/  /' >&2
  echo "Run: git rm --cached <file>  (see example/README.md, Firebase credentials)" >&2
  exit 1
fi
