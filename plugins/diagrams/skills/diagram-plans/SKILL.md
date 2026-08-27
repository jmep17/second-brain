---
name: diagram-plans
description: Answer plans, brainstorms, designs, option comparisons, roadmaps, and architecture discussions with a standalone Geist-styled HTML page holding a Mermaid diagram, opened in the browser, instead of paragraphs. Use whenever the user asks how to approach something, wants ideas or options, asks for a plan or breakdown, or the diagram-plans hook nudge appears in context.
---

Plans and brainstorms are trees and graphs, not prose. Draw the structure; keep words to labels. Diagrams are vertical: top-level flowcharts are `TD` (subgraphs `direction TB`), never `LR` — vertical reads without sideways scrolling and scales down responsively.

## Steps

1. **Pick the shape.** Match the request to one diagram (see the table in [`MERMAID.md`](MERMAID.md)):
   - brainstorm / ideas / breakdown → `flowchart TD` with one subgraph per branch
   - plan / sequence of work / decision path → `flowchart TD`
   - options with trade-offs → hand off to the `decision-pages` skill (option cards beat a flowchart for comparisons); stay here only when the options' structure — dependencies, flows — is the content, or use `quadrantChart` when two axes matter
   - roadmap / phases with time → `gantt` or `timeline`
   - components talking to each other → `flowchart TD` (or `sequenceDiagram` for call order)
2. **Gather the content first.** Read the code, files, or prior context the plan depends on; the diagram carries every branch you would otherwise have written as a paragraph. Done when each node's claim is grounded in something you actually looked at, not guessed.
3. **Write the HTML file** using the Geist template in [`MERMAID.md`](MERMAID.md) verbatim (fonts, tokens, CDN script included) — only the title, badge, date, diagram, and notes change. Path:
   - directory: `$DIAGRAMS_DIR` if set (absolute, or relative to the project root), else `artifacts/diagrams/`. Create it if missing.
   - filename: `YYYY-MM-DD-<kebab-slug>.html` (today's date, slug from the topic). Redeploying the same topic reuses the same path.
   - Node labels: short noun phrases, ≤ 6 words. Detail that cannot fit a label goes in a single "Notes" list under the diagram, one line each.
   - The page contains one diagram. The reader can flip it to a full-bleed canvas from the page itself, so do not shrink or split a diagram just to make it fit.
4. **Open it in the browser**: run `diagram-open <absolute-file-path>` (the plugin puts it on `PATH`; if the command is not found, fall back to `bash "${CLAUDE_PLUGIN_ROOT}/bin/diagram-open" <absolute-file-path>`; in agents that define neither, e.g. Codex, run `bash <dir-of-this-SKILL.md>/../../bin/diagram-open <path>` — the opener lives two directories above this file in every install layout). On a revision to the same file, the open browser tab just needs a refresh; open again only when the file is new. `DIAGRAMS_OPEN=0` skips this step. When a local site is serving the repo's `artifacts/` (`ARTIFACTS_SITE_URL` if set, else a probe of listening local ports), the opener opens the served review page — `/artifacts/review/<type>/<file>`, with element selection and batch feedback — instead of the raw file; `file://` is the fallback.
5. **The artifact is the response.** Reply with at most: the saved path, the opener status, and the one decision or open question the user must answer. No prose summary of the diagram — every other word belongs inside it. (Per `plugins/DESIGN.md`.)

Done when: the file exists at the configured path, the opener script reported `opened` (or was disabled), and the chat reply is under five lines.

## Rules

- The page is a plain file opened from disk: Mermaid loads from the jsDelivr CDN and Geist from Google Fonts, so it needs network on first view. Keep every other asset inline.
- Diagram theme follows the OS color scheme; Geist tokens do the rest. Custom colors belong in Mermaid `classDef`s, not ad-hoc CSS.
- Prefer breadth over depth: three levels is the ceiling; split into a second diagram past that.
- Contradictions, risks, and unknowns are nodes too (`⚠ risk: …`, `? open: …`), never hidden in prose.
- When the user then asks to "expand X" or "change Y", edit the same file; the browser tab refreshes to the new version.
- Explicit request for prose ("write it up", "in paragraphs", "as a doc") overrides this skill.
- Not everything needs a diagram. Comparisons and option lists read better as decision pages (`decision-pages`); use this skill when structure — flow, dependencies, architecture, time — carries the content.
- When any skill or workflow has just produced a plan, spec, or tickets
  document (e.g. a file under `plans/`, `.scratch/`, `specs/`, `tickets/` —
  the plan-artifact hook will remind you), render that document's structure
  as a diagram page too: same template, nodes sourced from the document's
  sections/steps/dependencies, saved and opened like any other diagram. The
  markdown document remains the source of truth — the diagram is the review surface,
  and the ≤ 5-line reply rule still applies.
