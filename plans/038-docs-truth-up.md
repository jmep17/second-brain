# Plan 038: The repo's own records match reality — CONTEXT/ADR build-status, a current log.md, and up-to-date artifact docs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- CONTEXT.md docs/adr/ log.md artifacts/README.md wiki/claude-diagrams-plugin.md .claude-plugin/marketplace.json .husky/pre-commit tools/`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live files before proceeding; on a mismatch,
> treat it as a STOP condition.

## At a glance

- **What**: Re-align `CONTEXT.md`/the ADRs, resume `log.md`, and fix `artifacts/README.md` with what is actually built, and add one guard against another log lapse.
- **Why**: Three of the repo's own records describe a system that doesn't exist on disk or a feature set that's gone stale, and agents are instructed to read them before exploring, so they onboard believing the wrong thing is live.
- **Next action**: Step 1 — Correct the one factually-wrong CONTEXT.md clause

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

Three of the repo's own records now describe a system that does not exist on
disk, and one has simply stopped being written. `CONTEXT.md` and the ADRs
describe a two-Mac deployment (a `personal/` submodule, Keychain-templated
dotfiles for eight tools, per-machine skill toggles, push-on-commit) of which
almost nothing is built — and `docs/agents/domain.md` instructs every
engineering agent to read those files *before exploring*, so an agent onboards
believing that system is live and plans against it. `log.md` — the append-only
chronicle that makes this a "second brain" and is published as a site page —
stopped a full day before this plan, with ~21 commits (the entire artifact
platform) unrecorded. And `artifacts/README.md`, the doc `CLAUDE.md` points
every artifact response at, is missing a shipped artifact type and calls a
shipped feature "future." None of this is a code bug; all of it quietly
misleads the next reader (human or agent). This plan re-aligns the records with
reality and adds one guard so the log lapse can't silently recur.

## Current state

Three independent doc-accuracy fixes, grouped because one executor can do them
together with clean per-file scope. **`site/README.md` is explicitly OUT of
scope — plan 035 owns it.**

### Part A — CONTEXT.md / ADRs describe decided-but-unbuilt state (finding F20)

Verified absent on disk at `c0ee11c`:

- No `.gitmodules`, no `personal/` directory (`ls .gitmodules personal` → both
  "No such file or directory").
- `dotfiles/` contains exactly one tracked file: `dotfiles/dot_config/tmux/tmux.conf`.
- No `.chezmoidata/`, `.chezmoiignore.tmpl`, `.chezmoiremove.tmpl`, or
  `run_after_*.sh.tmpl` anywhere.

Yet the docs describe them as present:

- `CONTEXT.md:34` — "Configuration for zsh, fish, nvim, tmux, ghostty, git and
  gh. Source lives in `dotfiles/` … `chezmoi apply` copies it into `$HOME`."
  (Reality: one tool, tmux. `site/lib/config-files.ts:13-15` `TOOLS` has one
  entry, `tmux`.)
- `CONTEXT.md:50` (**Commit**) — "commits all dirty `dotfiles/**` files **and
  pushes** to the machine's remote." But `site/app/api/config/git/route.ts:31`
  comment: "One commit for everything dirty; **push is out of scope for the
  prototype.**" — the handler only does `git add` + `git commit`.
- `CONTEXT.md:58` (**Personal repo**) — "The git submodule at `personal/` …"
  (does not exist).
- `docs/adr/0001-personal-wiki-is-a-nested-repo.md` — `status: accepted`;
  consequences include "the site must render with `personal/` empty" — a state
  never reached because `personal/` was never created.
- `docs/adr/0003-ui-edits-source-then-applies.md:13` — "Per-machine skill
  toggles are chezmoi data (`.chezmoidata/skills.toml`) plus
  `.chezmoiignore.tmpl` / `.chezmoiremove.tmpl`"; addendum line ~29 names a
  `run_after_*.sh.tmpl` prune script. None of these paths exist.
- `docs/agents/domain.md:5-8` — "## Before exploring, read these" → `CONTEXT.md`
  and `docs/adr/`. This is why the gap misleads agents.

These decisions are **genuinely accepted** — the goal is NOT to reverse them,
only to separate "decided" from "built" so a reader knows the current state.
The open ticket that would close the gap is `.scratch/config-system/issues/08-spec.md`
(`Status: open`; see also plan 039 which specs it).

### Part B — log.md stopped a day before HEAD (finding F21)

- `log.md` last entry heading: `## [2026-08-26] maintenance | Plan 012 —
  interactive artifacts: site serving + feedback/RFC loop`.
- `grep -c 2026-08-27 log.md` → `0`.
- `git log --oneline --since=2026-08-27T00:00 --until=2026-08-28T00:00 | wc -l`
  → `21`. That day landed plan 013 completion, the whole selectable-artifact
  -review feature, headless two-stage dispatch, and plan 019, among style/site
  commits.
- `CLAUDE.md` "Layout": "`log.md` — append-only chronological record of all
  operations. Never rewrite old entries." "Ground rules": "Commit after each
  ingest or lint session."
- Existing entry format (hold to it exactly), from the tail of `log.md`:

  ```markdown
  ## [2026-08-26] maintenance | Plan 012 — interactive artifacts: site serving + feedback/RFC loop

  - <one or more bullet lines describing what was filed/changed>
  ```

### Part C — artifact-platform docs lag shipped features (finding F22)

- `artifacts/README.md:5-9` — type table lists `diagrams/`, `plans/`,
  `decisions/` only. `artifacts/reviews/` exists on disk with three files
  (`2026-08-26-plan-010/011/012-execution-review.html`) and is in no row and
  has no plugin.
- `artifacts/README.md:18` — "This directory is the intended input for a
  **future** site Artifacts section." That section shipped in plan 012:
  `site/app/artifacts/page.tsx`, `site/app/artifacts/view/[...file]/route.ts`,
  `site/app/artifacts/review/[...file]/page.tsx`, and `POST
  /api/artifacts/feedback` (`site/app/api/artifacts/feedback/route.ts`).
- `wiki/claude-diagrams-plugin.md` — frontmatter `updated: 2026-08-26`; body
  heading "## Moved into second-brain (2026-08-26, **v0.3.0**)" and "Version:
  **0.3.0**." But `.claude-plugin/marketplace.json` ships `diagrams` at
  **`0.13.0`** (line 14), plus `plans` `0.4.0` (line 21) and `decisions`
  `0.6.0` (line 28), which have no wiki page.
- `CLAUDE.md:105` region — `artifacts/README.md` is the normative pointer for
  artifact responses; `CLAUDE.md` `/lint` exists to catch "stale claims
  superseded by newer sources," which the v0.3.0 page is.

### Repo conventions to honor

- **Wiki is LLM-owned** (`CLAUDE.md` "Ground rules"): editing `wiki/` is
  allowed; **never delete a wiki page without asking.** This plan only refreshes
  version/scope text on one wiki page — no deletion, no new page unless you
  choose the generalize option in Step 5.
- **`raw/` is immutable** — do not touch it.
- Markdown throughout; `bunx lint-staged` runs prettier on commit, so match
  existing spacing (prettier will normalize anyway).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat c0ee11c..HEAD -- CONTEXT.md docs/adr/ log.md artifacts/README.md wiki/claude-diagrams-plugin.md .claude-plugin/marketplace.json` | empty (or you handle drift per STOP) |
| List 2026-08-27 commits | `git log --oneline --since=2026-08-27T00:00 --until=2026-08-28T00:00` | ~21 lines to summarize |
| Confirm log backfilled | `grep -c 2026-08-27 log.md` | `> 0` |
| Plugin checks | `bash tools/check-plugins.sh` | `all checks passed`, exit 0 |
| Test the log guard | see Step 4 | warning prints on a plans/site/plugins commit with no new log heading |

## Scope

**In scope** (the only files you may modify or create):
- `CONTEXT.md` (add a status section; do not alter existing term definitions
  except to correct the factually-wrong "and pushes" clause — see Step 1)
- `docs/adr/0001-personal-wiki-is-a-nested-repo.md`,
  `docs/adr/0003-ui-edits-source-then-applies.md` (add build-status annotation
  only; do NOT change the decision text)
- `log.md` (append backfill entries only — never rewrite existing entries)
- `artifacts/README.md`
- `wiki/claude-diagrams-plugin.md`
- `.husky/pre-commit` and a new `tools/check-log-updated.sh` (the guard)
- `plans/README.md` (status row only, at the end)

**Out of scope** (do NOT touch, even though related):
- `site/README.md` — plan 035 owns the README's static-export/`source.tsx`
  corrections. Leave it entirely.
- Any `.chezmoi*` / `personal/` / `dotfiles/` **creation** — that is the config
  system build (plans 039/040), not a docs fix. You are documenting the gap,
  not closing it.
- The ADR *decisions* themselves — annotate build status, never reverse a
  decision.
- `raw/**` — immutable.
- Any code file under `site/` or `plugins/` except the pre-commit hook wiring.

## Git workflow

- Branch: `advisor/038-docs-truth-up`
- Commit per part (A/B/C) or per logical unit; lowercase-prefixed messages to
  match `git log` (e.g. `docs: mark decided-vs-built state in CONTEXT/ADRs`,
  `log: backfill 2026-08-27 entries + add update guard`,
  `docs: refresh artifact platform docs to shipped state`).
- Do NOT push or open a PR.

## Steps

### Step 1: Correct the one factually-wrong CONTEXT.md clause

In `CONTEXT.md:50` (**Commit** term), the clause "and pushes to the machine's
remote" contradicts the shipped handler. Change the definition to describe what
the UI actually does today and note push as target-state. Example target shape
(keep the term's `_Avoid_` line if present):

```markdown
**Commit**:
The separate UI action that commits all dirty `dotfiles/**` files in one
commit. Push is not yet implemented (`site/app/api/config/git/route.ts` — "push
is out of scope for the prototype"); pushing to the machine's remote is
target-state, see Implementation status below.
```

Do not touch the other term definitions here.

**Verify**: `grep -n "and pushes to the machine" CONTEXT.md` → no matches.

### Step 2: Add an "Implementation status" section to CONTEXT.md

Append a section (near the end of `CONTEXT.md`) that separates live code from
target-state. It must name, as **built today**: the `dotfiles/` source dir with
one tool (tmux), the Save action, and single-file Drift (`chezmoi diff`) — all
reachable through `site/app/config/` + `site/lib/config-files.ts`. And as
**decided but not yet built**: the Personal repo (`personal/` submodule), the
Work repo, per-machine skill toggles (`.chezmoidata/skills.toml` +
`.chezmoiignore.tmpl` + `run_after` prune), the other seven tools, and
push-on-commit. Point the reader at `.scratch/config-system/issues/08-spec.md`
(the open spec ticket) and plan 039.

Target shape:

```markdown
## Implementation status (2026-08-27)

CONTEXT.md and `docs/adr/0001`–`0003` record **decided** architecture. Much of
it is not yet built. This section is the source of truth for what exists today.

**Built:** the `dotfiles/` chezmoi source dir (one tool so far — tmux, see
`TOOLS` in `site/lib/config-files.ts`); the web config editor's Save (writes a
`dotfiles/**` source file then `chezmoi apply`s it) and single-file Drift
detection; Commit (one `git commit`, no push).

**Decided, not yet built:** the Personal repo (`personal/` submodule — no
`.gitmodules` exists), the Work repo and its push flow, per-machine skill
toggles (`.chezmoidata/skills.toml` + `.chezmoiignore.tmpl` + a `run_after`
prune script — none exist), management of the other seven tools, and
push-on-commit. Open ticket: `.scratch/config-system/issues/08-spec.md`; see
`plans/039-config-system-spec.md`.
```

Then add a one-line pointer at the top of each ADR's Consequences (or a short
`## Implementation status` note) saying the consequences describe target-state
not current disk state, cross-referencing this section. Do **not** edit the
decision paragraphs.

**Verify**: `grep -n "Implementation status" CONTEXT.md docs/adr/0001-personal-wiki-is-a-nested-repo.md docs/adr/0003-ui-edits-source-then-applies.md`
→ a match in each of the three files.

### Step 3: Backfill log.md for 2026-08-27

Run `git log --oneline --since=2026-08-27T00:00 --until=2026-08-28T00:00` and
group the 21 commits into honest `maintenance` entries — one per landed plan or
coherent feature (e.g. plan 013 completion; selectable artifact review;
headless two-stage dispatch; plan 019 sidebar dedupe; the review-tray/style
polish). Append them **after** the existing last entry, in date order, using
the exact heading format `## [2026-08-27] maintenance | <title>`. Add a short
parenthetical in the first backfilled entry noting these were reconstructed
from `git log` on 2026-08-27 (honest about being a backfill — do not pretend
they were contemporaneous). Never rewrite or reorder existing entries.

**Verify**: `grep -c 2026-08-27 log.md` → `> 0`; `grep "^## \[" log.md | tail -3`
shows the new 2026-08-27 headings last.

### Step 4: Add a guard so the log lapse can't silently recur

Create `tools/check-log-updated.sh` — an **advisory** (non-blocking) check that
warns when staged changes touch `plans/`, `site/`, or `plugins/` but no new
`## [` heading is being added to `log.md`. It must `exit 0` regardless (a
warning, not a block — doc-only and WIP commits must not be gated). Model its
shell style on the existing `tools/check-plugins.sh` (`set -euo pipefail`,
`git rev-parse --show-toplevel`). Sketch:

```bash
#!/usr/bin/env bash
set -uo pipefail
repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$repo_root"
# Staged files in gated dirs?
if git diff --cached --name-only | grep -qE '^(plans|site|plugins)/'; then
  # A new log heading being added in this commit?
  if ! git diff --cached -- log.md | grep -qE '^\+## \['; then
    echo "warning: staged changes touch plans/ site/ or plugins/ but log.md has no new '## [date]' entry (CLAUDE.md: log all operations)" >&2
  fi
fi
exit 0
```

Wire it into `.husky/pre-commit` as a third line (after `bash tools/check-plugins.sh`):

```
bash tools/check-log-updated.sh
```

**Verify**: with a `site/` file staged and no log heading staged,
`bash tools/check-log-updated.sh` prints the warning to stderr and exits 0
(`echo $?` → `0`). Staging a `log.md` line beginning `## [` suppresses it.

### Step 5: Refresh the artifact-platform docs

In `artifacts/README.md`: add a `reviews/` row to the type table. It has no
plugin — state the writer honestly (execution-review pages are written
ad hoc by the improve/review flow, not a marketplace plugin), e.g.
`| \`reviews/\` | shipped | Plan execution-review pages | — (written ad hoc) |`.
Replace the line 18 "future site Artifacts section" sentence with the shipped
reality, naming the routes:

```markdown
Served by the site's Artifacts section (plan 012): browse at `/artifacts`,
view raw at `/artifacts/view/<type>/<file>.html`, review with feedback at
`/artifacts/review/<type>/<file>.html`; feedback is filed via
`POST /api/artifacts/feedback` into `.scratch/artifact-feedback/issues/`.
```

In `wiki/claude-diagrams-plugin.md`: update the version claims from `0.3.0` to
the shipped `0.13.0` (`.claude-plugin/marketplace.json:14`), bump the
frontmatter `updated:` to `2026-08-27`, and add a one-line note that the
marketplace also ships `plans` (`0.4.0`) and `decisions` (`0.6.0`). Keep it a
version/scope refresh — do not rewrite the page's history narrative, and do not
delete anything. (Optional, only if you judge it cleaner: generalize the page
into one `entity` page covering all three plugins — but if unsure, do the
minimal version bump and STOP short of a rewrite.)

**Verify**: `grep -n "reviews/" artifacts/README.md` → a table row match;
`grep -n "future site Artifacts" artifacts/README.md` → no matches;
`grep -n "0.13.0" wiki/claude-diagrams-plugin.md` → at least one match;
`grep -c "0.3.0" wiki/claude-diagrams-plugin.md` → `0` (or only inside an
explicitly-historical sentence you left intact — if any remain, confirm they
are past-tense history, not a current-version claim).

### Step 6: Full gate

**Verify**: `bash tools/check-plugins.sh` → `all checks passed`, exit 0.
`git status` shows only in-scope files modified.

## Test plan

This is a docs plan; "tests" are the grep gates above. No unit tests to add.
The only executable artifact is `tools/check-log-updated.sh` — verify it both
ways (warns when it should, silent when a log heading is staged) as in Step 4.
There is no test runner requirement here, so this plan does not depend on plan
024.

## Done criteria

ALL must hold:

- [ ] `grep -n "and pushes to the machine" CONTEXT.md` → no matches
- [ ] `grep -n "Implementation status" CONTEXT.md docs/adr/0001-personal-wiki-is-a-nested-repo.md docs/adr/0003-ui-edits-source-then-applies.md` → a match in each
- [ ] `grep -c 2026-08-27 log.md` → `> 0`, and existing entries are unchanged (`git diff c0ee11c..HEAD -- log.md` shows only additions)
- [ ] `tools/check-log-updated.sh` exists, is wired into `.husky/pre-commit`, and warns-but-exits-0 as specified
- [ ] `grep -n "reviews/" artifacts/README.md` → a table row; `grep -n "future site Artifacts" artifacts/README.md` → no matches
- [ ] `grep -n "0.13.0" wiki/claude-diagrams-plugin.md` → a match; no current-version `0.3.0` claim remains
- [ ] `bash tools/check-plugins.sh` → exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt does not match the live file (drift since
  `c0ee11c` — e.g. `personal/` now exists, or the git route now pushes). The
  fix then depends on what actually shipped; report rather than guess.
- Backfilling log.md would require rewriting or reordering an existing entry
  (it must be append-only) — stop and report the conflict.
- Refreshing `wiki/claude-diagrams-plugin.md` seems to require deleting the page
  or large rewrites beyond a version/scope refresh — stop and ask (CLAUDE.md
  forbids deleting a wiki page without asking).
- Making `tools/check-log-updated.sh` blocking (non-zero exit) seems necessary
  to satisfy a reviewer — do NOT; it must stay advisory. Report the request.

## Maintenance notes

- The "Implementation status" section in `CONTEXT.md` is now the load-bearing
  truth about what's built. Plans 039 (config spec) and 040 (adopt/toggle) will
  move items from "decided, not yet built" to "built" — whoever lands those must
  update this section in the same change.
- `tools/check-log-updated.sh` is intentionally advisory. If the team later
  wants it enforcing, that's a separate decision — do not silently flip it.
- The wiki plugin page will drift again on the next marketplace version bump.
  A reviewer should treat a marketplace version change without a matching wiki
  update as a `/lint` finding (this is exactly what plan 042's KB-revival ingest
  rule is meant to systematize).
- A reviewer should confirm no ADR *decision* text changed — only status
  annotations were added — and that `log.md` additions are honest reconstructions,
  not invented detail.
