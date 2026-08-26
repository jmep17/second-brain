# Plan 008: Restyle the config editor onto Fumadocs theme tokens

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**, from the repo root:
>
> ```
> git diff --stat e573964..HEAD -- site/components/config-editor.tsx site/components/commit-box.tsx "site/app/config/[tool]/page.tsx"
> ```
>
> Plan 006 edits the third of those files (it deletes a breadcrumb `<p>` and
> drops an `mt-1`). That change is **expected** — see "Depends on". Any other
> difference from the "Current state" excerpts is a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW-MED (no logic changes; purely presentational, but it touches
  every visual state of the editor, and several states are only reachable with
  a real drifted/broken chezmoi setup)
- **Depends on**: **006 (must land first)** — it edits
  `site/app/config/[tool]/page.tsx`, one of this plan's three files, and this
  plan's "Current state" excerpt for that file assumes 006's deletion is
  already applied.
- **Category**: tech-debt
- **Planned at**: commit `e573964`, 2026-08-26

## Why this matters

The config editor was built as a standalone prototype (config-system ticket
07) and styled with raw Tailwind palette classes — `neutral-200`, `blue-600`,
`amber-50`, `green-100`, `red-950` — each with a hand-written `dark:` variant.
Every other surface on the site is styled with Fumadocs theme tokens
(`fd-card`, `fd-muted-foreground`, `fd-primary`, …), which adapt to the theme
automatically.

While the editor lived at a bare `/config/<tool>` URL with no site chrome, the
mismatch was invisible. Plan 006 puts it inside `DocsLayout` — the same shell
as every wiki page — so the editor now sits directly beside Fumadocs-themed
navigation, and its hand-rolled greys read as a different application bolted
into the page. That is the concrete cost: the owner asked for config to be "a
standard part of the larger site", and after 006 it is structurally part of the
site but visually still a guest.

There is also a correctness dimension, not just taste:

- Several classes have **no dark variant at all** (`text-neutral-500` in three
  places, `text-neutral-400` twice, `text-amber-600` once, `bg-blue-600` for
  the Save button). They were picked against a white page and are now rendered
  on `--color-fd-background: hsl(0, 0%, 7%)` in dark mode.
- Each `dark:` variant is a second place to keep in sync. There are 14 of them
  across the three files. Tokens remove the entire category.

After this plan, the three files contain **zero** raw palette classes, the
editor's alert banners are the same component the wiki's callouts use, and its
buttons are Fumadocs' own button variants.

**Decisions already made — do not re-litigate:**

- **No logic changes.** Not one line of state, fetching, or event handling
  moves. This plan changes `className` values, two imports, and the JSX
  wrappers around the five alert banners. If you find yourself editing a
  `useState`, a `fetch`, or an `async function`, you have gone out of scope.
- **Semantic tokens are never used as text colour.** See "The contrast
  constraint" below — this is measured, not aesthetic.
- The `ObsidianCallout` component is reused rather than reimplemented.

## Current state

Every fact below was verified at commit `e573964` on 2026-08-26, and the whole
change was built and served before this plan was written (see "How this was
validated").

### Files

- `site/components/config-editor.tsx` — the per-file editor. 279 lines.
  **Edited** (the largest share of the diff).
- `site/components/commit-box.tsx` — the commit panel. 121 lines. **Edited.**
- `site/app/config/[tool]/page.tsx` — the config page shell. **Edited**
  (3 class changes only; plan 006 already removed its breadcrumb).

### The raw palette classes to remove

This is the complete inventory. When you are done, none of these strings may
appear in the three files.

`site/components/config-editor.tsx`:

| Line (approx) | Current class string |
| ---- | ---- |
| 22 | `bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300` |
| 27 | `bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300` |
| 31, 40 | `bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300` |
| 36 | `bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300` |
| 166 | `rounded-lg border border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800` |
| 176 | `rounded-lg border border-neutral-200 dark:border-neutral-800` |
| 177 | `... border-b border-neutral-200 px-4 py-3 dark:border-neutral-800` |
| 185, 191 | `text-xs text-neutral-400` |
| 196 | `rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-40` |
| 204, 221, 266 | `border-b border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200` |
| 211, 229 | `border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200` |
| 236 | `bg-white/60 ... dark:bg-black/30` |
| 249, 257 | `rounded-md border border-amber-400 px-2 py-1 text-xs font-medium disabled:opacity-40` |

`site/components/commit-box.tsx`:

| Line (approx) | Current class string |
| ---- | ---- |
| 72 | `rounded-lg border border-neutral-200 p-4 dark:border-neutral-800` |
| 73 | `... uppercase tracking-wide text-neutral-500` |
| 77 | `mt-2 text-sm text-neutral-500` |
| 82 | `... font-mono text-xs text-neutral-600 dark:text-neutral-300` |
| 85 | `mr-2 inline-block w-6 text-amber-600` |
| 97 | `... border border-neutral-300 bg-transparent ... dark:border-neutral-700` |
| 102 | `rounded-md bg-neutral-800 ... text-white disabled:opacity-40 dark:bg-neutral-200 dark:text-neutral-900` |
| 110 | `mt-2 font-mono text-xs text-green-700 dark:text-green-400` |
| 115 | `mt-2 font-mono text-xs text-red-700 dark:text-red-400` |

`site/app/config/[tool]/page.tsx` (**after plan 006 has landed**):

| Line (approx) | Current class string |
| ---- | ---- |
| 56 | `mt-2 text-sm text-neutral-500 dark:text-neutral-400` |
| 63 | `mb-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900` |
| 64 | `text-sm font-semibold uppercase tracking-wide text-neutral-500` |
| 72 | `text-sm text-blue-600 hover:underline dark:text-blue-400` |

### Library facts (verified against `site/node_modules` at this commit)

- **Bare `border` already uses the theme token.** `fumadocs-ui/css/lib/base.css`
  lines 208–215 set, in `@layer base`:

  ```css
  *, ::after, ::before, ::backdrop, ::file-selector-button {
    border-color: var(--color-fd-border, currentColor);
  }
  ```

  So `className="border"` / `"border-b"` / `"border-t"` picks up
  `--color-fd-border` with no colour class at all. **Do not write
  `border-fd-border`** — it is redundant. Just delete the colour classes.

- **`buttonVariants` is a public export** at
  `fumadocs-ui/components/ui/button` (confirmed in that package's `exports`
  map). Its signature is
  `buttonVariants({ variant?, color?, size?, className? })` where `color` is
  `"primary" | "outline" | "ghost" | "secondary"` and `size` is
  `"sm" | "icon" | "icon-sm" | "icon-xs"`. It returns a class **string**, so it
  drops straight into `className={...}`. The `primary` variant is
  `bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/80
  disabled:bg-fd-secondary disabled:text-fd-secondary-foreground`, and the base
  string already includes `disabled:pointer-events-none disabled:opacity-50`
  and `focus-visible:ring-2 focus-visible:ring-fd-ring`. That is why the
  existing `disabled:opacity-40` classes are simply dropped rather than kept.

- **`cn` is NOT exported** from `fumadocs-ui`. Do not try to import it. To add
  extra classes to a button, pass them via `buttonVariants({ ..., className })`.
  This plan never needs to.

- **`ObsidianCallout` is a public export** at `fumadocs-obsidian/ui` (alongside
  `ObsidianCalloutTitle` / `ObsidianCalloutBody`). The site already imports
  from that exact path in `site/app/docs/[[...slug]]/page.tsx`. Its props are
  `{ type?: "info" | "warn" | "warning" | "error" | "success" } &
  ComponentProps<"div">`. It is a plain function component with no
  `"use client"` of its own, so it composes inside the two client components
  here.

  Its implementation (from the package's sourcemap) is the canonical pattern
  this plan follows:

  ```tsx
  <div
    className="flex gap-2 my-4 rounded-xl border bg-fd-card p-3 ps-1 text-sm text-fd-card-foreground shadow-md"
    style={{ '--callout-color': `var(--color-fd-${type}, var(--color-fd-muted))` }}
  >
    <div role="none" className="w-0.5 bg-(--callout-color)/50 rounded-sm" />
    <Icon className="size-5 -me-0.5 fill-(--callout-color) text-fd-card" />
    <div className="flex flex-col gap-2 min-w-0 flex-1">{children}</div>
  </div>
  ```

  Note what it does **not** do: it never colours the text. The surface is
  neutral (`bg-fd-card` / `text-fd-card-foreground`) and the semantic colour
  appears only as a 0.5-wide left rail at 50% alpha and as the icon fill.

- **The semantic tokens exist** and are theme-static (one value for both light
  and dark), defined in `fumadocs-ui/css/lib/default-colors.css`:
  `--color-fd-info`, `--color-fd-warning`, `--color-fd-error`,
  `--color-fd-success`, `--color-fd-idea`.

### The contrast constraint (measured — do not override)

The semantic tokens are mid-lightness colours. Computed WCAG contrast of each
token used **as text** against `--color-fd-background`:

| Token | sRGB | on light (`hsl(0,0%,96%)`) | on dark (`hsl(0,0%,7%)`) |
| ---- | ---- | ---- | ---- |
| `fd-info` | `#2b7fff` | **3.44** | 4.98 |
| `fd-warning` | `#fe9a00` | **1.96** | 8.74 |
| `fd-error` | `#fb2c36` | **3.50** | 4.91 |
| `fd-success` | `#00c950` | **2.04** | 8.43 |

Everything in the "on light" column fails the WCAG AA 4.5:1 minimum for body
text — `fd-warning` and `fd-success` fail catastrophically. **Therefore:
never write `text-fd-success`, `text-fd-warning`, `text-fd-error`, or
`text-fd-info`.** Use the tokens only as backgrounds at low alpha, as borders,
or as icon fills — exactly as `ObsidianCallout` does.

Used as a **background tint at 20% over `fd-card`**, the same tokens are both
legible and distinguishable, which is what the status badges do:

| Badge | light tint | text contrast | dark tint | text contrast |
| ---- | ---- | ---- | ---- | ---- |
| `bg-fd-success/20` | `#c1e9d1` | 14.98 | `#143c24` | 10.30 |
| `bg-fd-warning/20` | `#f4e0c1` | 15.34 | `#473314` | 10.06 |
| `bg-fd-error/20` | `#f3cacc` | 13.33 | `#461d1f` | 12.07 |

(Text is `text-fd-foreground` in both themes.) This is why the badges keep a
coloured background but get neutral text.

### Conventions to match

- TypeScript strict; Prettier (repo-root `.prettierrc`: 2 spaces, double
  quotes, semicolons, printWidth 80, trailingComma es5, arrowParens always).
  A Husky pre-commit hook runs Prettier on staged files.
- **Prettier's Tailwind class ordering is not configured here** (no
  `prettier-plugin-tailwindcss` in `site/package.json`), but Prettier *does*
  reflow long `className` strings. The class strings in this plan are already
  in the exact form `prettier --write` produces — copy them verbatim, then run
  Prettier and confirm it makes no further change.
- Imports use the `@/` alias for local modules; package imports are bare.
- Existing comments in these files explain *why* (e.g. the ADR 0003 references
  in `config-editor.tsx`). Leave every existing comment intact — none of them
  describe styling.

## Commands you will need

Run all from `site/`.

| Purpose | Command | Expected on success |
| ---- | ---- | ---- |
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Build | `bun run build` | exit 0, ends with the route table |
| Serve | `bun run start -p 3100` | "Ready" — background it, then `curl` |
| Format | `bunx prettier --check app lib components` | exit 0 |

Note the added `components` argument — earlier plans only formatted `app lib`.

There is no test runner in `site/`; verification is typecheck + build +
Prettier + HTTP/CSS probes (Steps 5 and 6).

## Scope

**In scope** (the only files you may modify):

- `site/components/config-editor.tsx`
- `site/components/commit-box.tsx`
- `site/app/config/[tool]/page.tsx`
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch):

- `site/app/global.css` — no new CSS variables are needed; every token used
  here already exists. Adding project-level colour variables would create a
  second source of truth.
- `site/lib/**`, `site/app/api/**`, `site/app/page.tsx`, `site/app/docs/**`,
  `site/app/config/layout.tsx`, `site/app/not-found.tsx` — plan 006's files;
  they are already on tokens.
- `site/package.json` — **no new dependencies.** Both `fumadocs-ui` and
  `fumadocs-obsidian` are already direct dependencies.
- Any behaviour: state, fetch calls, the ADR 0003 save/drift/adopt logic, the
  `window.confirm` guard, the 5-second `setInterval` refresh.
- Anything under `wiki/`, `raw/`, `docs/`, `.scratch/`, `dotfiles/`.
- `log.md` — the reviewer appends the log entry.

## Git workflow

- Commit in the worktree you were given, on whatever branch it is already on.
- One commit is fine; message style matching `git log`, e.g.
  `style(site): config editor uses fumadocs theme tokens`.
- Do NOT push and do NOT open a PR.
- If `site/node_modules` is absent in your worktree, run `bun install` in
  `site/` first.

## Steps

### Step 0: Confirm 006 has landed and record the baseline

From the repo root:

```bash
grep -c '/ config' "site/app/config/[tool]/page.tsx"
```

Expected `0`. If it prints `1`, plan 006 has **not** landed in this worktree —
STOP and report; this plan's excerpt for that file is wrong until it does.

Then from `site/`:

```bash
bun install
rm -rf .next && bun run build
```

Must exit 0. Record the doc-path count from the route table as a sanity anchor;
nothing in this plan should change it.

**Verify**: grep prints `0`; build exits 0.

### Step 1: Add the two imports to both client components

At the top of **both** `site/components/config-editor.tsx` and
`site/components/commit-box.tsx`, immediately after the existing
`import { useCallback, useEffect, useState } from "react";` line:

```tsx
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { ObsidianCallout } from "fumadocs-obsidian/ui";
```

Leave the `"use client";` directive and the blank line below it exactly as they
are.

**Verify**: `bun run typecheck` → exit 0. (It will still pass with the imports
unused; TypeScript's `noUnusedLocals` is not enabled here.)

### Step 2: Retoken the status badges in `config-editor.tsx`

Replace the entire `BADGE` object (currently lines 18–42) with:

```tsx
const BADGE: Record<FileState, { label: string; className: string }> = {
  "in-sync": { label: "in sync", className: "bg-fd-success/20" },
  drifted: { label: "drifted", className: "bg-fd-warning/20" },
  "not-applied": { label: "not applied", className: "bg-fd-error/20" },
  meta: {
    label: "chezmoi meta",
    className: "bg-fd-muted text-fd-muted-foreground",
  },
  error: { label: "chezmoi error", className: "bg-fd-error/20" },
};
```

Every `label` string is unchanged. Only `className` values change, and the
three single-property entries collapse onto one line each because Prettier fits
them under 80 columns.

Then, at the badge's render site (currently line 180), add
`text-fd-foreground` so the neutral text colour is explicit rather than
inherited:

```tsx
          className={`text-fd-foreground rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
```

(The `meta` entry deliberately overrides this with
`text-fd-muted-foreground`, which wins because it comes later in the string.)

**Verify**: `bun run typecheck` → exit 0, and
`grep -c 'green-\|amber-\|red-\|neutral-' components/config-editor.tsx` has
dropped (it will not be `0` yet — later steps finish the job).

### Step 3: Retoken the shell, header and buttons in `config-editor.tsx`

Five edits, all `className` values:

1. The loading section (line 166) — note the colour classes are **deleted**,
   not replaced, because bare `border` already uses the token:

   ```tsx
      <section className="text-fd-muted-foreground rounded-lg border bg-fd-card p-4 text-sm">
   ```

2. The main section and its header (lines 176–177):

   ```tsx
    <section className="rounded-lg border bg-fd-card">
      <header className="flex items-center gap-3 border-b px-4 py-3">
   ```

3. The target-path span (line 185) and the "saved" span (line 191):

   ```tsx
          <span className="text-fd-muted-foreground truncate text-xs">
   ```

   ```tsx
            <span className="text-fd-muted-foreground text-xs">saved</span>
   ```

4. The Save button (line 196) — the whole `className` string becomes a call:

   ```tsx
            className={buttonVariants({ color: "primary", size: "sm" })}
   ```

5. The textarea (line 275) gains a top border (it previously relied on the last
   banner's `border-b`, which Step 4 removes) and a visible focus ring:

   ```tsx
        className="focus-visible:ring-fd-ring block h-[28rem] w-full resize-y border-t bg-transparent p-4 font-mono text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset"
   ```

**Verify**: `bun run typecheck` → exit 0.

### Step 4: Convert the five alert banners to `ObsidianCallout`

This is the only structural change in the plan. Each banner is currently a
full-bleed `<div>` with `border-b` and a hand-written colour scheme; each
becomes an inset `ObsidianCallout` inside a `<div className="px-4">` wrapper.

**Read this before starting**: the wrapper `<div className="px-4">` is required
— `ObsidianCallout` has its own `my-4` margin and `rounded-xl` border, so
without horizontal padding it would touch the section's edges. The visual
result changes from edge-to-edge coloured strips to inset cards matching the
wiki's callouts. That is intended.

**4a — the chezmoi-error banner** (currently lines 203–208):

```tsx
      {status.state === "error" && (
        <div className="px-4">
          <ObsidianCallout type="error">
            chezmoi could not report this file&apos;s state:
            <pre className="mt-2 overflow-x-auto text-xs">{status.error}</pre>
          </ObsidianCallout>
        </div>
      )}
```

Note `file&apos;s` — the raw apostrophe is fine in JSX text but Prettier leaves
it either way; use the entity to match the rest of the repo's JSX.

**4b — the stale-save banner** (currently lines 210–218):

```tsx
      {stale && (
        <div className="px-4">
          <ObsidianCallout type="warning">
            The file changed on disk since you opened it; this save was
            rejected.{" "}
            <button
              onClick={() => void load()}
              className="font-medium underline"
            >
              Reload
            </button>{" "}
            (your edits will be lost).
          </ObsidianCallout>
        </div>
      )}
```

The Reload button keeps `font-medium underline` — it is an inline text action,
not a chrome button, so it does **not** become a `buttonVariants` call.

**4c — the apply-failed banner** (currently lines 220–226):

```tsx
      {applyError && (
        <div className="px-4">
          <ObsidianCallout type="error">
            Saved, but <code>chezmoi apply</code> failed — the file is not
            applied:
            <pre className="mt-2 overflow-x-auto text-xs">{applyError}</pre>
          </ObsidianCallout>
        </div>
      )}
```

**4d — the drift banner** (currently lines 228–263). This one contains the diff
`<pre>` and the two resolve buttons:

```tsx
      {status.state === "drifted" && (
        <div className="px-4">
          <ObsidianCallout type="warning">
            <p>
              {driftBlocked
                ? "Save refused: the applied file changed after you opened this page. Resolve the drift, then save again — your editor text is kept."
                : "The applied file differs from this source (edited directly in $HOME?)."}
            </p>
            {status.diff ? (
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-fd-muted p-2 text-xs">
                {status.diff}
              </pre>
            ) : (
              <p className="mt-1 text-xs">
                Diff withheld: template files may render secrets.
              </p>
            )}
            <div className="mt-2 flex gap-2">
              {!status.isTemplate && (
                <button
                  onClick={() => void resolveDrift("adopt")}
                  disabled={busy}
                  className={buttonVariants({ color: "outline", size: "sm" })}
                >
                  Adopt $HOME version
                </button>
              )}
              <button
                onClick={() => void resolveDrift("overwrite")}
                disabled={busy}
                className={buttonVariants({ color: "outline", size: "sm" })}
              >
                Overwrite with source
              </button>
            </div>
          </ObsidianCallout>
        </div>
      )}
```

Both ternaries, both `onClick` handlers, the `disabled={busy}` props and the
`!status.isTemplate` guard are **unchanged** — only the two `className` values
and the surrounding wrapper differ. The diff `<pre>` swaps
`bg-white/60 dark:bg-black/30` for `bg-fd-muted`.

**4e — the generic error banner** (currently lines 265–269):

```tsx
      {error && (
        <div className="px-4">
          <ObsidianCallout type="error">{error}</ObsidianCallout>
        </div>
      )}
```

**Verify**:

- `bun run typecheck` → exit 0
- `grep -c 'green-\|amber-\|red-\|neutral-\|blue-\|bg-white/60\|text-white' components/config-editor.tsx` → `0`

### Step 5: Retoken `commit-box.tsx`

Seven `className` edits plus the two result/error blocks:

```tsx
    <section className="rounded-lg border bg-fd-card p-4">
      <h2 className="text-fd-muted-foreground text-sm font-semibold tracking-wide uppercase">
```

```tsx
        <p className="text-fd-muted-foreground mt-2 text-sm">
```

```tsx
          <ul className="text-fd-muted-foreground mt-2 space-y-1 font-mono text-xs">
```

The per-file git status letter loses its amber (`text-fd-warning` would be
1.96:1 on light — see "The contrast constraint") and instead earns emphasis
through weight:

```tsx
                <span className="text-fd-foreground mr-2 inline-block w-6 font-medium">
```

The message input and Commit button:

```tsx
              className="focus-visible:ring-fd-ring flex-1 rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-2"
```

```tsx
              className={buttonVariants({ color: "primary", size: "sm" })}
```

And the two result blocks become callouts, replacing the coloured `<p>`s:

```tsx
      {result && (
        <ObsidianCallout type="success">
          <pre className="overflow-x-auto font-mono text-xs">{result}</pre>
        </ObsidianCallout>
      )}
      {error && (
        <ObsidianCallout type="error">
          <pre className="overflow-x-auto font-mono text-xs">{error}</pre>
        </ObsidianCallout>
      )}
```

(No `px-4` wrapper here — `CommitBox`'s own `<section>` already has `p-4`.)
The `<p>` becomes a `<pre>` so multi-line git output keeps its line breaks,
which the old `<p>` collapsed.

**Verify**:

- `bun run typecheck` → exit 0
- `grep -c 'green-\|amber-\|red-\|neutral-\|blue-\|text-white' components/commit-box.tsx` → `0`

### Step 6: Retoken `app/config/[tool]/page.tsx`

Three `className` edits. Nothing else in the file changes — `docsForTool`,
`Object.hasOwn`, `notFound()`, the `<main>` wrapper, `ConfigEditor` and
`CommitBox` all stay byte-identical.

```tsx
        <p className="text-fd-muted-foreground mt-2 text-sm">
```

```tsx
        <section className="mb-8 rounded-lg border bg-fd-card p-4">
          <h2 className="text-fd-muted-foreground text-sm font-semibold tracking-wide uppercase">
```

The doc links drop their blue and adopt the same treatment the home-page table
of contents uses (`site/app/page.tsx` renders its links as
`className="font-medium underline"`):

```tsx
                <Link href={doc.href} className="text-sm font-medium underline">
```

**Verify**:

- `bun run typecheck` → exit 0
- `grep -c 'neutral-\|blue-' "app/config/[tool]/page.tsx"` → `0`

### Step 7: Format, build, and probe

```bash
bunx prettier --write app lib components
bunx prettier --check app lib components
bun run typecheck
rm -rf .next && bun run build
```

All four exit 0. **If `prettier --write` changes any class string you copied
from this plan, that is a STOP condition** — report the diff; the plan's
strings were taken from Prettier's own output.

Now serve and probe. From `site/`:

```bash
bun run start -p 3100 > /tmp/site-prod.log 2>&1 &
for i in $(seq 1 40); do curl -sf -o /dev/null http://127.0.0.1:3100/ && break; sleep 1; done
curl -s http://127.0.0.1:3100/config/tmux > /tmp/cfg.html

echo "sidebar=$(grep -o 'fd-sidebar' /tmp/cfg.html | wc -l) main=$(grep -o '<main' /tmp/cfg.html | wc -l)"
echo "--- raw palette leaked into HTML (must be empty) ---"
grep -o 'text-neutral-[0-9]*\|border-neutral-[0-9]*\|bg-neutral-[0-9]*\|bg-neutral-50\|bg-blue-600\|text-blue-[0-9]*\|border-amber-400\|bg-red-50\|text-green-700' /tmp/cfg.html | sort | uniq -c
echo "--- fd tokens present ---"
for c in bg-fd-card text-fd-muted-foreground; do
  echo "  $c = $(grep -o "$c" /tmp/cfg.html | wc -l)"
done
```

**Expected**: `sidebar=7 main=1`; the raw-palette section prints **nothing**;
`bg-fd-card` ≥ 1 and `text-fd-muted-foreground` ≥ 10.

> The server-rendered HTML shows the editor's **loading** state, because
> `ConfigEditor` fetches its file on mount. So the badges, the Save button and
> the callouts are legitimately absent from this HTML. Step 8 checks them.

### Step 8: Verify the generated CSS and the client bundle

The real risk in this plan is a class that renders in markup but was never
generated into the stylesheet. Two checks, with the server from Step 7 still
running.

**8a — the compiled CSS contains every utility used.** From `site/`:

```bash
css=$(grep -o '/_next/static/chunks/[a-zA-Z0-9_.-]*\.css' /tmp/cfg.html | head -1)
curl -s "http://127.0.0.1:3100$css" > /tmp/built.css
for c in 'bg-fd-success\\/20' 'bg-fd-warning\\/20' 'bg-fd-error\\/20' 'bg-fd-muted' 'bg-fd-card' \
         'bg-fd-primary' 'text-fd-primary-foreground' 'focus-visible\\:ring-fd-ring' 'callout-color'; do
  echo "$c = $(grep -c "$c" /tmp/built.css)"
done
```

**Expected**: every line prints `1` (the CSS is minified onto few lines, so `1`
means "present"). **Any `0` is a STOP condition** — that utility was not
generated and the corresponding element will render unstyled.

**8b — the client bundle carries the class strings.** From `site/`:

```bash
rm -f /tmp/chunks.js
for js in $(grep -o '/_next/static/chunks/[a-zA-Z0-9_.%-]*\.js' /tmp/cfg.html | sort -u); do
  curl -s "http://127.0.0.1:3100$js" >> /tmp/chunks.js
done
for c in 'bg-fd-success/20' 'bg-fd-warning/20' 'bg-fd-error/20' 'callout-color' 'in sync' 'chezmoi meta'; do
  echo "$c = $(grep -c -- "$c" /tmp/chunks.js)"
done
```

**Expected**: every line ≥ `1`.

Stop the server when done.

## Test plan

There is no test runner in `site/` and adding one is out of scope. Automated
verification is Steps 7 and 8, which cover: no raw palette class survives into
the served HTML, every token utility exists in the compiled CSS, and the client
bundle carries the badge and callout classes.

**The states that automation cannot reach** must be checked by a human in a
browser, in **both light and dark mode** (toggle with the theme switch in the
nav bar that plan 006 put on this page). The reviewer will do this; you may
skip it.

1. `/config/tmux` with chezmoi in sync → green "in sync" badge, readable label.
2. Edit the textarea → Save button enables (`fd-primary`); click → "saved".
3. Force drift: `echo "# drift" >> ~/.config/tmux/tmux.conf`, reload → amber
   "drifted" badge and the warning callout with the diff `<pre>` and both
   resolve buttons; check the diff block (`bg-fd-muted`) is readable in dark
   mode. Use "Overwrite with source" to clean up.
4. Force a stale save: open the page, edit `dotfiles/dot_config/tmux/tmux.conf`
   on disk, then Save → the warning callout with the inline Reload button.
5. `CommitBox` with dirty files → the file list and the Commit button; commit
   → success callout with git output.
6. Break chezmoi (e.g. rename the binary on `PATH`) → the "chezmoi error"
   badge and the error callout.

## Done criteria

Machine-checkable. ALL must hold (from `site/` unless stated):

- [ ] `bun run typecheck` exits 0
- [ ] `bun run build` exits 0
- [ ] `bunx prettier --check app lib components` exits 0
- [ ] `grep -c 'neutral-\|-green-\|-amber-\|-red-\|-blue-\|text-white\|bg-white/60\|bg-black/30' components/config-editor.tsx components/commit-box.tsx "app/config/[tool]/page.tsx"` → `0` for each of the three
- [ ] `grep -c 'text-fd-success\|text-fd-warning\|text-fd-error\|text-fd-info' components/config-editor.tsx components/commit-box.tsx "app/config/[tool]/page.tsx"` → `0` for each (the contrast constraint)
- [ ] `grep -c 'border-fd-border' components/config-editor.tsx components/commit-box.tsx "app/config/[tool]/page.tsx"` → `0` for each (bare `border` already resolves to the token)
- [ ] `grep -c 'buttonVariants' components/config-editor.tsx` → `4` (import + Save + two resolve buttons)
- [ ] `grep -c 'buttonVariants' components/commit-box.tsx` → `2` (import + Commit)
- [ ] `grep -c 'ObsidianCallout' components/config-editor.tsx` → `10` (import,
      plus 9 lines of open/close tags — banner 4e has both tags on one line, and
      `grep -c` counts lines, not occurrences)
- [ ] `grep -c 'ObsidianCallout' components/commit-box.tsx` → `5` (import + 2 open + 2 close tags)
- [ ] Step 7's raw-palette probe on the served HTML prints nothing
- [ ] Every line of Step 8a prints `1`; every line of Step 8b prints ≥ `1`
- [ ] `git diff --stat` (repo root) touches exactly three files under `site/`
- [ ] `git diff -- site/components/config-editor.tsx site/components/commit-box.tsx | grep -c '^[-+].*\(useState\|useEffect\|useCallback\|fetch(\|async function\)'` → `0` (no added or removed line touches state, effects or fetching — measured on the validated prototype)
- [ ] `plans/README.md` status row for 008 updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 0's grep prints `1` — plan 006 has not landed and this plan's third
  excerpt does not apply yet.
- `fumadocs-ui` or `fumadocs-obsidian` is not `16.15.1` / `1.0.3` — every
  library fact above was verified against those exact versions.
- `fumadocs-ui/components/ui/button` or `fumadocs-obsidian/ui` fails to
  resolve, or `buttonVariants` does not accept `{ color, size }`.
- `ObsidianCallout` rejects `type="success"` or `type="warning"`.
- Any line of Step 8a prints `0` — a utility is missing from the compiled CSS.
  Report which one; do **not** work around it by inlining a `style={{}}`.
- `prettier --write` reformats a class string you copied verbatim from this
  plan. Report the diff.
- You find yourself changing anything other than a `className`, the two import
  lines, or the JSX wrapper around a banner.
- You are tempted to write `text-fd-success` / `text-fd-warning` /
  `text-fd-error` — re-read "The contrast constraint"; the answer is no.
- Any verification fails twice after a reasonable fix attempt.

## How this was validated

Before this plan was written, the complete change was applied to a throwaway
copy of the repo in a scratch directory (never the working tree), on top of
plan 006's changes, and:

- `bun run typecheck`, `bunx prettier --check app lib components` and a clean
  `bun run build` all passed;
- the served `/config/tmux` contained **zero** raw palette classes, 7
  `fd-sidebar` markers and exactly one `<main>`;
- the compiled stylesheet contained every utility listed in Step 8a — including
  the `buttonVariants` classes, which originate in `node_modules` and were the
  main thing at risk of not being generated;
- the client bundle contained `bg-fd-success/20`, `bg-fd-warning/20`,
  `bg-fd-error/20`, `callout-color` and both badge labels.

The contrast tables in "The contrast constraint" were computed from the OKLCH
values in `default-colors.css` converted to sRGB, not estimated by eye.

## Maintenance notes

- **The rule to keep**: in this codebase, `fd-success` / `fd-warning` /
  `fd-error` / `fd-info` are *background and rail* colours, never text colours.
  A reviewer should reject any `text-fd-{success,warning,error,info}` on sight
  — the measured light-mode contrast is 1.96–3.50:1.
- **Bare `border` is deliberate.** Anyone "fixing" `className="border"` by
  adding a colour is undoing this plan; `fumadocs-ui/css/lib/base.css` already
  sets `border-color: var(--color-fd-border)` on every element.
- **New alerts go through `ObsidianCallout`**, not a hand-rolled `<div>`. That
  keeps the editor's alerts identical to the callouts rendered inside wiki
  pages, which is the whole point of this plan.
- **New buttons go through `buttonVariants`.** `primary` for the affirmative
  action, `outline` for secondary actions, `size: "sm"` throughout this UI.
  Note it already supplies disabled and focus-ring styling — do not re-add
  `disabled:opacity-40`.
- **Deferred, deliberately:** the `<textarea>` is still a plain textarea with a
  monospace font — no syntax highlighting for tmux/shell config. Fumadocs ships
  Shiki (`fumadocs-core/highlight`) and the site already renders highlighted
  code on wiki pages, so a read-mode highlighted view with an edit toggle is
  feasible. It is a behaviour change with real complexity (cursor handling,
  scroll sync), so it is not bundled into a presentational plan. Recorded as a
  follow-up in `plans/README.md`.
- **Also deferred:** `CommitBox` polls `/api/config/git` every 5 seconds
  regardless of whether the panel is visible. Unrelated to styling; recorded as
  a follow-up.
