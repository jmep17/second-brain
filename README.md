# claude-diagrams

A Claude Code plugin marketplace. Currently one plugin:

## diagram-plans

When you ask Claude Code to plan, brainstorm, compare options, sketch an architecture, or lay out a roadmap, it answers with a **Mermaid mindmap / flowchart artifact** instead of paragraphs. The HTML file is saved to a directory you choose and published as a Claude Code Artifact.

Two parts:

- `skills/diagram-plans/` — the skill: picks the diagram type, writes the HTML file, publishes it, keeps the chat reply to a few lines.
- `hooks/nudge.sh` — a `UserPromptSubmit` hook that detects plan/brainstorm-shaped prompts and reminds the model to use the skill, so it fires reliably rather than by chance.

### Install

```
/plugin marketplace add jordenparker/claude-diagrams   # or a local path: /plugin marketplace add ~/src/claude-diagrams
/plugin install diagram-plans@claude-diagrams
```

Restart Claude Code (or `/reload-plugins`) after installing.

### Configure the save path

Set env vars in `~/.claude/settings.json` (global) or `.claude/settings.json` (per project):

```json
{
  "env": {
    "DIAGRAM_PLANS_DIR": "~/notes/diagrams",
    "DIAGRAM_PLANS_PUBLISH": "1"
  }
}
```

| Variable | Default | Meaning |
|---|---|---|
| `DIAGRAM_PLANS_DIR` | `.claude/diagrams` | Where HTML files are written. Absolute, or relative to the project root. Created on demand. |
| `DIAGRAM_PLANS_PUBLISH` | `1` | `0` writes the file without publishing an Artifact. |

Files are named `YYYY-MM-DD-<topic-slug>.html`. Each is self-contained (Mermaid is rendered natively by the Artifact viewer; opening the raw file in a browser shows the Mermaid source in a `<pre>` block).

### Opt out for one request

Say "write it up" / "in paragraphs" / "as a doc" and the skill stands down.

### Layout

```
.claude-plugin/marketplace.json
plugins/diagram-plans/
  .claude-plugin/plugin.json
  hooks/hooks.json
  hooks/nudge.sh
  skills/diagram-plans/SKILL.md
  skills/diagram-plans/MERMAID.md
```
