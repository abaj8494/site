#!/usr/bin/env python3

import os
import sys

def get_folder_size(start_path):
    """Recursively compute total size (in bytes) of all files under start_path."""
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(start_path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if not os.path.islink(fp):  # Avoid following symlinks
                try:
                    total_size += os.path.getsize(fp)
                except OSError:
                    pass
    return total_size

def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <directory>")
        sys.exit(1)

    directory = sys.argv[1]
    if not os.path.isdir(directory):
        print(f"Error: {directory} is not a valid directory.")
        sys.exit(1)

    folder_sizes = []
    for item in os.listdir(directory):
        path = os.path.join(directory, item)
        if os.path.isdir(path):
            size = get_folder_size(path)
            folder_sizes.append((size, path))

    # Sort by size descending
    folder_sizes.sort(key=lambda x: x[0], reverse=True)

    # Print top five
    print(f"Top 5 largest folders in '{directory}':")
    for size, folder in folder_sizes[:5]:
        print(f"{folder}\t{size} bytes")

if __name__ == "__main__":
    main()
