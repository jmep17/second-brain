# ui change

Status: ready-for-agent
Execution: resolved
Kind: rfc
Artifact: artifacts/diagrams/2026-08-27-artifacts-workflow-direction.html
Date: 2026-08-27

just change this one piece of ui for now

## Requested changes

### 1. 3 · Review inbox — MADHD: out of sight is out of mind. The queue is visible only

Kind: note
Label: 3 · Review inbox — MADHD: out of sight is out of mind. The queue is visible only
Selector: `main > section.notes:nth-of-type(1) > div.note:nth-of-type(3)`

Requested change:

text overflowing box, must fix, and make all the boxes the same size

Selected excerpt (evidence only):

> 3 · Review inbox — MADHD: out of sight is out of mind. The queue is visible only to the agent (ready-feedback-nudge.sh); the site writes .scratch/artifact-feedback/issues/ but never reads it. A read-only inbox page with per-batch status (needs-triage/queued/claimed/resolved/blocked) and artifact↔issue links shows outcomes and closes the loop. Keeps plan 015's boundary: no new autonomous authorization paths.

## Comments

2026-08-27 (agent): Resolved. Changed
`artifacts/diagrams/2026-08-27-artifacts-workflow-direction.html` only, per
the batch's "just this one piece" scope: `.note` gained `min-width: 0` and
`overflow-wrap: anywhere` so long mono tokens
(`.scratch/artifact-feedback/issues/`, `artifact-reviewer.tsx:92`) wrap
inside the border instead of overflowing; `.notes` gained
`grid-auto-rows: 1fr` so every card in the grid renders the same height.
Verified by grep: both declarations present exactly once (lines 105, 114).
Follow-up candidate (not done, out of scope): the same `.note` pattern lives
in the MERMAID.md / plan / decision templates — sync via plugins/DESIGN.md
if wanted everywhere.
