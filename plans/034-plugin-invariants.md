# Plan 034: Machine-check the plugin-duplication invariants; fix lockfile drift and check stubs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- tools/check-plugins.sh plugins/diagrams/bin/diagram-open plugins/plans/bin/diagram-open plugins/decisions/bin/diagram-open plugins/DESIGN.md plugins/diagrams/bun.lock plugins/diagrams/package.json plugins/diagrams/tools`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## At a glance

- **What**: Add a hash-equality check to `tools/check-plugins.sh` so the three plugins' copied opener, token block, and feedback widget can't silently drift, and fix the drifted `plugins/diagrams/bun.lock` and duplicate check scripts.
- **Why**: The copies are in sync only by discipline today, and nothing currently fails if a fix like plan 031's or a token rename is applied to some copies but not others.
- **Next action**: Step 1 — Add an opener hash-equality check to `tools/check-plugins.sh`

## Status

- **Priority**: P3
- **Effort**: S–M
- **Risk**: LOW (the check + stub cleanup); LOW (lockfile regen — the two stale
  packages are unused by the plugin's scripts)
- **Depends on**: none
- **Category**: tech-debt / dx
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

The three plugins publish standalone artifacts, so by design each inlines a
copy of the browser opener (`bin/diagram-open`), the Geist `:root` token block,
and the feedback widget. Those copies are currently **in sync** — this is a
drift-*prevention* plan, not a drift report. But the invariant is maintained
purely by discipline: `plugins/DESIGN.md:110-111` says "fix wording or
behaviour here first, then re-sync every template", and nothing fails if you
forget. A one-line fix to the opener's port probe (see plan 031) or a token
rename (plan 023) must be applied in three or four places, and the only thing
that notices a missed copy today is a human. `tools/check-plugins.sh` already
runs in `.husky/pre-commit`, so adding the comparison there makes the invariant
enforced for free. Two smaller messes ride along: `plugins/diagrams/bun.lock`
drifted from its manifest, and two byte-identical check scripts masquerade as
distinct verification steps.

## Current state

- Three byte-identical openers (confirmed `md5 = cbddc88ddd7dfe574e759608d911d55d`
  for all three):
  - `plugins/diagrams/bin/diagram-open`
  - `plugins/plans/bin/diagram-open`
  - `plugins/decisions/bin/diagram-open`
- The shared blocks live in `plugins/DESIGN.md` and each skill template:
  - `plugins/DESIGN.md` — the feedback widget between
    `<!-- feedback-widget:start -->` (`:113`) and `<!-- feedback-widget:end -->`
    (`:197`); the `:root` token block referenced from `:108`/`:228-230`.
  - `plugins/diagrams/skills/diagram-plans/MERMAID.md`
  - `plugins/plans/skills/plan-pages/TEMPLATE.md`
  - `plugins/decisions/skills/decision-pages/TEMPLATE.md`
  - Known per-type deltas that must be *allowed*: the `data-artifact` path in
    the widget and which radio is `checked`. (Confirm the exact deltas by
    diffing the four widget copies before writing the comparator — do not
    hard-code deltas you have not seen.)
- `tools/check-plugins.sh` — validates `marketplace.json`/`plugin.json` JSON,
  `plugin.json` vs `marketplace.json` version sync, `hooks.json` JSON, `bash -n`
  syntax on every `*.sh`, and the executable bit on `bin/*`. It never compares
  the three openers or the widget/token blocks. It walks `for plugin in plugins/*`.
- `plugins/diagrams/package.json` devDependencies: `playwright ^1.62.1`,
  `prettier ^3.9.6` only.
- `plugins/diagrams/bun.lock:2` — `"lockfileVersion": 2`; its workspace
  `devDependencies` still list `husky ^9.1.7`, `lint-staged ^17.3.0`,
  `playwright`, `prettier`, and the workspace entry has no `"name"` field.
  Root `bun.lock:2` and `site/bun.lock:2` are both `"lockfileVersion": 1` with a
  `"name"`. Plan 009 removed husky/lint-staged from the diagrams manifest; the
  lock was never regenerated.
- `plugins/diagrams/tools/check.sh` and
  `plugins/diagrams/tools/check-version-sync.sh` are byte-identical
  (`md5 = be8efcaeefd78dac5d72506034248c66`, 3 lines each):
  `exec bash "$(git rev-parse --show-toplevel)/tools/check-plugins.sh"`.
  `plugins/diagrams/package.json` `test` runs `bash tools/check.sh && bash test/ready-feedback-nudge.sh`.
  Grep for `check-version-sync` references before deleting.

Conventions to match: `tools/check-plugins.sh` uses `set -euo pipefail`, a
`note()` printf helper, and increments a `fail` variable rather than exiting
early — match that structure and its output style for the new checks. It is
POSIX-ish bash invoked as `bash`, and uses `python3 -m json.tool` for JSON.

## Commands you will need

| Purpose            | Command                                        | Expected on success |
|--------------------|------------------------------------------------|---------------------|
| Plugin check       | `bash tools/check-plugins.sh`                  | prints "all checks passed", exit 0 |
| Plugin test suite  | `cd plugins/diagrams && bun run test`          | exit 0              |
| Confirm opener md5 | `md5sum plugins/*/bin/diagram-open`            | three identical hashes |
| Lockfile regen     | `cd plugins/diagrams && bun install`           | writes `bun.lock`, exit 0 |

## Scope

**In scope** (the only files you should modify):
- `tools/check-plugins.sh` (add the new comparisons)
- `plugins/diagrams/bun.lock` (regenerate)
- `plugins/diagrams/tools/check-version-sync.sh` (delete)
- `plans/011-geist-artifact-conventions.md` (only the one line that references
  `check-version-sync.sh` — correct or remove it)

**Out of scope** (do NOT touch, even though they look related):
- The opener scripts and the widget/token blocks themselves — this plan adds a
  *check*, it does not change any copy. (Plan 031 edits the openers; plan 023
  renames the tokens. This plan's check must pass against the copies exactly as
  they are today.)
- `plugins/diagrams/package.json` — its devDeps are already correct; only the
  lockfile is stale.
- Any behaviour of the plugins at runtime.

## Git workflow

- Branch: `advisor/034-plugin-invariants`
- Commit style matches `git log` (lowercase prefix), e.g.
  `dx: enforce plugin duplication invariants in check-plugins.sh`.
- Do NOT push or open a PR.

## Steps

### Step 1: Add an opener hash-equality check to `tools/check-plugins.sh`

After the existing per-plugin loop (or as a new section before the final
`fail` report), compute the md5 (or `sha256sum`) of each
`plugins/*/bin/diagram-open` that exists and assert they are all equal. On
mismatch, `note` the offending files and set `fail=1`. Use the same `note`
formatting as the rest of the script.

**Verify**: `bash tools/check-plugins.sh` → still prints "all checks passed",
exit 0 (the three are identical today). Then temporarily append a space to
`plugins/plans/bin/diagram-open`, re-run, confirm it now FAILS, and revert the
space.

### Step 2: Add a widget/token block comparison

First diff the four widget copies to learn the exact allowed deltas:

```
diff <(sed -n '/feedback-widget:start/,/feedback-widget:end/p' plugins/DESIGN.md) \
     <(sed -n '/feedback-widget:start/,/feedback-widget:end/p' plugins/plans/skills/plan-pages/TEMPLATE.md)
```

(repeat for the other two templates and for the `:root` token block). Then in
`check-plugins.sh`, extract each block from `plugins/DESIGN.md` and from each
template, normalize whitespace, blank out the known per-type deltas
(`data-artifact="..."` value and the `checked` attribute position), and compare
against the DESIGN.md copy. Fail on any other difference. If a template does not
contain a block, that is itself a failure worth reporting (the template dropped
its widget).

**Verify**: `bash tools/check-plugins.sh` → "all checks passed", exit 0.
Temporarily change one token value in one template, re-run, confirm FAIL,
revert.

### Step 3: Regenerate the diagrams lockfile

```
cd plugins/diagrams && bun install
```

This rewrites `plugins/diagrams/bun.lock` from the current `package.json`
(dropping the stale husky/lint-staged entries). Confirm the diff removes those
two packages and only those.

**Verify**: `git diff plugins/diagrams/bun.lock` shows husky and lint-staged
removed; `cd plugins/diagrams && bun run test` → exit 0.
(If `bun install` also flips `lockfileVersion` 2→1 to match the other locks,
that is fine and desirable; if it stays 2, note it in your report but do not
hand-edit the lockfile.)

### Step 4: Collapse the redundant check stub

`grep -rn "check-version-sync" .` — if the only references are the file itself
and `plans/011`, delete `plugins/diagrams/tools/check-version-sync.sh` and
correct the `plans/011` line that treats it as a distinct verification step
(replace with a pointer to `bash tools/check-plugins.sh`). Do not touch
`plugins/diagrams/tools/check.sh` — it is referenced by the plugin's `test`
script.

**Verify**: `grep -rn "check-version-sync" .` → returns nothing outside git
history; `cd plugins/diagrams && bun run test` → exit 0.

### Step 5: Full gate

**Verify**: `bash tools/check-plugins.sh` → "all checks passed", exit 0;
`cd plugins/diagrams && bun run test` → exit 0.

## Test plan

- The check script *is* the test here; Steps 1 and 2 each include a
  seed-a-violation / confirm-fail / revert probe — do those and record the
  observed FAIL output in your completion note. This is how the executor proves
  the guard actually fires rather than passing vacuously.
- No new `bun:test` file is required for this plan.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bash tools/check-plugins.sh` exits 0 and its output includes the new
      opener-hash and widget/token lines
- [ ] Seeding a one-character change into any opener or any template makes
      `bash tools/check-plugins.sh` exit non-zero (probed and reverted)
- [ ] `plugins/diagrams/bun.lock` no longer lists `husky` or `lint-staged`
      (`grep -c 'husky\|lint-staged' plugins/diagrams/bun.lock` → 0)
- [ ] `plugins/diagrams/tools/check-version-sync.sh` no longer exists and no
      non-history reference to it remains
- [ ] `cd plugins/diagrams && bun run test` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The three openers are **not** identical at drift-check time (someone changed
  one) — the comparator would then codify a divergence; report instead.
- The widget/token blocks differ in ways beyond the `data-artifact` path and
  the `checked` radio (i.e. a real drift already exists) — report the drift;
  do not "fix" a template as part of this plan.
- `bun install` changes far more of the lockfile than the two stale packages
  (e.g. resolves new versions of playwright/prettier) — stop and report the
  diff rather than committing an unexpected dependency bump.
- Deleting `check-version-sync.sh` would break a reference outside `plans/011`.

## Maintenance notes

- **Plan 031** edits all three `bin/diagram-open` files — it must keep them
  byte-identical, and this plan's Step 1 check will hold it to that.
- **Plan 023** (Geist token rename) rewrites the four token blocks — Step 2's
  comparator will hold that rename to all four copies in lockstep. That is the
  intended payoff; mention this plan in 023's review.
- A reviewer should confirm the new checks fail on a seeded violation (not just
  pass today), and that the allowed-delta list matches the real per-type
  differences rather than being over-broad enough to let real drift through.
- Deferred: actually de-duplicating `bin/diagram-open` into one shared script is
  **not** done here — each plugin installs independently, so a shared script
  needs a real distribution answer (that is what
  `plugins/diagrams/plans/001-fix-distribution-and-versioning.md` was about).
  This plan only prevents silent divergence of the copies.
