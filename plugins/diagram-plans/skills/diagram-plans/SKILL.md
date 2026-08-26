---
name: diagram-plans
description: Answer plans, brainstorms, designs, option comparisons, roadmaps, and architecture discussions with a Mermaid diagram artifact instead of paragraphs. Use whenever the user asks how to approach something, wants ideas or options, asks for a plan or breakdown, or the diagram-plans hook nudge appears in context.
---

Plans and brainstorms are trees and graphs, not prose. Draw the structure; keep words to labels.

## Steps

1. **Pick the shape.** Match the request to one diagram (see the table in [`MERMAID.md`](MERMAID.md)):
   - brainstorm / ideas / breakdown → `mindmap`
   - plan / sequence of work / decision path → `flowchart`
   - options with trade-offs → `flowchart` with one subgraph per option, or `quadrantChart`
   - roadmap / phases with time → `gantt` or `timeline`
   - components talking to each other → `flowchart` (or `sequenceDiagram` for call order)
2. **Gather the content first.** Read the code, files, or prior context the plan depends on; the diagram carries every branch you would otherwise have written as a paragraph. Done when each node's claim is grounded in something you actually looked at, not guessed.
3. **Write the HTML file** using the template in [`MERMAID.md`](MERMAID.md). Path:
   - directory: `$DIAGRAM_PLANS_DIR` if set (absolute, or relative to the project root), else `.claude/diagrams/`. Create it if missing.
   - filename: `YYYY-MM-DD-<kebab-slug>.html` (today's date, slug from the topic). Redeploying the same topic reuses the same path.
   - Node labels: short noun phrases, ≤ 6 words. Detail that cannot fit a label goes in a single "Notes" list under the diagram, one line each.
   - The page contains one diagram (two only when a mindmap needs a companion flowchart for sequencing).
4. **Publish** with the Artifact tool (`file_path` = the file you wrote; favicon `🗺️`; stable title = the topic). Skip publishing only when `DIAGRAM_PLANS_PUBLISH=0`.
5. **Reply in ≤ 5 lines**: the artifact link, the saved path, and the one decision or open question the user must answer. Every other word belongs inside the diagram.

Done when: the file exists at the configured path, the Artifact call returned a URL (or publishing was disabled), and the chat reply is under five lines.

## Rules

- Mermaid renders natively in artifacts via `<pre class="mermaid">` — no scripts, no CDN.
- Prefer breadth in the tree over depth: three levels is the ceiling for a mindmap; split into a second diagram past that.
- Contradictions, risks, and unknowns are nodes too (`⚠ risk: …`, `? open: …`), never hidden in prose.
- When the user then asks to "expand X" or "change Y", edit the same file and republish to the same URL.
- Explicit request for prose ("write it up", "in paragraphs", "as a doc") overrides this skill.
