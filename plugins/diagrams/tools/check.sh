#!/usr/bin/env bash
set -euo pipefail
exec bash "$(git rev-parse --show-toplevel)/tools/check-plugins.sh"
