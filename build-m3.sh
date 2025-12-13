#!/bin/bash

# Build script that preprocesses org files before running Hugo

set -e

echo "Preprocessing org files with m2* shortcodes..."

# Find all .org files in content/ that might contain m2* shortcodes
find content -name "*.org" -type f | while read -r file; do
    # Check if file contains m2 shortcodes
    if grep -q "{{< m2" "$file"; then
        echo "  Processing: $file"
        python3 preprocess-org.py "$file"
    fi
done

echo "Running Hugo..."
hugo "$@"

echo "Build complete!"

