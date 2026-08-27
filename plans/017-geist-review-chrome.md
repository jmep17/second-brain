# Plan 017: Geist review chrome

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- site/components/artifact-reviewer.tsx plugins/DESIGN.md`
> If either file changed since `c0ee11c`, re-read it and compare against
> "Current state" below. On a mismatch, STOP and report instead of adapting
> silently.

## At a glance

- **What**: Restyle the artifact review chrome (`site/components/artifact-reviewer.tsx`) off Tailwind indigo / Fumadocs `fd-*` tokens onto the Geist contract in `plugins/DESIGN.md`.
- **Why**: The chrome is the reader's most common touchpoint on every artifact, so its mismatch with the Geist contract is the biggest look-and-feel gap for the least effort.
- **Next action**: Step 1 — Add the Geist token block, scoped

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (presentational only; no payload, route, or issue-tracker shape changes)
- **Depends on**: plans/011 (DESIGN.md contract), plans/012 (the reviewer component itself), plans/015 (review tray + Approve/Queue/Save actions) — all DONE
- **Category**: direction / dx
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

`artifacts/decisions/2026-08-27-artifacts-workflow-direction.html` (Option 1)
found that the review chrome the site wraps around every artifact —
`site/components/artifact-reviewer.tsx` — is styled with Tailwind's
`indigo-*` utility classes and Fumadocs' `fd-*` semantic tokens, not the
Geist contract in `plugins/DESIGN.md` that every artifact page itself must
follow. The chrome (toolbar, tray, buttons, badges) is the reader's most
common touchpoint — every artifact is now opened through it — so it is the
biggest look-and-feel gap for the least effort. The owner approved this
option in `.scratch/artifact-feedback/issues/04-approve-geist-review-chrome-dashboard-artifacts-index-open-q.md`.

## Current state

### The chrome is on a different token system than the pages it hosts

`site/components/artifact-reviewer.tsx` renders two regions around the
iframed artifact:

- A toolbar header (`artifact-reviewer.tsx:862-928`) — `border-indigo-500/30
  bg-indigo-500/[0.06]` when review mode is active (`:864-868`), an
  `indigo-600`/`indigo-500` primary button for "Start/Exit review mode"
  (`:918-925`), and an `indigo-600 dark:text-indigo-300` accent color on the
  kicker text and badge (`:872-913`).
- A review tray aside (`:938-1205`) — target cards, the "Requested change"
  textarea, batch title/instruction fields, kind radios, the model-select
  `<details>`, and three submit buttons, all built from `bg-fd-card`,
  `bg-fd-background`, `border` (Fumadocs' default `--color-fd-border`),
  `text-fd-muted-foreground`, and `indigo-600`/`indigo-500` for every
  interactive/selected state (`:918-925`, `:1057`, `:1090`, `:1110`,
  `:1126`, `:1143`, `:1152`, `:1160`, `:1191`).
- Selection highlighting injected into the iframed document itself
  (`artifact-reviewer.tsx:87` `REVIEW_ACCENT = "rgb(99, 102, 241)"`, used at
  `:577-582`, `:701-713`) — this is indigo too, and it paints *inside* the
  artifact's own document, so it must stay visually distinct from whatever
  tone the chrome adopts (it marks "the site's tool is drawing on your
  page," not the artifact's own content).

### Why `fd-*` is not the fix

`site/app/global.css:1-3` pulls Fumadocs' theme from
`fumadocs-ui/css/neutral.css` (OKLCH-based), not Geist. `plans/README.md`'s
plan-008 write-up already measured this against WCAG: converting
`default-colors.css`'s OKLCH values to sRGB gives `fd-warning` 1.96:1,
`fd-success` 2.04:1, `fd-info` 3.44:1, `fd-error` 3.50:1 against
`--color-fd-background` in light mode — all fail AA as text. Plan 008
responded by forbidding `text-fd-{success,warning,error,info}` outright and
using those tokens only as background tints. `plugins/DESIGN.md` §2 sets a
harder bar for artifact pages: warning/info text tones MUST clear AA in
*both* themes, with proven values `#8a4b00`/`#0057b7` (light) and
`#f5a623`/`#52a8ff` (dark). Mapping Geist's contract onto `fd-*` variables
would inherit the exact category of failure plan 008 already found and
worked around — the tokens are structurally different systems (OKLCH
semantic roles with baked-in contrast problems vs. Geist's numbered gray
scale with AA guarantees baked into the palette itself).

### Decision this plan settles

**Adopt Geist tokens outright in the reviewer's own chrome**, scoped with a
component-local CSS custom-property block (matching the pattern every
artifact page already uses, see `plugins/diagrams/skills/diagram-plans/MERMAID.md:45-56`
for the canonical `:root` variable set) rather than mapping Geist values
into `fd-*`. Rationale:

1. `fd-*` already carries a documented AA failure for exactly the semantic
   roles (warning/info-equivalent accents) this component uses for its
   "review mode active" and "selected" states.
2. The chrome is not part of the Fumadocs site shell's own navigation or
   layout (sidebar, header, docs nav) — those legitimately stay on `fd-*`
   and are out of scope here. The chrome is the *artifact review surface*,
   which `plugins/DESIGN.md` already normatively governs for every other
   artifact; treating the reviewer as an extension of that surface, not of
   the docs site, keeps one contract instead of two.
3. Geist's tokens already ship in this codebase (every artifact template)
   with a verified Google Fonts + fallback-stack setup; no new dependency.

Non-token layout classes (`flex`, `grid`, `border-t`, `rounded-lg`, sizing,
etc.) stay as Tailwind utilities — only *color* and *radius* tokens move to
the Geist CSS variables. This mirrors how every existing artifact template
mixes plain CSS layout with the Geist `:root` token block.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Typecheck | `cd site && bun run typecheck` | exit 0 |
| Build | `cd site && bun run build` | exit 0; `/artifacts/review/*` route unchanged in the route list |
| Format | `bunx prettier --check site/components/artifact-reviewer.tsx site/app/global.css` | exit 0 |
| Manual check | `cd site && bunx next dev -H 127.0.0.1 -p 4317`, then open `/artifacts/review/decisions/2026-08-27-artifacts-workflow-direction.html` | toolbar and tray render in Geist tokens, light and dark; iframe content unaffected |

## Scope

**In scope**:

- `site/components/artifact-reviewer.tsx` — restyle the toolbar and tray;
  keep all state, handlers, discovery logic, and the fetch/submit flow
  byte-identical.
- `site/app/global.css` — add the Geist `:root` / dark-scheme token block
  and the Geist Google Fonts `@import`, scoped so it only affects elements
  under a new wrapper class (e.g. `.geist-review`) the reviewer's root
  `<main>` carries. Do not remove or edit the existing `fd-*`/Fumadocs
  imports or the global thin-scrollbar rule at `global.css:15-19`.

**Out of scope**:

- The Fumadocs docs shell (sidebar, top nav, `/docs/*`, `/config/*`) — stays
  on `fd-*`.
- `site/app/artifacts/page.tsx` (the `/artifacts` index) — covered by plan
  018.
- The embedded per-page feedback widget inside artifact HTML files
  (`plugins/DESIGN.md` §8) — already Geist-native, untouched.
- `REVIEW_ACCENT` / the in-iframe selection highlight color
  (`artifact-reviewer.tsx:87`) — this paints inside the artifact's own
  document, not the chrome, and must stay visually distinct from whatever
  accent the chrome uses so a reader can tell "the tool is drawing on the
  page" from "this is the artifact's own content." Pick the chrome's accent
  from Geist's info-tone (`--text-info`) or a neutral high-contrast gray,
  not from `REVIEW_ACCENT`'s hue, and leave `REVIEW_ACCENT` itself
  unchanged.
- `site/scripts/test-artifact-review.mjs` and its Playwright assertions —
  they check behavior (selection, submission, cleanup), not color; no
  change needed unless a selector it depends on (e.g. a class name) is
  renamed. Grep it for any Tailwind class you delete before deleting it.

## Git workflow

- Branch: `advisor/017-geist-review-chrome`
- Commit: `site: restyle the artifact review chrome onto Geist tokens`
- Do NOT push or open a PR.

## Steps

### Step 0: Confirm the Playwright script has no hard dependency on the classes you're about to change

```
grep -n "indigo\|bg-fd-card\|bg-fd-background\|text-fd-muted-foreground" site/scripts/test-artifact-review.mjs
```

Expected: no matches (the script selects by `data-*` attributes and ARIA,
not Tailwind classes). If it matches, note every hit and update the
selector alongside the restyle in the same commit — do not leave the test
referencing a class you deleted.

### Step 1: Add the Geist token block, scoped

In `site/app/global.css`, after the existing imports, add:

```css
.geist-review {
  --geist-bg: #ffffff;
  --geist-fg: #171717;
  --accents-1: #fafafa;
  --accents-2: #eaeaea;
  --accents-3: #999999;
  --accents-5: #666666;
  --text-warning: #8a4b00;
  --text-info: #0057b7;
  --radius: 10px;
  --font-sans:
    "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
  .geist-review {
    --geist-bg: #000000;
    --geist-fg: #ededed;
    --accents-1: #111111;
    --accents-2: #333333;
    --accents-3: #888888;
    --accents-5: #a1a1a1;
    --text-warning: #f5a623;
    --text-info: #52a8ff;
  }
}
```

This is the same variable set MERMAID.md's `:root` block uses
(`plugins/diagrams/skills/diagram-plans/MERMAID.md:45-56`), copied verbatim
per `plugins/DESIGN.md` §9's "new types copy its token block verbatim"
rule, scoped under a class instead of `:root` because this lives inside the
Next.js app shell alongside `fd-*`, not in a standalone artifact document.

Add the Geist Google Fonts `<link>` pair
(`fonts.googleapis.com`/`fonts.gstatic.com`, `family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500`)
to `site/app/layout.tsx`'s `<head>` if not already present — check first:

```
grep -rn "fonts.googleapis.com/css2?family=Geist" site/app/layout.tsx
```

If present (another plugin/page may already load it), skip; if absent, add
it once, globally — do not duplicate `<link>` tags per page.

**Verify**: `bunx prettier --check site/app/global.css` passes; no existing
`fd-*` variable definition was touched (`git diff site/app/global.css`
shows only additions).

### Step 2: Restyle the toolbar

In `artifact-reviewer.tsx`, add `className="geist-review"` to the outer
`<main>` (`:860`). Replace the indigo/fd-* classes in the toolbar
(`:862-928`) with Geist-token equivalents using inline
`style={{ ... }}` or a small set of local CSS classes added to
`.geist-review` in `global.css` (match whichever pattern keeps the diff
smallest — this file already mixes Tailwind utility classes for layout
with token-driven color, so prefer: keep Tailwind for `flex`/`gap`/`px`/
`py`/sizing, replace only `bg-*`/`text-*`/`border-*`/`rounded-*` color and
radius utilities with `style` reading the CSS variables, e.g.
`style={{ borderColor: "var(--accents-2)", background: "var(--accents-1)" }}`).

Map:

- Toolbar background (active/inactive): `var(--accents-1)` / `var(--geist-bg)`.
- Toolbar border: `var(--accents-2)`.
- Kicker text color: `var(--text-info)` (not `--accents-3`, which is a
  border/muted-text role, not an accent — the kicker is calling out
  "review mode active," an info-toned state).
- Primary "Start/Exit review mode" button: `background: var(--geist-fg)`,
  `color: var(--geist-bg)` when inactive (Geist's high-contrast filled
  button pattern — see `plugins/DESIGN.md` §4's 700–800 "high-contrast
  background" role), `border: 1px solid var(--accents-2)` when active
  (secondary/outline state, matching "Exit review mode"'s current
  secondary treatment).
- Badge ("N selected"): border `var(--accents-2)`, background
  `var(--accents-1)` when zero, `color: var(--text-info)` +
  `border-color: var(--text-info)` at low opacity when nonzero.
- Radius: `var(--radius)` (10px) on the button and badge (was `rounded-lg`
  / `rounded-full` — keep `rounded-full` on the badge, a pill is exempt
  from the card-radius band).

**Verify**: `bun run typecheck` passes; visually confirm in the manual
check (Step 4) that the toolbar has no `indigo-*` or `fd-*` color classes
left: `grep -n "indigo\|fd-card\|fd-background\|fd-muted-foreground\|fd-accent\|fd-border\|fd-foreground" site/components/artifact-reviewer.tsx` inside the toolbar's line range (862-928) returns nothing.

### Step 3: Restyle the tray

Apply the same token mapping to the tray aside (`:938-1205`):

- Tray/card backgrounds: `var(--geist-bg)` (page) / `var(--accents-1)`
  (raised card) — DESIGN.md §2's "two background levels" rule.
- Borders: `var(--accents-2)` default, `var(--text-info)` on
  focus-visible (replacing `focus-visible:ring-indigo-500/40`).
- Selected-target accent (the small dot, the text-selection card border/
  background at `:975-981`, `:967-971`): `var(--text-info)`, not
  `REVIEW_ACCENT`'s indigo — this is chrome UI state, not the in-iframe
  highlight, so it should read as *part of the chrome's* accent language,
  not borrow the iframe's marker color.
- Inputs/textareas: `border: 1px solid var(--accents-2)`, focus
  `border-color: var(--text-info)`.
- Kind radio pills: same border/background pattern as the badge above.
- Primary "Approve · run now" button: Geist's filled high-contrast style
  (`background: var(--geist-fg); color: var(--geist-bg)`), not
  `bg-indigo-600`.
- Secondary "Queue for agent" / "Save for triage": outline style, `1px
  solid var(--accents-2)`, matching DESIGN.md's materials.
- Status (`role="status"`) / error (`role="alert"`) text: keep semantic
  meaning but use `var(--text-info)`-family success framing is not
  available in the two-tone warning/info palette — use `var(--text-info)`
  for status and a red that clears AA in both themes for error; DESIGN.md
  does not define an error text tone, so pick one and record it: use
  `#c00` light / `#ff6b6b` dark and note in the commit message that this
  is a new tone not yet in DESIGN.md (do not silently expand the contract
  without saying so).
- Radii: `var(--radius)` on cards, 6px (per DESIGN.md §4 "6px for small
  controls/chips") on buttons/badges/pills.

**Verify**: same grep as Step 2, run against the tray's line range
(938-1205); zero indigo/fd-* color-class matches remain.

### Step 4: Manual light/dark check

```
cd site && bunx next dev -H 127.0.0.1 -p 4317
```

Open `http://127.0.0.1:4317/artifacts/review/decisions/2026-08-27-artifacts-workflow-direction.html`.
Toggle review mode; select a target; toggle OS/browser dark mode. Confirm:

- Toolbar and tray render in the Geist palette in both themes, no
  leftover indigo.
- The iframe's own selection highlight (still `REVIEW_ACCENT`, indigo)
  remains visually distinct from the chrome's info-tone accent — this is
  intentional (Scope, above), not a miss.
- Text is legible (spot-check with a contrast checker on the kicker,
  badge, and status text against their backgrounds in both themes).

### Step 5: Full verification and commit

```
cd site && bun run typecheck
cd site && bun run build
bunx prettier --check site/components/artifact-reviewer.tsx site/app/global.css site/app/layout.tsx
bash tools/check-plugins.sh
git diff --stat
```

Confirm the diff touches only `site/components/artifact-reviewer.tsx`,
`site/app/global.css`, and (if the font link was added)
`site/app/layout.tsx`. Commit.

## Test plan

- Typecheck and build gates (no new runtime logic, so no new unit tests
  are needed — this plan is presentational).
- Manual: Step 4's light/dark walkthrough is the acceptance test; there is
  no existing automated visual-regression harness in this repo to extend.
- Regression: re-run `bun run test:artifact-review` if a dev server and
  Chromium are available, to confirm Step 0's grep held and selection/
  submission behavior is unaffected by the class changes.

## Done criteria

- [ ] `grep -n "indigo" site/components/artifact-reviewer.tsx` returns 0
      matches
- [ ] `grep -n "bg-fd-card\|bg-fd-background\|text-fd-muted-foreground\|fd-accent\|border-fd\|focus-visible:ring-indigo" site/components/artifact-reviewer.tsx` returns 0 matches inside the toolbar/tray (a stray `fd-*` reference in an unrelated already-Tailwind-layout class like `bg-fd-background` used purely for the outer `<main>` fallback before hydration is acceptable only if it's outside `.geist-review`'s scope — else fix it)
- [ ] `bun run typecheck` and `bun run build` exit 0
- [ ] `bunx prettier --check` exits 0 on all touched files
- [ ] `bash tools/check-plugins.sh` passes
- [ ] Manual light/dark check (Step 4) confirms Geist palette, AA-legible
      text, and `REVIEW_ACCENT` still visually distinct from the chrome
- [ ] Scope exactly the files listed above

## STOP conditions

- Restyling requires touching `discoverTargets`, the submit flow, or any
  non-visual logic in `artifact-reviewer.tsx` — stop, the plan is
  presentational-only by design.
- The Playwright test script (`test-artifact-review.mjs`) depends on a
  Tailwind class being renamed and cannot be trivially updated in the same
  commit — stop and report which selector broke.
- `fd-*` tokens turn out to be required for correct rendering inside the
  Fumadocs `DocsLayout` wrapper (e.g. layout classes that also carry
  color) — stop and report the specific conflict rather than leaving a
  half-migrated component.

## Maintenance notes

- If `plugins/DESIGN.md`'s token values change, this component's
  `.geist-review` block in `global.css` must be updated alongside every
  other conforming instance (`plugins/DESIGN.md` §9).
- The new error text tone (`#c00`/`#ff6b6b`, Step 3) is not yet normative
  in DESIGN.md. A future plan should either add it to §2 or replace it
  with a DESIGN.md-sanctioned value once one exists.
- Plan 018 (dashboard artifacts index) and plan 020 (open question on the
  page) both touch site UI adjacent to this component; if either lands
  first, re-check this plan's line citations before starting.
