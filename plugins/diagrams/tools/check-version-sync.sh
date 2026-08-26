#!/usr/bin/env bash
# Fail if the plugin manifest and the marketplace entry disagree on the version.
# Claude Code keys its plugin cache on this version; a mismatch or a stale value
# means installed copies silently never update.
set -euo pipefail

plugin_v="$(python3 -c 'import json;print(json.load(open(".claude-plugin/plugin.json"))["version"])')"
market_v="$(python3 -c 'import json;d=json.load(open("../../.claude-plugin/marketplace.json"));print([p for p in d["plugins"] if p["name"]=="diagrams"][0]["version"])')"

if [ "$plugin_v" != "$market_v" ]; then
  echo "version mismatch: plugin.json=$plugin_v marketplace.json=$market_v" >&2
  exit 1
fi
echo "version in sync: $plugin_v"
