#!/bin/bash
# Cleanup script for tmpclaude temporary files
# These files are created by Claude Code CLI tool and can be safely deleted

echo "Searching for tmpclaude-* files..."

# Find all tmpclaude files
files=$(find . -name "tmpclaude-*" -type f 2>/dev/null)
count=$(echo "$files" | grep -c "tmpclaude-" 2>/dev/null || echo "0")

if [ "$count" -eq 0 ]; then
    echo "No tmpclaude-* files found. Repository is clean!"
    exit 0
fi

echo "Found $count tmpclaude-* files"
echo ""
echo "Files to be deleted:"
echo "$files"
echo ""

read -p "Do you want to delete these files? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deleting files..."
    find . -name "tmpclaude-*" -type f -delete 2>/dev/null
    echo "✓ Cleanup complete! Deleted $count files."
else
    echo "Cleanup cancelled."
    exit 0
fi
