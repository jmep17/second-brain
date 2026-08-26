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
  metadata=()
  mapfile -t metadata < <(head -n 8 -- "$issue" 2>/dev/null)
  # Legacy payloads accept multiline titles for byte compatibility. Such a
  # title can forge this eight-line ready header, but the legacy renderer then
  # emits its canonical needs-triage metadata later. Reject any such marker;
  # false negatives from body text are safer than false authorization.
  if awk 'NR > 8 && $0 == "Status: needs-triage" { found=1; exit } END { exit(found ? 0 : 1) }' \
    "$issue" >/dev/null 2>&1; then
    continue
  fi
  if [[ "${metadata[0]-}" == \#\ * ]] \
    && [ -z "${metadata[1]-}" ] \
    && [ "${metadata[2]-}" = "Status: ready-for-agent" ] \
    && [ "${metadata[3]-}" = "Execution: queued" ] \
    && [[ "${metadata[4]-}" =~ ^Kind:\ (feedback|rfc)$ ]] \
    && [[ "${metadata[5]-}" =~ ^Artifact:\ artifacts/.+\.html$ ]] \
    && [[ "${metadata[6]-}" =~ ^Date:\ [0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] \
    && [ -z "${metadata[7]-}" ]; then
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
