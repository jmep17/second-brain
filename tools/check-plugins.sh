#!/usr/bin/env bash
# Validate every plugin in the second-brain marketplace.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

fail=0
marketplace=".claude-plugin/marketplace.json"

note() { printf '%-42s %s\n' "$1" "$2"; }

if python3 -m json.tool "$marketplace" >/dev/null 2>&1; then
  note "$marketplace" "valid json"
else
  note "$marketplace" "INVALID JSON"
  fail=1
fi

for plugin in plugins/*; do
  manifest="$plugin/.claude-plugin/plugin.json"
  [ -f "$manifest" ] || continue
  name="$(basename "$plugin")"
  note "$name" "checking"

  if python3 -m json.tool "$manifest" >/dev/null 2>&1; then
    note "  .claude-plugin/plugin.json" "valid json"
  else
    note "  .claude-plugin/plugin.json" "INVALID JSON"
    fail=1
    continue
  fi

  manifest_v="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$manifest")"
  marketplace_v="$(python3 -c '
import json, sys
data = json.load(open(sys.argv[1]))
match = next((p for p in data["plugins"] if p["name"] == sys.argv[2]), None)
print(match["version"] if match else "<missing>")
' "$marketplace" "$name")"
  if [ "$manifest_v" = "$marketplace_v" ]; then
    note "  version" "in sync: $manifest_v"
  else
    note "  version" "MISMATCH plugin.json=$manifest_v marketplace.json=$marketplace_v"
    fail=1
  fi

  hooks_json="$plugin/hooks/hooks.json"
  if [ -f "$hooks_json" ]; then
    if python3 -m json.tool "$hooks_json" >/dev/null 2>&1; then
      note "  hooks/hooks.json" "valid json"
    else
      note "  hooks/hooks.json" "INVALID JSON"
      fail=1
    fi
  fi

  while IFS= read -r shell_file; do
    if bash -n "$shell_file" 2>/dev/null; then
      note "  ${shell_file#"$plugin/"}" "shell syntax ok"
    else
      note "  ${shell_file#"$plugin/"}" "SHELL SYNTAX ERROR"
      fail=1
    fi
  done < <(git ls-files "$plugin" | awk '/\.sh$/')

  if [ -d "$plugin/bin" ]; then
    while IFS= read -r bin_file; do
      if [ -x "$bin_file" ]; then
        note "  ${bin_file#"$plugin/"}" "executable"
      else
        note "  ${bin_file#"$plugin/"}" "NOT EXECUTABLE"
        fail=1
      fi
    done < <(find "$plugin/bin" -maxdepth 1 -type f -print | sort)
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "all checks passed"
else
  echo "checks FAILED" >&2
fi
exit "$fail"
