# Plan 021: A new machine can install the second-brain Claude Code layer from a runbook and prove it with one script

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- docs tools .claude-plugin/marketplace.json skills-lock.json .husky/pre-commit`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live files before proceeding; on a
> mismatch, treat it as a STOP condition. `docs/install.md` and
> `tools/verify-install.sh` must NOT already exist — if either does, STOP.

## At a glance

- **What**: Write a runbook (`docs/install.md`) and a read-only checker (`tools/verify-install.sh`) that take a fresh machine from `git clone` to a working Claude Code setup.
- **Why**: That knowledge currently lives only in the owner's head and this machine's local `~/.claude` state, so a new machine has no way to reach parity.
- **Next action**: Step 1 — Preflight

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (two new files; nothing existing is modified except the plans index and log)
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

This repo is designed to run on more than one machine (`CONTEXT.md`: a
personal machine that pushes and a work machine that pulls), but today the
knowledge of how to go from `git clone` to a working Claude Code setup lives
only in the owner's head and in this machine's `~/.claude` state.
`.scratch/config-system/map.md` explicitly lists under "Not yet specified":
*"Bootstrap: how a fresh machine goes from zero to fully configured"*. This
plan fills the Claude Code-layer slice of that gap: a runbook
(`docs/install.md`) with the exact, docs-verified commands, and a read-only
checker (`tools/verify-install.sh`) that proves an install is complete. The
wider config-system spec (`.scratch/config-system/issues/08-spec.md`, open)
will later absorb this doc; nothing here pre-empts its decisions.

## Current state

All facts verified on 2026-08-27 at commit `c0ee11c` unless marked otherwise.

### What a `git clone` already brings (tracked in git, loads automatically)

- `CLAUDE.md` / `AGENTS.md` — workflow instructions, loaded on session start.
- `.claude/commands/ingest.md`, `.claude/commands/lint.md` — the `/ingest`
  and `/lint` commands.
- `.claude/skills/` — 21 vendored skill directories; 20 of them are pinned in
  `skills-lock.json` (`"version": 1`, one `computedHash` per skill, source
  `JuliusBrussee/caveman`); `adhd-summarize` is vendored without a lock entry.
- `plugins/diagrams`, `plugins/plans`, `plugins/decisions` — the three
  artifact plugins.
- `.claude-plugin/marketplace.json` — marketplace `second-brain` with exactly
  these entries (drift-check anchor; re-read the live file for versions):
  `diagrams` 0.13.0, `plans` 0.4.0, `decisions` 0.6.0, each with
  `"source": "./plugins/<name>"`.

Per Claude Code docs (verified 2026-08-27 against
https://code.claude.com/docs/en/skills.md): project-level
`.claude/skills/*/SKILL.md` and `.claude/commands/*.md` load automatically
when `claude` runs in the repo — no install step. The only gate is the
workspace **trust dialog** on first run in a new directory.

### What is per-machine state and must be recreated on a new machine

Evidence from this machine (the only installed one):

- `~/.claude/plugins/known_marketplaces.json`:

  ```json
  {
    "second-brain": {
      "source": { "source": "directory", "path": "/home/jorden/src/second-brain" },
      "installLocation": "/home/jorden/src/second-brain"
    }
  }
  ```

- `~/.claude/plugins/installed_plugins.json` (`"version": 2`) — per plugin
  key `<name>@second-brain`, an array whose first entry has `scope: "user"`,
  `installPath` under `~/.claude/plugins/cache/second-brain/<name>/<version>`,
  and a `version` field matching `marketplace.json`.
- `~/.claude.json` — `enabledPlugins` (`diagrams@second-brain`,
  `plans@second-brain`, `decisions@second-brain`: true) and
  `extraKnownMarketplaces` mirroring the directory source.

Per Claude Code docs (verified 2026-08-27 against
https://code.claude.com/docs/en/discover-plugins.md): marketplace
registrations from a local directory are **per-machine**; every command has a
non-interactive form — `claude plugin marketplace add <path>`,
`claude plugin install <name>@<marketplace> [--scope user|project|local]`,
`claude plugin enable|disable`, `claude plugin marketplace update <name>`,
`claude plugin marketplace list [--json]`. Editing the state files directly
is not supported; installs must go through these commands.

### What must NOT be copied to a new machine

This machine's `~/.claude/settings.json` contains machine-specific state that
would break a fresh install if copied wholesale:

- `env.ANTHROPIC_BASE_URL: "http://127.0.0.1:8787/w/claude"` plus
  `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL` — the local caveman gateway.
  Without that proxy running, Claude Code cannot reach the API at all.
- `env.XDG_RUNTIME_DIR` override — a WSLg-only socket fix.
- All hooks — they reference absolute fnm paths
  (`/home/jorden/.local/share/fnm/...`) and `/home/jorden/.caveman/bin/...`.

Also per ADR 0002 (`docs/adr/0002-secrets-in-keychain.md`): *"tools that own
their credential files (gh, Claude Code) re-login per machine"* — Claude Code
auth is never synced.

### Machine map and the personal/ submodule rule

- `CONTEXT.md` names a **Personal Mac** (source of truth, pushes) and a
  **Work Mac** (pulls, never pushes). `plans/007-*.md` records the owner's
  corrected map: the personal machine is currently a Windows/WSL2
  workstation; the work machine is an M4 Pro Mac. The runbook therefore
  targets macOS and Linux/WSL equally.
- ADR 0001 + `.scratch/config-system/issues/04-repo-layout.md`: a private
  `personal/` git submodule is planned; *"Bootstrap must
  `git submodule update --init` on the personal Mac only"*. The submodule
  **does not exist yet** (no `.gitmodules`); the runbook states the rule
  conditionally.

### Runtime dependencies of the tracked layer

- `plugins/diagrams/hooks/plan-artifact-nudge.sh:8` — `python3`.
- `plugins/*/bin/diagram-open` — `curl` or `wget` or `python3` (fallback
  chain in `http_ok()`); explicitly supports WSL, Linux, and macOS (line 2).
- `tools/check-plugins.sh` — `python3`, `git`, `bash`.
- `.husky/pre-commit` — `bunx lint-staged` + `bash tools/check-plugins.sh`,
  so `bun` is required on any machine that commits.
- `site/` — `bun` (Next.js 16 / Fumadocs; `site/README.md` documents
  `bun install`, `bun run dev|build`).
- macOS ships bash 3.2: no `mapfile`, no associative arrays in the new
  script. (`tools/check-plugins.sh` already stays within bash 3.2 —
  process substitution `< <(...)` is fine.)

### Repo conventions to match

- Checker style — `tools/check-plugins.sh`: `set -euo pipefail`, resolve
  `repo_root` via `git rev-parse --show-toplevel`, a
  `note() { printf '%-42s %s\n' "$1" "$2"; }` two-column reporter, a `fail`
  flag, final line `all checks passed` or `checks FAILED` (stderr), exit
  `$fail`. Match it.
- Formatting — `.lintstagedrc` runs `prettier --ignore-unknown --write` on
  everything staged; format the new markdown with
  `bunx prettier --write docs/install.md`.
- Log — append-only `log.md`, entry format
  `## [YYYY-MM-DD] maintenance | Title` plus bullet lines (see CLAUDE.md
  "Log format").
- Commit messages — short prefixed style, e.g. `docs: ...`, `tools: ...`
  (`git log --oneline`).

## Commands you will need

| Purpose            | Command                                             | Expected on success        |
| ------------------ | --------------------------------------------------- | -------------------------- |
| Shell syntax check | `bash -n tools/verify-install.sh`                   | exit 0, no output          |
| Plugin repo checks | `bash tools/check-plugins.sh`                       | ends `all checks passed`   |
| Format             | `bunx prettier --write docs/install.md`             | exit 0                     |
| Format check       | `bunx prettier --check docs/install.md`             | `All matched files use …`  |
| New checker        | `bash tools/verify-install.sh`                      | ends `all checks passed`   |

## Scope

**In scope** (the only files you create or modify):

- `docs/install.md` (create)
- `tools/verify-install.sh` (create, mode 755)
- `plans/README.md` (status row for this plan only)
- `log.md` (append one entry)

**Out of scope** (do NOT touch):

- Anything under `plugins/`, `.claude/`, `site/`, `dotfiles/`, `wiki/`, `raw/`
- `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`, ADRs, `.scratch/**`
- Any file outside the repo — especially `~/.claude/settings.json`,
  `~/.claude.json`, `~/.claude/plugins/**`. This plan documents and reads
  that state; it never writes it.
- No chezmoi scaffolding (`dotfiles/dot_claude/` belongs to config-system
  ticket 08), no `personal/` submodule creation, no Codex install steps
  (plan 010 owns the Codex pattern).

## Git workflow

- Branch: `advisor/021-claude-code-layer-install`
- One commit: `docs: install runbook + verify script for the Claude Code layer`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Preflight

Confirm the facts this plan depends on:

```
git rev-parse --short HEAD
python3 -c 'import json; d=json.load(open(".claude-plugin/marketplace.json")); print(sorted((p["name"], p["version"]) for p in d["plugins"]))'
python3 -c 'import json; d=json.load(open("skills-lock.json")); print(d["version"], len(d["skills"]))'
```

**Verify**: marketplace names are exactly `decisions`, `diagrams`, `plans`;
`skills-lock.json` prints `1 20`. Version numbers may be higher than the
excerpts above — that alone is not drift; different names or a different
lock shape is.

### Step 2: Write `docs/install.md`

Create `docs/install.md` with exactly this content (fill `<HEAD>` with the
short SHA from Step 1):

````markdown
# Installing the Claude Code layer on a new machine

Scope: what CONTEXT.md calls the **Claude Code layer** — CLAUDE.md, the
project skills and commands under `.claude/`, and the three artifact plugins
— on a machine that has never seen this repo. macOS and Linux/WSL both work.
This is the bootstrap slice `.scratch/config-system/map.md` lists as "not
yet specified"; the config-system spec (ticket 08) will absorb it. Dotfiles,
secrets, and the future `personal/` submodule are out of scope here — see
`docs/adr/0001` and `docs/adr/0002`.

Written at commit `<HEAD>`, 2026-08-27.

## Prerequisites

- `git`
- Claude Code, installed and logged in on this machine (auth is per-machine
  and never synced — ADR 0002)
- `python3` (plugin hooks and repo check scripts)
- `bun` (pre-commit hooks and the site; optional on a read-only machine)
- `curl` or `wget` (optional; the artifact opener falls back to python3)

## 1. Clone

```sh
git clone https://github.com/jmep17/second-brain.git ~/src/second-brain
```

Any path works; `~/src/second-brain` matches the existing machines. Do NOT
run `git submodule update --init` on the work machine: when the private
`personal/` submodule lands (ADR 0001), it must stay uninitialised there.
On the personal machine, submodule init becomes part of this step.

## 2. First run and trust

```sh
cd ~/src/second-brain
claude
```

Accept the workspace trust dialog. The project skills
(`.claude/skills/`), commands (`/ingest`, `/lint`), and CLAUDE.md load
automatically from the clone — there is no install step for them.

## 3. Register the marketplace and install the plugins

Marketplace registration is per-machine. From any shell:

```sh
claude plugin marketplace add ~/src/second-brain
claude plugin install diagrams@second-brain
claude plugin install plans@second-brain
claude plugin install decisions@second-brain
```

The directory source means plugin versions track whatever commit the clone
has pulled. After a `git pull` that bumps plugin versions:

```sh
claude plugin marketplace update second-brain
```

then restart the session.

## 4. Do NOT copy `~/.claude` from another machine

Each machine gets a fresh `~/.claude`. In particular, never copy the
personal workstation's `~/.claude/settings.json`: its
`env.ANTHROPIC_BASE_URL` points at a localhost caveman gateway (Claude Code
cannot reach the API without that proxy running), its `XDG_RUNTIME_DIR` is a
WSLg-only fix, and its hooks reference absolute paths that exist only there.
If you want caveman or similar tooling on the new machine, install it there
natively.

## 5. Optional pieces

- **Committing from this machine**: `bun install` at the repo root once, so
  husky's pre-commit (`bunx lint-staged` + `tools/check-plugins.sh`) works.
- **The site**: `cd site && bun install && bun run dev` →
  http://localhost:3000 (see `site/README.md`).
- **Env vars** (all optional, defaults in parentheses): `DIAGRAMS_DIR`
  (`artifacts/diagrams`), `DIAGRAMS_OPEN` (`1`), `ARTIFACTS_SITE_URL`
  (unset; the opener probes local ports).

## 6. Verify

```sh
bash tools/verify-install.sh
```

Every line reports one check; the last line must be `all checks passed`.
The script is read-only — safe to run any time, including before step 3 to
see what is missing.
````

**Verify**: `bunx prettier --write docs/install.md && bunx prettier --check docs/install.md`
→ passes. `grep -c 'claude plugin' docs/install.md` → ≥ 5.

### Step 3: Write `tools/verify-install.sh`

Create with exactly this content, then `chmod +x tools/verify-install.sh`:

```bash
#!/usr/bin/env bash
# Verify the Claude Code layer of second-brain is installed on this machine.
# Read-only: checks binaries, the tracked layer, marketplace registration,
# and plugin installs. Run from anywhere inside the clone. Bash 3.2 safe.
set -euo pipefail

if ! repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  echo "verify-install: run from inside the second-brain clone" >&2
  exit 1
fi
cd "$repo_root"
if [ ! -f .claude-plugin/marketplace.json ]; then
  echo "verify-install: $repo_root is not the second-brain repo" >&2
  exit 1
fi

fail=0
note() { printf '%-42s %s\n' "$1" "$2"; }

# 1. Required binaries
for bin in git claude bun python3; do
  if command -v "$bin" >/dev/null 2>&1; then
    note "binary: $bin" "found"
  else
    note "binary: $bin" "MISSING"
    fail=1
  fi
done
if command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1; then
  note "binary: curl or wget" "found"
else
  note "binary: curl or wget" "missing (opener falls back to python3)"
fi

# 2. Tracked Claude Code layer in the clone
for f in CLAUDE.md .claude/commands/ingest.md .claude/commands/lint.md skills-lock.json; do
  if [ -f "$f" ]; then
    note "file: $f" "present"
  else
    note "file: $f" "MISSING"
    fail=1
  fi
done
if command -v python3 >/dev/null 2>&1; then
  missing_skills="$(python3 - <<'PY' 2>/dev/null || true
import json, os
lock = json.load(open("skills-lock.json"))
print("\n".join(n for n in lock["skills"]
                if not os.path.isfile(os.path.join(".claude/skills", n, "SKILL.md"))))
PY
)"
  if [ -z "$missing_skills" ]; then
    note "skills: skills-lock.json entries" "all present"
  else
    note "skills: missing" "$(printf '%s' "$missing_skills" | tr '\n' ' ')"
    fail=1
  fi
fi

# 3. Repo-side plugin validity
if bash tools/check-plugins.sh >/dev/null 2>&1; then
  note "plugins: tools/check-plugins.sh" "all checks passed"
else
  note "plugins: tools/check-plugins.sh" "FAILED (run it directly for details)"
  fail=1
fi

# 4. Per-machine marketplace registration (reads Claude Code state, never writes)
plug_state="${HOME}/.claude/plugins"
if [ ! -f "$plug_state/known_marketplaces.json" ]; then
  note "marketplace: second-brain" "NOT REGISTERED (claude plugin marketplace add $repo_root)"
  fail=1
else
  reg_path="$(python3 - "$plug_state/known_marketplaces.json" <<'PY' 2>/dev/null || true
import json, sys
d = json.load(open(sys.argv[1]))
s = d.get("second-brain", {}).get("source", {})
print(s.get("path", "") if s.get("source") == "directory" else s.get("repo", ""))
PY
)"
  if [ -z "$reg_path" ]; then
    note "marketplace: second-brain" "NOT REGISTERED (claude plugin marketplace add $repo_root)"
    fail=1
  elif [ "$reg_path" = "$repo_root" ]; then
    note "marketplace: second-brain" "registered -> $reg_path"
  else
    note "marketplace: second-brain" "registered to OTHER source: $reg_path (expected $repo_root)"
    fail=1
  fi
fi

# 5. Installed plugins vs marketplace versions
if [ ! -f "$plug_state/installed_plugins.json" ]; then
  note "plugins: installed" "NONE (see docs/install.md step 3)"
  fail=1
else
  plugin_report="$(python3 - "$plug_state/installed_plugins.json" <<'PY' 2>/dev/null || true
import json, sys
market = json.load(open(".claude-plugin/marketplace.json"))
installed = json.load(open(sys.argv[1])).get("plugins", {})
for p in sorted(market["plugins"], key=lambda p: p["name"]):
    key = p["name"] + "@second-brain"
    entries = installed.get(key) or []
    if not entries:
        print("bad|" + key + "|NOT INSTALLED (claude plugin install " + key + ")")
        continue
    got = entries[0].get("version", "?")
    if got == p["version"]:
        print("ok|" + key + "|installed at " + got)
    else:
        print("bad|" + key + "|installed " + got + " != marketplace " + p["version"]
              + " (claude plugin marketplace update second-brain)")
PY
)"
  if [ -z "$plugin_report" ]; then
    note "plugins: installed state" "UNREADABLE (installed_plugins.json schema changed?)"
    fail=1
  else
    while IFS='|' read -r status key msg; do
      [ -z "$status" ] && continue
      note "plugin: $key" "$msg"
      [ "$status" = "ok" ] || fail=1
    done < <(printf '%s\n' "$plugin_report")
  fi
fi

if [ "$fail" -eq 0 ]; then
  echo "all checks passed"
else
  echo "checks FAILED" >&2
fi
exit "$fail"
```

**Verify**: `bash -n tools/verify-install.sh` → exit 0.
`test -x tools/verify-install.sh && echo ok` → `ok`.

### Step 4: Positive run on this machine

This machine is a fully installed machine, so the checker must pass here:

```
bash tools/verify-install.sh
```

**Verify**: every line reports a passing state, last line
`all checks passed`, exit code 0. If any line fails, the script (not the
machine) is wrong — fix the script. Exception: if the `plugin:` lines show a
version mismatch AND `git log --oneline -3 -- .claude-plugin/marketplace.json`
shows a bump newer than the installed versions, the machine genuinely needs
`claude plugin marketplace update second-brain`; report that rather than
"fixing" the script to ignore it.

### Step 5: Negative runs

```
cd /tmp && bash "$OLDPWD/tools/verify-install.sh"; echo "exit=$?"; cd -
HOME="$(mktemp -d)" bash tools/verify-install.sh; echo "exit=$?"
```

**Verify**: run 1 prints `verify-install: run from inside the second-brain
clone` and `exit=1`. Run 2 reports `marketplace: second-brain` as
`NOT REGISTERED` and the plugins as `NONE`, ends `checks FAILED`, `exit=1`
— and must not crash before the summary line.

### Step 6: Log entry, index row, commit

Append to `log.md` (keep the grep-able prefix format):

```markdown
## [<today>] maintenance | Plan 021 — install runbook + verify script for the Claude Code layer

- Added docs/install.md (clone → trust → marketplace add → plugin install → verify; per-machine ~/.claude warnings) and tools/verify-install.sh (read-only checker)
- Bootstrap gap named in .scratch/config-system/map.md is now covered for the Claude Code layer; ticket 08 will absorb the doc
```

Update this plan's row in `plans/README.md` to `DONE`. Commit on the branch
from "Git workflow".

**Verify**: `git status --porcelain` shows only the four in-scope files;
`bash tools/check-plugins.sh` still ends `all checks passed`.

## Test plan

The script runs in Steps 4–5 are the tests (positive on an installed
machine, outside-the-repo, and fresh-HOME negative). No unit-test framework
applies; `plugins/diagrams/test/ready-feedback-nudge.sh` is the repo's
precedent for shell checks and needs no changes.

## Done criteria

ALL must hold:

- [ ] `docs/install.md` exists, passes `bunx prettier --check docs/install.md`
- [ ] `bash -n tools/verify-install.sh` exits 0; file is executable
- [ ] `bash tools/verify-install.sh` on this machine ends `all checks passed`, exit 0
- [ ] `HOME="$(mktemp -d)" bash tools/verify-install.sh` ends `checks FAILED`, exit 1
- [ ] `bash tools/check-plugins.sh` still ends `all checks passed`
- [ ] `git status --porcelain` shows only the four in-scope files
- [ ] `log.md` has the new maintenance entry; `plans/README.md` row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `docs/install.md` or `tools/verify-install.sh` already exists.
- `~/.claude/plugins/installed_plugins.json` on this machine is missing, has
  `"version"` ≠ 2, or `known_marketplaces.json` lacks a `second-brain`
  directory-source entry — the schema excerpts in "Current state" are then
  stale and the script's parsers would be written against fiction.
- Step 4's positive run still fails after two fix attempts.
- Marketplace plugin names in Step 1 differ from `decisions`/`diagrams`/`plans`.
- The work requires editing any out-of-scope file.

## Maintenance notes

- **Ticket 08 absorbs this**: when `.scratch/config-system/spec.md` is
  written, fold `docs/install.md` into its bootstrap section (secrets list
  per host, chezmoi init order) and leave a pointer behind.
- **Internal-schema risk**: sections 4–5 of the script read
  `~/.claude/plugins/*.json`, which Claude Code does not document as stable.
  The script already degrades to an explicit `UNREADABLE ... schema changed?`
  failure; if that fires after a Claude Code update, rewrite those sections
  on top of `claude plugin marketplace list --json`.
- **When `personal/` lands** (ADR 0001): update `docs/install.md` step 1 —
  submodule init on the personal machine becomes a real command, and the
  work-machine prohibition becomes testable.
- **When `dotfiles/dot_claude/` lands** (ticket 04): the "do not copy
  `~/.claude`" section shrinks to "run `chezmoi apply`"; revisit the doc.
- **Reviewer focus**: the script must stay strictly read-only (`grep -n
  'claude plugin\|>' tools/verify-install.sh` — no state-mutating command,
  writes only to stdout/stderr), and remedy messages must name the exact
  command to run.
- **Deferred**: Codex-side install on the new machine (plan 010's pattern);
  a `--fix` mode that runs the install commands itself (kept out to preserve
  read-only semantics).
