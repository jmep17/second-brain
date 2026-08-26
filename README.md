# claude-diagrams

A Claude Code plugin marketplace. Currently one plugin:

## diagram-plans

When you ask Claude Code to plan, brainstorm, compare options, sketch an architecture, or lay out a roadmap, it answers with a **Mermaid mindmap / flowchart** in a standalone HTML page styled on [Vercel's Geist design system](https://vercel.com/geist) instead of paragraphs. The file is saved to a directory you choose and opened in your browser.

Two parts:

- `skills/diagram-plans/` — the skill: picks the diagram type, writes the Geist-styled HTML file, opens it in your browser, keeps the chat reply to a few lines.
- `hooks/nudge.sh` — a `UserPromptSubmit` hook that detects plan/brainstorm-shaped prompts and reminds the model to use the skill, so it fires reliably rather than by chance.

### Install

```
/plugin marketplace add jordenparker/claude-diagrams   # or a local path: /plugin marketplace add ~/src/claude-diagrams
/plugin install diagram-plans@claude-diagrams
```

Restart Claude Code (or `/reload-plugins`) after installing.

### Updating

Plugin installs are cached and keyed on the version in
`.claude-plugin/marketplace.json`. After pulling new commits:

```
/plugin marketplace update claude-diagrams
/plugin update diagram-plans@claude-diagrams
```

If a change does not appear, check what your install is actually pinned to:

```
python3 -c 'import json;print(json.load(open("$HOME/.claude/plugins/installed_plugins.json")))'
```

**When contributing**: any change to the plugin's files must bump the version in
*both* `plugins/diagram-plans/.claude-plugin/plugin.json` and
`.claude-plugin/marketplace.json`. Run `bash tools/check-version-sync.sh`
to confirm they agree. Without a bump, existing installs keep serving the old
cached copy.

### Configure the save path

Set env vars in `~/.claude/settings.json` (global) or `.claude/settings.json` (per project):

```json
{
  "env": {
    "DIAGRAM_PLANS_DIR": "~/notes/diagrams",
    "DIAGRAM_PLANS_OPEN": "1"
  }
}
```

| Variable | Default | Meaning |
|---|---|---|
| `DIAGRAM_PLANS_DIR` | `.claude/diagrams` | Where HTML files are written. Absolute, or relative to the project root. Created on demand. |
| `DIAGRAM_PLANS_OPEN` | `1` | Open the file in your default browser when created (WSL, Linux, macOS). `0` disables. |

Files are named `YYYY-MM-DD-<topic-slug>.html`. Each page loads Mermaid from jsDelivr and the Geist fonts from Google Fonts, follows your OS light/dark scheme, and otherwise has no dependencies.

### Opt out for one request

Say "write it up" / "in paragraphs" / "as a doc" and the skill stands down.

### Layout

```
.claude-plugin/marketplace.json
plugins/diagram-plans/
  .claude-plugin/plugin.json
  hooks/hooks.json
  hooks/nudge.sh
  bin/diagram-open
  skills/diagram-plans/SKILL.md
  skills/diagram-plans/MERMAID.md
```
