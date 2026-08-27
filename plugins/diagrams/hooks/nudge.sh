#!/usr/bin/env bash
# UserPromptSubmit hook: when the prompt reads like planning or brainstorming,
# add a one-line reminder so the diagram-plans skill fires deterministically.
# Stdout from this hook is appended to the model's context.

set -euo pipefail

prompt="$(cat | sed -n 's/.*"prompt"[[:space:]]*:[[:space:]]*"\(\([^"\\]\|\\.\)*\)".*/\1/p' | head -c 4000)"

pattern='\b(plan|planning|brainstorm|ideate|ideas? for|options?|approach(es)?|architect(ure)?|design|trade-?offs?|roadmap|strategy|compare|pros and cons|how (should|would|could) (we|i)|what are the ways|outline|break(down| down)|mind ?map|diagram)\b'

if printf '%s' "$prompt" | grep -qiE "$pattern"; then
  dir="${DIAGRAMS_DIR:-artifacts/diagrams}"
  echo "diagram-plans: this prompt is a plan/brainstorm/design request. Present an artifact, not a prose answer — invoke the diagrams:diagram-plans skill, then reply with only the artifact path and at most one open question. Save dir: ${dir}. Follow docs/agents/adhd-writing.md: conclusion first, one next action, chunked."
fi
exit 0
