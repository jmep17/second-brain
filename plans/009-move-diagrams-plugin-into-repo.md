# Plan 009: Move claude-diagrams into this repo as `plugins/diagrams`, with second-brain as the marketplace and `artifacts/diagrams/` as the output dir

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**, from the repo root:
>
> ```
> git diff --stat 00ddd4a..HEAD -- .claude-plugin plugins artifacts .gitignore .prettierignore .husky/pre-commit wiki/claude-diagrams-plugin.md wiki/index.md
> git -C ~/src/claude-diagrams log --oneline -1
> ```
>
> Expected: the first command prints nothing (none of these paths exist or
> changed since `00ddd4a`); the second prints `ea3e98b Point the install at
jmep17/claude-diagrams`. Anything else is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (a rename of a plugin, its marketplace, and its env vars; the
  installed copy in `~/.claude/plugins` must be re-pointed by the owner
  afterwards or the old one keeps running)
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `00ddd4a`, 2026-08-26

## Why this matters

The `diagram-plans` Claude Code plugin lives in a separate repo,
`~/src/claude-diagrams` (GitHub `jmep17/claude-diagrams`). The owner wants
every generated artifact — diagrams today, rendered plans and other page types
next — stored in second-brain, listed on the second-brain site, and switchable
from its config UI. Two repos means the plugin and the site that displays its
output drift apart, and the config UI cannot toggle something it does not
contain.

After this plan: the plugin's full git history is inside this repo at
`plugins/diagrams/`; second-brain itself is the Claude Code marketplace
(`.claude-plugin/marketplace.json` at the root, name `second-brain`); the
plugin is named `diagrams` (install: `diagrams@second-brain`); it writes to
`artifacts/diagrams/` by default; its env vars are `DIAGRAMS_DIR` and
`DIAGRAMS_OPEN`. The layout is deliberately one-folder-per-artifact-type so
later plugins (`plugins/plans/`, `plugins/ask/`) and output dirs
(`artifacts/plans/`) slot in beside it. Nothing about the site or the config
UI changes in this plan — those are follow-ups.

**Decisions already made — do not re-litigate:**

- `git subtree add` (history preserved, no submodule). The owner chose this
  over a submodule explicitly.
- Marketplace name `second-brain`; plugin name `diagrams`; the _skill_ keeps
  its name `diagram-plans` (it describes what the skill does; the plugin name
  describes the artifact type). Skill invocation becomes
  `diagrams:diagram-plans`.
- Output dir `artifacts/diagrams/` (repo-relative), tracked in git. Env vars
  renamed to `DIAGRAMS_DIR` / `DIAGRAMS_OPEN`. The old names are not kept as
  fallbacks.
- Version bumps to `0.3.0` — Claude Code keys its plugin cache on this value;
  without a bump an existing install never picks up changes.
- The source repo `~/src/claude-diagrams` is left untouched. Archiving or
  deleting it on GitHub is the owner's manual follow-up, not part of this plan.

## Current state

Every fact below was verified at commit `00ddd4a` on 2026-08-26.

### The source repo `~/src/claude-diagrams` (HEAD `ea3e98b`, 8 commits)

```
.claude-plugin/marketplace.json          name "claude-diagrams"; one plugin entry, version 0.2.0
plugins/diagram-plans/
  .claude-plugin/plugin.json             name "diagram-plans", version 0.2.0
  hooks/hooks.json                       UserPromptSubmit → bash "${CLAUDE_PLUGIN_ROOT}/hooks/nudge.sh"
  hooks/nudge.sh                         regex on the prompt; reads DIAGRAM_PLANS_DIR (default .claude/diagrams)
  bin/diagram-open                       browser opener; reads DIAGRAM_PLANS_OPEN (default 1); must stay executable
  skills/diagram-plans/SKILL.md          references $DIAGRAM_PLANS_DIR, DIAGRAM_PLANS_OPEN, ${CLAUDE_PLUGIN_ROOT}/bin/diagram-open
  skills/diagram-plans/MERMAID.md        HTML template; large; listed in .prettierignore on purpose
tools/check.sh                           json validity + bash -n + executable bit; hardcodes plugins/diagram-plans/... paths
tools/check-version-sync.sh              compares plugin.json version with the marketplace entry named "diagram-plans"
plans/000..008-*.md, plans/README.md     the plugin's own improvement plans (its own numbering, unrelated to ours)
package.json, bun.lock                   devDeps husky, lint-staged, prettier; "prepare": "husky"; "test": "bash tools/check.sh"
.husky/pre-commit                        bunx lint-staged + bun run test
.lintstagedrc, .prettierrc, .prettierignore, .gitignore (contains ".claude/diagrams/")
README.md                                install/usage docs, all under the old names
```

**The working tree of the source repo is dirty**: `package.json` and
`bun.lock` add `playwright ^1.62.1`, and `test/` (`make-fixture.mjs`,
`fixtures/sample-plan.html`) is untracked. `git subtree add` only imports
_commits_, so this work would be silently left behind. See STOP condition 1.

Key excerpts (source repo, at `ea3e98b`):

`plugins/diagram-plans/hooks/nudge.sh:14-16`

```bash
if printf '%s' "$prompt" | grep -qiE "$pattern"; then
  dir="${DIAGRAM_PLANS_DIR:-.claude/diagrams}"
  echo "diagram-plans: this prompt is a plan/brainstorm/design request. Answer with a diagram artifact, not paragraphs — invoke the diagram-plans skill. Save dir: ${dir}."
```

`plugins/diagram-plans/bin/diagram-open:16-19`

```bash
if [ "${DIAGRAM_PLANS_OPEN:-1}" = "0" ]; then
  echo "DIAGRAM_PLANS_OPEN=0; not opening $url"
  exit 0
fi
```

`plugins/diagram-plans/skills/diagram-plans/SKILL.md:18` and `:22`

```
   - directory: `$DIAGRAM_PLANS_DIR` if set (absolute, or relative to the project root), else `.claude/diagrams/`. Create it if missing.
...
4. **Open it in the browser**: run `diagram-open <absolute-file-path>` (the plugin puts it on `PATH`; if the command is not found, fall back to `bash "${CLAUDE_PLUGIN_ROOT}/bin/diagram-open" <absolute-file-path>`). On a revision to the same file, the open browser tab just needs a refresh; open again only when the file is new. `DIAGRAM_PLANS_OPEN=0` skips this step.
```

`tools/check-version-sync.sh:7-8`

```bash
plugin_v="$(python3 -c 'import json;print(json.load(open("plugins/diagram-plans/.claude-plugin/plugin.json"))["version"])')"
market_v="$(python3 -c 'import json;d=json.load(open(".claude-plugin/marketplace.json"));print([p for p in d["plugins"] if p["name"]=="diagram-plans"][0]["version"])')"
```

`test/make-fixture.mjs:8` (untracked)

```js
const TEMPLATE = "plugins/diagram-plans/skills/diagram-plans/MERMAID.md";
```

### This repo (second-brain, `00ddd4a`)

- No `.claude-plugin/`, no `plugins/`, no `artifacts/` directory exists.
- `.claude/diagrams/` holds one untracked file,
  `2026-08-26-claude-diagrams-into-second-brain.html`, written by the plugin
  under its current default dir. It moves to `artifacts/diagrams/`.
- `.gitignore` (9 lines) does not mention `.claude/diagrams` or `artifacts`.
- `.husky/pre-commit` is exactly one line: `bunx lint-staged`.
  `.lintstagedrc`: `{ "*": "prettier --ignore-unknown --write" }`.
  `.prettierrc` exists (2-space, double quotes, printWidth 80).
- `package.json`: devDeps husky, lint-staged, prettier; `"prepare": "husky"`.
  No `test` script.
- `site/lib/source.ts:20-27` publishes only `wiki/**`, `raw/**`,
  `plans/**/*.md`, `docs/**/*.md` and a few root files. `plugins/**` and
  `artifacts/**` are **not** included, so the subtree's README and plans do
  not become site pages. Leave that as is.
- `wiki/claude-diagrams-plugin.md` (entity page, `updated: 2026-08-26`)
  documents the plugin under its old name and paths; `wiki/index.md:20`
  lists it. Both must be updated (CLAUDE.md: "Keep `index.md` complete").
- `log.md` entries look like `## [2026-08-26] maintenance | <title>` followed
  by bullets. Append, never rewrite.
- The installed plugin on this machine is
  `diagram-plans@claude-diagrams` v0.2.0, cached at
  `~/.claude/plugins/cache/claude-diagrams/diagram-plans/0.2.0`
  (`~/.claude/plugins/installed_plugins.json`). Re-pointing it is the
  owner's step (Step 10) — do not edit files under `~/.claude/plugins`.

### Conventions to match

- Commit messages: short, area-prefixed, imperative, e.g.
  `maintenance: document claude-diagrams plugin`,
  `feat(site): sidebar on every page; config joins the page tree`.
- Shell scripts start with `#!/usr/bin/env bash` and `set -euo pipefail`.
- Wiki pages carry YAML frontmatter with `updated:`; bump it when editing.

## Commands you will need

| Purpose            | Command (from repo root)                                                                                             | Expected on success                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Source repo clean? | `git -C ~/src/claude-diagrams status --porcelain`                                                                    | empty output                                 |
| Plugin self-check  | `bash plugins/diagrams/tools/check.sh`                                                                               | last line `all checks passed`, exit 0        |
| Old names gone     | `grep -rn "DIAGRAM_PLANS\|diagram-plans@\|claude-diagrams" plugins .claude-plugin .husky .gitignore .prettierignore` | no output                                    |
| Formatting         | `bunx prettier --check plugins .claude-plugin`                                                                       | `All matched files use Prettier code style!` |
| JSON validity      | `python3 -m json.tool .claude-plugin/marketplace.json`                                                               | pretty JSON, exit 0                          |
| Hook smoke test    | see Step 6                                                                                                           | one nudge line naming `artifacts/diagrams`   |

## Scope

**In scope** (the only paths you create or modify):

- `.claude-plugin/marketplace.json` (create)
- `plugins/diagrams/**` (create via subtree, then edit)
- `artifacts/diagrams/` (create; move one file into it)
- `.gitignore`, `.prettierignore`, `.husky/pre-commit`
- `wiki/claude-diagrams-plugin.md`, `wiki/index.md`, `log.md` (append only)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- Anything under `~/src/claude-diagrams` — read it, subtree it, never edit or
  commit there. If it is dirty, STOP (condition 1).
- Anything under `~/.claude/` — the installed-plugin cache and settings are
  the owner's; Step 10 hands them instructions.
- `site/**` — listing `artifacts/` on the site and the config-UI toggle are
  separate future plans.
- `dotfiles/**` — the chezmoi-managed settings will carry `DIAGRAMS_DIR` in a
  later plan; nothing here yet.
- `plugins/diagrams/skills/diagram-plans/MERMAID.md` beyond the two literal
  string replacements in Step 5 — do not reformat or restructure it.
- The plugin's own `plans/` (moved to `plugins/diagrams/plans/`): historical
  record, leave the contents as they are.

## Git workflow

- Branch: `advisor/009-diagrams-plugin-subtree`, created from `main`.
- `git subtree add` produces a merge commit; that is expected and desired.
- Commit per step as marked below, messages in the repo's `area: imperative`
  style. Do NOT push or open a PR.

## Steps

### Step 0: Preconditions

```
git -C ~/src/claude-diagrams status --porcelain
git status --porcelain
```

**Verify**: first prints nothing. If it prints anything → STOP condition 1.
The second may show pre-existing untracked wiki files and `M log.md`; that is
fine, but do not stage them in this plan's commits. Then:

```
git checkout -b advisor/009-diagrams-plugin-subtree main
```

### Step 1: Import the repo with history

```
git subtree add --prefix=plugins/diagrams ~/src/claude-diagrams main --squash=false 2>/dev/null \
  || git subtree add --prefix=plugins/diagrams ~/src/claude-diagrams main
```

(Some git versions reject `--squash=false`; the fallback is the same command
without it — non-squash is the default.)

**Verify**: `git log --oneline -1` shows
`Add 'plugins/diagrams/' from commit 'ea3e98b...'`;
`ls plugins/diagrams` lists `.claude-plugin plugins tools plans README.md package.json ...`;
`git log --oneline -- plugins/diagrams | wc -l` ≥ 8 (history came along).

### Step 2: Flatten the plugin to `plugins/diagrams/` and drop the nested marketplace

The subtree contains a marketplace wrapper around one plugin. The plugin
itself moves up one level; the wrapper's marketplace file becomes the root one.

```
git mv plugins/diagrams/plugins/diagram-plans/.claude-plugin plugins/diagrams/.claude-plugin.tmp
git mv plugins/diagrams/.claude-plugin/marketplace.json .claude-plugin/marketplace.json   # mkdir -p .claude-plugin first
git rm -r --quiet plugins/diagrams/.claude-plugin
git mv plugins/diagrams/.claude-plugin.tmp plugins/diagrams/.claude-plugin
git mv plugins/diagrams/plugins/diagram-plans/hooks  plugins/diagrams/hooks
git mv plugins/diagrams/plugins/diagram-plans/bin    plugins/diagrams/bin
git mv plugins/diagrams/plugins/diagram-plans/skills plugins/diagrams/skills
git rm -r --quiet plugins/diagrams/plugins
```

Target layout:

```
.claude-plugin/marketplace.json
plugins/diagrams/
  .claude-plugin/plugin.json
  hooks/hooks.json  hooks/nudge.sh
  bin/diagram-open
  skills/diagram-plans/SKILL.md  MERMAID.md
  tools/check.sh  tools/check-version-sync.sh
  test/  plans/  README.md  package.json  bun.lock  .prettierrc  .prettierignore  .gitignore
```

**Verify**: `test -x plugins/diagrams/bin/diagram-open && echo ok` → `ok`
(git mv preserves the mode bit; if not, `chmod +x` it);
`ls plugins/diagrams/plugins 2>&1` → `No such file or directory`.

### Step 3: Rewrite the two manifests

`.claude-plugin/marketplace.json` — replace the whole file with:

```json
{
  "name": "second-brain",
  "owner": {
    "name": "Jorden Parker"
  },
  "metadata": {
    "description": "Claude Code plugins that produce artifacts stored in the second-brain repo — one plugin per artifact type."
  },
  "plugins": [
    {
      "name": "diagrams",
      "source": "./plugins/diagrams",
      "description": "Plans, brainstorms, and design discussions become a Mermaid diagram in a Geist-styled HTML page saved under artifacts/diagrams/ and opened in the browser.",
      "version": "0.3.0",
      "category": "productivity"
    }
  ]
}
```

`plugins/diagrams/.claude-plugin/plugin.json` — change only `name` to
`"diagrams"`, `version` to `"0.3.0"`, and `description` to the same sentence
as the marketplace entry. Keep `author` and `keywords`.

**Verify**: `python3 -m json.tool .claude-plugin/marketplace.json >/dev/null && python3 -m json.tool plugins/diagrams/.claude-plugin/plugin.json >/dev/null && echo ok` → `ok`.

### Step 4: Remove the subtree's own git-hook tooling; wire its check into ours

The imported `package.json` has `"prepare": "husky"`, which fails outside a
repo root, and the root `.husky/pre-commit` already runs lint-staged.

- `git rm -r --quiet plugins/diagrams/.husky plugins/diagrams/.lintstagedrc plugins/diagrams/.gitignore`
- In `plugins/diagrams/package.json`: delete the `"prepare"` script and the
  `husky` and `lint-staged` devDependencies. Keep `prettier`, `playwright`,
  and the `test` / `format` scripts. Do not run `bun install` (the lockfile
  will be regenerated by whoever next installs; leave `bun.lock` as is).
- `plugins/diagrams/.gitignore` contained `.claude/diagrams/`, `.DS_Store`,
  `node_modules/`. The root `.gitignore` already covers `.DS_Store` and
  `node_modules/`; add this line to the **root** `.gitignore`:
  `plugins/*/node_modules/`.
- Append the contents of `plugins/diagrams/.prettierignore` (minus its
  `node_modules` line, already covered) to the **root** `.prettierignore`,
  with the path rewritten to `plugins/diagrams/skills/diagram-plans/MERMAID.md`.
  Then `git rm --quiet plugins/diagrams/.prettierignore plugins/diagrams/.prettierrc`
  (the root `.prettierrc` is the same style).
- Replace `.husky/pre-commit` with:

  ```
  bunx lint-staged
  bash plugins/diagrams/tools/check.sh
  ```

**Verify**: `grep -c "prepare\|husky\|lint-staged" plugins/diagrams/package.json` → `0`;
`grep -n "MERMAID.md" .prettierignore` → one line;
`grep -n "plugins/\*/node_modules" .gitignore` → one line.

### Step 5: Rename every identifier — env vars, plugin name, paths, default dir

Apply exactly these replacements; then grep proves nothing was missed.

| File                                               | Replace                                                                            | With                                            |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| `plugins/diagrams/hooks/nudge.sh`                  | `${DIAGRAM_PLANS_DIR:-.claude/diagrams}`                                           | `${DIAGRAMS_DIR:-artifacts/diagrams}`           |
| `plugins/diagrams/bin/diagram-open`                | `DIAGRAM_PLANS_OPEN` (2 occurrences)                                               | `DIAGRAMS_OPEN`                                 |
| `plugins/diagrams/bin/diagram-open`                | `while the diagram-plans plugin is enabled`                                        | `while the diagrams plugin is enabled`          |
| `plugins/diagrams/skills/diagram-plans/SKILL.md`   | `` `$DIAGRAM_PLANS_DIR` ``                                                         | `` `$DIAGRAMS_DIR` ``                           |
| same                                               | `` else `.claude/diagrams/` ``                                                     | `` else `artifacts/diagrams/` ``                |
| same                                               | `DIAGRAM_PLANS_OPEN=0`                                                             | `DIAGRAMS_OPEN=0`                               |
| `plugins/diagrams/skills/diagram-plans/MERMAID.md` | any literal `DIAGRAM_PLANS_` or `.claude/diagrams` (grep first; there may be none) | `DIAGRAMS_` / `artifacts/diagrams`              |
| `plugins/diagrams/tools/check.sh`                  | `plugins/diagram-plans/.claude-plugin/plugin.json`                                 | `.claude-plugin/plugin.json`                    |
| same                                               | `.claude-plugin/marketplace.json` (the marketplace line in the `for f in` list)    | `../../.claude-plugin/marketplace.json`         |
| same                                               | `plugins/diagram-plans/hooks/hooks.json`                                           | `hooks/hooks.json`                              |
| same                                               | `git ls-files '*.sh' plugins/diagram-plans/bin/`                                   | `git ls-files '*.sh' bin/`                      |
| same                                               | `plugins/diagram-plans/bin/diagram-open`                                           | `bin/diagram-open`                              |
| `plugins/diagrams/tools/check-version-sync.sh`     | `plugins/diagram-plans/.claude-plugin/plugin.json`                                 | `.claude-plugin/plugin.json`                    |
| same                                               | `open(".claude-plugin/marketplace.json")`                                          | `open("../../.claude-plugin/marketplace.json")` |
| same                                               | `p["name"]=="diagram-plans"`                                                       | `p["name"]=="diagrams"`                         |
| `plugins/diagrams/test/make-fixture.mjs`           | `plugins/diagram-plans/skills/diagram-plans/MERMAID.md`                            | `skills/diagram-plans/MERMAID.md`               |

`tools/check.sh` does `cd "$(dirname "$0")/.."` so its cwd is
`plugins/diagrams/`; the `../../` prefixes reach the repo root from there.
`check.sh` also relies on `git ls-files` — that works inside a subdirectory
of the repo.

Nudge text: change `invoke the diagram-plans skill` to
`invoke the diagrams:diagram-plans skill` in `nudge.sh`.

Then rewrite `plugins/diagrams/README.md` (short, ~40 lines is fine) so it
describes: the plugin as part of the second-brain marketplace; install via
`/plugin marketplace add ~/src/second-brain` then
`/plugin install diagrams@second-brain`; update via
`/plugin marketplace update second-brain` + `/plugin update diagrams@second-brain`;
the env vars `DIAGRAMS_DIR` (default `artifacts/diagrams`) and
`DIAGRAMS_OPEN` (default `1`); the version-bump rule (both
`plugins/diagrams/.claude-plugin/plugin.json` and the root
`.claude-plugin/marketplace.json`, guarded by `tools/check-version-sync.sh`);
and the new layout tree from Step 2.

**Verify**:
`grep -rn "DIAGRAM_PLANS\|diagram-plans@\|claude-diagrams\|plugins/diagram-plans\|\.claude/diagrams" plugins .claude-plugin .husky .gitignore .prettierignore` → no output.
(`plugins/diagrams/plans/*.md` are historical and are excluded from this grep
by being allowed to match — if they are the _only_ hits, that is a pass; add
`--exclude-dir=plans` to confirm.)
`bash plugins/diagrams/tools/check.sh` → ends `all checks passed`.
`bunx prettier --write plugins .claude-plugin .husky && bunx prettier --check plugins .claude-plugin` → passes.

**Commit** (Steps 1–5): `plugins: move claude-diagrams into plugins/diagrams; second-brain is the marketplace`

### Step 6: Smoke-test the hook and opener from the new location

```
printf '{"prompt":"brainstorm options for the sidebar"}' | DIAGRAMS_DIR= bash plugins/diagrams/hooks/nudge.sh
printf '{"prompt":"what time is it"}' | bash plugins/diagrams/hooks/nudge.sh
DIAGRAMS_OPEN=0 plugins/diagrams/bin/diagram-open plugins/diagrams/README.md
```

**Verify**: line 1 prints one line containing `diagrams:diagram-plans` and
`Save dir: artifacts/diagrams.`; line 2 prints nothing; line 3 prints
`DIAGRAMS_OPEN=0; not opening /home/.../plugins/diagrams/README.md`.

### Step 7: Create `artifacts/diagrams/` and move the existing page

```
mkdir -p artifacts/diagrams
git mv -k .claude/diagrams/2026-08-26-claude-diagrams-into-second-brain.html artifacts/diagrams/ 2>/dev/null \
  || mv .claude/diagrams/2026-08-26-claude-diagrams-into-second-brain.html artifacts/diagrams/
rmdir .claude/diagrams 2>/dev/null || true
git add artifacts/diagrams
```

Also write `artifacts/README.md` (≤ 15 lines): one folder per artifact type;
`diagrams/` is written by the `diagrams` plugin (`DIAGRAMS_DIR`); files are
tracked in git and are the input for the site's future Artifacts section.

**Verify**: `ls artifacts/diagrams` → the one `.html` file;
`git status --porcelain .claude/diagrams` → nothing.

**Commit**: `artifacts: add artifacts/diagrams and move the first diagram page there`

### Step 8: Update the wiki entity page and the index

`wiki/claude-diagrams-plugin.md`: keep the filename (other pages link
`[[claude-diagrams-plugin]]`; CLAUDE.md prefers redirect notes over renames).
Edit: set `updated: 2026-08-26` is already today — leave it; change `title:`
to `diagrams plugin (formerly claude-diagrams)`; add a new top section
**"Moved into second-brain (2026-08-26, v0.3.0)"** stating the new location
`plugins/diagrams/`, marketplace `second-brain`, plugin name `diagrams`, env
vars `DIAGRAMS_DIR` / `DIAGRAMS_OPEN`, default dir `artifacts/diagrams/`,
install commands, and that `~/src/claude-diagrams` / `jmep17/claude-diagrams`
is now frozen history. Do not delete the existing v0.2.0 content — prefix the
old "Configuration", "Install", and "Layout" sections with one italic line:
_Superseded 2026-08-26 by the move into second-brain; see the top section._

`wiki/index.md:20`: rewrite the summary to lead with the new name, e.g.
`- [[claude-diagrams-plugin]] — the \`diagrams\` Claude Code plugin (formerly claude-diagrams), now vendored at \`plugins/diagrams\` with second-brain as its marketplace; writes Mermaid/Geist HTML pages to \`artifacts/diagrams/\`; v0.3.0.`

**Verify**: `grep -c "DIAGRAMS_DIR" wiki/claude-diagrams-plugin.md` ≥ 1;
`grep -c "claude-diagrams-plugin" wiki/index.md` → `1`.

### Step 9: Log entry, index row, commit

Append to `log.md`:

```
## [2026-08-26] maintenance | Plan 009 — claude-diagrams moved into plugins/diagrams

- git subtree of ~/src/claude-diagrams (ea3e98b) into plugins/diagrams with history; flattened; marketplace is now the repo root (.claude-plugin/marketplace.json, name second-brain)
- Plugin renamed diagram-plans → diagrams (v0.3.0); env vars DIAGRAM_PLANS_* → DIAGRAMS_*; default output artifacts/diagrams/
- Updated wiki/claude-diagrams-plugin.md, wiki/index.md; root pre-commit now runs plugins/diagrams/tools/check.sh
- Owner follow-up: re-add the marketplace and reinstall (see plan 009 step 10)
```

Update this plan's row in `plans/README.md` to `DONE`.

**Commit**: `maintenance: log plan 009; wiki page for the diagrams plugin`

### Step 10: Hand-off to the owner (not executable by you)

Report these commands for the owner to run inside Claude Code, in order:

```
/plugin uninstall diagram-plans@claude-diagrams
/plugin marketplace remove claude-diagrams
/plugin marketplace add ~/src/second-brain
/plugin install diagrams@second-brain
/reload-plugins
```

then verify with
`python3 -c 'import json;print(list(json.load(open("/home/jorden/.claude/plugins/installed_plugins.json"))["plugins"]))'`
→ contains `diagrams@second-brain`, and with a plan-shaped prompt, whose
hook line must say `Save dir: artifacts/diagrams.` and whose page must land
in `artifacts/diagrams/`. (`claude plugin --help` shows non-interactive
`enable/disable` subcommands; marketplace add/remove are slash commands.)

## Test plan

No unit-test framework exists in this repo. Verification is the plugin's own
`tools/check.sh` (JSON validity, shell syntax, executable bit, version sync),
the greps above, and the Step 6 smoke test. The fixture builder
`plugins/diagrams/test/make-fixture.mjs` must still run:
`cd plugins/diagrams && node test/make-fixture.mjs /tmp/claude-1000/fixture.html`
→ `PASS  fixture ...`. (It writes only to the given path.)

## Done criteria

ALL must hold, from the repo root on branch `advisor/009-diagrams-plugin-subtree`:

- [ ] `test -f .claude-plugin/marketplace.json && test -f plugins/diagrams/.claude-plugin/plugin.json && test -x plugins/diagrams/bin/diagram-open`
- [ ] `python3 -c 'import json;m=json.load(open(".claude-plugin/marketplace.json"));p=json.load(open("plugins/diagrams/.claude-plugin/plugin.json"));assert m["name"]=="second-brain" and m["plugins"][0]["name"]=="diagrams"=="p["name"] and p["version"]==m["plugins"][0]["version"]=="0.3.0";print("ok")'` → `ok`
- [ ] `bash plugins/diagrams/tools/check.sh` → `all checks passed`
- [ ] `grep -rn --exclude-dir=plans "DIAGRAM_PLANS\|diagram-plans@\|claude-diagrams\|plugins/diagram-plans\|\.claude/diagrams" plugins .claude-plugin .husky .gitignore .prettierignore` → no output
- [ ] `git log --oneline -- plugins/diagrams | grep -c .` ≥ 8
- [ ] `ls artifacts/diagrams/*.html | wc -l` → `1`; `.claude/diagrams` does not exist
- [ ] Step 6 smoke test outputs as specified
- [ ] `bunx prettier --check plugins .claude-plugin wiki/claude-diagrams-plugin.md` passes
- [ ] `git -C ~/src/claude-diagrams status --porcelain` still empty and its HEAD still `ea3e98b` (you did not touch the source repo)
- [ ] `git status --porcelain` shows only the pre-existing untracked wiki files and `M log.md` from before Step 0 — nothing else outside the scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

1. `git -C ~/src/claude-diagrams status --porcelain` is non-empty. The owner
   must first commit (suggested message:
   `test: playwright fixture builder and sample page`) or discard the
   pending `playwright` / `test/` work; subtree would drop it silently.
2. `git subtree` is not available (`git subtree -h` errors) — do not
   substitute a manual copy; history preservation is the point.
3. The source repo HEAD is not `ea3e98b` — the excerpts and replacement table
   may no longer be accurate.
4. After Step 5, the grep still shows a hit outside `plugins/diagrams/plans/`
   that is not in the replacement table — report the file and line rather
   than guessing at a rename.
5. `tools/check.sh` fails after the path rewrites for any reason other than a
   typo you can see in your own diff.
6. Anything requires editing `site/**`, `dotfiles/**`, or `~/.claude/**`.

## Maintenance notes

- **Version bumps**: any change under `plugins/diagrams/` must bump both
  `plugins/diagrams/.claude-plugin/plugin.json` and the root
  `.claude-plugin/marketplace.json`; `tools/check-version-sync.sh` (run from
  the pre-commit hook via `check.sh`) fails the commit otherwise. Without the
  bump the installed copy silently keeps the old version.
- **Adding a plugin** (`plugins/plans/`, `plugins/ask/`): add an entry to the
  root marketplace `plugins` array, and extend `check.sh` /
  `check-version-sync.sh` — they are currently single-plugin scripts. A
  loop over `plugins/*/.claude-plugin/plugin.json` is the natural next shape.
- **Follow-ups deliberately deferred**: an Artifacts section on the site
  reading `artifacts/<type>/`; a `plugins` tool in the config UI
  (`site/lib/config-files.ts` `TOOLS`) toggling `enabledPlugins` and the
  `env` block in the chezmoi-managed Claude settings; `diagram-open`
  preferring `localhost:3000/artifacts/...` when the dev server is up;
  archiving `jmep17/claude-diagrams` on GitHub.
- Reviewer: check the merge commit from `git subtree add` is present (not
  squashed), the executable bit on `bin/diagram-open`, and that no file under
  `plugins/diagrams/plans/` was edited.

## Execution record (reviewer, 2026-08-26)

- Executed on worktree branch `worktree-agent-a37fce8a8b5b966e7`
  (`.claude/worktrees/agent-a37fce8a8b5b966e7`), commits `488ea15` (subtree
  merge), `472b99e`, `4cec53b`, `6d9d30b`. Verdict: **APPROVE**; all done
  criteria re-verified by the reviewer. Merging is the owner's step.
- Pre-execution reconciliation: the source repo's dirty playwright/test work
  was committed (owner-approved) as `42fe966`, which supersedes the `ea3e98b`
  pin everywhere in this plan.
- Step 7 ran as a **copy**, not a move (the untracked HTML in `.claude/diagrams/`
  is invisible to a worktree); the original in the main tree is the owner's
  post-merge cleanup.
- **Criterion correction for future runs**: `git log --oneline -- plugins/diagrams`
  counts 2, not ≥ 8/9 — `git subtree add` (non-squash) merges the original
  commits as a second parent without rewriting their trees under the prefix, so
  a pathspec log cannot see them. The correct check is: the subtree merge
  commit has two parents and `git log --oneline <merge>^2 | wc -l` → 9 with tip
  `42fe966`, and `git diff <merge>^2 42fe966` is empty. Both held.
