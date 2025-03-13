#!/usr/bin/env python3

import sys
from collections import deque

def main():
    """
    Usage:
        ./errant_accesses.py /path/to/access.log 1.2.3.4
    Assumes Apache-style logs with status code at index [8].
    'Errant' is defined here as 4xx or 5xx response codes.
    """
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <logfile> <IP_address>")
        sys.exit(1)

    logfile = sys.argv[1]
    ip_addr = sys.argv[2]

    last_ten = deque(maxlen=10)

    try:
        with open(logfile, "r") as f:
            for line in f:
                if ip_addr in line:
                    parts = line.split()
                    # Typical Apache log format:
                    #   IP - - [date] "GET /endpoint" status_code ...
                    if len(parts) > 8:
                        status_code = parts[8]
                        if status_code.startswith('4') or status_code.startswith('5'):
                            last_ten.append(line.rstrip("\n"))
    except FileNotFoundError:
        print(f"Log file not found: {logfile}")
        sys.exit(1)
    except PermissionError:
        print(f"Permission denied reading log file: {logfile}")
        sys.exit(1)

    print(f"Last 10 errant (4xx/5xx) accesses from IP {ip_addr} in {logfile}:")
    for entry in last_ten:
        print(entry)

if __name__ == "__main__":
    main()
