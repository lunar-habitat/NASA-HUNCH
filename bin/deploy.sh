#!/usr/bin/env bash
# deploy.sh — Stage, commit, and push all changes to GitHub Pages
# Usage: ./deploy.sh "your commit message"
#   or:  ./deploy.sh  (uses a default timestamped message)

set -euo pipefail

BRANCH="main"
REMOTE="nasa-hunch"

# Use provided message or generate a default
if [[ $# -gt 0 ]]; then
    MSG="$*"
else
    MSG="deploy: update $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Ensure we're in the repo root
cd "$(git rev-parse --show-toplevel)"

# Check for changes
if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    echo "✓ Nothing to deploy — working tree is clean."
    exit 0
fi

# Stage, commit, push
git add -A
echo "Staged all changes."

git commit -m "$MSG"
echo "Committed: $MSG"

git push "$REMOTE" "$BRANCH"
echo ""
echo "✓ Deployed to GitHub. Site will update at:"
echo "  https://lunar-habitat.github.io/NASA-HUNCH/"
