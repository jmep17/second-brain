# Plan 041: Surface needs-triage feedback so the queue stops being write-only

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> This is a **direction/design plan**: Step 1 (the hook count) is a concrete,
> shippable change; Step 2 (the inbox view) is a design spike with open
> questions to resolve before building. Do Step 1, then produce the Step 2
> design and STOP for owner input on the open questions — do not build the
> inbox view speculatively.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- plugins/diagrams/hooks/ready-feedback-nudge.sh site/lib/artifact-feedback.ts site/app/artifacts/page.tsx site/lib/artifacts.ts`
> If any changed, compare the "Current state" excerpts against the live code
> before proceeding; on a mismatch, treat it as a STOP condition.

## At a glance

- **What**: Add a needs-triage batch count to the session-start hook so open feedback batches are surfaced without themselves authorizing autonomous work.
- **Why**: The feedback widget's default output is `needs-triage`, but nothing in the system ever surfaces it again, so the default path is a write-only queue — as already happened to two of three owner-approved options in one real batch.
- **Next action**: Step 1 — add a needs-triage count to the session-start hook

## Status

- **Priority**: P2
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: plans/024-verification-baseline.md (only for any new lib
  tests in Step 2; Step 1 needs no test runner)
- **Category**: direction
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

The artifact platform's whole premise is that feedback on a page becomes work.
But the feedback widget's **default** output is `Status: needs-triage`, and
nothing in the system ever surfaces a `needs-triage` batch again — the
session-start nudge hook explicitly *rejects* that status and counts only
`ready-for-agent` + `Execution: queued`. So the default path is a write-only
queue: the owner submits feedback, sees a success response, and it silently
disappears. This is not hypothetical — `.scratch/artifact-feedback/issues/03-…`
is a `needs-triage` batch from 2026-08-27 in which the owner approved three
options ("Geist review chrome", "Review inbox", "Now strip on home"); only the
first became a plan, and the other two have no record anywhere. Ironically,
"Review inbox" — the fix for this very problem — is one of the stranded items.
Surfacing open batches closes the loop; the strict boundary is that surfacing
must never itself authorize autonomous work.

## Current state

### The write-only path

- `site/lib/artifact-feedback.ts:225` — the issue renderer sets status from a
  single boolean:

  ```ts
  const status = payload.readyForAgent ? "ready-for-agent" : "needs-triage";
  const execution = payload.readyForAgent ? "Execution: queued\n" : "";
  ```

  So a batch filed without `readyForAgent` is `needs-triage` with no
  `Execution:` line.

- `plugins/diagrams/hooks/ready-feedback-nudge.sh` — a `UserPromptSubmit` hook
  (registered in `plugins/diagrams/hooks/hooks.json`) that lists authorized
  batches at session start. It **skips** `needs-triage`:

  ```bash
  # rejects any issue with a `Status: needs-triage` line
  if awk 'NR > 8 && $0 == "Status: needs-triage" { found=1; exit } END { exit(found ? 0 : 1) }' \
    "$issue" >/dev/null 2>&1; then
    continue
  fi
  # then counts only the strict 8-line ready+queued header:
  #   [0] "# …"  [1] ""  [2] "Status: ready-for-agent"  [3] "Execution: queued"
  #   [4] "Kind: feedback|rfc"  [5] "Artifact: artifacts/….html"
  #   [6] "Date: YYYY-MM-DD"     [7] ""
  count=$((count + 1))
  ...
  # final output:
  printf 'artifact feedback queue: %d ready+queued batch(es)\n' "$count"
  ```

  Its closing message tells the agent these batches "were explicitly
  authorized." That authorization gate is correct and must be preserved — the
  problem is only that **non-authorized** batches are invisible, not that they
  should be auto-run.

- The stranded evidence: `.scratch/artifact-feedback/issues/03-approve-geist-review-chrome-review-inbox-now-strip-on-home.md`:

  ```
  Status: needs-triage
  Kind: feedback
  Artifact: artifacts/decisions/2026-08-27-artifacts-workflow-direction.html
  Date: 2026-08-27

  Approved options: Geist review chrome; Review inbox; Now strip on home. Turn these into plans.

  ## Comments
  ```

  Its sibling `04-…md` is `Status: resolved` only because the owner claimed it
  by hand in an interactive session.

### The surfaces that could show open batches

- `site/app/artifacts/page.tsx` — the `/artifacts` index. Currently lists
  generated artifact HTML by type (via `listArtifacts()` from
  `site/lib/artifacts.ts`), each linking to `/artifacts/review/<type>/<file>`.
  It does **not** read `.scratch/artifact-feedback/issues/` at all.
- `site/lib/artifacts.ts` — already knows `feedbackDir`
  (`.scratch/artifact-feedback/issues`) and has `nextIssueNumber()` reading it;
  a batch-listing helper would live naturally here.

### The boundary that must not move

- `CLAUDE.md` "Artifact feedback queue": "Only feedback with `Status:
  ready-for-agent` and `Execution: queued` authorizes autonomous work." An
  inbox that surfaces batches must be **read-only**; any action that promotes a
  batch to `ready-for-agent`/`queued` is a human decision and, once plan 026
  lands, must go through its token-gated dispatch endpoint — never by writing
  the marker directly.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat c0ee11c..HEAD -- plugins/diagrams/hooks/ready-feedback-nudge.sh site/app/artifacts/page.tsx site/lib/artifacts.ts` | empty (or handle per STOP) |
| Shell syntax | `bash -n plugins/diagrams/hooks/ready-feedback-nudge.sh` | exit 0 |
| Plugin checks | `bash tools/check-plugins.sh` | `all checks passed`, exit 0 |
| Typecheck (if Step 2 built) | `cd site && bun run typecheck` | exit 0 |
| Tests (if Step 2 built) | `cd site && bun test` | all pass (needs plan 024) |

## Scope

**In scope**:
- Step 1: `plugins/diagrams/hooks/ready-feedback-nudge.sh`
- Step 2 (design only, unless owner approves build): a design note appended to
  this plan or written to `.scratch/artifact-feedback/` describing the inbox;
  if built, `site/lib/artifacts.ts` (batch-listing helper), `site/app/artifacts/page.tsx`
  (or a new `site/app/inbox/` route), and a colocated test.
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- The `ready-for-agent` + `queued` authorization gate in the hook — surface
  additional info, never widen what counts as authorized.
- `site/lib/artifact-feedback.ts` renderer defaults — do not change what status
  the widget writes; the fix is surfacing, not re-defaulting. (If the owner
  later wants the default changed, that's a separate decision.)
- Any code that sets `Status: ready-for-agent` / `Execution: queued` — this
  plan adds no promotion path. Promotion is plan 026's dispatch endpoint.
- `site/app/artifacts/review/[...file]/` and the reviewer component.

## Git workflow

- Branch: `advisor/041-surface-needs-triage-feedback`
- Commit Step 1 on its own (e.g. `feedback: surface needs-triage count at
  session start`). Do not commit a speculative inbox build.
- Do NOT push or open a PR.

## Steps

### Step 1 (ship now): add a needs-triage count to the session-start hook

Extend `plugins/diagrams/hooks/ready-feedback-nudge.sh` so that, in addition to
the existing "ready+queued" count, it tallies open `needs-triage` batches and
prints a separate advisory line. Requirements:

- Do **not** alter the existing ready+queued detection or its "explicitly
  authorized" message — only add a second, clearly-separate count.
- The new line must make clear these are **not** authorized for autonomous work
  — they are awaiting the owner's triage. Example output shape:

  ```
  artifact feedback queue: 2 ready+queued batch(es)
  - .scratch/artifact-feedback/issues/07-....md
  needs triage: 3 open batch(es) awaiting your review (not authorized to run)
  - .scratch/artifact-feedback/issues/03-....md
  ```

- Count a batch as needs-triage when its header carries `Status: needs-triage`
  (mirror the existing filename filter `^[0-9]+-[A-Za-z0-9][A-Za-z0-9._-]*\.md$`
  and the "only trust the top-of-file header, not body lines" discipline the
  hook already uses — reuse the same 8-line/`head -n 8` approach so a body line
  reading `Status: needs-triage` can't inflate the count; a genuine needs-triage
  header has the marker in the metadata block, not below it).
- Keep the 5-path display cap the ready branch uses.
- Preserve `set -uo pipefail` and `exit 0` on the empty case.

**Verify**:
- `bash -n plugins/diagrams/hooks/ready-feedback-nudge.sh` → exit 0.
- Run the hook against the current repo: `bash plugins/diagrams/hooks/ready-feedback-nudge.sh`
  from the repo root → output includes a `needs triage:` line counting at least
  the `03-…` batch (it is `Status: needs-triage` today).
- `bash tools/check-plugins.sh` → exit 0 (it `bash -n`-checks this file).

### Step 2 (design spike — do NOT build without owner sign-off): the inbox view

Write a short design (append to this plan under a `## Design: inbox view`
heading, or a note under `.scratch/artifact-feedback/`) for a read-only inbox
that lists every non-resolved batch (`needs-triage`, `ready-for-human`,
`blocked`) with its artifact link, status, and date, read from
`.scratch/artifact-feedback/issues/`. The design must resolve these **open
questions** (each with a recommended answer) before any build:

1. **Location** — a section on `/artifacts` (`site/app/artifacts/page.tsx`,
   reusing `DocsLayout`) vs. a dedicated `/inbox` route. *Recommend*: a section
   on `/artifacts` first (least surface, the index is already where batches'
   artifacts are linked); promote to `/inbox` only if it grows.
2. **Resolved history** — show only open batches, or a collapsed "resolved"
   list too? *Recommend*: open-only by default; resolved are in git history.
3. **Actions** — read-only links only, or an affordance to act? *Recommend*:
   read-only links to the artifact and the issue file for now. Any "approve"
   action is explicitly deferred to plan 026's token-gated dispatch endpoint —
   the inbox must not write status markers. State this as a hard constraint.
4. **Data source** — a new `listOpenBatches()` helper in `site/lib/artifacts.ts`
   parsing the header block (same header discipline as the hook). Note it should
   reuse whatever issue-status reader plan 030 introduces if that lands first,
   to avoid a third parser (coordinate; do not duplicate).

If — and only if — the owner approves the build after reviewing the design,
implement the recommended minimal version: a `listOpenBatches()` helper (with a
`bun:test`, following `site/lib/artifact-feedback.test.ts` as the pattern) and
an "Open feedback" section on `/artifacts`. That build depends on plan 024 for
the test runner.

**Verify (design step)**: the design note exists and answers all four open
questions. No code changed in this step unless the owner approved the build, in
which case `cd site && bun run typecheck` and `cd site && bun test` pass.

## Test plan

- Step 1: verified by running the hook (above) — no unit test framework needed
  for a bash hook; `bash -n` + a live run against the real queue is the gate.
- Step 2 build (only if approved): add `listOpenBatches()` cases to a
  `site/lib/artifacts.test.ts` (or extend one created by plan 024/028) —
  happy path (a needs-triage batch is listed), a resolved batch is excluded, a
  malformed/body-only `Status:` line is not miscounted. Model after
  `site/lib/artifact-feedback.test.ts`.

## Done criteria

Step 1 (always):

- [ ] `bash -n plugins/diagrams/hooks/ready-feedback-nudge.sh` → exit 0
- [ ] Running the hook prints a `needs triage:` count that includes the `03-…`
      batch, on a line clearly marked as not authorized to run
- [ ] The existing ready+queued detection and its "explicitly authorized"
      message are unchanged (`git diff` shows only additions)
- [ ] `bash tools/check-plugins.sh` → exit 0

Step 2 (design):

- [ ] A design note exists resolving all four open questions with recommendations
- [ ] No inbox code was built without explicit owner approval

- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The hook's current ready+queued logic differs from the "Current state"
  excerpt (drift since `c0ee11c`) — the count you add must sit alongside the
  real current logic, not a stale copy.
- Implementing the needs-triage count cleanly seems to require relaxing the
  header discipline (trusting body lines) — do NOT; report instead. False
  negatives are safer than miscounts.
- Any step appears to need writing a `ready-for-agent`/`queued` marker — that
  is out of scope and crosses the authorization boundary; stop.
- After the Step 2 design, before building the inbox — always stop here for
  owner sign-off on the open questions.

## Maintenance notes

- The header-parsing discipline (trust only the top metadata block, never body
  lines) is shared by the hook and any future inbox reader; a reviewer should
  confirm every new consumer of issue files honors it — this is the same
  spoofing surface plan 028 hardens on the writer side.
- If plan 026 (separate filing from dispatch) lands, the inbox's "no promotion"
  boundary is enforced by routing any approve action through its token-gated
  dispatch endpoint. If plan 030 lands an issue-status reader, the inbox should
  reuse it rather than adding a third parser.
- The two stranded options in `issues/03-…` ("Review inbox", "Now strip on
  home") still need owner triage regardless of this plan — surfacing them is the
  point, but this plan does not itself plan or build them.
- Deferred: changing the widget's default status away from `needs-triage`. Left
  out because the default is a deliberate safety choice (nothing auto-authorizes);
  revisit only if triage volume makes it friction.
