# diagrams

A Claude Code plugin: plans, brainstorms, and design discussions become a
Mermaid diagram in a Geist-styled HTML page, opened in the browser, instead
of paragraphs. Part of the `second-brain` marketplace — its output lands in
`artifacts/diagrams/` in that repo.

## Install

```
/plugin marketplace add ~/src/second-brain
/plugin install diagrams@second-brain
```

## Update

```
/plugin marketplace update second-brain
/plugin update diagrams@second-brain
```

## Configuration

Set env vars in your Claude Code settings (`env` block):

```json
{
  "env": {
    "DIAGRAMS_DIR": "artifacts/diagrams",
    "DIAGRAMS_OPEN": "1"
  }
}
```

| Var             | Default              | Meaning                                                                                     |
| --------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `DIAGRAMS_DIR`  | `artifacts/diagrams` | Where HTML files are written. Absolute, or relative to the project root. Created on demand. |
| `DIAGRAMS_OPEN` | `1`                  | Open the file in your default browser when created (WSL, Linux, macOS). `0` disables.       |

## Version bumps

Any change under `plugins/diagrams/` must bump the version in **both**
`plugins/diagrams/.claude-plugin/plugin.json` and the root
`.claude-plugin/marketplace.json` — Claude Code keys its plugin cache on this
value, and `tools/check-version-sync.sh` fails the pre-commit check if they
disagree.

## Layout

```
.claude-plugin/plugin.json
hooks/hooks.json  hooks/nudge.sh
bin/diagram-open
skills/diagram-plans/SKILL.md  MERMAID.md
tools/check.sh  tools/check-version-sync.sh
test/  plans/  package.json  bun.lock
```
