---
name: diagram-plans
description: Answer plans, brainstorms, designs, option comparisons, roadmaps, and architecture discussions with a standalone Geist-styled HTML page holding a Mermaid diagram, opened in the browser, instead of paragraphs. Use whenever the user asks how to approach something, wants ideas or options, asks for a plan or breakdown, or the diagram-plans hook nudge appears in context.
---

Plans and brainstorms are trees and graphs, not prose. Draw the structure; keep words to labels.

## Steps

1. **Pick the shape.** Match the request to one diagram (see the table in [`MERMAID.md`](MERMAID.md)):
   - brainstorm / ideas / breakdown → `flowchart TD` with one subgraph per branch
   - plan / sequence of work / decision path → `flowchart`
   - options with trade-offs → `flowchart` with one subgraph per option, or `quadrantChart`
   - roadmap / phases with time → `gantt` or `timeline`
   - components talking to each other → `flowchart` (or `sequenceDiagram` for call order)
2. **Gather the content first.** Read the code, files, or prior context the plan depends on; the diagram carries every branch you would otherwise have written as a paragraph. Done when each node's claim is grounded in something you actually looked at, not guessed.
3. **Write the HTML file** using the Geist template in [`MERMAID.md`](MERMAID.md) verbatim (fonts, tokens, CDN script included) — only the title, badge, date, diagram, and notes change. Path:
   - directory: `$DIAGRAM_PLANS_DIR` if set (absolute, or relative to the project root), else `.claude/diagrams/`. Create it if missing.
   - filename: `YYYY-MM-DD-<kebab-slug>.html` (today's date, slug from the topic). Redeploying the same topic reuses the same path.
   - Node labels: short noun phrases, ≤ 6 words. Detail that cannot fit a label goes in a single "Notes" list under the diagram, one line each.
   - The page contains one diagram. The reader can flip it to a full-bleed canvas from the page itself, so do not shrink or split a diagram just to make it fit.
4. **Open it in the browser**: run `diagram-open <absolute-file-path>` (the plugin puts it on `PATH`; if the command is not found, fall back to `bash "${CLAUDE_PLUGIN_ROOT}/bin/diagram-open" <absolute-file-path>`). On a revision to the same file, the open browser tab just needs a refresh; open again only when the file is new. `DIAGRAM_PLANS_OPEN=0` skips this step.
5. **Reply in ≤ 5 lines**: the saved path, and the one decision or open question the user must answer. Every other word belongs inside the diagram.

Done when: the file exists at the configured path, the opener script reported `opened` (or was disabled), and the chat reply is under five lines.

## Rules

- The page is a plain file opened from disk: Mermaid loads from the jsDelivr CDN and Geist from Google Fonts, so it needs network on first view. Keep every other asset inline.
- Diagram theme follows the OS color scheme; Geist tokens do the rest. Custom colors belong in Mermaid `classDef`s, not ad-hoc CSS.
- Prefer breadth over depth: three levels is the ceiling; split into a second diagram past that.
- Contradictions, risks, and unknowns are nodes too (`⚠ risk: …`, `? open: …`), never hidden in prose.
- When the user then asks to "expand X" or "change Y", edit the same file; the browser tab refreshes to the new version.
- Explicit request for prose ("write it up", "in paragraphs", "as a doc") overrides this skill.
