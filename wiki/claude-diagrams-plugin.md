---
title: claude-diagrams (diagram-plans plugin)
type: entity
created: 2026-08-26
updated: 2026-08-26
sources: [~/src/claude-diagrams]
---

# claude-diagrams — the `diagram-plans` Claude Code plugin

A local Claude Code plugin marketplace at `~/src/claude-diagrams` (git, 3 commits as of 2026-08-26). Its one plugin, **diagram-plans**, makes Claude Code answer planning, brainstorming, option-comparison, roadmap, and architecture prompts with a **Mermaid diagram in a standalone Geist-styled HTML page**, saved to a configurable directory and opened in the browser, instead of paragraphs of prose.

Built 2026-08-26 in one session. Related: [[mattpocock-skills-workflow]] (another plugin with model-invoked skills), [[claude-code-memory-plan-locations]] (relocating other Claude Code files).

## Why it exists

Plans and brainstorms are trees/graphs; prose flattens them. Also, reading long chat output is costly (see [[adhd-summarize]] motivation) — a mindmap or flowchart is scannable and re-enterable.

## Design decisions

| Decision | Choice | Reason |
|---|---|---|
| Mechanism | Skill + `UserPromptSubmit` hook, not an output style | Output styles are deprecated in Claude Code (v2.1.246 at build time). The hook makes the skill fire *deterministically* on plan-shaped prompts rather than relying on the model to notice the skill description. |
| Rendering | Standalone HTML, Mermaid 11 from jsDelivr, fonts from Google Fonts | Originally published as a Claude Code Artifact (Mermaid renders natively there); switched to a plain file so it opens in any browser, lives on disk, and follows a real design system. Needs network on first view. |
| Design system | Vercel Geist | Geist Sans/Mono, neutral gray tokens (`#eaeaea` borders, `#666`/`#999` accents, `#0070f3` blue, `#f5a623` warning), 8 px radii, auto light/dark via `prefers-color-scheme`; Mermaid re-renders with `neutral`/`dark` theme when the scheme flips. |
| Configuration | Env vars via `settings.json` `env` | Plugins cannot ship settings; env is the one channel both the hook (bash) and the skill (model reads the nudge) can see. |
| Diagram choice | Table mapping request shape → diagram type | mindmap (brainstorm), flowchart TD (plan/decision), flowchart LR subgraphs or quadrantChart (options/trade-offs), timeline/gantt (roadmap), sequenceDiagram (call flow), stateDiagram-v2 (lifecycle). |

## Layout

```
.claude-plugin/marketplace.json          # marketplace "claude-diagrams"
plugins/diagram-plans/
  .claude-plugin/plugin.json
  hooks/hooks.json                       # UserPromptSubmit → nudge.sh
  hooks/nudge.sh                         # regex on the prompt; prints a one-line reminder + save dir
  scripts/open-url.sh                    # wslview → powershell Start-Process → xdg-open → open; handles local files (wslpath -w)
  skills/diagram-plans/SKILL.md          # steps + rules (written per writing-for-agents: front-loaded pointer, completion criteria, positive phrasing)
  skills/diagram-plans/MERMAID.md        # disclosed reference: diagram table, Geist HTML template, Mermaid syntax crib
```

## Skill flow (SKILL.md)

1. Pick the shape from the table.
2. Gather content first — every node grounded in something actually read.
3. Write the HTML file from the Geist template verbatim; only title, badge, date, diagram, notes vary. Path `$DIAGRAM_PLANS_DIR` (default `.claude/diagrams/`), name `YYYY-MM-DD-<slug>.html`. Labels ≤ 6 words; overflow goes in a one-line-each Notes list; mindmaps max three levels; risks/unknowns are nodes (`⚠ risk:`, `? open:`).
4. Open in browser via `open-url.sh` (first creation only; revisions = refresh tab).
5. Reply in ≤ 5 lines: saved path + the one decision the user must make.

Opt-out per request: "write it up" / "in paragraphs" / "as a doc".

## Configuration

```json
{ "env": { "DIAGRAM_PLANS_DIR": "~/notes/diagrams", "DIAGRAM_PLANS_OPEN": "1" } }
```

| Var | Default | Meaning |
|---|---|---|
| `DIAGRAM_PLANS_DIR` | `.claude/diagrams` | Output directory, absolute or project-relative; created on demand |
| `DIAGRAM_PLANS_OPEN` | `1` | `0` skips opening the browser |

(`DIAGRAM_PLANS_PUBLISH` existed briefly in the Artifact-based version and was removed.)

## Install

```
/plugin marketplace add ~/src/claude-diagrams     # or jordenparker/claude-diagrams once pushed
/plugin install diagram-plans@claude-diagrams
/reload-plugins
```

## Status / open items

- Not yet pushed to GitHub; installed only from the local path.
- The Geist template has not been visually verified in a browser yet — first real run deserves a look.
- Hook regex is broad (`plan|design|options|compare|outline|…`); tune if it fires on non-planning prompts.
- On WSL, install `wslu` (`wslview`) for the cleanest browser open; fallback is `powershell.exe Start-Process`.
