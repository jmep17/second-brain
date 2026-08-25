# Plan 005: Give the home page the docs sidebar

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**, from the repo root:
> `git diff --stat e858c3b..HEAD -- site/app/page.tsx site/app/docs/layout.tsx site/lib/layout.shared.tsx site/lib/source.ts site/package.json`
> If any of those files changed since this plan was written, compare the
> "Current state" excerpts against the live files before proceeding. Any
> differing line in an excerpt is a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW (one file, `site/app/page.tsx`; no content file changes)
- **Depends on**: 003 (DONE, merged as `74be1ba`)
- **Category**: direction
- **Planned at**: commit `e858c3b`, 2026-08-25

## Why this matters

Before plan 003, `/` was a `<meta http-equiv="refresh">` redirect into
`/docs/wiki`, so every visitor landed on a page rendered by `DocsLayout` —
with the navigation sidebar. Plan 003 replaced that redirect with a real
table of contents rendered in `HomeLayout`, which by design has no sidebar.
Net effect for the reader: the site's front door lost its sidebar.

The owner wants it back. After this plan, `/` renders the same table of
contents inside `DocsLayout`, so the sidebar (the full page tree) is present
on the home page exactly as it is on every `/docs/*` page.

**Decision (already made, do not re-litigate):** keep the table of contents
itself unchanged. This plan swaps the layout wrapper only. Do not restyle the
TOC, do not change grouping, and do not touch `site/lib/toc.ts`.

## Current state

All facts below were verified at commit `e858c3b` on 2026-08-25. The site
builds cleanly at this commit (`cd site && bun run build` → exit 0, 15 static
pages).

### Files

- `site/app/page.tsx` — the home page. **The only file this plan edits.**
- `site/app/docs/layout.tsx` — the docs layout. **Unchanged**; it is the
  exemplar for how `DocsLayout` is wired in this repo.
- `site/lib/toc.ts` — builds the TOC data. **Unchanged.**
- `site/lib/source.ts` — the content source. **Unchanged**; read only for
  `source.getPageTree()`.
- `site/lib/layout.shared.tsx` — shared nav options. **Unchanged.**

### Excerpts

`site/app/docs/layout.tsx` (entire file — this is the wiring to copy):

```tsx
import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
```

`site/app/page.tsx` lines 1–20 (the part this plan changes):

```tsx
import { HomeLayout } from "fumadocs-ui/layouts/home";
import Link from "next/link";
import type { Metadata } from "next";
import { baseOptions } from "@/lib/layout.shared";
import { buildToc } from "@/lib/toc";

export const metadata: Metadata = {
  title: "Second Brain",
  description: "Table of contents for the wiki and its sources.",
};

export default function Home() {
  const groups = buildToc();
  return (
    <HomeLayout {...baseOptions()}>
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="mb-2 text-3xl font-semibold">Table of contents</h1>
        <p className="text-fd-muted-foreground mb-8">
          Every page on this site, grouped by type.
        </p>
```

The rest of the file (the `groups.map(...)` block, the closing
`</div>` and `</HomeLayout>`) is unchanged except for those two closing tags.

### Library facts (verified against `site/node_modules` at this commit)

- `fumadocs-ui@16.15.1` exports `DocsLayout` from `fumadocs-ui/layouts/docs`.
  `DocsLayoutProps extends BaseLayoutProps` and requires
  `tree: PageTree.Root` (`node_modules/fumadocs-ui/dist/layouts/docs/index.d.ts`),
  so `<DocsLayout tree={source.getPageTree()} {...baseOptions()}>` type-checks
  — the same call the docs layout already makes.
- **`DocsLayout` renders no `<main>` element** (zero occurrences of `"main"`
  in `node_modules/fumadocs-ui/dist/layouts/docs/index.js`). On `/docs/*`
  pages the single `<main>` comes from `DocsPage`, which the home page does
  not use. `HomeLayout`, which the home page uses today, _does_ render one —
  so simply swapping the wrapper would leave the home page with zero `<main>`
  landmarks. That is why Step 1 also promotes the inner `<div>` back to
  `<main>`: exactly one `<main>` before, exactly one after.
- Sidebar link counts at this commit: a doc page
  (`out/docs/wiki/dotfiles-management.html`) contains 9 unique `/docs/` hrefs
  — 7 wiki pages and 2 of the 4 `raw/` pages. The TOC on `/` lists all 11.
  The sidebar's set is a subset of the TOC's, so after this change the total
  unique `/docs/` hrefs in `out/index.html` stays **11**.

### Conventions to match

- TypeScript strict; Prettier (`.prettierrc`: 2 spaces, double quotes, semi,
  printWidth 80, trailingComma es5). A pre-commit hook runs Prettier on
  staged files.
- Imports use the `@/` alias (`tsconfig.json` `paths`).
- Import order in this repo's layout files: content source first, then the
  fumadocs layout, then `baseOptions`, then types (see the docs layout
  excerpt above). Match it.

## Commands you will need

Run all from `site/` (`cd site`).

| Purpose   | Command                         | Expected on success                                   |
| --------- | ------------------------------- | ----------------------------------------------------- |
| Install   | `bun install`                   | exit 0                                                |
| Typecheck | `bun run typecheck`             | exit 0, no errors                                     |
| Build     | `bun run build`                 | exit 0, ends with the route table                     |
| Format    | `bunx prettier --check app lib` | exit 0 ("All matched files use Prettier code style!") |

There is no test runner in `site/`; verification is typecheck + build +
`grep` on the exported HTML.

## Scope

**In scope** (the only file you should modify):

- `site/app/page.tsx`

**Out of scope** (do NOT touch):

- `site/lib/toc.ts`, `site/lib/source.ts`, `site/lib/layout.shared.tsx`,
  `site/app/docs/**`, `site/app/layout.tsx` — no change is needed in any of
  them.
- `site/README.md` — its home-page paragraph stays accurate; the TOC is
  unchanged, only its wrapper.
- Anything under `wiki/` or `raw/` — owned by the wiki workflow.
- `CLAUDE.md`, `log.md`.
- `site/package.json` — no new packages.

## Git workflow

- Commit in the worktree you were given, on whatever branch it is already on.
- One commit, message style matching `git log`, e.g.
  `feat(site): home page uses the docs layout so it keeps the sidebar`.
- Do NOT push or open a PR.

## Steps

### Step 1: Swap the layout wrapper in `site/app/page.tsx`

Four edits in that one file:

1. Replace the first import line

   ```tsx
   import { HomeLayout } from "fumadocs-ui/layouts/home";
   ```

   with these two, placed so the final import order is: `source`,
   `DocsLayout`, `Link`, `Metadata`, `baseOptions`, `buildToc`:

   ```tsx
   import { source } from "@/lib/source";
   import { DocsLayout } from "fumadocs-ui/layouts/docs";
   ```

2. Change the opening wrapper from

   ```tsx
   <HomeLayout {...baseOptions()}>
   ```

   to

   ```tsx
   <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
   ```

3. Change the matching closing tag `</HomeLayout>` to `</DocsLayout>`.

4. Change the inner container element from `<div` to `<main` and its closing
   `</div>` to `</main>` — the one with
   `className="mx-auto w-full max-w-3xl flex-1 px-6 py-10"`. Keep the
   className exactly as it is. (Rationale: `DocsLayout` renders no `<main>`;
   see Library facts.)

Nothing else in the file changes — `metadata`, `buildToc()`, and the whole
`groups.map(...)` block stay byte-identical.

**Verify**: `bun run typecheck` → exit 0, then `bunx prettier --check app lib`
→ exit 0 (run `bunx prettier --write app lib` first if it fails, then re-check).

### Step 2: Build and inspect the export

Run `rm -rf out && bun run build`.

**Verify**, all from `site/`:

- `grep -c 'fd-sidebar' out/index.html` → at least `1` (the sidebar is now on
  the home page)
- `grep -o '<main' out/index.html | wc -l` → `1` (exactly one landmark)
- `grep -c '</main></main>' out/index.html` → `0` (no nesting)
- `grep -c 'Table of contents' out/index.html` → at least `1` (the TOC is
  still rendered)
- `grep -o 'href="/docs/[^"]*"' out/index.html | sort -u | wc -l` → `11`
- `grep -c 'techniques for version-controlling dotfiles' out/index.html` → `1`
  (summaries still wired)
- `grep -c 'http-equiv="refresh"' out/index.html` → `0`
- `test ! -e out/docs/wiki.html && echo ok` → `ok`
- A doc page is unaffected:
  `grep -o 'href="/docs/[^"]*"' out/docs/wiki/dotfiles-management.html | sort -u | wc -l`
  → `9`

## Test plan

No test runner exists in `site/` and adding one is out of scope. Verification
is the build plus the `grep` gates in Step 2. Manual check (optional, and the
reviewer will do it): `bun run start`, open http://localhost:3000, confirm the
sidebar lists the wiki pages and that clicking one navigates without the
sidebar disappearing or shifting.

## Done criteria

Machine-checkable. ALL must hold (run from `site/`):

- [ ] `bun run typecheck` exits 0
- [ ] `bun run build` exits 0
- [ ] `bunx prettier --check app lib` exits 0
- [ ] `grep -c 'fd-sidebar' out/index.html` is at least `1`
- [ ] `grep -o '<main' out/index.html | wc -l` prints `1`
- [ ] `grep -o 'href="/docs/[^"]*"' out/index.html | sort -u | wc -l` prints `11`
- [ ] `grep -c 'techniques for version-controlling dotfiles' out/index.html` prints `1`
- [ ] `git status --short` (repo root) shows only `site/app/page.tsx`
- [ ] `git diff --stat -- wiki raw CLAUDE.md log.md site/lib` is empty

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt does not match the live file.
- `DocsLayout` does not type-check with `tree={source.getPageTree()}` and
  `{...baseOptions()}` — the `fumadocs-ui` version differs from `16.15.1`.
- `out/index.html` ends up with zero or two-plus `<main>` elements after
  Step 1 — report the count; do not add or remove wrappers to force it.
- The sidebar renders on `/` but the TOC no longer does (the
  `Table of contents` grep returns 0).
- The unique `/docs/` href count on `/` is anything other than `11`, or the
  doc-page count is anything other than `9` — the page tree changed shape;
  report the observed numbers.
- A verification fails twice after a reasonable fix attempt.
- You find yourself editing any file other than `site/app/page.tsx`.

## Maintenance notes

- `/` and `/docs/*` now render two separate `DocsLayout` instances with the
  same `tree`. If the sidebar is ever customized (grouping by frontmatter
  `type` is an open follow-up), the options must be applied in both
  `site/app/docs/layout.tsx` and `site/app/page.tsx`, or the two will drift.
  Extracting a shared `docsLayoutProps()` helper is the natural fix at that
  point — not now, for one prop.
- Plan 004 turns the synchronous `source` export into `await getSource()`.
  When 004 lands, this file's `source.getPageTree()` call becomes
  `(await getSource()).getPageTree()` and `Home` becomes `async` — 004's plan
  text must account for `site/app/page.tsx` as a second call site.
- The sidebar omits 2 of the 4 `raw/` pages (9 links vs the TOC's 11). That
  predates this plan and is a page-tree question, not a layout one. Out of
  scope here; worth a separate look.
