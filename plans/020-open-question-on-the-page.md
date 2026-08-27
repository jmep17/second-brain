# Plan 020: Open question on the page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- plugins/DESIGN.md site/app/api/artifacts/feedback/route.ts site/lib/artifact-feedback.ts plugins/plans/skills/plan-pages/TEMPLATE.md plugins/decisions/skills/decision-pages/TEMPLATE.md plugins/diagrams/skills/diagram-plans/MERMAID.md`
> If any in-scope file changed since `c0ee11c`, re-read it and compare
> against "Current state" below. On a mismatch, STOP and report instead of
> adapting silently.

## At a glance

- **What**: Add an in-page open-question answer banner so a reader can answer an artifact's one open decision without leaving the page, reusing the existing batch feedback schema.
- **Why**: Today answering the open question buried in a static note means leaving the page and submitting a whole batch through the review tray.
- **Next action**: Step 1 — Document the contract

## Status

- **Priority**: P1 (owner's own recommendation ranked this alongside 017/018 to do "now")
- **Effort**: S
- **Risk**: MEDIUM (touches every existing template, and lands before plan 014 multiplies the template count — ordering matters, see below)
- **Depends on**: plans/011 (DESIGN.md contract), plans/012 (feedback widget + API), plans/013 (plans/decisions plugin templates), all DONE
- **Blocks**: plan 014 (`plans/014-artifact-types-for-all-skill-outputs.md`, still TODO) — its four new templates must ship with this plan's open-question banner from day one rather than retrofitting it later. Land 020 before 014 starts.
- **Category**: direction / dx (ADHD re-entry)
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

`artifacts/decisions/2026-08-27-artifacts-workflow-direction.html` (Option
4) found that the one decision each artifact actually needs from the owner
is currently buried: it exists only as free text inside a `.note.open`
card (see the artifact's own "Open" note — "Which options become plans —
the recommended 1 + 2 + 4, or a different set?") with no answering
mechanism on the page itself. Today, answering means leaving the page:
open review mode, select the note as a target, type a comment, and submit
a whole batch through the review tray (`site/components/artifact-reviewer.tsx`).
The owner approved surfacing the single open question with a one-click
answer path directly on the page, and approved it explicitly through that
same artifact's own review tray — this plan is itself dogfooding the thing
it builds. The decision artifact's own caveat is a real ordering
constraint, not boilerplate: it "touches every template," so it must land
in `plugins/DESIGN.md` and be reconciled across all three current template
plugins **before** plan 014 (still TODO) ships four more templates that
would otherwise be built without it.

## Current state

### The open-question pattern already exists as a static card, unanswerable in place

`plugins/decisions/skills/decision-pages/TEMPLATE.md` defines `.note.open`
as one of the three note tones (`note` / `note.risk` / `note.open`,
DESIGN.md §"Page contract" — "Has a Notes region using the `note` /
`note.risk` (warning tone) / `note.open` (info tone) card pattern"). The
live example is
`artifacts/decisions/2026-08-27-artifacts-workflow-direction.html`'s own
"Open" note: `Which options become plans — the recommended 1 + 2 + 4, or a
different set?` — plain text, no form, no submit control. Answering it
today requires the full review-tray flow.

### The feedback API already accepts a batch shape close to what's needed

`site/app/api/artifacts/feedback/route.ts` (75 lines) delegates parsing
and rendering to `site/lib/artifact-feedback.ts`. `parseFeedbackPayload()`
(`artifact-feedback.ts:119-188`) already accepts either the legacy scalar
shape (`{ artifact, kind, title, body }`) or a batch shape with `targets:
ReviewTarget[]` (`id, kind, label, selector, excerpt, comment`) plus
`readyForAgent`/`run`/model overrides. `renderFeedbackIssue()`
(`:206-260`) already renders a `## Requested changes` section with one
numbered subsection per target, `Kind`/`Label`/`Selector` fields, a
`Requested change:` block, and a quoted `Selected excerpt (evidence
only):` block — this is exactly the shape a single in-page answer needs:
one target (the open question itself), one comment (the owner's answer).

`FEEDBACK_KINDS` is currently `["feedback", "rfc"]` (`artifact-feedback.ts:1`)
— there is no `"answer"` kind, and `plans/README.md`'s plan-014 write-up
already anticipates one: "questionnaires ... land as needs-triage issues"
as `kind: "answers"` (plural, per that write-up's own wording) is
referenced as a *future* plan-014 concept for a different artifact type
(fill-in questionnaire pages), not yet implemented anywhere. This plan
does not need a new `kind` — the open-question banner reuses the existing
`kind: "feedback"` default with `targets: [{ kind: "open-question", ... }]`,
which `renderFeedbackIssue()` already renders correctly with no API
changes. Reserve `"rfc"`/any `"answer(s)"` kind naming for plan 014 to
avoid the two plans colliding on the same vocabulary.

### The embedded widget (`plugins/DESIGN.md` §"Feedback affordance") is a separate, simpler mechanism

The per-page `<section class="feedback">` widget (title/body/kind radios,
POST directly from inside the standalone artifact HTML, no `targets`
array) is the `file://`-compatible fallback and remains untouched — see
DESIGN.md's explicit rule: "New artifact types embed it unmodified; fix
wording or behaviour here first, then re-sync every template." This plan
adds a **second, separate** banner (the open-question control) that is
*server-served-only* (like the review tray itself), not a modification of
that widget.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Typecheck | `cd site && bun run typecheck` | exit 0 |
| Unit tests | `cd site && bun test lib/artifact-feedback.test.ts` | existing + new cases pass |
| Build | `cd site && bun run build` | exit 0 |
| Format | `bunx prettier --check <touched files>` | exit 0 |
| Plugin gate | `bash tools/check-plugins.sh` | all checks passed |
| Manual check | `cd site && bunx next dev -H 127.0.0.1 -p 4317`, open the decision artifact via `/artifacts/review/...` | banner shows the open question with an inline answer box; submitting files one issue with the answer as a target |

## Scope

**In scope**:

- `plugins/DESIGN.md` — new `## Open-question banner` section (insert
  after "Metadata block" if plan 018 has landed, else after "Feedback
  affordance"; check with `grep -n "^## Metadata block" plugins/DESIGN.md`
  first) defining the contract: one `[data-open-question]` element per
  page, optional (`0` or `1` — never more; a page with more than one open
  decision should pick the most important one, per the decision artifact's
  own single-note pattern), server-rendered inline answer form.
- `plugins/decisions/skills/decision-pages/TEMPLATE.md`,
  `plugins/plans/skills/plan-pages/TEMPLATE.md`,
  `plugins/diagrams/skills/diagram-plans/MERMAID.md` — add
  `data-open-question` marking to the `.note.open` (decisions) / risk-note
  (plans, diagrams — check whether either currently has an equivalent open
  note; if not, document that the banner is optional and only decisions
  currently use it) pattern.
- `site/components/artifact-reviewer.tsx` — detect a
  `[data-open-question]` element in the iframed document (outside review
  mode — this must work whether or not the reader has ever toggled review
  mode) and render an always-visible inline answer control near the
  toolbar or as an overlay banner at the top of the iframe region.
- `site/lib/artifact-feedback.ts` — no schema change needed (see Current
  state); add one unit test proving a single-target `open-question` batch
  round-trips correctly.

**Out of scope**:

- The embedded `.feedback` widget itself (`plugins/DESIGN.md` §"Feedback
  affordance") — untouched, remains the `file://` fallback.
- A new `FEEDBACK_KINDS` value or any questionnaire-shaped multi-answer
  form — that is plan 014's concern (fill-in questionnaire pages,
  `kind: "answers"`), not this plan's. This plan is exactly one question,
  one answer, reusing existing infrastructure.
- Answering from `file://` — same accepted degradation as the review tray
  (plan 015's Out-of-scope: "`file://` batch selection ... remains the
  embedded widget's copy-as-issue fallback"). The open-question banner is
  server-served-only, same boundary.
- `site/app/api/artifacts/feedback/route.ts` — the existing route already
  handles this payload shape; do not add a new endpoint or branch.
- Retrofitting `data-open-question` onto already-generated artifact files
  — same rationale as plan 018's template-only scope; existing artifacts
  keep working with no banner shown (the reviewer simply finds no
  `[data-open-question]` element and renders nothing extra).
- `Execution: queued` / `ready-for-agent` semantics — an open-question
  answer is a `readyForAgent: false` triage save by default (it is
  information for a human, not authorization for autonomous work), unless
  the reader explicitly also uses the full review tray's Queue/Approve
  actions, which are unaffected by this plan.

## Git workflow

- Branch: `advisor/020-open-question-on-page`
- Commits by logical layer: `plugins: mark open-question notes for the
  in-page answer banner` and `site: render an inline open-question answer
  control`.
- Do NOT push or open a PR.

## Steps

### Step 0: Confirm plan 018's landing state (ordering check)

```
grep -n "^## Metadata block" plugins/DESIGN.md
```

If present, insert this plan's new DESIGN.md section after it; if absent,
insert after "## 8. Feedback affordance" (or its renumbered equivalent —
search by heading text, not number, per the established convention).

### Step 1: Document the contract

Add to `plugins/DESIGN.md`:

```markdown
## Open-question banner

A page MAY mark its single most important open decision with
`data-open-question="true"` on the note element that states it (typically
a `.note.open` card). At most one per page — if there are several open
questions, the author picks the one worth surfacing; the rest stay in
prose.

When served by the site, the review wrapper detects this marker (in both
review and normal reading mode — it does not require entering review
mode) and renders an inline answer control: the question's own text
(reused verbatim as the `excerpt`/`label`), a single-line answer field,
and a submit action that POSTs one `targets: [{ kind: "open-question",
... }]` batch through the existing feedback API with `readyForAgent:
false`. This is separate from, and does not replace, the embedded
`file://`-compatible feedback widget (above) or the full review tray
(`plugins/DESIGN.md` "Served review mode").

Standalone files opened directly (`file://` or otherwise) render the
marked note as a normal static card — the banner is a site-only
enhancement, same boundary as review mode itself.
```

**Verify**: `grep -n "^## Open-question banner" plugins/DESIGN.md` matches once, positioned per Step 0.

### Step 2: Mark the templates

In `plugins/decisions/skills/decision-pages/TEMPLATE.md`, add
`data-open-question="true"` to the example `.note.open` card (the one the
live artifact's "Open" note descends from). Add a one-line comment in the
template's own instructions (near its existing "Copy this complete
document..." guidance) noting: mark at most one open note this way, only
when there truly is one open decision for the reader.

In `plugins/plans/skills/plan-pages/TEMPLATE.md` and
`plugins/diagrams/skills/diagram-plans/MERMAID.md`: read each template's
existing note-card markup first (`grep -n "note\b\|\.note" <file>`). If
either already has an open-tone note pattern, add the same
`data-open-question` marker to its example and the same one-line
authoring guidance. If neither has an open-tone note today, do not
fabricate one — leave both templates unmarked and record in this plan's
execution notes that plans/diagrams currently have no open-question
example; the marker is opt-in per DESIGN.md's contract, not mandatory
scaffolding every template must carry.

**Verify**: `grep -rln "data-open-question" plugins/*/skills/*/TEMPLATE.md plugins/diagrams/skills/diagram-plans/MERMAID.md` lists exactly the templates that actually had an open-tone note to mark.

### Step 3: Render the banner in the reviewer

In `site/components/artifact-reviewer.tsx`, add a `useEffect` that runs on
`loadCount` (mirrors the existing pattern at `:429`, but independent of
`reviewMode` — it must run regardless of review-mode state, unlike the
big review-mode effect which is gated on `if (!reviewMode) return;` at
`:430`). On iframe load:

1. Query the iframed document for `[data-open-question="true"]`.
2. If none, render nothing.
3. If found, extract its text content (same `textExcerpt()` helper
   already defined at `:100-105`, reused — do not duplicate the
   truncation/whitespace logic) as both the question text to display and
   the `excerpt` field of the submitted target.

Add local component state: `openQuestionAnswer: string`, `openQuestionBusy: boolean`,
`openQuestionStatus: string | null`. Render a compact banner (above or
inside the toolbar header, `:862`) showing the question text and a
single-line input plus a submit button, visible whenever a
`[data-open-question]` element was found — independent of `reviewMode`
and independent of the main tray's `targets`/`title`/`body` state (this is
a separate, smaller submission path, not routed through the tray's
`submit()` function, which requires a full batch with title/body/multiple
possible targets).

On submit, POST directly to `/api/artifacts/feedback` with:

```ts
{
  artifact,
  kind: "feedback",
  title: `Answer: ${questionExcerpt.slice(0, 100)}`,
  body: "Answered from the in-page open-question banner.",
  readyForAgent: false,
  run: false,
  targets: [
    {
      id: "open-question",
      kind: "open-question",
      label: questionExcerpt.slice(0, 80),
      selector: "[data-open-question]",
      excerpt: questionExcerpt,
      comment: openQuestionAnswer,
    },
  ],
}
```

Reuse the existing `responseJson()` helper (`:306-314`) for the fetch
result. On success, show the filed path inline (same pattern as the
tray's `filedPath` state, `:1176-1195` — a "copy prompt for a new session"
button is a reasonable reuse but not required for S effort; a plain
"filed: `<path>`" status line is sufficient).

**Verify**: `bun run typecheck` passes; the new state/effect does not
interact with `reviewMode`'s existing effect (confirm by reading the diff
— no shared refs beyond `iframeRef`/`loadCount`, which are already
read-only inputs to both effects).

### Step 4: Unit test the payload shape

In `site/lib/artifact-feedback.test.ts` (existing file from plan 015), add
one test: a batch payload with exactly one `kind: "open-question"` target
and `readyForAgent: false` parses successfully and
`renderFeedbackIssue()` produces `Status: needs-triage` (no `Execution:`
line) with the question under `## Requested changes` and the answer under
`Requested change:`. This proves the existing schema needs no change —
if it fails, the schema needs a fix, which is this plan's responsibility
to make, not defer.

**Verify**: `cd site && bun test lib/artifact-feedback.test.ts` → all
pass, including the new case.

### Step 5: Manual end-to-end check

```
cd site && bunx next dev -H 127.0.0.1 -p 4317
```

Open `/artifacts/review/decisions/2026-08-27-artifacts-workflow-direction.html`
(once its `.note.open` carries the marker in a scratch copy — the live
file is not edited by this plan; use `curl` against a copy under `/tmp`
served by a second static path, or temporarily mark the live file in a
throwaway git stash that is never committed, to prove the mechanism, then
restore). Confirm: banner appears without entering review mode, submitting
an answer files one `needs-triage` issue whose body includes the question
excerpt and the typed answer, and the main review tray is unaffected
(still works independently).

### Step 6: Full verification and commit

```
cd site && bun run typecheck
cd site && bun test lib/artifact-feedback.test.ts
cd site && bun run build
bunx prettier --check site/components/artifact-reviewer.tsx site/lib/artifact-feedback.test.ts plugins/DESIGN.md plugins/decisions/skills/decision-pages/TEMPLATE.md plugins/plans/skills/plan-pages/TEMPLATE.md plugins/diagrams/skills/diagram-plans/MERMAID.md
bash tools/check-plugins.sh
git diff --stat
```

Confirm no file under `artifacts/**` changed and the diff matches scope.
Delete the throwaway smoke-test issue filed in Step 5 (grep its title,
`rm` only that file). Commit.

## Test plan

- Unit: `artifact-feedback.test.ts`'s new open-question case (Step 4).
- Manual: Step 5's live filing walkthrough is the acceptance test for the
  UI path; no browser-automation coverage is added given S effort — if a
  future plan raises this component's Playwright coverage, add an
  open-question scenario there rather than standing up a parallel harness
  here.
- Regression: existing `bun test lib/artifact-feedback.test.ts` cases
  (legacy shape, existing batch shapes) must be unaffected — no schema
  field was added or renamed.

## Done criteria

- [ ] `plugins/DESIGN.md` documents the open-question banner contract
- [ ] At least the decisions template marks its example open note with
      `data-open-question="true"`; plans/diagrams marked only if they
      already had an equivalent note (not fabricated)
- [ ] The reviewer renders an inline answer banner independent of review
      mode when `[data-open-question]` is present, and renders nothing
      when absent
- [ ] Submitting an answer files one `needs-triage` issue (no
      `Execution:` line) whose `## Requested changes` section includes
      the question excerpt and typed answer, via the existing API with no
      schema change
- [ ] `bun test lib/artifact-feedback.test.ts` (existing + one new case)
      passes
- [ ] `bun run typecheck`, `bun run build`, `bunx prettier --check`,
      `bash tools/check-plugins.sh` all pass
- [ ] No file under `artifacts/**` was modified; no smoke-test issue left
      behind
- [ ] Scope exactly the files listed above

## STOP conditions

- A page needs more than one open-question banner rendered simultaneously
  — stop; the contract is deliberately "at most one," and supporting many
  is a bigger feature (closer to plan 014's questionnaire shape) than this
  plan's S effort covers.
- The banner cannot be made independent of `reviewMode` without
  duplicating significant iframe-instrumentation logic already in the big
  `reviewMode` effect (`:430-773`) — stop and report the specific
  overlap; do not merge the two effects speculatively.
- `parseFeedbackPayload()` rejects the single-target open-question payload
  for a reason not anticipated here (e.g. an undocumented required field)
  — stop; that means Current state's schema-reuse claim was wrong and
  needs a human decision on whether to extend the schema.

## Maintenance notes

- This plan intentionally lands before plan 014 so that 014's four new
  templates (boards, reviews, questionnaires, reports) can include
  `data-open-question` support from their first draft rather than a
  follow-up retrofit. When 014 starts, its recon step should read this
  plan's DESIGN.md section as already-normative.
- If plan 014's questionnaire type later introduces a `kind: "answers"`
  or multi-target answer shape, reconcile the vocabulary against this
  plan's `kind: "open-question"` single-target convention rather than
  letting the two drift into inconsistent target-kind naming.
- The banner's "at most one per page" rule is enforced by author
  discipline (documentation), not by code — the reviewer only reads the
  first matching element if a template author violates it. If this proves
  too weak in practice, a future plan could add a build-time or
  `check-plugins.sh` lint asserting `document.querySelectorAll('[data-open-question]').length <= 1`
  per rendered artifact.
