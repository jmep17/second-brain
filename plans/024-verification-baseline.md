# Plan 024: One command proves the codebase works — `bun run verify`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0ee11c..HEAD -- package.json site/package.json site/lib .husky/pre-commit plugins/diagrams tools/check-plugins.sh AGENTS.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## At a glance

- **What**: Add a root `bun run verify` entry point that typechecks the site, runs its unit tests, runs the diagrams plugin's regression suite, and validates every plugin.
- **Why**: The site writes dotfiles, applies chezmoi against `$HOME`, commits to git, and spawns autonomous agent runs, and no command currently proves any of it works.
- **Next action**: Step 1 — Make `bun test` runnable and typechecked in `site/`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

This repo's site writes dotfiles, runs `chezmoi apply` against `$HOME`, commits
to git, and spawns autonomous `claude` agent runs with `--permission-mode
acceptEdits` — and there is currently **no command that proves any of it
works**. The only unit test file is run by nothing, the guard functions that
confine those privileged operations have zero tests, and pre-commit checks
formatting only. Several upcoming plans (025, 026, 028, 029, 030, 032, 033,
036, 041) change security-relevant code; they need a verification baseline to
land safely. After this plan, `bun run verify` at the repo root is the single
entry point that typechecks the site, runs its unit tests, runs the diagrams
plugin's regression suite, and validates every plugin.

## Current state

Files involved:

- `package.json` (repo root) — scripts are only `{"prepare": "husky"}`; devDeps are husky, lint-staged, prettier.
- `site/package.json` — scripts: `sync-assets`, `dev`, `build`, `start`, `test:artifact-review`, `typecheck` (`next typegen && tsc --noEmit`). **No `test` script.** No `@types/bun` in devDependencies.
- `.husky/pre-commit` — the entire gate, two lines:
  ```
  bunx lint-staged
  bash tools/check-plugins.sh
  ```
- No `.github/` directory exists anywhere — there is no CI of any kind.
- `site/lib/artifact-feedback.test.ts:1-2` — the repo's ONLY unit test file:
  ```ts
  // @ts-nocheck -- Bun supplies bun:test at runtime; the site omits Bun globals.
  import { describe, expect, test } from "bun:test";
  ```
  It has 8 test cases covering `parseFeedbackPayload` / `renderFeedbackIssue`
  (the code that decides whether an autonomous agent run is authorized), is
  actively maintained (changed 5× in the last 40 commits), and **nothing runs
  it**. The `@ts-nocheck` means `tsc --noEmit` also skips it even though
  `site/tsconfig.json:20` includes `**/*.ts`.
- `plugins/diagrams/package.json:6` — `"test": "bash tools/check.sh && bash test/ready-feedback-nudge.sh"`. `test/ready-feedback-nudge.sh` is a real regression matrix (temp-dir git fixtures covering absent/empty/needs-triage/body-evidence cases) for the hook that nudges agents to execute queued feedback. Pre-commit only `bash -n` syntax-checks it (`tools/check-plugins.sh:59`) — its assertions never run. Note `tools/check.sh` is just `exec bash "$(git rev-parse --show-toplevel)/tools/check-plugins.sh"`, i.e. the first half of the plugin's `test` duplicates what pre-commit already runs.

Untested pure guard functions (the highest-blast-radius logic in the repo, all
dependency-free string logic — the cheapest possible tests):

- `site/lib/config-files.ts:22-28` — `resolveSource(rel)`: the sole boundary keeping `PUT /api/config/file` writes inside `dotfiles/`:
  ```ts
  export function resolveSource(rel: string): string {
    const abs = path.resolve(dotfilesDir, rel);
    if (abs !== dotfilesDir && !abs.startsWith(dotfilesDir + path.sep)) {
      throw new Error(`path escapes dotfiles/: ${rel}`);
    }
    return abs;
  }
  ```
- `site/lib/config-files.ts:38-47` — `isChezmoiMeta(rel)`: five branches deciding between a single-file `chezmoi apply` and a **full** `chezmoi apply --force` over `$HOME` (checks `.chezmoiignore*`, `.chezmoiremove*`, `.chezmoi.toml.tmpl`, a `.chezmoidata` path segment, and `run_*` basenames).
- `site/lib/artifacts.ts:18-27` — `resolveArtifact(rel)`: same containment shape as `resolveSource` plus an `.html`-suffix requirement; guards both the artifact-serving route and the feedback API.
- `site/lib/artifacts.ts:71-83` — `nextIssueNumber()`: parses `NN-` prefixes in `.scratch/artifact-feedback/issues/` and returns max+1 zero-padded.
- `site/lib/artifact-run.ts:12,18-20` — `validIssueFilename(name)`: regex `/^\d+-[A-Za-z0-9][A-Za-z0-9._-]*\.md$/` — the only validation on the filename interpolated into the prompt of a spawned autonomous agent run.

Repo conventions: TypeScript, bun everywhere; tests use `bun:test` with
`describe`/`test`/`expect` — see `site/lib/artifact-feedback.test.ts` for the
house style (a table of cases via helper functions, plain assertions, no
mocking).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (site) | `cd site && bun install` | exit 0 |
| Typecheck | `cd site && bun run typecheck` | exit 0 (writes into `.next/` and `tsconfig.tsbuildinfo` — expected) |
| Unit tests (after step 1) | `cd site && bun test` | all pass |
| Plugin checks | `bash tools/check-plugins.sh` | "all checks passed", exit 0 |
| Plugin regression suite | `bash plugins/diagrams/test/ready-feedback-nudge.sh` | exit 0 |
| Full gate (after step 4) | `bun run verify` (repo root) | exit 0 |

## Scope

**In scope** (the only files you should modify):

- `package.json` (repo root) — add `verify` script
- `site/package.json` — add `test` script and `@types/bun` devDep
- `site/bun.lock` — regenerated by `bun install` for the new devDep
- `site/lib/artifact-feedback.test.ts` — remove `@ts-nocheck`, fix surfaced type errors *in this file only*
- `site/lib/config-files.test.ts` (create)
- `site/lib/artifacts.test.ts` (create)
- `site/lib/artifact-run.test.ts` (create)
- `AGENTS.md` and `CLAUDE.md` — add a short "Verification" note (these two files are kept byte-identical; edit both the same way)

**Out of scope** (do NOT touch, even though they look related):

- Any file under `site/lib/` other than the test files — this plan adds tests for the guards **as they are**; if a test reveals a weakness, record it, don't fix it (plans 028/029 own the fixes).
- `.husky/pre-commit` — leave unchanged (see step 5 note).
- `tools/check-plugins.sh`, `plugins/diagrams/tools/*` — plan 034 owns the check-script cleanup.
- `site/scripts/test-artifact-review.mjs` — the Playwright harness stays manual; plan 032's work touches it.
- Adding CI (`.github/workflows/`) — deferred; this plan establishes the local command CI would later call.

## Git workflow

- Branch: `advisor/024-verification-baseline`
- Commit per step; message style: lowercase prefix, e.g. `test: wire bun test into site/`, `test: cover path-guard functions` (matches `git log --oneline` style like `site: …`, `plans: …`).
- Do NOT push or open a PR.

## Steps

### Step 1: Make `bun test` runnable and typechecked in `site/`

1. In `site/package.json`, add to `"scripts"`: `"test": "bun test"`, and to `"devDependencies"`: `"@types/bun": "^1.2.0"` (any current ^1 release is fine).
2. Run `cd site && bun install`.
3. Delete line 1 of `site/lib/artifact-feedback.test.ts` (the `// @ts-nocheck` comment).
4. Run `cd site && bun run typecheck`. If it reports errors **inside `artifact-feedback.test.ts`**, fix them in that file (they will be type drift between the test and `artifact-feedback.ts`). If it reports errors in any *other* file, see STOP conditions.

**Verify**: `cd site && bun test` → 8+ tests pass, exit 0. `cd site && bun run typecheck` → exit 0.

### Step 2: Add guard-function tests

Create three `bun:test` files, modeled structurally on
`site/lib/artifact-feedback.test.ts` (helper + table of cases). Cover at
minimum:

- `site/lib/config-files.test.ts`
  - `resolveSource`: accepts `dot_config/tmux/tmux.conf` (returns an absolute path under `dotfiles/`); throws on `../CLAUDE.md`, `../../etc/passwd`, an absolute path like `/etc/passwd`, and a mid-path escape like `a/../../b`. Accepts nested new paths (`dot_config/new/file.conf`).
  - `isChezmoiMeta`: true for `.chezmoiignore`, `.chezmoiignore.tmpl`, `.chezmoiremove.tmpl`, `.chezmoi.toml.tmpl`, `.chezmoidata/skills.toml`, `run_after_prune.sh.tmpl`, and a nested `scripts/run_once_setup.sh`; false for `dot_config/tmux/tmux.conf`, `dot_zshrc`, and a file merely *containing* "run\_" mid-name (`dot_run_thing` — basename starts with `dot_`, expect false; assert whatever current behavior is and note it).
- `site/lib/artifacts.test.ts`
  - `resolveArtifact`: accepts `diagrams/2026-08-26-x.html`; throws on `../wiki/index.md`, `diagrams/../../x.html`, and any non-`.html` (`diagrams/x.md`, `diagrams/x`).
  - `nextIssueNumber`: this reads the real `feedbackDir` — test only the pure part you can reach: if the function can't be tested without touching the live dir, assert its behavior against the existing `.scratch/artifact-feedback/issues/` read-only (returns a zero-padded string strictly greater than every existing `NN-` prefix). Do not create or delete files there.
- `site/lib/artifact-run.test.ts`
  - `validIssueFilename`: accepts `01-fix-thing.md`, `123-a.b_c-d.md`; rejects `../01-x.md`, `01-x.txt`, `x.md` (no number), `01-.md`, `01-$(cmd).md`, names with `/`, spaces, or newlines, and the empty string.

**Verify**: `cd site && bun test` → all pass (8 original + your new cases); `cd site && bun run typecheck` → exit 0.

### Step 3: Root `verify` script

In the root `package.json`, add:

```json
"scripts": {
  "prepare": "husky",
  "verify": "cd site && bun run typecheck && bun test && cd .. && bash tools/check-plugins.sh && bash plugins/diagrams/test/ready-feedback-nudge.sh"
}
```

(One chained script is fine; `plugins/diagrams`'s own `test` script is NOT
called because its first half re-runs `tools/check-plugins.sh` — call the
regression suite directly instead to avoid the duplicate.)

**Verify**: `bun run verify` at the repo root → exit 0, output ends with the plugin checks passing and the nudge suite exiting cleanly.

### Step 4: Document the entry point

In `AGENTS.md`, add a short section (and make the identical edit in
`CLAUDE.md` — the two files are intentionally byte-identical; after editing,
`diff AGENTS.md CLAUDE.md` must be empty):

```markdown
## Verification

`bun run verify` at the repo root is the single gate: site typecheck, site
unit tests (`bun test`), plugin manifest/shell checks, and the diagrams
plugin's hook regression suite. Run it before claiming any change works.
(`cd site && bun run test:artifact-review` is the manual Playwright pass;
it needs a running server and `ARTIFACT_REVIEW_BASE_URL`.)
```

Pre-commit is deliberately left as-is (prettier + plugin checks): `verify`
runs a full typecheck and can take tens of seconds, which is hostile as a
commit-time gate. The tradeoff is documented here instead of enforced.

**Verify**: `diff AGENTS.md CLAUDE.md` → no output. `git diff --stat` → only in-scope files changed.

## Test plan

The new tests ARE the deliverable. Summary of coverage added:

- `resolveSource` / `resolveArtifact`: containment escapes (`..`, absolute, mid-path), suffix rules.
- `isChezmoiMeta`: every branch, including the `run_` and `.chezmoidata` cases that trigger a full `$HOME` apply.
- `validIssueFilename`: shell-metacharacter and traversal rejects for the string that reaches a spawned agent prompt.
- Pattern to follow: `site/lib/artifact-feedback.test.ts`.
- Verification: `cd site && bun test` → all pass.

## Done criteria

ALL must hold:

- [ ] `cd site && bun test` exits 0; runs the original 8 cases plus new tests in 3 new files
- [ ] `site/lib/artifact-feedback.test.ts` no longer contains `@ts-nocheck` (`grep -c ts-nocheck site/lib/artifact-feedback.test.ts` → 0)
- [ ] `cd site && bun run typecheck` exits 0
- [ ] `bun run verify` at repo root exits 0
- [ ] `diff AGENTS.md CLAUDE.md` produces no output
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Removing `@ts-nocheck` surfaces type errors in files *other than* `site/lib/artifact-feedback.test.ts` — that means the site's tsconfig treats test files differently than assumed; report the error list.
- A new guard test FAILS against current behavior — e.g. `resolveSource` accepts an escape you expected it to reject. Do not "fix" the guard (plans 028/029 own guard changes); record the failing case as a comment with `test.todo(...)`, report it, and continue.
- `bun install` in `site/` changes `site/bun.lock` beyond adding `@types/bun` and its dependencies (unexpected resolution churn).
- The `ready-feedback-nudge.sh` suite fails on a clean checkout — the suite itself may be broken; report its output rather than patching the hook or the suite.
- The code at the "Current state" locations doesn't match the excerpts.

## Maintenance notes

- Every future plan's "Commands you will need" table should list `bun run verify` as the final gate; plans 025–042 were written assuming it exists.
- If CI is ever added, the workflow should call `bun run verify` rather than re-encoding the steps.
- When plan 034 dedupes `plugins/diagrams/tools/check.sh`, the `verify` chain here is unaffected (it calls `tools/check-plugins.sh` and the nudge suite directly).
- `nextIssueNumber`'s error-swallowing (bare `catch` → `"01"`) is a known defect fixed in plan 028 — the test written here asserts *current* behavior and will be extended there.
