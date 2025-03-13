#!/usr/bin/env bash
#
# Usage:
#   ./stream_mic.sh <destination_host> <destination_port>
#
# Example:
#   ./stream_mic.sh 192.168.1.50 9999
#
# Requirements:
#   - arecord (ALSA) or sox/other recorder
#   - netcat (nc)

DEST_HOST="$1"
DEST_PORT="$2"

if [[ -z "$DEST_HOST" || -z "$DEST_PORT" ]]; then
  echo "Usage: $0 <destination_host> <destination_port>"
  exit 1
fi

# Record from the microphone at CD-quality and send over netcat
arecord -f cd | nc "$DEST_HOST" "$DEST_PORT"
