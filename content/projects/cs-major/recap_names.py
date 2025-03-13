#!/usr/bin/env python3

import sys

def fix_name(line):
    """
    Takes a line like "john doe" (fully lower-cased).
    Returns "John Doe" (properly capitalized).
    Handles middle names if present.
    """
    parts = line.split()
    return " ".join(part.capitalize() for part in parts)

def main():
    """
    Read names from stdin, print re-capitalized names to stdout.
    Usage example:
        cat names.txt | ./recap_names.py
    """
    for line in sys.stdin:
        line = line.strip()
        if line:
            print(fix_name(line))

if __name__ == "__main__":
    main()
