# diagrams

A Claude Code plugin: plans, brainstorms, and design discussions become a
Mermaid diagram in a Geist-styled HTML page, opened in the browser, instead
of paragraphs. Part of the `second-brain` marketplace — its output lands in
`artifacts/diagrams/` in that repo.

## Install

### Claude Code

```
/plugin marketplace add ~/src/second-brain
/plugin install diagrams@second-brain
```

Update:

```
/plugin marketplace update second-brain
/plugin update diagrams@second-brain
```

### Codex

```
codex plugin marketplace add ~/src/second-brain
codex plugin add diagrams@second-brain
```

Update: `codex plugin marketplace upgrade` then re-run `codex plugin add`.
Remove the retired predecessor if present:

```
codex plugin remove diagram-plans@claude-diagrams
codex plugin marketplace remove claude-diagrams
```

Codex reads the same Claude-format marketplace and plugin manifests. Set
`DIAGRAMS_DIR` / `DIAGRAMS_OPEN` in the shell environment Codex inherits.

### Other agents

Any agent that speaks the Agent Skills standard can consume the skill alone
from this repo by copying `skills/diagram-plans/` into the agent's skills
directory (copy the whole plugin folder, not just the one file, so the
skill's relative-path fallback can still find `bin/diagram-open`).
Skill-only installs get the diagram workflow but **not** the enforcement
hooks or the `PATH`-installed opener.

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

## Enforcement

Enforcement is plugin-gated: everything below ships with the plugin and is
active exactly when the plugin is enabled, in any agent that runs plugin
hooks.

- `hooks/nudge.sh` (UserPromptSubmit): planning-shaped prompts get a one-line
  reminder to answer with a diagram artifact instead of paragraphs.
- `hooks/plan-artifact-nudge.sh` (PostToolUse on Write): whenever a skill or
  workflow writes a plan/spec/tickets markdown file (`plans/`, `.scratch/`,
  `specs/`, `tickets/`), the agent is reminded to render that document as a
  diagram page too — so plans from any skill (to-spec, improve, generators)
  end up as an artifact in the browser, not a wall of markdown.
- Opting out: disable the plugin; or per-request, ask for prose ("write it
  up", "in paragraphs"); or set `DIAGRAMS_OPEN=0` to keep files from opening.

Agents that install only the skill (no hook support) still follow the same
rules when the skill is invoked, but nothing fires automatically.

## Version bumps

Any change under `plugins/diagrams/` must bump the version in **both**
`plugins/diagrams/.claude-plugin/plugin.json` and the root
`.claude-plugin/marketplace.json` — Claude Code keys its plugin cache on this
value, and `tools/check-version-sync.sh` fails the pre-commit check if they
disagree.

## Layout

```
.claude-plugin/plugin.json
hooks/hooks.json  hooks/nudge.sh  hooks/plan-artifact-nudge.sh
bin/diagram-open
skills/diagram-plans/SKILL.md  MERMAID.md
tools/check.sh  tools/check-version-sync.sh
test/  plans/  package.json  bun.lock
```
