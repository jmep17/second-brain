# Plan 032: Artifact review discovery classifies SVG text correctly and stops rescanning the whole document

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0ee11c..HEAD -- site/components/artifact-reviewer.tsx site/scripts/test-artifact-review.mjs`
> If either in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## At a glance

- **What**: Classify SVG text/tspan elements as `writing`, remove the dead nesting filter, and scope target discovery to a bounded selector.
- **Why**: SVG text is always misclassified as `component` because the tag-name check is case-sensitive, and the full-document rescan on every mutation makes entering review on a diagram walk and decorate thousands of nodes repeatedly.
- **Next action**: Step 1 — Compare tag names case-insensitively

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/024-verification-baseline.md (for the Playwright smoke harness)
- **Category**: bug
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

When you enter review mode on an artifact, the reviewer walks the artifact DOM
and builds a list of "targets" you can select and comment on; each target's
inferred **kind** (`writing` vs `component`) is written into the filed feedback
issue's `Kind:` line, which tells the executing agent what it is being asked to
change. Two defects live in that discovery pass:

1. **SVG text is always misclassified.** `WRITING_TAGS` holds uppercase
   `"TEXT"`/`"TSPAN"`, but SVG elements report a **lowercase** `tagName`
   (`"text"`, `"tspan"`), so `WRITING_TAGS.has(element.tagName)` is never true
   for them. Mermaid diagram labels are therefore filed as `component`, not
   `writing`, and get a pointer cursor instead of a text cursor.
2. **The whole document is rescanned on every mutation.** A first pass over
   `GENERIC_SELECTOR` carefully skips elements nested inside a higher-priority
   target — then the very next pass over `"body *"` re-adds **every** element
   anyway, so the filter does nothing but affect id numbering, at an
   `O(candidates × priorityAncestors)` cost. A `MutationObserver` re-runs the
   full scan on every DOM change, and Mermaid renders its SVG client-side as a
   burst of mutations, so entering review on a diagram walks and decorates
   hundreds-to-thousands of SVG nodes several times over and puts a
   `tabindex="0"` on each (a keyboard trap). This is the one place in the repo
   where single-user localhost scale does not save you — the cost is
   per-element.

After this plan, SVG text is classified as `writing`, the dead nesting filter
is gone, discovery is scoped to a bounded selector (no leaf SVG primitives or
wrapper `<div>`s as targets), per-element excerpt/selector work happens only for
selected elements, and the two `doc.defaultView!` non-null assertions no longer
throw when the iframe document is torn down mid-`requestAnimationFrame`.

## Current state

File in scope: `site/components/artifact-reviewer.tsx` — the review tray; the
discovery logic is `discoverTargets(...)` and the decoration/observer effect.

### The tag sets (around lines 45–83)

```ts
const WRITING_TAGS = new Set([
  "H1","H2","H3","H4","H5","H6","P","LI","SPAN","STRONG","EM","CODE","TD","TH",
  "FIGCAPTION","TEXT","TSPAN",
]);
const ALL_ARTIFACT_SELECTOR = "body *";
const TEXT_CONTAINER_SELECTOR = [
  "h1","h2","h3","h4","h5","h6","p","li","td","th","figcaption","blockquote",
  "pre","code","span","text","tspan",
].join(",");
```

`GENERIC_SELECTOR` is defined nearby (read it — it is the union used by the
first pass). `EXCLUDED_SELECTOR` lists `.feedback`, `script`, `style`,
`button`, … (the elements discovery must skip).

### The two discovery passes (around lines 253–300)

```ts
  for (const element of doc.querySelectorAll(GENERIC_SELECTOR)) {
    if (higherPriority.has(element)) continue;
    const nestedInPriority = Array.from(higherPriority).some(
      (ancestor) => ancestor !== element && ancestor.contains(element)
    );
    if (nestedInPriority && !WRITING_TAGS.has(element.tagName)) continue;
    candidates.push({
      element,
      inferredKind: WRITING_TAGS.has(element.tagName) ? "writing" : "component",
    });
  }

  for (const element of doc.querySelectorAll(ALL_ARTIFACT_SELECTOR)) {
    candidates.push({
      element,
      inferredKind: WRITING_TAGS.has(element.tagName) ? "writing" : "component",
    });
  }
```

The second (`"body *"`) loop re-adds every element the first loop's
`nestedInPriority` check excluded, with the identical `inferredKind`
computation — so the filter changes nothing except which entry lands first
(dedup by `seenElements` later keeps the first occurrence).

### The dedup/build loop and the first `defaultView!` (around lines 275–300)

```ts
  for (const { element, inferredKind } of candidates) {
    if (
      seenElements.has(element) ||
      isExcluded(element, decorated) ||
      !(element instanceof doc.defaultView!.Element)
    ) {
      continue;
    }
    seenElements.add(element);
    const kind = (element.getAttribute("data-review-kind") || inferredKind).slice(0, 200);
    const id = idForElement(element, kind);
    const excerpt = textExcerpt(element);
    result.push({ element: element as HTMLElement | SVGElement, target: { id, kind,
      label: targetLabel(element, excerpt), selector: selectorFor(element), excerpt } });
```

`textExcerpt(element)` serializes the element's whole `textContent` subtree and
`selectorFor(element)` walks every ancestor — both are computed here for
**every** candidate on every refresh.

### The cursor consumer and second `defaultView!` (around lines 627–640)

```ts
        element.setAttribute("tabindex", "0");
        element.style.cursor = target.kind === "writing" ? "text" : "pointer";
```

```ts
    const eventTarget = (event: Event) => {
      const node = event.target;
      if (!(node instanceof doc.defaultView!.Element)) return null;
```

### The observer (around lines 723–725)

```ts
    refresh();
    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(doc.documentElement, { childList: true, subtree: true });
```

`scheduleRefresh` does `cancelAnimationFrame(frame); frame = requestAnimationFrame(refresh);`.

### The id derivation (around lines 476–490) — read before touching numbering

`idForElement` prefers an explicit `data-review-id` / `id`, else falls back to
`` `${kind}-${n}` `` counting by discovery order. Fallback ids
(`writing-3`, `component-12`) are persisted into filed issues via
`site/lib/artifact-feedback.ts` (the `Kind:`/`Selector:` block, around lines
225–241). **Changing which elements are candidates, or their order, renumbers
the fallback ids** for any artifact without explicit `data-review-id`s.

## Commands you will need

| Purpose        | Command                                   | Expected on success        |
|----------------|-------------------------------------------|----------------------------|
| Typecheck      | `cd site && bun run typecheck`            | exit 0, no errors          |
| Smoke (E2E)    | see plan 024/026 harness; needs a running server + `ARTIFACTS_SITE_URL` + Chromium | assertions pass |
| Plugin gate    | `bash tools/check-plugins.sh`             | `all checks passed`        |

The E2E harness is `site/scripts/test-artifact-review.mjs`; it requires
`ARTIFACTS_SITE_URL` and a Playwright Chromium (`bunx playwright install
chromium`). If plan 024 has wired a wrapper that boots the server, use it;
otherwise start `bun run start` on a known port and set `ARTIFACTS_SITE_URL`
before running the script.

## Suggested executor toolkit

- If a `frontend-design` or React best-practices skill is available, consult it
  only for the lazy-computation change (Step 3) — the rest is straight bug fixing.

## Scope

**In scope**:
- `site/components/artifact-reviewer.tsx` (discovery passes, tag comparison,
  the two `defaultView!` sites, and the bounded selector)
- `site/scripts/test-artifact-review.mjs` (only if the target-count assertion
  changes — see Step 4)

**Out of scope** (do NOT touch, even though they are in the same file):
- The submit/dispatch logic, the `watchIssue` status poll (plan 030 owns it),
  the model pickers, and the JSX/markup (plan 017 restyles it; plan 037
  extracts the engine).
- `site/lib/artifact-feedback.ts` — the id → issue serialization. You are
  changing which ids are produced, not how they are written.
- `idForElement`'s explicit-id precedence (`data-review-id`/`id` first) — keep it.

## Git workflow

- Branch: `advisor/032-artifact-target-discovery-fix`
- Commit per step or logical unit; lowercase prefix, e.g.
  `fix: classify SVG text as writing in artifact discovery`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Compare tag names case-insensitively

Everywhere discovery compares against `WRITING_TAGS`, normalize the tag name.
Replace the three `WRITING_TAGS.has(element.tagName)` sites (in both passes and
anywhere else `grep` finds them) with `WRITING_TAGS.has(element.tagName.toUpperCase())`.

```
grep -n "WRITING_TAGS.has(element.tagName)" site/components/artifact-reviewer.tsx
```

should return no matches after this step.

**Verify**: `cd site && bun run typecheck` → exit 0; the grep above → no matches.

### Step 2: Delete the dead pass and bound the selector

Remove the second `for (const element of doc.querySelectorAll(ALL_ARTIFACT_SELECTOR))`
loop entirely. Change the **first** loop to iterate a bounded selector that is
the union of `GENERIC_SELECTOR` and `TEXT_CONTAINER_SELECTOR` plus the Mermaid
node/cluster groups, so leaf SVG primitives (`path`, `rect`, individual
`tspan`s outside a labelled group) and structural wrapper `<div>`s are no longer
candidates:

- Define, near the other selector constants:
  ```ts
  const DISCOVERY_SELECTOR = `${GENERIC_SELECTOR}, ${TEXT_CONTAINER_SELECTOR}, .mermaid g.node, .mermaid g.cluster`;
  ```
- Iterate `doc.querySelectorAll(DISCOVERY_SELECTOR)` in the single remaining
  loop. Keep the `higherPriority`/`nestedInPriority` skip **only if** it still
  serves a purpose against the bounded set; if after bounding the selector the
  `nestedInPriority` check no longer changes results, delete it too (it was
  dead precisely because the `"body *"` pass defeated it — with that pass gone,
  re-evaluate). Prefer the simplest version that passes the smoke test.
- `ALL_ARTIFACT_SELECTOR` is now unused — remove the constant (line ~64) so no
  dead export remains.

**Verify**: `cd site && bun run typecheck` → exit 0;
`grep -n "ALL_ARTIFACT_SELECTOR" site/components/artifact-reviewer.tsx` → no matches.

### Step 3: Compute excerpt/selector lazily, and guard the detached view

- In the dedup/build loop, do **not** call `textExcerpt(element)` and
  `selectorFor(element)` for every candidate. Compute the cheap identity first
  (`id`, `kind`), and defer `excerpt`/`selector`/`label` to when a target is
  actually selected. If the target object shape requires those fields eagerly,
  the minimum viable change is to compute them only for elements that survive
  the `seenElements`/`isExcluded` filters (you already skip early with
  `continue`) — confirm they are not computed before those guards. If a larger
  refactor is needed to make them lazy, keep it to this loop and do not change
  the `ArtifactReviewSelection` type's public fields (plan 037 owns deeper
  restructuring).
- Replace both `doc.defaultView!` non-null assertions (the dedup loop guard and
  `eventTarget`) with a null-safe form so a torn-down iframe document returns
  early instead of throwing out of the rAF/refresh:
  ```ts
  const view = doc.defaultView;
  if (!view) return; // in refresh(): abort this pass; in eventTarget(): return null
  // …use view.Element…
  ```
  Apply the appropriate early-return for each call site (the loop is inside
  `discoverTargets`/`refresh`; `eventTarget` returns `null`).

**Verify**: `cd site && bun run typecheck` → exit 0;
`grep -n "doc.defaultView!" site/components/artifact-reviewer.tsx` → no matches.

### Step 4: Reconcile the E2E assertion

`site/scripts/test-artifact-review.mjs` (around lines 411–421) asserts an exact
selected-target count and a `diagram-node` kind:

```js
  const selected = page.locator("[data-selected-target]");
  assert(
    (await selected.count()) === 4,
    "expected one component, two text ranges, and one diagram node"
  );
```

Your Step 1–2 changes alter which elements are discovered for the synthetic
diagram node the test injects (`g.node#synthetic-review-node`). Run the smoke
test; if the count changed because SVG text is now `writing` (expected) or
because the bounded selector dropped a wrapper (expected), update the assertion
**and its message** to the new correct count, and keep the
`filter({ hasText: "diagram-node" })` assertion working (the synthetic
`g.node` should still be discovered — the test explicitly checks
`data-artifact-review-target` is set on it at line ~414). Do **not** loosen the
assertion to `>= 1`; keep it exact so it stays a real regression check.

**Verify**: the E2E harness runs and its assertions pass (see Commands).

### Step 5: Full gate

**Verify**:
- `cd site && bun run typecheck` → exit 0
- `bash tools/check-plugins.sh` → `all checks passed`
- E2E smoke assertions pass

## Test plan

- The E2E harness (`site/scripts/test-artifact-review.mjs`) is the regression
  net; it injects a synthetic Mermaid `g.node` at runtime and asserts it is
  discovered, selectable, and filed with kind `diagram-node`. Extend it if
  practical with an assertion that a diagram **text** element
  (`.mermaid text`/`tspan`) is discovered as `writing` — this is the exact bug
  Step 1 fixes and nothing currently asserts it.
- If plan 024 added a real `bun test` unit harness and the discovery helpers
  (`textExcerpt`, `selectorFor`, the tag classification) were extracted to a
  pure module, add a unit test for `WRITING_TAGS.has(tag.toUpperCase())` on
  `"text"`/`"tspan"`. If they are still trapped in the component (plan 037 has
  not run), the E2E is the only feasible layer — say so in the PR summary.
- Verification: E2E assertions pass; `bun run typecheck` exits 0.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd site && bun run typecheck` exits 0
- [ ] `grep -n "WRITING_TAGS.has(element.tagName)" site/components/artifact-reviewer.tsx` → no matches (all case-normalized)
- [ ] `grep -n "ALL_ARTIFACT_SELECTOR" site/components/artifact-reviewer.tsx` → no matches (dead pass + constant removed)
- [ ] `grep -n "doc.defaultView!" site/components/artifact-reviewer.tsx` → no matches
- [ ] The E2E smoke test runs and its target-count + `diagram-node` assertions pass (updated count if changed)
- [ ] `bash tools/check-plugins.sh` prints `all checks passed`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The discovery passes, tag sets, or `defaultView!` sites don't match the
  "Current state" excerpts — the file drifted (plan 037's engine extraction may
  have already moved this logic into `lib/`; if so, apply the same fixes there
  and report the relocation).
- Removing the `"body *"` pass drops a target class that a **real** artifact
  relies on for review (verify against an actual page under `artifacts/`, e.g.
  open one in review mode) — report which elements disappeared before widening
  the selector back.
- The fallback-id renumbering (Step 2) would change ids on an artifact that has
  a **queued or in-flight** feedback batch referencing those ids
  (check `.scratch/artifact-feedback/issues/` for a non-resolved batch whose
  `Selector:` ids are fallback-form) — stale ids in a live batch could mislead
  the executing agent. Report and pause rather than renumber under an active batch.
- The E2E harness cannot run at all (no Chromium, no server) — do not mark the
  plan done on typecheck alone; report that the regression net could not be run.

## Maintenance notes

- Plan 037 extracts this discovery/decoration logic into a plain
  `lib/review-surface.ts`; doing that after this plan means the fixed classifier
  moves wholesale rather than being re-derived. Plan 017 restyles the same
  file's markup — coordinate branch order so the two don't stomp each other.
- Fallback ids depend on discovery order; if a future change reorders candidates
  again, filed issues from before the change keep their old ids (they are text
  in `.scratch/`), so a reviewer reading an old batch must map by selector, not id.
- Reviewer should scrutinize: that no leaf SVG primitive still gets
  `tabindex="0"` (open a Mermaid artifact in review mode and Tab through it —
  stops should be on labelled nodes/text, not every `path`), and that the
  lazy-excerpt change did not break `targetLabel`/selection for elements that
  are selected.
- Deferred: the broader god-component split (plan 037) and the Geist restyle
  (plan 017); this plan is scoped to the discovery correctness/perf bug only.
