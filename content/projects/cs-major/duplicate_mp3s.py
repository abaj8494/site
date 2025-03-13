#!/usr/bin/env python3

import os
import sys
import hashlib

def hash_file(filepath, blocksize=65536):
    """Return SHA-256 hash of the given file."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        buf = f.read(blocksize)
        while buf:
            hasher.update(buf)
            buf = f.read(blocksize)
    return hasher.hexdigest()

def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <directory>")
        sys.exit(1)

    root_dir = sys.argv[1]
    if not os.path.isdir(root_dir):
        print(f"Error: {root_dir} is not a valid directory.")
        sys.exit(1)

    file_hashes = {}
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for fn in filenames:
            if fn.lower().endswith(".mp3"):
                fullpath = os.path.join(dirpath, fn)
                try:
                    h = hash_file(fullpath)
                    file_hashes.setdefault(h, []).append(fullpath)
                except Exception as e:
                    print(f"Could not process file {fullpath}: {e}")

    # Report duplicates
    found_duplicates = False
    for h, paths in file_hashes.items():
        if len(paths) > 1:
            found_duplicates = True
            print("Duplicate MP3s detected:")
            for p in paths:
                print(f"  {p}")
            print()

    if not found_duplicates:
        print("No duplicate MP3 files found.")

if __name__ == "__main__":
    main()
