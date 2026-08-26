# Plan 001: Make installed copies actually receive updates, and ship the opener as a `bin/` executable

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat cd109ef..HEAD -- plugins/diagram-plans .claude-plugin README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `cd109ef`, 2026-08-26

## Why this matters

Every improvement in this repo since its first commit is invisible to the
person who installed the plugin. The plugin version has been `0.1.0` in all
three commits, so Claude Code's plugin cache has nothing to invalidate against
and keeps serving the first commit. The observed effect on this machine: the
installed copy is pinned to `gitCommitSha: cc5b0de` (commit 1 of 3), it has **no
`scripts/` directory at all**, and it still carries the pre-Geist,
artifact-based `MERMAID.md`. So `SKILL.md` step 4 — which runs
`scripts/open-url.sh` — cannot work, and the "Geist-styled page" the README
promises is not what gets rendered.

Until this is fixed, plans 003–008 will ship into the same void. This plan goes
first for that reason.

## Current state

Files involved:

- `plugins/diagram-plans/.claude-plugin/plugin.json` — plugin manifest; holds the version.
- `.claude-plugin/marketplace.json` — marketplace manifest; holds a **second, independent** copy of the version.
- `plugins/diagram-plans/scripts/open-url.sh` — the browser opener, currently in `scripts/`.
- `plugins/diagram-plans/skills/diagram-plans/SKILL.md` — step 4 invokes the opener.
- `README.md` — install/layout docs.

`plugins/diagram-plans/.claude-plugin/plugin.json` today:

```json
{
  "name": "diagram-plans",
  "version": "0.1.0",
  "description": "Plans, brainstorms, and design discussions become a Mermaid mindmap or flowchart artifact saved to a configurable directory.",
  "author": {
    "name": "Jorden Parker"
  },
  "keywords": [
    "diagram",
    "mindmap",
    "mermaid",
    "planning",
    "brainstorm",
    "artifact"
  ]
}
```

`.claude-plugin/marketplace.json` carries `"version": "0.1.0"` for the same
plugin — the two must be kept in lockstep.

`SKILL.md:22` today:

```
4. **Open it in the browser**: run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/open-url.sh" <absolute-file-path>`. On a revision to the same file, the open browser tab just needs a refresh; open again only when the file is new. `DIAGRAM_PLANS_OPEN=0` skips this step.
```

Two facts about `${CLAUDE_PLUGIN_ROOT}`, both verified, that shape the fix:

1. Per the Claude Code plugins reference, the placeholder **is** substituted
   inline in skill content, so `SKILL.md`'s use of it is legitimate. It is
   _not_ exported into the Bash tool's process environment (`echo
"$CLAUDE_PLUGIN_ROOT"` in a Bash tool call prints empty), so it only works
   in the substituted-placeholder position.
2. The same reference documents a `bin/` directory whose contents are "added to
   the Bash tool's `PATH` and invokable as bare commands while the plugin is
   enabled". On this machine `PATH` already contains
   `/home/jorden/src/claude-diagrams/plugins/diagram-plans/bin` even though that
   directory does not exist — Claude Code adds it unconditionally.

`bin/` is the more robust of the two mechanisms: it survives placeholder
substitution changing, needs no quoting, and produces a shorter instruction the
model is less likely to mangle. Use it, and keep a `${CLAUDE_PLUGIN_ROOT}`
fallback in the skill text for hosts that do not wire up `PATH`.

Repo conventions to match: shell scripts are `#!/usr/bin/env bash` with
`set -euo pipefail` and a two-line `#` header comment explaining purpose and
usage (see `plugins/diagram-plans/scripts/open-url.sh:1-4` and
`plugins/diagram-plans/hooks/nudge.sh:1-4`). Commit messages follow
`diagram-plans: <lowercase imperative summary>` — see `git log --oneline`.

## Commands you will need

| Purpose          | Command                                                | Expected on success |
| ---------------- | ------------------------------------------------------ | ------------------- |
| JSON validity    | `python3 -m json.tool <file> > /dev/null`              | exit 0              |
| Version lockstep | `bash tools/check-version-sync.sh` (created in step 3) | exit 0              |
| Executable bit   | `test -x plugins/diagram-plans/bin/diagram-open`       | exit 0              |
| Shell syntax     | `bash -n <script>`                                     | exit 0              |

This repo has no package manager, test runner, or CI. Plan 002 adds them; do
not wait for it.

## Scope

**In scope** (the only files you should modify or create):

- `plugins/diagram-plans/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `plugins/diagram-plans/bin/diagram-open` (create; moved from `scripts/open-url.sh`)
- `plugins/diagram-plans/scripts/open-url.sh` (delete)
- `plugins/diagram-plans/skills/diagram-plans/SKILL.md` (step 4 line only)
- `README.md` (install, layout, and a new "Updating" section)
- `tools/check-version-sync.sh` (create)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch, even though they look related):

- `plugins/diagram-plans/skills/diagram-plans/MERMAID.md` — plans 003, 004 and
  005 rewrite it. Editing it here guarantees a conflict.
- `plugins/diagram-plans/hooks/nudge.sh` and `hooks/hooks.json` — plan 008.
- Any other line of `SKILL.md` — plans 005, 006 and 007 own the rest of it.
- The user's installed plugin cache under `~/.claude/plugins/` — never write
  there. It is regenerated by Claude Code.

## Git workflow

- Branch: `advisor/001-fix-distribution`
- One commit per step is fine; message style `diagram-plans: <imperative>`,
  matching `git log` (e.g. `diagram-plans: ship opener as a bin/ executable`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Move the opener to `bin/` and rename it

`git mv plugins/diagram-plans/scripts/open-url.sh plugins/diagram-plans/bin/diagram-open`
(create the `bin/` directory first if `git mv` complains).

Then edit the file's header comment — and **only** the header comment — to
match the new name and invocation:

```bash
#!/usr/bin/env bash
# Open a URL or local HTML file in the user's default browser. Works on WSL, Linux, and macOS.
# On PATH as `diagram-open` while the diagram-plans plugin is enabled.
# Usage: diagram-open <url-or-file>
set -euo pipefail
url="${1:?usage: diagram-open <url-or-file>}"
```

Leave the rest of the script byte-for-byte unchanged — the WSL/`wslview`/
`xdg-open`/`open` cascade and the `DIAGRAM_PLANS_OPEN=0` early exit are correct
and already handle the platforms this repo targets.

Ensure the executable bit is set: `chmod +x plugins/diagram-plans/bin/diagram-open`.

**Verify**:

- `bash -n plugins/diagram-plans/bin/diagram-open` → exit 0
- `test -x plugins/diagram-plans/bin/diagram-open` → exit 0
- `git ls-files -s plugins/diagram-plans/bin/diagram-open` → mode `100755`
- `test ! -e plugins/diagram-plans/scripts/open-url.sh` → exit 0
- `DIAGRAM_PLANS_OPEN=0 ./plugins/diagram-plans/bin/diagram-open /tmp/nonexistent.html` → prints `DIAGRAM_PLANS_OPEN=0; not opening /tmp/nonexistent.html`, exit 0

### Step 2: Update `SKILL.md` step 4 to call the bare command

Replace the single line at `SKILL.md:22` with:

```
4. **Open it in the browser**: run `diagram-open <absolute-file-path>` (the plugin puts it on `PATH`; if the command is not found, fall back to `bash "${CLAUDE_PLUGIN_ROOT}/bin/diagram-open" <absolute-file-path>`). On a revision to the same file, the open browser tab just needs a refresh; open again only when the file is new. `DIAGRAM_PLANS_OPEN=0` skips this step.
```

Change nothing else in `SKILL.md`.

**Verify**:

- `grep -c 'scripts/open-url.sh' plugins/diagram-plans/skills/diagram-plans/SKILL.md` → `0`
- `grep -c 'diagram-open' plugins/diagram-plans/skills/diagram-plans/SKILL.md` → `2`
- `git diff --numstat -- plugins/diagram-plans/skills/diagram-plans/SKILL.md` → exactly `1	1	...` (one line added, one removed)

### Step 3: Add a version-sync guard

Create `tools/check-version-sync.sh`:

```bash
#!/usr/bin/env bash
# Fail if the plugin manifest and the marketplace entry disagree on the version.
# Claude Code keys its plugin cache on this version; a mismatch or a stale value
# means installed copies silently never update.
set -euo pipefail

plugin_v="$(python3 -c 'import json;print(json.load(open("plugins/diagram-plans/.claude-plugin/plugin.json"))["version"])')"
market_v="$(python3 -c 'import json;d=json.load(open(".claude-plugin/marketplace.json"));print([p for p in d["plugins"] if p["name"]=="diagram-plans"][0]["version"])')"

if [ "$plugin_v" != "$market_v" ]; then
  echo "version mismatch: plugin.json=$plugin_v marketplace.json=$market_v" >&2
  exit 1
fi
echo "version in sync: $plugin_v"
```

`chmod +x tools/check-version-sync.sh`.

**Verify**: `bash tools/check-version-sync.sh` → prints
`version in sync: 0.1.0`, exit 0.

### Step 4: Bump the version in both manifests

Set the version to `0.2.0` in **both**
`plugins/diagram-plans/.claude-plugin/plugin.json` and the `diagram-plans` entry
of `.claude-plugin/marketplace.json`.

`0.2.0` rather than `0.1.1`: the plugin's file layout changes (`scripts/` →
`bin/`) and the skill's invocation contract changes with it.

While in `plugin.json`, also drop `"mindmap"` from `keywords` and add
`"geist"` and `"flowchart"` — plan 005 removes mindmap support, and the
keywords are user-visible in plugin search. Leave `description` alone; plan 006
rewrites it alongside the skill's own description so they stay consistent.

**Verify**:

- `python3 -m json.tool plugins/diagram-plans/.claude-plugin/plugin.json > /dev/null` → exit 0
- `python3 -m json.tool .claude-plugin/marketplace.json > /dev/null` → exit 0
- `bash tools/check-version-sync.sh` → prints `version in sync: 0.2.0`
- `grep -c mindmap plugins/diagram-plans/.claude-plugin/plugin.json` → `0`

### Step 5: Document installing, updating, and the new layout

In `README.md`:

1. In the `### Layout` code block, replace `scripts/open-url.sh` with
   `bin/diagram-open`.
2. Add a `### Updating` section immediately after `### Install`:

```markdown
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
```

**Verify**:

- `grep -c 'scripts/open-url.sh' README.md` → `0`
- `grep -c 'bin/diagram-open' README.md` → `1`
- `grep -c '### Updating' README.md` → `1`

### Step 6: Confirm the fix end to end on this machine

Re-run the marketplace update and the plugin update, then confirm the installed
copy now contains `bin/diagram-open`:

```
find "$HOME/.claude/plugins/cache/claude-diagrams/diagram-plans" -name diagram-open
```

**Verify**: the `find` prints a path under a `0.2.0` directory. If it does not,
this is a STOP condition — report exactly what
`~/.claude/plugins/installed_plugins.json` contains.

Note: `/plugin` commands are interactive Claude Code commands, not shell
commands. If you cannot run them from your environment, say so in your report
and leave step 6 unverified rather than faking it — steps 1–5 still stand on
their own.

## Test plan

This repo has no test suite yet (plan 002 adds one). For this plan the tests are
the verification commands above, plus one behavioral check:

- `DIAGRAM_PLANS_OPEN=0 ./plugins/diagram-plans/bin/diagram-open /tmp/x.html`
  exits 0 and prints the "not opening" message — proves the move did not break
  the early-exit path.
- `bash tools/check-version-sync.sh` exits 0 — proves the guard works
  against the real manifests.

When plan 002 lands, both become CI steps. Do not write a test framework here.

## Done criteria

ALL must hold:

- [ ] `test -x plugins/diagram-plans/bin/diagram-open` exits 0 and `git ls-files -s` reports mode `100755`
- [ ] `test ! -e plugins/diagram-plans/scripts/open-url.sh` exits 0
- [ ] `bash -n plugins/diagram-plans/bin/diagram-open` exits 0
- [ ] `bash tools/check-version-sync.sh` prints `version in sync: 0.2.0`
- [ ] `python3 -m json.tool` exits 0 for both manifests
- [ ] `grep -rc 'scripts/open-url.sh' README.md plugins/` returns 0 matches in every file
- [ ] `grep -c '### Updating' README.md` returns `1`
- [ ] `git status --porcelain` lists no file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `plugins/diagram-plans/scripts/open-url.sh` does not match the excerpt in
  "Current state" — someone edited it after this plan was written.
- The version in either manifest is not `0.1.0` when you start — another plan
  or commit already bumped it; reconcile before proceeding rather than
  overwriting.
- Step 6's `find` returns nothing after a successful `/plugin update`. That
  means `bin/` is not being packaged the way the reference documents, and the
  skill must keep using `${CLAUDE_PLUGIN_ROOT}/bin/diagram-open` as the primary
  form. Report it; do not revert the move.
- You discover the assumption "Claude Code adds `<plugin>/bin` to the Bash
  tool's `PATH`" is false on this host.

## Maintenance notes

- The version now has to be bumped in two places on every plugin change. The
  guard script catches drift but nothing forces you to run it until plan 002
  wires it into CI — that dependency is deliberate, and 002 should land soon
  after this.
- The Claude Code plugins reference notes that a top-level `bin/` directory
  cannot be included in plugins distributed through claude.ai organization
  settings. This repo is a local/git marketplace, so that restriction does not
  apply today. If distribution ever changes, the `${CLAUDE_PLUGIN_ROOT}`
  fallback left in `SKILL.md` step 4 becomes the primary path.
- Reviewer should scrutinize: that the `git mv` preserved the executable bit
  (a plain copy loses it), and that only one line of `SKILL.md` changed.
- Deferred out of this plan: rewriting the plugin `description` (plan 006 owns
  it) and adding CI (plan 002).
