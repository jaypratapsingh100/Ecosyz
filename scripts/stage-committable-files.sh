#!/bin/bash

# Script to stage all committable files excluding .md files
# Usage: ./scripts/stage-committable-files.sh

echo "=================================================================================="
echo "Staging all committable files (excluding .md files)"
echo "=================================================================================="
echo ""

# Stage modified and deleted files (excluding .md)
echo "Staging modified files..."
git status --porcelain | grep -E '^[MD]' | grep -v '\.md$' | awk '{print $2}' | while read file; do
    if [ -n "$file" ]; then
        echo "  Staging: $file"
        git add "$file"
    fi
done

# Stage untracked files (excluding .md)
echo ""
echo "Staging untracked files..."
git status --porcelain | grep '^??' | grep -v '\.md$' | awk '{print $2}' | while read file; do
    if [ -n "$file" ]; then
        echo "  Adding: $file"
        git add "$file"
    fi
done

echo ""
echo "=================================================================================="
echo "Staging complete!"
echo "=================================================================================="
echo ""
echo "Staged files summary:"
git status --short | grep -v '\.md$'

echo ""
echo "Total files staged: $(git diff --cached --name-only | wc -l | tr -d ' ')"
