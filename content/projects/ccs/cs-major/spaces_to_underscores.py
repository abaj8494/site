#!/usr/bin/env python3

import os
import sys

def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <directory>")
        sys.exit(1)

    directory = sys.argv[1]
    if not os.path.isdir(directory):
        print(f"Error: {directory} is not a valid directory.")
        sys.exit(1)

    for filename in os.listdir(directory):
        if ' ' in filename:
            new_filename = filename.replace(' ', '_')
            old_path = os.path.join(directory, filename)
            new_path = os.path.join(directory, new_filename)
            try:
                os.rename(old_path, new_path)
                print(f"Renamed '{filename}' -> '{new_filename}'")
            except Exception as e:
                print(f"Failed to rename '{filename}': {e}")

if __name__ == "__main__":
    main()
