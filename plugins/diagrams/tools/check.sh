#!/usr/bin/env bash
# Repo verification: manifest versions in lockstep, valid JSON, sane shell.
# Wired into .husky/pre-commit as `bun run test`.
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
note() { printf '%-34s %s\n' "$1" "$2"; }

bash tools/check-version-sync.sh || fail=1

for f in .claude-plugin/plugin.json \
         ../../.claude-plugin/marketplace.json \
         hooks/hooks.json; do
  if python3 -m json.tool "$f" > /dev/null 2>&1; then
    note "$(basename "$f")" "valid json"
  else
    note "$(basename "$f")" "INVALID JSON"; fail=1
  fi
done

while IFS= read -r f; do
  if bash -n "$f" 2>/dev/null; then
    note "$(basename "$f")" "shell syntax ok"
  else
    note "$(basename "$f")" "SHELL SYNTAX ERROR"; fail=1
  fi
done < <(git ls-files '*.sh' bin/)

# The opener is invoked as a bare command; losing the bit breaks the skill.
if [ -x bin/diagram-open ]; then
  note "bin/diagram-open" "executable"
else
  note "bin/diagram-open" "NOT EXECUTABLE"; fail=1
fi

[ "$fail" -eq 0 ] && echo "all checks passed" || echo "checks FAILED" >&2
exit "$fail"
