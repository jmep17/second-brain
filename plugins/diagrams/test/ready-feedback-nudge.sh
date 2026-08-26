#!/usr/bin/env bash
# Regression matrix for the metadata-only ready artifact feedback hook.
set -euo pipefail

plugin_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
hook="$plugin_root/hooks/ready-feedback-nudge.sh"
fixture_root="$(mktemp -d /tmp/ready-feedback-nudge.XXXXXX)"
trap 'rm -rf "$fixture_root"' EXIT
git -C "$fixture_root" init -q

run_hook() {
  (cd "$fixture_root" && bash "$hook")
}

assert_silent() {
  local name="$1"
  local output
  output="$(run_hook)"
  if [ -n "$output" ]; then
    echo "$name unexpectedly output: $output" >&2
    exit 1
  fi
  echo "$name: silent, exit 0"
}

assert_silent absent
queue="$fixture_root/.scratch/artifact-feedback/issues"
mkdir -p "$queue"
assert_silent empty

printf '%s\n' \
  '# Needs triage' \
  '' \
  'Status: needs-triage' \
  'Kind: feedback' \
  'Artifact: artifacts/diagrams/example.html' \
  'Date: 2026-08-27' \
  '' \
  'Body evidence follows:' \
  'Status: ready-for-agent' \
  'Execution: queued' \
  > "$queue/01-needs-triage-spoof.md"
assert_silent needs-triage-body-spoof

printf '%s\n' \
  '# Legacy title' \
  '' \
  'Status: ready-for-agent' \
  'Execution: queued' \
  'Kind: feedback' \
  'Artifact: artifacts/diagrams/example.html' \
  'Date: 2026-08-27' \
  '' \
  'Status: needs-triage' \
  'Kind: feedback' \
  'Artifact: artifacts/diagrams/example.html' \
  'Date: 2026-08-27' \
  '' \
  'Legacy body' \
  '' \
  '## Comments' \
  > "$queue/02-serialized-legacy-multiline-title-spoof.md"
assert_silent serialized-legacy-multiline-title-spoof

printf '%s\n' '# Claimed' '' 'Status: ready-for-agent' 'Execution: claimed' \
  'Kind: feedback' 'Artifact: artifacts/diagrams/example.html' 'Date: 2026-08-27' '' \
  'PRIVATE CLAIMED BODY' > "$queue/03-claimed.md"
assert_silent claimed
printf '%s\n' 'Status: ready-for-agent' 'Execution: queued' 'PRIVATE MALFORMED BODY' \
  > "$queue/04-malformed.md"
assert_silent malformed

printf '%s\n' '# Ready' '' 'Status: ready-for-agent' 'Execution: queued' \
  'Kind: feedback' 'Artifact: artifacts/diagrams/example.html' 'Date: 2026-08-27' '' \
  'PRIVATE READY BODY' > "$queue/05-ready.md"
one="$(run_hook)"
grep -Fqx 'artifact feedback queue: 1 ready+queued batch(es)' <<< "$one"
grep -Fqx -- '- .scratch/artifact-feedback/issues/05-ready.md' <<< "$one"
! grep -Fq 'PRIVATE' <<< "$one"
echo "one ready+queued: count/path only, exit 0"

find "$queue" -maxdepth 1 -type f -delete
for number in 01 02 03 04 05 06; do
  printf '%s\n' '# Ready' '' 'Status: ready-for-agent' 'Execution: queued' \
    'Kind: feedback' 'Artifact: artifacts/diagrams/example.html' 'Date: 2026-08-27' '' \
    "PRIVATE BODY $number" > "$queue/$number-ready.md"
done
six="$(run_hook)"
grep -Fqx 'artifact feedback queue: 6 ready+queued batch(es)' <<< "$six"
[ "$(grep -c '^- .scratch/artifact-feedback/issues/' <<< "$six")" -eq 5 ]
! grep -Fq '06-ready.md' <<< "$six"
! grep -Fq 'PRIVATE BODY' <<< "$six"
echo "six ready+queued: count 6/five paths/no bodies, exit 0"
