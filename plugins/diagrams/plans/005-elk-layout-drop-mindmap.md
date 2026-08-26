# Plan 005: Switch to ELK layout, adopt the `neo` look, and remove `mindmap`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Read `plans/000-research-diagram-engines.md` before starting.** It records
> why these choices were made and what was rejected; this plan assumes it.
>
> **Drift check (run first)**:
> `git diff --stat cd109ef..HEAD -- plugins/diagram-plans/skills/diagram-plans/`
> If either skill file changed beyond what plans 001–004 did, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/004-geist-design-system.md`
- **Category**: bug
- **Planned at**: commit `cd109ef`, 2026-08-26

## Why this matters

`mindmap` is the skill's default shape for brainstorms — the single most common
request it handles — and Mermaid cannot render it legibly or in Geist. Verified
against Mermaid's own sources:

- Node fills come from the `cScale0..11` rainbow
  (`packages/mermaid/src/diagrams/mindmap/styles.ts`), one hue per branch.
- Branch strokes are generated as `stroke-width: 17 - 3 * i` — **17px thick** at
  depth 0. There is no configuration option for this; the value is computed in a
  loop.
- Layout is force-directed `cose-bilkent` (`config.schema.yaml:1098`), which
  places branches by simulation and routinely overlaps them.
- Labels are hard-capped at `maxNodeWidth: 200`, and `classDef` is unsupported,
  so the Geist `themeVariables` plan 004 introduced cannot reach it.

No amount of theming fixes a 17px rainbow branch. The type has to go.

Separately, everything that _stays_ still uses Mermaid's default `dagre` layout,
which routes edges without avoiding crossings. ELK's layered algorithm produces
markedly fewer crossings on the same graph, and — per the research record — runs
on the main thread with no Web Worker, which is the constraint that matters
because these pages are opened as `file://`.

## Current state

Two files change.

`plugins/diagram-plans/skills/diagram-plans/MERMAID.md:5-13` — the type table
that routes brainstorms to `mindmap`:

```
| Request smells like | Diagram | Why |
|---|---|---|
| "ideas for", "brainstorm", "break down", "what goes into" | `mindmap` | Radial tree; unordered branches |
| "plan", "steps", "how should we", "decision" | `flowchart TD` | Ordered, with branches on decisions |
...
```

`MERMAID.md:109-118` — the mindmap syntax crib:

```
### mindmap
```

mindmap
root((Center))
Branch
Leaf
...

```

`plugins/diagram-plans/skills/diagram-plans/SKILL.md:10-15` — the same routing,
restated in the skill's step 1:

```

1. **Pick the shape.** Match the request to one diagram (see the table in [`MERMAID.md`](MERMAID.md)):
   - brainstorm / ideas / breakdown → `mindmap`
   - plan / sequence of work / decision path → `flowchart`
     ...

```

`SKILL.md:21` and `SKILL.md:31` also reference mindmaps:

```

- The page contains one diagram (two only when a mindmap needs a companion flowchart for sequencing).

```

```

- Prefer breadth in the tree over depth: three levels is the ceiling for a mindmap; split into a second diagram past that.

````

And after plan 004, `themeConfig(dark)` returns an object with `theme: "base"`
and a `themeVariables` block. **This plan adds `look` and `layout` to that
object; it must not touch any `themeVariables` value** — those belong to plan
004.

Verified facts you can rely on without re-checking:

- `@mermaid-js/layout-elk` is at version **0** (currently `0.2.3`), not 11. The
  CDN path `@mermaid-js/layout-elk@11/...` is a documented mistake and 404s.
- Registration is `mermaid.registerLayoutLoaders(elkLayouts)` and must happen
  **before** `mermaid.initialize`.
- Its render chunk is 1.63 MB and lazily loaded — it costs nothing until a
  diagram actually renders.
- Mermaid's `neo` look pairs with a white fill and black hairline border
  (`theme-neo.js`: `mainBkg: '#ffffff'`, `nodeBorder: '#000000'`), which is
  close to the Geist treatment. Plan 004's explicit `themeVariables` still win
  over the look's own colours; `look` governs shape and stroke style.
- ELK applies to the diagram types rendered by Mermaid's unified renderer —
  flowchart, state, class, block, requirement. Other types (`sequenceDiagram`,
  `gantt`, `timeline`, `quadrantChart`, `journey`, `erDiagram`) ignore the
  `layout` key rather than failing. Step 4 verifies this rather than trusting it.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Page structure lint | `python3 test/lint-page.py test/fixtures/sample-plan.html` | exit 0 |
| Render check | `npm run test:render` | exit 0 |
| Everything | `npm test` | exit 0 |
| Version sync | `bash tools/check-version-sync.sh` | exit 0 |

## Scope

**In scope**:
- `plugins/diagram-plans/skills/diagram-plans/MERMAID.md` — the `## Which diagram`
  table, the `## Syntax crib` mindmap section, the ELK import, and the `look` /
  `layout` keys
- `plugins/diagram-plans/skills/diagram-plans/SKILL.md` — step 1's shape list,
  line 21, line 31
- `test/lint-page.py` — the `diagram-type` and `no-mindmap` rules
- `test/fixtures/sample-plan.html` (regenerate) and a second fixture for a
  non-ELK type
- `plugins/diagram-plans/.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` — version bump
- `README.md` — the sentence naming the diagram types
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- Any `themeVariables` value — plan 004 owns every colour.
- The layout CSS, error markup, or pan/zoom code — plan 003.
- The complexity budget and label rules — plan 006 adds those; do not
  pre-empt them here beyond what the type table already says.
- Adding Graphviz or authored-SVG support. The research record explicitly
  defers both until Mermaid+ELK has been used in anger.

## Git workflow

- Branch: `advisor/005-elk-layout`
- Message style `diagram-plans: <imperative>`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Register the ELK layout loader

In the `<script type="module">` block, immediately after the dynamic Mermaid
import succeeds and **before** any `initialize` call, add:

```js
  if (mermaid) {
    try {
      const { default: elkLayouts } = await import("https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs");
      mermaid.registerLayoutLoaders(elkLayouts);
    } catch (e) {
      // Non-fatal: without ELK, Mermaid falls back to dagre. A slightly worse
      // layout beats a blank page, so this failure is logged, not surfaced.
      console.warn("ELK layout unavailable, falling back to dagre:", e);
    }
  }
````

The `@0` in the URL is load-bearing — the package is on major version 0 and
`@11` does not exist.

The catch is deliberately non-fatal, unlike plan 003's Mermaid import guard: a
missing Mermaid means no diagram at all, while a missing ELK means a dagre
layout. Do not promote this to the error box.

**Verify**:

- `grep -c 'layout-elk@0' plugins/diagram-plans/skills/diagram-plans/MERMAID.md` → `1`
- `grep -c 'registerLayoutLoaders' .../MERMAID.md` → `1`
- `grep -n 'registerLayoutLoaders' .../MERMAID.md` reports a line number **lower** than the first `mermaid.initialize` line

### Step 2: Add `look` and `layout` to `themeConfig`

Add exactly two keys to the object `themeConfig(dark)` returns, alongside the
existing `theme` and `themeVariables`:

```js
      theme: "base",
      look: "neo",
      layout: "elk",
```

and add an `elk` config block to the `mermaid.initialize({...})` call, next to
the `flowchart` block plan 003 added:

```js
        elk: { mergeEdges: false, nodePlacementStrategy: "BRANDES_KOEPF" },
```

`mergeEdges: false` keeps two edges that share a target independently
traceable rather than fusing them into one stroke — the readability property
the whole effort is about. `BRANDES_KOEPF` favours straight, aligned edges over
compactness.

**Verify**:

- `grep -c 'look: "neo"' .../MERMAID.md` → `1`
- `grep -c 'layout: "elk"' .../MERMAID.md` → `1`
- `grep -c 'mergeEdges: false' .../MERMAID.md` → `1`
- `git diff .../MERMAID.md | grep -cE '^[+-].*themeVariables|^[+-].*#[0-9a-fA-F]{6}'` → `0` (no colour touched)

### Step 3: Remove `mindmap` from both skill files

**In `MERMAID.md`:**

Replace the first row of the `## Which diagram` table with:

```
| "ideas for", "brainstorm", "break down", "what goes into" | `flowchart LR` with the root on the left | Reads as a tree, lays out cleanly, and themes completely — unlike `mindmap`, whose branches Mermaid draws 17px thick in a fixed rainbow |
```

Delete the entire `### mindmap` section from the syntax crib and replace it
with a worked example of the shape it replaces:

```
### flowchart as a tree (use this instead of `mindmap`)
```

flowchart LR
accTitle: What goes into onboarding
accDescr: Onboarding broken into three branches with their sub-items.
R(("Onboarding")) --> A["Accounts"]
R --> B["First task"]
R --> C["Docs"]
A --> A1["SSO"]
A --> A2["Repo access"]
B --> B1["Pair on a small PR"]
C --> C1["Risk: docs are stale"]
class C1 risk
classDef risk stroke-dasharray: 4 3

```
`mindmap` is not supported. Mermaid renders its branches at a fixed 17px in a
per-branch rainbow with no way to override either, and lays them out with a
force-directed algorithm that overlaps siblings. A left-to-right flowchart is
the same tree, laid out deterministically and themed by the page's tokens.
```

**In `SKILL.md`:**

- Step 1's first bullet becomes:
  `  - brainstorm / ideas / breakdown →`flowchart LR` as a tree (root on the left)`
- Line 21 becomes:
  `   - The page contains one diagram (two only when a tree needs a companion flowchart for sequencing).`
- Line 31 becomes:
  `- Prefer breadth in the tree over depth: three levels is the ceiling; split into a second diagram past that.`

**Verify**:

- `grep -ci 'mindmap' plugins/diagram-plans/skills/diagram-plans/SKILL.md` → `0`
- `grep -ci 'mindmap' .../MERMAID.md` → `2` (both inside the explanatory paragraph telling the reader it is unsupported and why)
- `grep -c 'flowchart LR' .../MERMAID.md` → at least `2`

### Step 4: Prove non-ELK diagram types still render

Add `test/fixtures/sample-sequence.html`, generated from the same template but
containing a `sequenceDiagram` — a type ELK does not handle:

```
sequenceDiagram
  accTitle: Prompt to diagram
  accDescr: How a user prompt becomes a rendered diagram page.
  User->>CLI: prompt
  CLI->>Hook: UserPromptSubmit
  Hook-->>CLI: nudge
  CLI->>Skill: write page
```

Add it to `package.json`'s `lint` and `test:render` scripts so both fixtures are
checked.

This is the step that catches the plan's main risk: a global `layout: "elk"`
breaking a type that does not support it. If the sequence fixture fails
`no-error`, that is a STOP condition — the fix is to move `layout` out of the
global config and into per-diagram front-matter, not to give up on ELK.

**Verify**:

- `npm test` → exit 0, both fixtures passing all render-check rules
- `node test/render-check.mjs test/fixtures/sample-sequence.html` → 7 PASS lines

### Step 5: Update the linter's type rules

In `test/lint-page.py`:

- Remove `mindmap` from any accepted list in the `diagram-type` rule (plan 002
  never included it, but confirm).
- Strengthen `no-mindmap` so it fails on a block whose first non-blank line is
  `mindmap` **and** on the substring `root((` appearing inside a block, which is
  mindmap syntax that a flowchart would not use.

**Verify**: a scratch fixture whose block starts with `mindmap` exits 1 with
`FAIL no-mindmap`; delete it afterwards.

### Step 6: Update the docs and bump the version

In `README.md`, replace "a **Mermaid mindmap / flowchart**" with
"a **Mermaid flowchart, sequence, timeline, or quadrant diagram**", and add one
sentence after it:

> Layout goes through ELK rather than Mermaid's default, which produces far
> fewer edge crossings; `mindmap` is deliberately unsupported because Mermaid
> renders it in a fixed rainbow at a fixed 17px stroke width.

Bump both manifests to `0.4.0`.

**Verify**:

- `grep -ci 'mindmap' README.md` → `1` (the explanatory sentence only)
- `bash tools/check-version-sync.sh` → `version in sync: 0.4.0`

### Step 7: Compare layouts by eye

Render the flowchart fixture twice — once with `layout: "elk"` and once with the
line removed — and open both. Confirm ELK produces fewer crossings and
straighter edges on the same source. If it does not, say so plainly in your
report: the research record's central claim would be wrong and worth knowing.

## Test plan

Verification runs through plan 002's harness against **both** fixtures. Confirm
each fault produces its failure, then revert:

| Injected fault                             | Must fail rule                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| A block starting with `mindmap`            | `no-mindmap`                                                                                                                              |
| A block containing `root((Center))`        | `no-mindmap`                                                                                                                              |
| ELK import pointed at `@11` (the 404 path) | _nothing_ — must still render via dagre, with a console **warning** not an error. If `console-clean` fails, the catch in step 1 is wrong. |
| `mergeEdges: true`                         | _nothing_ — a readability regression the tests cannot see. Note it in your report as an untested constraint.                              |

That third row is the important one: it proves the ELK failure is genuinely
non-fatal.

## Done criteria

ALL must hold:

- [ ] `npm test` exits 0 with both fixtures rendering (not skipped)
- [ ] `grep -ci mindmap plugins/diagram-plans/skills/diagram-plans/SKILL.md` returns `0`
- [ ] `grep -c 'layout-elk@0' .../MERMAID.md` returns `1`, and `grep -c 'layout-elk@11' .../MERMAID.md` returns `0`
- [ ] `registerLayoutLoaders` appears before the first `mermaid.initialize` in the file
- [ ] `grep -c 'look: "neo"' .../MERMAID.md` and `grep -c 'layout: "elk"' .../MERMAID.md` each return `1`
- [ ] `git diff .../MERMAID.md` changes no hex colour and no `themeVariables` entry
- [ ] `test/fixtures/sample-sequence.html` exists and passes all render-check rules
- [ ] The ELK-404 fault renders via dagre with a console warning and no console error
- [ ] `bash tools/check-version-sync.sh` prints `version in sync: 0.4.0`
- [ ] `git status --porcelain` lists no file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `themeConfig(dark)` does not return `theme: "base"` — plan 004 has not landed.
- The sequence fixture fails `no-error` with `layout: "elk"` set globally.
  Report the exact Mermaid error. The intended fix is per-diagram front-matter
  (`---\nconfig:\n  layout: elk\n---`) emitted only for flowchart-family
  diagrams — but make that call with the operator, not alone.
- The ELK render chunk fails to load from `file://` with a CORS error. That
  contradicts `plans/000-research-diagram-engines.md` and changes the engine
  decision; report before proceeding.
- ELK produces _more_ crossings than dagre on the fixture in step 7.
- You find yourself wanting to keep `mindmap` "just as an option". It is
  removed, and plan 002's linter enforces it. If you disagree, say so in the
  report rather than leaving a half-removed type behind.

## Maintenance notes

- The ELK layout is a second CDN dependency and a 1.63 MB lazy chunk. It is
  loaded on every page view; the non-fatal catch is what keeps that from being a
  single point of failure. Do not "simplify" it into the main try block.
- `look: "neo"` changes node geometry, not colour. If a future Mermaid release
  changes what `neo` means, the render check's `no-overflow` rule is the thing
  most likely to catch it.
- `mergeEdges: false` is untestable with the current harness — nothing asserts
  edges stay separate. If edge readability regresses, that setting is the first
  place to look.
- Graphviz-WASM and authored SVG remain deliberately unbuilt. Revisit
  `plans/000-research-diagram-engines.md` after a few weeks of real use; the
  decision to defer them was about not building three engines before knowing
  one is insufficient.
- Reviewer should scrutinize: that no colour moved (this plan and plan 004 must
  stay disjoint), and that the mindmap removal is complete rather than partial.
