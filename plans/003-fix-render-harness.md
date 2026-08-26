# Plan 003: Stop the diagram from being scaled down, mis-measured, or silently broken

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat cd109ef..HEAD -- plugins/diagram-plans/skills/diagram-plans/MERMAID.md`
> If the file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/002-verification-baseline.md`
- **Category**: bug
- **Planned at**: commit `cd109ef`, 2026-08-26

## Why this matters

This is the plan that answers "the diagrams aren't readable". Three independent
defects in the page template compound into illegible output:

1. **The SVG is scaled down until the text is too small to read.** Mermaid's
   `useMaxWidth` defaults to `true`, which sets the SVG to `width: 100%` and
   scales its contents to fit the container. A flowchart whose natural width is
   2000px gets squeezed into roughly 1104px of usable space, rendering nominal
   14px text at about 7.7px. The template even has `overflow-x: auto` on the
   card to handle wide diagrams — but it can never fire, because the SVG shrinks
   instead of overflowing.
2. **Labels overflow their own boxes.** Mermaid measures text to size each node.
   The page loads Geist with `display=swap` and starts rendering immediately, so
   Mermaid measures using the _fallback_ font and then Geist swaps in wider.
   Text spills past node borders.
3. **A broken diagram produces a bomb graphic or a blank card, with no
   explanation.** There is no `try`/`catch`, no `<noscript>`, and no handling
   for the CDN import failing. A Mermaid syntax error is the single most likely
   failure — and the skill itself mandates labels like `⚠ risk: …` and
   `? open: …` that contain Mermaid-significant characters.

A fourth defect is latent and becomes real the moment (1) is fixed:
`justify-content: center` on an overflow container makes the leading edge of
overflowing content unreachable, so a wide diagram would lose its left side.

## Current state

One file changes: `plugins/diagram-plans/skills/diagram-plans/MERMAID.md`. It
contains a single fenced `html` block (lines 19–105) that the skill copies
verbatim for every diagram it writes.

The CSS that must change, `MERMAID.md:46-49`:

```css
.card {
  background: var(--geist-bg);
  border: 1px solid var(--accents-2);
  border-radius: var(--radius);
  padding: 24px;
  overflow-x: auto;
}
.card + .card {
  margin-top: 16px;
}
.mermaid {
  display: flex;
  justify-content: center;
}
.mermaid svg {
  max-width: 100%;
  height: auto;
}
```

The script that must be replaced wholesale, `MERMAID.md:85-102`:

```html
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  const sources = [...document.querySelectorAll("pre.mermaid")].map(
    (el) => el.textContent
  );
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  async function render() {
    const dark = mq.matches;
    mermaid.initialize({
      startOnLoad: false,
      theme: dark ? "dark" : "neutral",
      themeVariables: {
        fontFamily: "Geist, system-ui, sans-serif",
        fontSize: "14px",
      },
      mindmap: { padding: 12 },
      flowchart: { curve: "basis", padding: 12 },
    });
    document.querySelectorAll("pre.mermaid").forEach((el, i) => {
      el.removeAttribute("data-processed");
      el.textContent = sources[i];
    });
    await mermaid.run({ nodes: document.querySelectorAll("pre.mermaid") });
  }
  mq.addEventListener("change", render);
  render();
</script>
```

Two facts verified against Mermaid's own sources, so you do not have to
re-derive them:

- `useMaxWidth` is declared in `config.schema.yaml` under `BaseDiagramConfig`
  with `default: true`, described as "When this flag is set to `true`, the
  height and width is set to 100% and is then scaled with the available space.
  If set to `false`, the absolute space required is used." Every diagram config
  block inherits it.
- `curve: "basis"` is already Mermaid's schema default for flowchart, so the
  existing setting is a no-op, not a bug. Changing it to `linear` is a
  deliberate readability choice made in step 2 below, not a fix.

**This plan shares `MERMAID.md` with plans 004 and 005.** To keep the three from
fighting over the same lines, they own disjoint regions:

- **003 (this plan)** owns the layout CSS, the `<noscript>`/error markup, the
  `<script>` structure, and the pan/zoom control.
- **004** owns the `:root` token block, the inlined fonts, and the body of the
  `themeConfig(dark)` function you create in step 3.
- **005** owns the `initialize()` call's `theme` / `look` / `layout` keys, the
  ELK import, and the diagram-type table.

Create `themeConfig(dark)` exactly as specified so plan 004 has a clean seam to
fill in. Do not change any colour value in this plan.

## Commands you will need

| Purpose             | Command                                                    | Expected on success  |
| ------------------- | ---------------------------------------------------------- | -------------------- |
| Page structure lint | `python3 test/lint-page.py test/fixtures/sample-plan.html` | exit 0               |
| Render check        | `npm run test:render`                                      | exit 0, 7 PASS lines |
| Everything          | `npm test`                                                 | exit 0               |

All three come from plan 002. If they do not exist, that is a STOP condition.

## Scope

**In scope**:

- `plugins/diagram-plans/skills/diagram-plans/MERMAID.md` — the CSS block, the
  `<body>` markup for the diagram card, and the `<script>` block
- `test/fixtures/sample-plan.html` — regenerate from the updated template
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- The `:root` custom properties and the `@media (prefers-color-scheme: dark)`
  block — plan 004 owns every colour in this file.
- The `## Which diagram` table and the `## Syntax crib` section — plan 005.
- `SKILL.md` — plans 005, 006 and 007.
- Adding any third-party JS library for pan/zoom. Write the ~40 lines by hand;
  the page must stay dependency-free apart from Mermaid itself.

## Git workflow

- Branch: `advisor/003-fix-render-harness`
- Message style `diagram-plans: <imperative>`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace the diagram container CSS

Replace `MERMAID.md:48-49` (the two `.mermaid` rules) with:

```css
.diagram {
  overflow: auto;
  cursor: grab;
  overscroll-behavior: contain;
}
.diagram.dragging {
  cursor: grabbing;
  user-select: none;
}
.mermaid svg {
  display: block;
  margin-inline: auto;
  max-width: none;
  height: auto;
}
.zoom {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.zoom button {
  font: inherit;
  font-size: 12px;
  line-height: 1;
  padding: 6px 10px;
  background: var(--geist-bg);
  color: var(--accents-5);
  border: 1px solid var(--accents-2);
  border-radius: 6px;
  cursor: pointer;
}
.zoom button:hover {
  color: var(--geist-fg);
}
#diagram-error {
  border: 1px solid var(--geist-error);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 16px;
}
#diagram-error[hidden] {
  display: none;
}
#diagram-error .msg {
  font-weight: 500;
  margin: 0 0 8px;
}
#diagram-error pre {
  font-family: var(--font-mono);
  font-size: 12px;
  white-space: pre-wrap;
  margin: 0;
  color: var(--accents-5);
}
```

Two things to understand rather than copy blindly:

- `display: flex; justify-content: center` is **removed, not adapted**. Centring
  an overflowing child with flex makes its leading edge unreachable — you can
  never scroll to the left side of a wide diagram. `margin-inline: auto` on a
  block child centres when it fits and left-aligns when it does not, which is
  the behaviour you want.
- `max-width: none` overrides the inline `max-width` Mermaid still writes onto
  the SVG element. Without it, step 3's `useMaxWidth: false` is partly undone
  by CSS.

Colour references here reuse the existing `--accents-*` / `--geist-error`
variables on purpose. Plan 004 renames them repo-wide in one pass; introducing
new names now would leave the file half-migrated.

**Verify**: `grep -c 'justify-content: center' plugins/diagram-plans/skills/diagram-plans/MERMAID.md` → `0`

### Step 2: Add the error surface, the `<noscript>` fallback, and the zoom control

In the template's `<body>`, replace the diagram section (`MERMAID.md:66-76`)
with:

```html
<div id="diagram-error" hidden>
  <p class="msg"></p>
  <pre></pre>
</div>

<section class="card">
  <div class="zoom">
    <button type="button" data-zoom="out" aria-label="Zoom out">−</button>
    <button type="button" data-zoom="reset">Reset</button>
    <button type="button" data-zoom="in" aria-label="Zoom in">+</button>
  </div>
  <div class="diagram">
    <pre class="mermaid">
flowchart LR
  accTitle: TOPIC
  accDescr: One sentence saying what this diagram shows.
  A["First step"] --> B["Second step"]
      </pre>
  </div>
</section>

<noscript>
  <p>
    This page renders its diagram with JavaScript. The diagram source is in the
    <code>&lt;pre class="mermaid"&gt;</code> block above and is readable as
    plain text.
  </p>
</noscript>
```

The `accTitle:` / `accDescr:` lines are Mermaid's accessibility directives; they
become the SVG's accessible name and description. Plan 007 makes them mandatory
and plan 002's linter already checks for them, so seed them in the template now.

**Verify**:

- `grep -c 'id="diagram-error"' plugins/diagram-plans/skills/diagram-plans/MERMAID.md` → `1`
- `grep -c '<noscript>' plugins/diagram-plans/skills/diagram-plans/MERMAID.md` → `1`
- `grep -c 'accTitle' plugins/diagram-plans/skills/diagram-plans/MERMAID.md` → at least `1`

### Step 3: Replace the `<script>` block

Replace `MERMAID.md:85-102` entirely with:

```html
<script type="module">
  const blocks = [...document.querySelectorAll("pre.mermaid")];
  const sources = blocks.map((el) => el.textContent);
  const errBox = document.getElementById("diagram-error");
  const mq = window.matchMedia("(prefers-color-scheme: dark)");

  function fail(message, detail) {
    errBox.hidden = false;
    errBox.querySelector(".msg").textContent = message;
    errBox.querySelector("pre").textContent = detail || "";
  }

  // Plan 004 fills in the Geist palette here; plan 005 adds theme/look/layout.
  function themeConfig(dark) {
    return {
      theme: dark ? "dark" : "neutral",
      themeVariables: {
        fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
        fontSize: "16px",
      },
    };
  }

  let mermaid;
  try {
    ({ default: mermaid } =
      await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs"));
  } catch (e) {
    fail(
      "Could not load Mermaid from jsDelivr. This page needs network access the first time it is opened.",
      String(e)
    );
  }

  async function render() {
    if (!mermaid) return;
    try {
      // Measure with the real fonts. Rendering before they load makes Mermaid
      // size every node against the fallback metrics, and the text then
      // overflows its box when Geist swaps in.
      await Promise.all([
        document.fonts.load("400 16px Geist"),
        document.fonts.load("500 16px Geist"),
        document.fonts.load("600 16px Geist"),
        document.fonts.load('400 12px "Geist Mono"'),
      ]);
      await document.fonts.ready;

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        maxTextSize: 50000,
        ...themeConfig(mq.matches),
        // useMaxWidth:false renders at natural size and lets .diagram scroll.
        // Left at the default true, a wide diagram is squeezed into the card
        // and its text scales below legibility.
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: "linear",
          padding: 16,
          nodeSpacing: 56,
          rankSpacing: 72,
          wrappingWidth: 220,
        },
        sequence: { useMaxWidth: false },
        state: { useMaxWidth: false },
        gantt: { useMaxWidth: false },
        timeline: { useMaxWidth: false },
        quadrantChart: { useMaxWidth: false },
        journey: { useMaxWidth: false },
        er: { useMaxWidth: false },
      });

      blocks.forEach((el, i) => {
        el.removeAttribute("data-processed");
        el.textContent = sources[i];
      });
      errBox.hidden = true;
      await mermaid.run({ nodes: blocks, suppressErrors: false });
      blocks.forEach((el) => attachZoom(el.closest(".card")));
    } catch (e) {
      fail(
        "This diagram did not render — the Mermaid source has a syntax error.",
        (e && e.message) || String(e)
      );
    }
  }

  function attachZoom(card) {
    const pane = card.querySelector(".diagram");
    const svg = pane && pane.querySelector("svg");
    if (!pane || !svg || pane.dataset.zoomReady) return;
    pane.dataset.zoomReady = "1";

    const natural =
      svg.viewBox.baseVal.width || svg.getBoundingClientRect().width;
    let z = 1;
    const apply = () => {
      svg.style.width = natural * z + "px";
      svg.style.height = "auto";
    };
    apply();

    card.querySelectorAll("[data-zoom]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const k = btn.dataset.zoom;
        z =
          k === "in"
            ? Math.min(4, z * 1.25)
            : k === "out"
              ? Math.max(0.5, z / 1.25)
              : 1;
        apply();
      })
    );

    let drag = false,
      sx = 0,
      sy = 0,
      sl = 0,
      st = 0;
    pane.addEventListener("pointerdown", (e) => {
      drag = true;
      sx = e.clientX;
      sy = e.clientY;
      sl = pane.scrollLeft;
      st = pane.scrollTop;
      pane.classList.add("dragging");
      pane.setPointerCapture(e.pointerId);
    });
    pane.addEventListener("pointermove", (e) => {
      if (!drag) return;
      pane.scrollLeft = sl - (e.clientX - sx);
      pane.scrollTop = st - (e.clientY - sy);
    });
    const stop = (e) => {
      drag = false;
      pane.classList.remove("dragging");
      try {
        pane.releasePointerCapture(e.pointerId);
      } catch {}
    };
    pane.addEventListener("pointerup", stop);
    pane.addEventListener("pointercancel", stop);
  }

  mq.addEventListener("change", render);
  await render();
</script>
```

Notes on choices you might otherwise second-guess:

- The Mermaid import is a **dynamic** `import()` inside `try`/`catch`. A static
  top-level `import` cannot be caught — a CDN failure would abort the whole
  module and leave a blank page with only a console error.
- Zoom resizes the SVG element rather than applying a CSS `transform`. A
  transform does not change layout, so the scroll container would not know the
  content grew and you could not scroll to the far edge. Setting `width` keeps
  the scrollbars honest and keeps text crisp.
- `curve: "linear"` is a change from the (default) `basis`. Basis curves do not
  pass through their control points, so edges visually detach from node borders
  and edge labels drift off the line. Straight segments read better for plans.
- Plain wheel scrolling is left alone deliberately — hijacking it to zoom breaks
  page scrolling and is a common complaint about diagram viewers.

**Verify**:

- `grep -c 'useMaxWidth: false' plugins/diagram-plans/skills/diagram-plans/MERMAID.md` → `8`
- `grep -c 'document.fonts.ready' plugins/diagram-plans/skills/diagram-plans/MERMAID.md` → `1`
- `grep -c 'suppressErrors: false' plugins/diagram-plans/skills/diagram-plans/MERMAID.md` → `1`
- `grep -c 'function themeConfig' plugins/diagram-plans/skills/diagram-plans/MERMAID.md` → `1`

### Step 4: Update the template's prose

`MERMAID.md:17` currently reads:

> A complete, standalone document. Styling follows Vercel's Geist design system: Geist Sans / Geist Mono, neutral gray scale, 1px `#eaeaea` borders, 6–8px radii, black-on-white with a dark scheme. Mermaid comes from the jsDelivr CDN and re-renders when the color scheme flips. Replace `TOPIC`, the diagram, and the notes; leave the rest.

Append two sentences:

> The diagram renders at its natural size inside a scrollable, drag-to-pan pane with zoom controls — never scaled down to fit, which is what makes labels illegible. If Mermaid fails to load or the source has a syntax error, the page shows the reason in an error box instead of a blank card.

Leave the rest of the sentence alone; plan 004 rewrites the colour claims.

**Verify**: `grep -c 'never scaled down' plugins/diagram-plans/skills/diagram-plans/MERMAID.md` → `1`

### Step 5: Regenerate the fixture and re-run the gates

Rebuild `test/fixtures/sample-plan.html` from the updated template, keeping the
same sample flowchart plan 002 specified. Then remove the
`effective-font-size`, `no-overflow` and `font-applied` entries from any
`RENDER_CHECK_ALLOW_FAIL` list plan 002 left in `package.json` — this plan is
what makes them pass. Leave allowances that belong to plan 004 (`geist-tokens`,
`no-legacy-tokens`, `font-inlined`, `no-external-css`) in place.

**Verify**:

- `npm run lint` → exit 0
- `npm run test:render` → exit 0, with `PASS effective-font-size`,
  `PASS no-overflow` and `PASS font-applied` among the output
- `grep -c 'effective-font-size' package.json` → `0`

### Step 6: Prove each fix independently

For each row, make the edit in a scratch copy of the fixture, run
`node test/render-check.mjs <scratch>`, confirm the named rule FAILS, then
delete the scratch file.

| Scratch edit                                                                   | Rule that must fail   |
| ------------------------------------------------------------------------------ | --------------------- |
| `flowchart: { useMaxWidth: true }`                                             | `effective-font-size` |
| Delete the `document.fonts.load`/`fonts.ready` awaits                          | `no-overflow`         |
| Point the Mermaid import at `https://cdn.jsdelivr.net/npm/mermaid@11/nope.mjs` | `no-error`            |
| Replace the diagram body with `flowchart LR\n  A[[[broken`                     | `no-error`            |

The third and fourth rows are the important ones: they must fail with the error
box **visible and populated**, not with a blank page. Confirm by reading
`#diagram-error .msg` in the failure output.

**Verify**: all four fail as specified; `git status --porcelain test/` is clean
afterwards.

## Test plan

No new test files. This plan is verified through plan 002's harness:

- `python3 test/lint-page.py` covers the structural rules (`error-container`,
  `noscript`, `mermaid-block`, `accessibility`).
- `node test/render-check.mjs` covers the behavioural ones (`no-error`,
  `svg-rendered`, `has-text`, `font-applied`, `effective-font-size`,
  `no-overflow`, `console-clean`).
- Step 6 is the negative test: each fix, reverted individually, must break its
  own assertion.

If plan 002's `render-check.mjs` is in its puppeteer-missing skip path, run
`npm i` first. A skipped render check does **not** satisfy this plan's done
criteria.

## Done criteria

ALL must hold:

- [ ] `npm test` exits 0 with the render check actually running (not skipped)
- [ ] `grep -c 'useMaxWidth: false' .../MERMAID.md` returns `8`
- [ ] `grep -c 'justify-content: center' .../MERMAID.md` returns `0`
- [ ] `grep -c 'max-width: 100%' .../MERMAID.md` returns `0`
- [ ] `grep -c 'document.fonts.ready' .../MERMAID.md` returns `1`
- [ ] `grep -c 'function themeConfig' .../MERMAID.md` returns `1`
- [ ] `render-check.mjs` reports `PASS effective-font-size`, `PASS no-overflow`, `PASS font-applied`
- [ ] All four step-6 scratch edits failed their named rule and were deleted
- [ ] No colour literal in `MERMAID.md` changed (`git diff .../MERMAID.md | grep -E '^[+-].*#[0-9a-fA-F]{6}'` shows only the `#diagram-error` rules added in step 1)
- [ ] `git status --porcelain` lists no file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `test/render-check.mjs` or `test/lint-page.py` does not exist — plan 002 has
  not landed and this plan cannot be verified.
- The `MERMAID.md` script block does not match the "Current state" excerpt.
- `useMaxWidth: false` makes the render check fail `no-overflow` because a
  diagram now exceeds the viewport in a way the pan/zoom pane does not handle.
  Report the fixture's natural SVG width; do not compromise by re-enabling
  `useMaxWidth`.
- The dynamic `import()` fails under `file://` with a CORS error. That
  contradicts the engine research in `plans/000-research-diagram-engines.md`
  and must be reported before any further plan proceeds.
- You find yourself wanting to change a colour to make an assertion pass. That
  is plan 004's territory — stop and say so.

## Maintenance notes

- `themeConfig(dark)` exists purely as a seam for plan 004. Once 004 lands it
  holds the whole Geist palette; do not inline it back into `initialize()`.
- The eight `useMaxWidth: false` entries must be extended whenever the skill
  starts emitting a new diagram type — the setting is per-diagram-type and a
  missing entry silently reintroduces the shrinking bug for that type. Plan
  002's linter rule `diagram-type` lists the supported set; keep the two in
  sync.
- Reviewer should scrutinize: that zoom sets `width` and not `transform` (a
  transform breaks scrolling), and that the error box is genuinely reachable —
  the easiest way to regress this plan is a `catch` that swallows.
- Deferred out of this plan: exporting the diagram to PNG/SVG, keyboard
  shortcuts for zoom, and remembering the zoom level across reloads.
