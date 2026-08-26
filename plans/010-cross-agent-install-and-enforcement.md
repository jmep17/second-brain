# Plan 010: The diagrams plugin installs into Codex (and other agents) and, when enabled, enforces diagram artifacts — including for plans produced by other skills

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat f17627f..HEAD -- plugins/diagrams .claude-plugin/marketplace.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. In particular, if
> `plugins/diagrams/plans/008-hook-precision-and-robustness.md` has been
> executed (check its status row in `plugins/diagrams/plans/README.md`),
> `hooks/nudge.sh` will differ from the excerpt below — that is fine; this
> plan does not touch `nudge.sh`. Anything else differing is a STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (steps 6–8 mutate per-machine agent config outside the repo; everything in-repo is LOW)
- **Depends on**: none (plan 009 already DONE; see "Interaction with plugin plan 008" below)
- **Category**: dx
- **Planned at**: commit `f17627f`, 2026-08-26

## Why this matters

The diagrams plugin turns plans/brainstorms into a Geist-styled Mermaid HTML
page opened in the browser, instead of long prose answers. Today it is
installed only in **Claude Code** (`diagrams@second-brain` v0.3.0). **Codex**
(v0.149.1, installed on this machine) still runs the plugin's *predecessor* —
`diagram-plans@claude-diagrams` v0.2.0 from the retired `~/src/claude-diagrams`
repo — so Codex gets a stale skill, stale env-var names
(`DIAGRAM_PLANS_DIR`), and none of the improvements since. And in *both*
agents, enforcement only triggers on the user's own prompt wording: when a
skill (mattpocock's `/to-spec`, `/improve`, shadcn-style generators, etc.)
writes a plan or spec document, nothing pushes the agent to render it as a
browser artifact — the user gets a wall of markdown.

After this plan: one install path per agent documented and executed (Codex on
the same `second-brain` marketplace as Claude Code, stale install removed), a
deterministic PostToolUse hook that fires whenever any skill writes a
plan/spec file, and a skill rule making the diagram page the standard review
surface for those documents. Enforcement is plugin-gated: enabled plugin ⇒
hooks and skill active; disabled ⇒ nothing fires.

## Current state

Everything verified directly on 2026-08-26 at commit `f17627f`.

### The plugin (in this repo)

- `plugins/diagrams/.claude-plugin/plugin.json` — manifest, `"name": "diagrams"`, `"version": "0.3.0"`.
- `.claude-plugin/marketplace.json` (repo root) — marketplace `second-brain`, one entry `diagrams` @ `0.3.0`, `"source": "./plugins/diagrams"`.
- `plugins/diagrams/hooks/hooks.json` — in full:

  ```json
  {
    "hooks": {
      "UserPromptSubmit": [
        {
          "hooks": [
            {
              "type": "command",
              "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/nudge.sh\""
            }
          ]
        }
      ]
    }
  }
  ```

- `plugins/diagrams/hooks/nudge.sh` — UserPromptSubmit nudge; greps the prompt
  for planning words and, on match, injects one line telling the model to
  invoke the skill. **Owned by plugin plan 008 (TODO) — do not modify it.**
- `plugins/diagrams/skills/diagram-plans/SKILL.md` — the skill. Two excerpts
  this plan edits around:

  Step 4 (the opener):

  > **Open it in the browser**: run `diagram-open <absolute-file-path>` (the
  > plugin puts it on `PATH`; if the command is not found, fall back to
  > `bash "${CLAUDE_PLUGIN_ROOT}/bin/diagram-open" <absolute-file-path>`). …

  The `## Rules` section ends with:

  > - Explicit request for prose ("write it up", "in paragraphs", "as a doc") overrides this skill.

- `plugins/diagrams/bin/diagram-open` — browser opener (WSL/Linux/macOS),
  executable. On `PATH` only under Claude Code.
- `plugins/diagrams/README.md` — documents install/update **for Claude Code
  only** (`/plugin marketplace add ~/src/second-brain`, `/plugin install
  diagrams@second-brain`), the two env vars, the version-bump rule, layout.
- `plugins/diagrams/tools/check.sh` — pre-commit gate: version sync, JSON
  validity of the three manifests, `bash -n` on every tracked `*.sh` (via
  `git ls-files '*.sh' bin/`), executable bit on `bin/diagram-open`. A new
  tracked `.sh` file is linted automatically; no edit needed there.
- `plugins/diagrams/tools/check-version-sync.sh` — fails when
  `plugin.json` and the root `marketplace.json` disagree on the version.

### Installed state, per agent (this machine)

- **Claude Code**: `~/.claude/plugins/installed_plugins.json` has
  `diagrams@second-brain` v0.3.0, `gitCommitSha f17627f`;
  `~/.claude/plugins/known_marketplaces.json` has `second-brain` →
  `/home/jorden/src/second-brain`. Current.
- **Codex** (`codex-cli 0.149.1`): `~/.codex/config.toml` contains the stale
  pair:

  ```toml
  [marketplaces.claude-diagrams]
  source_type = "local"
  source = "/home/jorden/src/claude-diagrams"

  [plugins."diagram-plans@claude-diagrams"]
  enabled = true
  ```

  `codex plugin list` prints (among the `openai-curated` rows):

  ```
  Marketplace `claude-diagrams`
  /home/jorden/src/claude-diagrams/.claude-plugin/marketplace.json

  PLUGIN                         STATUS              VERSION  PATH
  diagram-plans@claude-diagrams  installed, enabled  0.2.0    /home/jorden/src/claude-diagrams/plugins/diagram-plans
  ```

  This proves Codex accepts **Claude-format** marketplaces
  (`.claude-plugin/marketplace.json`) and plugins
  (`.claude-plugin/plugin.json`), and its cache copy at
  `~/.codex/plugins/cache/claude-diagrams/diagram-plans/0.2.0/` includes the
  plugin's `hooks/` and `bin/` directories. Codex's own plugin spec
  (`~/.codex/skills/.system/plugin-creator/references/plugin-json-spec.md`)
  lists `skills` and `hooks` as plugin components, and Codex supports the same
  hook event names (`~/.codex/hooks.json` on this machine already wires
  `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, …). **Not verified:**
  whether Codex actually *executes* plugin-provided hooks, whether it
  substitutes `${CLAUDE_PLUGIN_ROOT}`, whether it puts plugin `bin/` on
  `PATH`, and its hook stdin payload shape. Step 7 verifies empirically;
  Step 8 is the fallback.

- The old repo `~/src/claude-diagrams` is clean at `42fe966` and fully
  superseded by `plugins/diagrams` (plan 009). Retiring the GitHub repo
  itself stays deferred (plan 009's README notes it); this plan only removes
  the *Codex registration* of it.

### How other skills publish plans (what the new hook must catch)

- This repo's `improve` workflow writes `plans/NNN-*.md`.
- mattpocock skills (`/to-spec`, `/to-tickets`, installed via the vercel
  `skills` CLI into `~/.agents/skills`, symlinked into `~/.claude/skills`)
  publish specs/tickets to the project issue tracker, which per `CLAUDE.md` is
  local markdown under `.scratch/<feature>/`.
- Generic generators ("shadcn, etc.") also write markdown plans/specs into
  whatever project is open.

So "a skill produced a plan" is observable as: **the agent wrote a `.md` file
under a `plans/`, `.scratch/`, `specs/` or `tickets/` directory**. That is
what the PostToolUse hook keys on — prompt wording never enters into it.

### Conventions that apply

- Shell: `#!/usr/bin/env bash`, `set -uo pipefail` (hooks must always exit 0 —
  see plan 008's out-of-scope note: "A `UserPromptSubmit` hook that exits
  non-zero can surface errors to the user"), short `#` header stating purpose.
  Exemplar: `plugins/diagrams/hooks/nudge.sh`.
- Formatting: Prettier formats everything (`bunx lint-staged` pre-commit;
  `*": "prettier --ignore-unknown --write"`).
- **Version bump rule** (plugin README): any change under `plugins/diagrams/`
  bumps the version in BOTH `plugins/diagrams/.claude-plugin/plugin.json` and
  root `.claude-plugin/marketplace.json`. New capability ⇒ minor bump:
  `0.3.0` → `0.4.0`.
- `python3` is available and already used by `check-version-sync.sh`.

### Interaction with plugin plan 008

`plugins/diagrams/plans/008-hook-precision-and-robustness.md` (status TODO)
rewrites `hooks/nudge.sh` and builds a nudge corpus test. This plan does
**not** touch `nudge.sh`; it adds a *separate* hook script and an *additive*
`hooks.json` entry. 008 marks `hooks.json` out of scope with "the wiring is
correct" — that statement predates this plan; the PostToolUse entry added here
does not alter the `UserPromptSubmit` wiring 008 relies on. If 008 runs after
this plan, its instruction "do not touch hooks.json" still holds and nothing
conflicts.

## Commands you will need

| Purpose                    | Command                                              | Expected on success                      |
| -------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| Plugin checks              | `cd plugins/diagrams && bun run test`                | `all checks passed`, exit 0              |
| Version sync only          | `cd plugins/diagrams && bash tools/check-version-sync.sh` | `version in sync: 0.4.0`, exit 0    |
| Format                     | `cd plugins/diagrams && bun run format`              | exit 0                                   |
| Codex marketplace listing  | `codex plugin marketplace list`                      | table of marketplaces                    |
| Codex plugin listing       | `codex plugin list`                                  | table incl. `diagrams@second-brain`      |

## Scope

**In scope** (repo files — the only files you may modify; steps 6–8 addition-
ally touch the named per-machine config, outside the repo):

- `plugins/diagrams/hooks/plan-artifact-nudge.sh` (create)
- `plugins/diagrams/hooks/hooks.json` (add a `PostToolUse` entry — do not
  change the existing `UserPromptSubmit` entry)
- `plugins/diagrams/skills/diagram-plans/SKILL.md` (two additive edits)
- `plugins/diagrams/README.md` (Codex + other-agents install docs, enforcement
  docs)
- `plugins/diagrams/.claude-plugin/plugin.json` (version → `0.4.0`)
- `.claude-plugin/marketplace.json` (version → `0.4.0`)
- `plans/README.md` (status row)
- Machine config, steps 6–8 only: `~/.codex/config.toml` (via the `codex
  plugin` CLI only — never hand-edit it), `~/.codex/AGENTS.md` (step 8
  fallback only).

**Out of scope** (do NOT touch, even though they look related):

- `plugins/diagrams/hooks/nudge.sh` — plugin plan 008 owns it.
- `plugins/diagrams/skills/diagram-plans/MERMAID.md` — rendering/template;
  nothing here changes how a diagram renders.
- `plugins/diagrams/tools/*` — `check.sh` already lints any new tracked `.sh`.
- The old repo `~/src/claude-diagrams` — read-only reference; archiving it is
  a separately deferred task.
- Third-party skills under `~/.claude/skills`, `~/.agents/skills`,
  `~/.codex/skills/.system` — managed installs; any edit is lost on update.
  Enforcement must layer *above* them (hook + skill rule), never inside them.
- `~/.claude/settings.json` and `~/.codex/hooks.json` — user-level config
  carrying unrelated (caveman) hooks.
- `site/`, `wiki/`, `log.md` — untouched by this plan. (The site Artifacts
  section and config-UI plugin toggle remain deferred from plan 009.)

## Git workflow

- Branch: `advisor/010-cross-agent-install`
- Message style: `diagrams: <imperative>` (matches plugin history, e.g.
  `diagram-plans: rebuild the page template as document + canvas`).
- Do NOT push or open a PR unless the operator instructed it.
- Note: pre-commit runs `bunx lint-staged` + `bash plugins/diagrams/tools/check.sh`
  from the repo root, so the version bump (step 5) must be in the same commit
  as (or an earlier commit than) any `plugins/diagrams` change you commit.

## Steps

### Step 1: Create the PostToolUse hook script

Create `plugins/diagrams/hooks/plan-artifact-nudge.sh`:

```bash
#!/usr/bin/env bash
# PostToolUse hook: when the agent has just WRITTEN a plan/spec markdown file
# (plans/, .scratch/, specs/, tickets/), remind it to also render the document
# as a diagram artifact page in the browser via the diagram-plans skill.
# Stdout is appended to the model's context. Must always exit 0.
set -uo pipefail

path="$(python3 -c '
import json, re, sys
try:
    d = json.loads(sys.stdin.read())
except Exception:
    sys.exit(0)
tool = str(d.get("tool_name") or d.get("tool") or "")
if tool.lower() not in ("write", "write_file", "create_file"):
    sys.exit(0)
ti = d.get("tool_input") or {}
p = str(ti.get("file_path") or ti.get("path") or "")
base = p.rsplit("/", 1)[-1].lower()
if base in ("readme.md", "index.md"):
    sys.exit(0)
if re.search(r"(^|/)(plans|\.scratch|specs?|tickets?)/[^\0]*\.md$", p):
    sys.stdout.write(p)
' 2>/dev/null || true)"

if [ -n "${path:-}" ]; then
  echo "diagram-plans: a plan/spec document was just written (${path}). Render its structure as a diagram artifact too — invoke the diagram-plans skill on that document and open the page in the browser. The markdown stays the source of truth; the diagram is the review surface. Skip only if the user explicitly asked for prose or the document was itself generated from a diagram."
fi
exit 0
```

Properties that matter: it never exits non-zero (no `set -e`; `|| true` on the
python call); malformed/unknown payloads stay silent; only *Write*-shaped
tools fire (an Edit to an existing plan does not re-nudge on every touch-up);
`README.md`/`index.md` basenames are excluded so plan-index updates stay
quiet. The tool-name and path-key alternatives (`tool`, `path`,
`write_file`…) are defensive slack for Codex's undocumented payload shape —
under Claude Code the payload is `{"tool_name": "Write", "tool_input":
{"file_path": …}}`.

**Verify** (each must print the expected line and exit 0):

```bash
cd plugins/diagrams
printf '{"tool_name":"Write","tool_input":{"file_path":"/r/plans/011-foo.md"}}' \
  | bash hooks/plan-artifact-nudge.sh; echo "exit=$?"
# → one nudge line containing /r/plans/011-foo.md ; exit=0
printf '{"tool_name":"Write","tool_input":{"file_path":"/r/.scratch/auth/spec.md"}}' \
  | bash hooks/plan-artifact-nudge.sh
# → one nudge line
printf '{"tool_name":"Write","tool_input":{"file_path":"/r/plans/README.md"}}' \
  | bash hooks/plan-artifact-nudge.sh
# → no output
printf '{"tool_name":"Edit","tool_input":{"file_path":"/r/plans/011-foo.md"}}' \
  | bash hooks/plan-artifact-nudge.sh
# → no output
printf '{"tool_name":"Write","tool_input":{"file_path":"/r/wiki/notes.md"}}' \
  | bash hooks/plan-artifact-nudge.sh
# → no output
printf 'not json' | bash hooks/plan-artifact-nudge.sh; echo "exit=$?"
# → no output; exit=0
printf '' | bash hooks/plan-artifact-nudge.sh; echo "exit=$?"
# → no output; exit=0
```

### Step 2: Wire the hook into hooks.json

Edit `plugins/diagrams/hooks/hooks.json` — add a `PostToolUse` key alongside
(not replacing) `UserPromptSubmit`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/nudge.sh\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/plan-artifact-nudge.sh\""
          }
        ]
      }
    ]
  }
}
```

The `matcher` keeps the hook off the hot path of every Bash/Read call in
Claude Code; the script re-checks the tool name anyway for hosts that ignore
`matcher`.

**Verify**: `python3 -m json.tool plugins/diagrams/hooks/hooks.json` → valid;
the diff for this file touches only the added `PostToolUse` block
(`git diff plugins/diagrams/hooks/hooks.json` shows no `-` lines except the
brace/comma reflow around the insertion).

### Step 3: Make the skill cross-agent and plan-document-aware (SKILL.md)

Two additive edits to `plugins/diagrams/skills/diagram-plans/SKILL.md`:

**3a — portable opener fallback.** In step 4 of the skill, extend the
parenthetical so the full chain reads: try `diagram-open` on `PATH`; then
`bash "${CLAUDE_PLUGIN_ROOT}/bin/diagram-open" <path>`; then — new — "in
agents that define neither (e.g. Codex), run
`bash <dir-of-this-SKILL.md>/../../bin/diagram-open <path>` — the opener
lives two directories above this file in every install layout". (Both the
Claude Code and Codex plugin caches preserve the repo layout
`skills/diagram-plans/SKILL.md` vs `bin/diagram-open`, verified in both
caches on this machine.)

**3b — plans produced by other skills.** Append one rule to `## Rules`:

```markdown
- When any skill or workflow has just produced a plan, spec, or tickets
  document (e.g. a file under `plans/`, `.scratch/`, `specs/`, `tickets/` —
  the plan-artifact hook will remind you), render that document's structure
  as a diagram page too: same template, nodes sourced from the document's
  sections/steps/dependencies, saved and opened like any other diagram. The
  markdown document remains the source of truth — the diagram is the review
  surface, and the ≤ 5-line reply rule still applies.
```

Do not change the skill's `description:` frontmatter (plan 008's guardrail:
hook and description are independent selection mechanisms — change one at a
time; this plan changes hooks, so the description stays fixed).

**Verify**: `grep -c "review surface" plugins/diagrams/skills/diagram-plans/SKILL.md`
→ `1`; `grep -c "two directories above" plugins/diagrams/skills/diagram-plans/SKILL.md`
→ `1`; `git diff` for this file shows only additions (plus reflow) — no
deleted rule lines, frontmatter untouched.

### Step 4: Document install + enforcement per agent (plugin README)

Edit `plugins/diagrams/README.md`:

**4a** — retitle the existing `## Install` content as `### Claude Code`
(commands unchanged) and add:

````markdown
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
from this repo (e.g. `npx skills add github:jmep17/second-brain --skill
diagram-plans`, or by copying `skills/diagram-plans/` into the agent's skills
directory). Skill-only installs get the diagram workflow but **not** the
enforcement hooks or the `PATH`-installed opener — the skill's relative-path
fallback still finds `bin/diagram-open` if you copy the whole plugin folder.
````

(If the `skills` CLI's actual flag syntax differs, document the copy-the-
folder path only — do not guess flags into the README; verify with
`npx skills --help` first or drop the CLI mention.)

**4b** — add an `## Enforcement` section:

```markdown
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
```

**Verify**: `grep -c "codex plugin add diagrams@second-brain" plugins/diagrams/README.md` → `1`;
`grep -c "## Enforcement" plugins/diagrams/README.md` → `1`.

### Step 5: Version bump and repo checks

Set `"version": "0.4.0"` in `plugins/diagrams/.claude-plugin/plugin.json` AND
in the `diagrams` entry of `.claude-plugin/marketplace.json`.

**Verify**:

```bash
cd plugins/diagrams
bash tools/check-version-sync.sh   # → version in sync: 0.4.0
bun run format                     # prettier, exit 0
bun run test                       # → all checks passed (incl. bash -n on the new hook)
```

Commit everything in-repo now (one or more commits, message style above).
Steps 6–8 act on the machine, not the worktree — they need this work merged
to `main` first when executed from a worktree (see STOP conditions).

### Step 6: Point Codex at the second-brain marketplace (machine-level)

Run from any directory, on the real machine, **after the repo changes are on
`main`** (Codex snapshots the marketplace from the live directory):

```bash
codex plugin marketplace add ~/src/second-brain
codex plugin add diagrams@second-brain
codex plugin remove diagram-plans@claude-diagrams
codex plugin marketplace remove claude-diagrams
```

**Verify**:

- `codex plugin marketplace list` → contains a `second-brain` row with root
  `/home/jorden/src/second-brain...`; no `claude-diagrams` row.
- `codex plugin list` → contains `diagrams@second-brain  installed, enabled  0.4.0`;
  no `diagram-plans@claude-diagrams` row.
- `grep -n "claude-diagrams" ~/.codex/config.toml` → no matches;
  `grep -n "second-brain" ~/.codex/config.toml` → the new marketplace +
  plugin entries (written by the CLI — never hand-edit this file; the
  caveman-managed blocks in it must survive untouched:
  `grep -c "caveman" ~/.codex/config.toml` returns the same count before and
  after).

### Step 7: Refresh Claude Code's install and verify enforcement there (machine-level)

In a Claude Code session: `/plugin marketplace update second-brain` then
`/plugin update diagrams@second-brain`.

**Verify**:

- `python3 -c 'import json;d=json.load(open("/home/jorden/.claude/plugins/installed_plugins.json"));print(d["plugins"]["diagrams@second-brain"][0]["version"])'` → `0.4.0`
- Live hook check, in a fresh Claude Code session in any repo: have it write
  a file `plans/zz-hook-smoke.md` (then delete it). The turn after the write
  should show the model receiving the plan-artifact nudge (it will mention
  rendering the plan as a diagram, or produce one). If `DIAGRAMS_OPEN=0` is
  set, no browser opens but the HTML file appears.

### Step 8: Verify Codex enforcement empirically; fall back to global guidance if plugin hooks don't fire (machine-level)

Whether Codex executes plugin-shipped hooks is undocumented. Test it
(requires operator consent — it spends one Codex turn):

```bash
cd "$(mktemp -d)" && git init -q .
DIAGRAMS_OPEN=0 codex exec "Give me a plan for splitting a monolith into two services. Keep it short."
ls artifacts/diagrams/ 2>/dev/null
```

- **If** an HTML file appears (or the transcript shows the nudge line):
  plugin hooks fire under Codex. Record that in
  `plugins/diagrams/README.md`'s Enforcement section ("verified under Codex
  0.149.x") in a follow-up commit, and you are done.
- **If not**: enforcement under Codex needs the guidance channel. Create
  `~/.codex/AGENTS.md` if absent (it does not exist on this machine today)
  and append exactly:

  ```markdown
  ## Diagram artifacts for plans

  When the `diagram-plans` skill (diagrams plugin) is installed and the task
  is a plan, brainstorm, design comparison, or roadmap — or any skill has
  just written a plan/spec/tickets markdown file — follow that skill: render
  the answer/document as its Geist-styled Mermaid HTML page and open it in
  the browser, instead of a long prose reply. Explicit requests for prose
  override this.
  ```

  Then re-run the smoke test above and confirm the diagram file appears.
  Note in the README's Enforcement section that Codex enforcement rides on
  `~/.codex/AGENTS.md` (not plugin-gated — remove the snippet if the plugin
  is uninstalled). Report which branch you landed on.

## Test plan

- The seven stdin cases in Step 1 are the hook's test. They are cheap enough
  to run by hand; a committed test harness for hooks arrives with plugin
  plan 008's corpus runner (`test/test-nudge.sh`) — when that lands, fold
  these cases in there. Do not build a parallel harness now.
- `bun run test` (plugin `tools/check.sh`) is the structural gate: JSON
  validity of the edited `hooks.json`, `bash -n` on the new script.
- Steps 7–8 are the end-to-end tests, one per agent.

## Done criteria

ALL must hold:

- [ ] All seven Step-1 stdin cases behave as specified (fire ×2, quiet ×5, always exit 0)
- [ ] `cd plugins/diagrams && bun run test` → `all checks passed`, exit 0
- [ ] `bash plugins/diagrams/tools/check-version-sync.sh` (from `plugins/diagrams`) → `version in sync: 0.4.0`
- [ ] `git diff f17627f..HEAD -- plugins/diagrams/hooks/nudge.sh` → empty (008's file untouched)
- [ ] `grep -c "## Enforcement" plugins/diagrams/README.md` → `1`; Codex install commands present
- [ ] SKILL.md: new rule + opener fallback present; `description:` frontmatter byte-identical to before
- [ ] `codex plugin list` shows `diagrams@second-brain  installed, enabled  0.4.0` and no `claude-diagrams` rows
- [ ] `grep -c caveman ~/.codex/config.toml` unchanged from before Step 6
- [ ] Claude Code `installed_plugins.json` shows `0.4.0`
- [ ] Step 8 ran and its outcome (plugin hooks fire under Codex, or AGENTS.md fallback installed) is recorded in the README and in your report
- [ ] `git status --porcelain` in the repo lists no file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows changes to any in-scope file other than the expected
  possibility of `nudge.sh` (via plan 008).
- `codex plugin marketplace add ~/src/second-brain` errors or the subsequent
  `codex plugin add` cannot see the `diagrams` plugin — the Claude-format
  compatibility assumption would be wrong for marketplace *adding* (it held
  for the old repo, but do not fight the CLI; report the exact error).
- Any `codex plugin …` command reports it modified something other than the
  `claude-diagrams` / `second-brain` marketplace or plugin entries, or the
  caveman grep-count in `~/.codex/config.toml` changes.
- You are executing in an isolated worktree and reach Step 6: machine-level
  steps snapshot from `~/src/second-brain` (main checkout), not your
  worktree. STOP after Step 5, report, and let the operator merge first —
  running Step 6 before the merge installs the *old* 0.3.0 content under a
  0.4.0-less marketplace snapshot.
- The Step-8 smoke test misbehaves in any way beyond "no diagram appeared"
  (e.g. `codex exec` starts editing files in the temp repo unprompted for
  longer than one turn): kill it and report.
- You find yourself wanting to edit `nudge.sh`, any file under
  `~/.claude/skills` / `~/.agents`, or `~/.codex/config.toml` by hand.

## Maintenance notes

- **Future changes that interact**: plugin plan 008 (nudge corpus) — fold
  Step 1's seven cases into its `test/test-nudge.sh` when it lands. The
  deferred site "Artifacts section" and config-UI plugin toggle (plan 009
  README) will read `artifacts/diagrams/`, unaffected here.
- **Reviewer should scrutinize**: that `plan-artifact-nudge.sh` has no path
  by which it exits non-zero; that the `hooks.json` diff is purely additive;
  that the README's Codex commands were actually run (Step 6 verify output
  pasted in the report), not just documented; and Step 8's honest outcome.
- **Deferred deliberately**: a dedup guard so N written plan files in one
  turn nudge N times (harmless, batched by the model anyway); prompt-level
  slash-command triggers (`/to-spec` etc.) in `nudge.sh` — belongs to 008's
  corpus if wanted later; archiving `github.com/jmep17/claude-diagrams`;
  auto-registering the marketplace for other machines (install docs cover
  it); a `codex`-side render smoke test in CI (no headless Codex in CI).
