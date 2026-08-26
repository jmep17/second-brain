#!/usr/bin/env bash
# Open a URL in the user's default browser. Works on WSL, Linux, and macOS.
# Usage: open-url.sh <url>
set -euo pipefail
url="${1:?usage: open-url.sh <url>}"

if [ "${DIAGRAM_PLANS_OPEN:-1}" = "0" ]; then
  echo "DIAGRAM_PLANS_OPEN=0; not opening $url"
  exit 0
fi

if command -v wslview >/dev/null 2>&1; then
  wslview "$url"
elif grep -qi microsoft /proc/version 2>/dev/null; then
  powershell.exe -NoProfile -Command "Start-Process '$url'" >/dev/null 2>&1 || cmd.exe /c start "" "$url" >/dev/null 2>&1
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$url" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "$url"
else
  echo "no browser opener found; open manually: $url"
  exit 0
fi
echo "opened $url"
