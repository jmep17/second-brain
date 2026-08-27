# Plan 037: Extract the review-surface DOM engine out of `artifact-reviewer.tsx`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- site/components/artifact-reviewer.tsx site/scripts/test-artifact-review.mjs`
> This file is the single most-changed file in the repo. If **either** file has
> changed since `c0ee11c`, re-read it against the "Current state" excerpts and
> the line ranges below before touching anything; any mismatch is a STOP
> condition. See also the hard sequencing gate in Step 0.

## At a glance

- **What**: Extract the framework-agnostic DOM instrumentation engine out of `artifact-reviewer.tsx` into a plain, unit-testable module, leaving the component as state plus rendering.
- **Why**: The engine is trapped inside one 344-line `useEffect` closure in the repo's largest, highest-churn file, so it cannot be unit-tested and every unrelated change touches the same file.
- **Next action**: Step 1 — Capture the baseline

## Status

- **Priority**: P3
- **Effort**: L (multi-day)
- **Risk**: MED-HIGH
- **Depends on**: plans/032-artifact-target-discovery-fix.md (must land first —
  it edits the discovery code you are extracting) **and** coordinate with the
  pre-existing plans/017-geist-review-chrome.md (Geist restyle of this same
  file's markup). Recommended order: **032 → 017 → 037**.
- **Category**: tech-debt
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

`site/components/artifact-reviewer.tsx` is 1208 lines — the largest and
highest-churn file in the repo (9 of the last ~29 `site/` commits). One React
component holds four unrelated concerns: a framework-agnostic DOM
instrumentation engine (target discovery, id allocation, text-range capture, 16
capture-phase listeners, a `MutationObserver`, per-element style save/restore,
and the CSS Custom Highlight registry), a feedback form, a network client, and a
status poller. The engine is trapped inside a single 344-line `useEffect`
closure, so **it cannot be unit-tested at all**, and every change to any one
concern — the Geist restyle (plan 017), the discovery fix (plan 032), model
config — edits the same file, guarded only by one 547-line Playwright script.
Extracting the engine into a plain, imperative module makes it unit-testable and
shrinks the component to state + rendering, so the four concerns can evolve
independently.

## Current state

The file is `"use client"` (line 1). Structure, by region (verify line numbers
with the drift check — they are approximate anchors, not guarantees):

- **Module-scope pure helpers already extracted** (lines ~100–305): `textExcerpt`,
  `selectionExcerpt`, `selectionHash`, `elementForNode`, `textOffsetWithin`,
  `highlightApi`, `syncTextHighlights`, `isTextSelection`, `targetLabel`,
  `selectorFor`, `isExcluded`, and crucially `discoverTargets(doc, decorated,
  idForElement)` (lines ~228–305). These are the pure discovery/selector logic —
  **plan 032 fixes bugs inside `discoverTargets` and the `WRITING_TAGS`/
  `doc.defaultView!` usages here**, which is why 032 must precede this plan.
  The un-extracted part is the *stateful engine that drives them*.

- **The component** `ArtifactReviewer({ artifact, src })` starts at line ~316.
  It declares **5 refs** (lines ~323–327) and **15 useState** hooks
  (lines ~328–343):

  ```ts
  // site/components/artifact-reviewer.tsx:323
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeDocumentRef = useRef<Document | null>(null);
  const selectedRef = useRef<Record<string, ArtifactReviewSelection>>({});
  const ownedElementsRef = useRef<Set<HTMLElement | SVGElement>>(new Set());
  const textRangesRef = useRef<Map<string, Range>>(new Map());
  const [loadCount, setLoadCount] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, ArtifactReviewSelection>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"feedback" | "rfc">("feedback");
  const [executorModel, setExecutorModel] = useState<RunModel>("sonnet");
  const [reviewerModel, setReviewerModel] = useState<RunModel>("opus");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filedPath, setFiledPath] = useState<string | null>(null);
  const [watchIssue, setWatchIssue] = useState<string | null>(null);
  ```

  `selectedRef`, `ownedElementsRef`, and `textRangesRef` exist **only** to
  bridge the imperative DOM layer to React state.

- **The status-poll effect** (lines ~351–389): `setInterval(3000)` polling
  `/api/artifacts/feedback/status?issue=…`, gated on `watchIssue`. Self-contained
  network/timer logic — a natural `useReviewBatch` hook member. (Note: plan 030
  hardens this poll's terminal-state handling; if 030 has landed, preserve its
  logic when you move this into a hook.)

- **The engine effect** (lines ~429–773, deps `[loadCount, reviewMode,
  toggleTarget]`): the 344-line core. It builds local id/decoration maps, calls
  `discoverTargets`, wires 16 capture-phase listeners
  (`click`/`keydown`/`pointer*`/`mouse*`/`wheel`/`dblclick`/`dragstart`/
  `focusin`/`focusout`), installs a `MutationObserver(scheduleRefresh)`
  (line ~724), registers CSS highlights, and — critically — has a **cleanup path
  (lines ~743–772)** that removes every listener and calls `restoreElement` on
  each decorated element plus restores hidden feedback-widget `display` values.
  A botched extraction that drops any cleanup leaves artifacts **permanently
  decorated** (stuck outlines, tabindex, hidden widgets).

- **A small third effect** (lines ~775–790) re-syncs text highlights on
  `selected` change.

- **`submit(mode)`** (lines ~799–857): builds the POST body to
  `/api/artifacts/feedback` with `readyForAgent: mode !== "triage"` and
  `run: mode === "run"`. **Note the interaction with plan 026**, which changes
  the filing/dispatch contract and this exact call. If 026 has landed, do not
  regress its two-call (GET token → POST dispatch) flow when you move `submit`
  into a hook.

- **The JSX** (lines ~859–1207, ~350 lines): the iframe, the review tray, the
  model pickers (lines ~1098–1136), and the "copy prompt" affordance
  (~1176). **Plan 017 restyles this markup onto Geist tokens** — see Step 0.

Repo conventions to follow:

- New non-component modules live under `site/lib/` (e.g. `site/lib/artifacts.ts`,
  `site/lib/artifact-feedback.ts`). Match that: the engine goes in
  `site/lib/review-surface.ts`, the batch hook in
  `site/lib/use-review-batch.ts` (or `site/components/` if it must be a client
  hook file — keep the `"use client"` boundary correct).
- Tests are `bun:test`, colocated as `*.test.ts` — model after
  `site/lib/artifact-feedback.test.ts`. (`bun test` exists after plan 024.)
- Commit style: lowercase prefix, e.g. `site: extract review-surface engine`.

## Commands you will need

| Purpose       | Command                                                        | Expected on success              |
| ------------- | ------------------------------------------------------------- | -------------------------------- |
| Typecheck     | `cd site && bun run typecheck`                                | exit 0, no errors                |
| Unit test     | `cd site && bun test`                                         | all pass                         |
| Build         | `cd site && bun run build`                                    | exit 0                           |
| E2E (see note)| `cd site && bun run start` (separate shell) then `ARTIFACT_REVIEW_BASE_URL=http://127.0.0.1:3000 bun run test:artifact-review` | script exits 0 |
| Full gate     | `bun run verify` (repo root)                                  | exit 0 (added by plan 024)       |

The Playwright E2E needs a running server and Chromium
(`bunx playwright install chromium` if absent). It is the **only** regression net
for this file — keep it green after every step.

## Scope

**In scope** (the only files you should modify):

- `site/components/artifact-reviewer.tsx` — shrink to state + rendering.
- `site/lib/review-surface.ts` (create) — the imperative DOM engine.
- `site/lib/review-surface.test.ts` (create) — unit tests for the engine.
- `site/lib/use-review-batch.ts` (create, or a `"use client"` file under
  `site/components/`) — the submit + status-poll hook.
- Optionally a `site/components/review-tray.tsx` (create) — the tray JSX, only
  if it makes the component meaningfully smaller without conflicting with 017.

**Out of scope** (do NOT touch, even though they look related):

- `site/lib/artifact-feedback.ts` and its `ArtifactReviewSelection`/`RunModel`
  types — consume them; do not change them (plans 026/028 own that module).
- `site/app/api/artifacts/feedback/**` route handlers — behavior is owned by
  plans 025/026.
- The `discoverTargets`/`WRITING_TAGS`/`selectorFor` **logic** — plan 032 owns
  the bug fixes there. You may *move* these pure helpers into
  `review-surface.ts`, but do not change their behavior in this plan.
- Any change to the filed-issue POST shape or the run-dispatch contract.

## Git workflow

- Branch: `advisor/037-extract-review-surface-engine`
- Commit incrementally — one commit per extracted concern, each keeping the E2E
  green, so a bad step is easy to bisect.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 0: Sequencing gate (do this before writing any code)

Confirm plan 032 is **DONE** and plan 017 is **DONE** in `plans/README.md`.

- If **032 is not DONE**: STOP and report. Extracting the discovery code before
  its bugs are fixed means you extract broken behavior and 032 then has to edit
  the moved code.
- If **017 is not DONE**: STOP and report. 017 rewrites this file's tray markup
  onto Geist tokens; doing 037 first guarantees a second rewrite and a painful
  merge. (If the operator explicitly tells you to proceed ahead of 017, note it
  and expect to reconcile the JSX.)

**Verify**: state the status of 032 and 017 from `plans/README.md` before
continuing.

### Step 1: Capture the baseline

Run the E2E and record that it passes on the current file, so you can detect any
regression you introduce.

**Verify**: `cd site && bun run start` (separate shell) then
`ARTIFACT_REVIEW_BASE_URL=http://127.0.0.1:3000 bun run test:artifact-review`
→ script exits 0. If it does not pass on the untouched file, STOP — you cannot
safely refactor behind a red net (fix the harness via plan 032/024 or report).

### Step 2: Define the engine API and move the pure helpers

Create `site/lib/review-surface.ts` exporting a factory/class with an imperative
API:

```ts
export interface ReviewSurface {
  refresh(): void;
  setSelected(ids: Record<string, ArtifactReviewSelection>): void;
  detach(): void;
}
export function attachReviewSurface(
  doc: Document,
  opts: {
    initialSelected: Record<string, ArtifactReviewSelection>;
    onTargetToggle: (target: ArtifactReviewSelection) => void;
    onTextRange?: (id: string, range: Range) => void;
  }
): ReviewSurface;
```

Move the module-scope pure helpers (`discoverTargets`, `selectorFor`,
`textExcerpt`, `targetLabel`, `isExcluded`, `highlightApi`, `syncTextHighlights`,
`elementForNode`, `textOffsetWithin`, the `SPECIAL_TARGETS`/`GENERIC_SELECTOR`/
`WRITING_TAGS`/`TEXT_CONTAINER_SELECTOR` constants, and the id/decoration types)
into `review-surface.ts`. Do **not** change their behavior (plan 032 owns that).
Re-export from the component if convenient, or import back into it.

**Verify**: `cd site && bun run typecheck` → exit 0 (nothing wired yet; this step
just relocates and re-imports). `git diff` shows only moves, not logic changes.

### Step 3: Move the engine effect body into the surface

Move the body of the 344-line effect (discovery loop, listener wiring,
`MutationObserver`, highlight registration) into `attachReviewSurface`, and move
the cleanup (lines ~743–772) into `detach()`. The component's engine `useEffect`
becomes a thin wrapper: on `reviewMode` + iframe-doc-ready, call
`attachReviewSurface(...)`, keep the returned handle in a ref, call
`handle.setSelected(...)` when `selected` changes (replacing the third effect),
and call `handle.detach()` in cleanup. The `selectedRef`/`ownedElementsRef`/
`textRangesRef` bridges either move inside the surface or are passed via the
callbacks.

**Verify**: `cd site && bun run typecheck` → exit 0; `cd site && bun run build`
→ exit 0; then re-run the E2E (Step 1 command) → exits 0. **Enter review mode on
a Mermaid artifact and leave it**: outlines/tabindex must be gone and the
feedback widget visible again (the cleanup path works). If anything stays
decorated, the `detach()` move dropped a restore — fix before continuing.

### Step 4: Extract the batch hook (submit + status poll)

Move `submit(mode)` and the status-poll effect (lines ~351–389) into
`useReviewBatch(...)`, exposing `{ submit, status, error, busy, filedPath,
watchIssue }` (or the subset the tray needs). Preserve the POST body exactly —
including whatever plan 026 changed if it has landed. The component calls the
hook and passes its values into the tray JSX.

**Verify**: `cd site && bun run typecheck` → exit 0; E2E → exits 0 (it files a
batch, so the submit path is covered).

### Step 5: (Optional) Extract the tray JSX

Only if it shrinks the component meaningfully **and** 017 has landed (so you are
not fighting its markup): move the review-tray JSX (~lines 963–1207) into
`site/components/review-tray.tsx`, taking props from the component. Skip this
step if it risks conflicting with 017's styling — smaller-but-conflicting is
worse than large-but-stable here.

**Verify**: `cd site && bun run build` → exit 0; E2E → exits 0.

## Test plan

- New: `site/lib/review-surface.test.ts` (`bun:test`, model after
  `site/lib/artifact-feedback.test.ts`). Because the engine needs a DOM, use the
  DOM that `bun test` provides (or a minimal document stub). Cover, at minimum:
  - `attachReviewSurface` on a small HTML document discovers the expected
    targets and calls `onTargetToggle` when a target element is clicked
    (simulate via `dispatchEvent`).
  - `detach()` restores every element it decorated (no leftover
    `data-artifact-review-target` / outline / tabindex; the pre-existing feedback
    widget `display` is restored).
  - `setSelected` toggles decoration for the given ids.
  - If the DOM APIs the engine needs (CSS Custom Highlight, `defaultView`) are
    unavailable under `bun test`, test the pure helpers (`selectorFor`,
    `discoverTargets` against a jsdom-like document, `textExcerpt`) and note in
    the test file which behaviors are only covered by the Playwright E2E.
- Keep `site/scripts/test-artifact-review.mjs` passing throughout — it is the
  integration net for the DOM wiring the unit tests cannot fully reach.
- Verification: `cd site && bun test` → all pass, including new engine tests;
  E2E → exits 0.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd site && bun run typecheck` exits 0
- [ ] `cd site && bun test` exits 0; `site/lib/review-surface.test.ts` exists and
      passes
- [ ] `cd site && bun run build` exits 0
- [ ] The Playwright E2E exits 0 (server + `ARTIFACT_REVIEW_BASE_URL` set)
- [ ] `site/lib/review-surface.ts` exists and exports `attachReviewSurface`
      (`grep -n "attachReviewSurface" site/lib/review-surface.ts`)
- [ ] `site/components/artifact-reviewer.tsx` is substantially smaller — under
      ~700 lines (`wc -l`), with no inline 300+-line effect (the engine body now
      lives in `review-surface.ts`)
- [ ] Manual check recorded: entering and leaving review mode on a Mermaid
      artifact leaves no decoration and restores the feedback widget
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 032 or plan 017 is not DONE (Step 0), unless the operator overrode it.
- The Playwright E2E does not pass on the **untouched** file (Step 1) — you have
  no regression net; do not refactor blind.
- The code at the "Current state" line ranges doesn't match after the drift
  check (this file changes often; a mismatch means re-plan against the live
  code).
- Extraction of the cleanup path leaves any element decorated after leaving
  review mode and you cannot restore parity within two attempts.
- A step's verification fails twice after a reasonable fix attempt.
- You find the engine's reliance on `iframe.contentDocument` (same-origin) is
  being changed by plan 027 (which may move artifacts to a separate origin +
  `postMessage`) — if 027 has restructured the iframe access, this extraction's
  boundary shifts; report and re-scope rather than guessing.

## Maintenance notes

For the human/agent who owns this after the change lands:

- The DOM engine is now `site/lib/review-surface.ts` — a plain module with an
  imperative `attach/refresh/setSelected/detach` contract. Future discovery or
  decoration changes go there and get a unit test; the React component should
  stay thin (state + rendering).
- A reviewer should scrutinize the `detach()`/cleanup parity above all — the
  single highest-risk regression is a decorated artifact that never restores.
  Confirm every `addEventListener(...)` has a matching `removeEventListener`,
  and every `restoreElement`/`display` restore survived the move.
- This plan deliberately does **not** address plan 027's longer-term
  origin-isolation of the artifact iframe (separate loopback port +
  `postMessage`). If that lands later, the engine's direct `contentDocument`
  access becomes a `postMessage` bridge — the extracted module is the right
  place to make that change, which is part of why this extraction is worth doing.
- Deferred out of this plan: splitting the tray JSX (Step 5) is optional and may
  be left for a follow-up once 017's Geist markup is settled.
