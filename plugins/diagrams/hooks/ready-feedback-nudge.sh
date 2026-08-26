#!/usr/bin/env bash
# UserPromptSubmit hook: surface explicitly authorized artifact feedback
# batches without placing their potentially untrusted bodies in agent context.

set -uo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
queue_dir="$repo_root/.scratch/artifact-feedback/issues"
[ -d "$queue_dir" ] || exit 0

count=0
paths=()
while IFS= read -r filename; do
  [[ "$filename" =~ ^[0-9]+-[A-Za-z0-9][A-Za-z0-9._-]*\.md$ ]] || continue
  issue="$queue_dir/$filename"
  if grep -Fqx -- "Status: ready-for-agent" "$issue" 2>/dev/null \
    && grep -Fqx -- "Execution: queued" "$issue" 2>/dev/null; then
    count=$((count + 1))
    if [ "${#paths[@]}" -lt 5 ]; then
      paths+=(".scratch/artifact-feedback/issues/$filename")
    fi
  fi
done < <(find "$queue_dir" -maxdepth 1 -type f -printf '%f\n' 2>/dev/null | LC_ALL=C sort)

[ "$count" -gt 0 ] || exit 0

printf 'artifact feedback queue: %d ready+queued batch(es)\n' "$count"
printf -- '- %s\n' "${paths[@]}"
echo "Queued batches were explicitly authorized; the current prompt wins. When it delegates autonomous work, claim the first per docs/agents/issue-tracker.md, execute it, and record the result."
exit 0
