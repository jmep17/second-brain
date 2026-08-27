# diagram update

Status: ready-for-agent
Execution: resolved
Kind: rfc
Artifact: artifacts/diagrams/2026-08-27-artifacts-workflow-direction.html
Date: 2026-08-27

diagram template ui update, skill update to enforce it

## Requested changes

### 1. #artifacts-direction{font-family:Geist,system-ui,sans-serif;font-size:16px;fill:

Kind: component
Label: #artifacts-direction{font-family:Geist,system-ui,sans-serif;font-size:16px;fill:
Selector: `#artifacts-direction`

Requested change:

make the diagram responsive; let's have them be vertical only so they're easier to read; might require skill update

Selected excerpt (evidence only):

> #artifacts-direction{font-family:Geist,system-ui,sans-serif;font-size:16px;fill:#ededed;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#artifacts-direction .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#artifacts-direction .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#artifacts-direction .error-icon{fill:hsl(180, 0%, 11.6666666667%);}#artifacts-direction .error-text{fill:rgb(225.2499999999, 225.2499999999, 225.2499999999);stroke:rgb(225.2499999999, 225.2499999999, 225.2499999999);}#artifacts-direction .edge-thickness-normal{stroke-width:1px;}#artifacts-direction .edge-thickness-thick{stroke-width:3.5px;}#artifacts-direction .edge-pattern-solid{stroke-dasharray:0;}#artifacts-direction .edge-thickness-invisible{stroke-width:0;fill:none;}#artifacts-direction .edge-pat

## Comments

2026-08-27 (agent): Resolved. Vertical-only + responsive is now the
convention, enforced in the template and skill:
- `plugins/diagrams/skills/diagram-plans/MERMAID.md` — "Which diagram" table
  rows for options and architecture switched `flowchart LR` -> `flowchart TD`;
  new rule paragraph (every flowchart `TD`, subgraphs `direction TB`, `LR`
  not used); template CSS `.mermaid svg` gains `max-width: 100%; height:
  auto` (canvas mode resets to `max-width: none` so pan/zoom keeps real
  size); the `useMaxWidth` design note rewritten to match.
- `plugins/diagrams/skills/diagram-plans/SKILL.md` — shape bullets name
  `flowchart TD` explicitly; intro states the vertical-only rule.
- `artifacts/diagrams/2026-08-27-artifacts-workflow-direction.html` (this
  batch's artifact) — diagram source `flowchart LR` -> `flowchart TD`,
  responsive svg CSS added.
- diagrams plugin 0.9.0 -> 0.10.0; marketplace synced;
  `tools/check-plugins.sh` passes; Claude Code and Codex installs refreshed.
Not changed (out of scope): the three older diagram artifacts under
`artifacts/diagrams/` keep their original orientation.
