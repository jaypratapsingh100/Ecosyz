#!/bin/bash

# DRY-RUN version of stage-committable-files.sh
# This script shows what WOULD be staged without actually staging anything
# Usage: ./scripts/test-stage-committable-files.sh

echo "=================================================================================="
echo "DRY-RUN: Files that WOULD be staged (excluding .md files)"
echo "=================================================================================="
echo ""

# Show modified and deleted files that would be staged (excluding .md)
echo "Modified/Deleted files that would be staged:"
echo "--------------------------------------------"
MODIFIED_FILES=$(git status --porcelain | grep -E '^[MD]' | grep -v '\.md$' | awk '{print $2}')
if [ -z "$MODIFIED_FILES" ]; then
    echo "  (none)"
else
    echo "$MODIFIED_FILES" | while read file; do
        if [ -n "$file" ]; then
            status=$(git status --porcelain "$file" | awk '{print $1}')
            echo "  [$status] $file"
        fi
    done
fi

# Show untracked files that would be staged (excluding .md)
echo ""
echo "Untracked files that would be added:"
echo "-------------------------------------"
UNTRACKED_FILES=$(git status --porcelain | grep '^??' | grep -v '\.md$' | awk '{print $2}')
if [ -z "$UNTRACKED_FILES" ]; then
    echo "  (none)"
else
    echo "$UNTRACKED_FILES" | while read file; do
        if [ -n "$file" ]; then
            echo "  [??] $file"
        fi
    done
fi

# Count files
if [ -z "$MODIFIED_FILES" ]; then
    MODIFIED_COUNT=0
else
    MODIFIED_COUNT=$(echo "$MODIFIED_FILES" | wc -l | tr -d ' ')
fi

if [ -z "$UNTRACKED_FILES" ]; then
    UNTRACKED_COUNT=0
else
    UNTRACKED_COUNT=$(echo "$UNTRACKED_FILES" | wc -l | tr -d ' ')
fi

TOTAL_COUNT=$((MODIFIED_COUNT + UNTRACKED_COUNT))

echo ""
echo "=================================================================================="
echo "Summary:"
echo "  Modified/Deleted files: $MODIFIED_COUNT"
echo "  Untracked files: $UNTRACKED_COUNT"
echo "  Total files that would be staged: $TOTAL_COUNT"
echo "=================================================================================="
echo ""
echo "To actually stage these files, run: ./scripts/stage-committable-files.sh"
echo ""
