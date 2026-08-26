# Plan 006: Put the sidebar on every page and make Config part of it

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
> git diff --stat e573964..HEAD -- site/app site/lib site/package.json
> ```
>
> If any of those files changed since this plan was written, compare the
> "Current state" excerpts against the live files before proceeding. Any
> differing line in an excerpt is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (site-only; no content files, no new dependencies)
- **Depends on**: 005 (DONE, on `main` as `7d3d00e`), 004 (DONE, merged)
- **Category**: dx
- **Planned at**: commit `e573964`, 2026-08-26

## Why this matters

The site has four kinds of page. Two of them have the navigation sidebar and
two do not:

| Route                                      | Wrapped in           | Sidebar today |
| ------------------------------------------ | -------------------- | ------------- |
| `/`                                        | `DocsLayout`         | yes           |
| `/docs/**` (42 pages)                      | `DocsLayout`         | yes           |
| `/config/[tool]`                           | nothing              | **no**        |
| 404 (unmatched URLs, and `notFound()`)     | nothing              | **no**        |

Measured at commit `e573964` against a production build (`bun run build`,
`bun run start`, `curl`):

```
/                                HTTP 200 | fd-sidebar=7 | <main=1
/docs/wiki/dotfiles-management   HTTP 200 | fd-sidebar=7 | <main=1
/config/tmux                     HTTP 200 | fd-sidebar=0 | <main=1
/nope-does-not-exist             HTTP 404 | fd-sidebar=0 | <main=0
/config/not-a-tool               HTTP 404 | fd-sidebar=0 | <main=0
```

So a reader who opens the tmux config editor, or who mistypes any URL, loses
every navigation affordance the site has — sidebar, nav bar, search, and theme
switch — and the 404 is an unstyled Next.js default with no way back except
the browser Back button.

There is a second half to this. Even once `/config/*` renders a sidebar, the
config editor would not appear **in** that sidebar: the page tree is built by
the Fumadocs loader from vault markdown, and the config editor is a hand-built
route with no file in the vault. The owner's instruction is that config should
be "a standard part of the larger site" — so this plan also injects a `Config`
folder into the page tree, making the editor reachable from the sidebar of
every page on the site.

After this plan: every page on the site renders the same `DocsLayout` sidebar,
and that sidebar lists Config alongside the wiki, sources, plans and docs.

**Decisions already made — do not re-litigate:**

- The table of contents on `/` stays exactly as it is. Do not restyle it.
- The `Config` sidebar entry is generated from `TOOLS` in
  `site/lib/config-files.ts` — the existing single source of truth. Do not
  hardcode a tool list anywhere.
- The config editor's colours (raw Tailwind `neutral-*` / `blue-*`) are
  **out of scope**. See "Maintenance notes".

## Current state

Every fact below was verified at commit `e573964` on 2026-08-26. The site
builds cleanly at this commit (`cd site && bun run build` → exit 0), and its
route table listed **42** doc paths under `/docs/[[...slug]]`.

> **Do not treat 42 as the number to expect.** The vault publishes
> `plans/**/*.md`, so committing this plan file itself adds a doc page, and any
> `wiki/`, `raw/`, `docs/` or `.scratch/` markdown added since raises it
> further. **Step 0 has you measure your own baseline.** What this plan
> requires is that the count is *unchanged by your edits* — none of them touch
> the vault or the `include` globs.

### Files

- `site/lib/layout.shared.tsx` — shared nav options. **Edited** (gains a
  `docsLayoutProps()` helper).
- `site/lib/source.ts` — the content source and page tree. **Edited** (gains
  the `Config` page-tree entry).
- `site/app/docs/layout.tsx` — docs layout. **Edited** (uses the new helper).
- `site/app/page.tsx` — home page. **Edited** (uses the new helper).
- `site/app/config/layout.tsx` — **created.**
- `site/app/not-found.tsx` — **created.**
- `site/app/docs/not-found.tsx` — **created.**
- `site/app/config/not-found.tsx` — **created.**
- `site/lib/config-files.ts` — **read only**, for its `TOOLS` export.
- `site/app/config/[tool]/page.tsx` — **edited**, one deletion only (Step 6).

### Excerpts

`site/lib/layout.shared.tsx` (entire file today):

```tsx
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: "Second Brain" },
  };
}
```

`site/app/docs/layout.tsx` (entire file today):

```tsx
import { getSource } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import type { ReactNode } from "react";

export default async function Layout({ children }: { children: ReactNode }) {
  const source = await getSource();
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
```

`site/app/page.tsx` lines 1–18 (only these change; the `groups.map(...)` block
below them is untouched):

```tsx
import { getSource } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import Link from "next/link";
import type { Metadata } from "next";
import { baseOptions } from "@/lib/layout.shared";
import { buildToc } from "@/lib/toc";

export const metadata: Metadata = {
  title: "Second Brain",
  description: "Table of contents for the wiki and its sources.",
};

export default async function Home() {
  const groups = await buildToc();
  const source = await getSource();
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
```

`site/lib/source.ts` lines 1–6 (the import block):

```ts
import path from "node:path";
import { dynamicLoader } from "fumadocs-core/source";
import { obsidian } from "fumadocs-obsidian";
import { slug } from "github-slugger";
import { remarkLooseLinks } from "@/lib/remark-loose-links";
import { titleFromHeading } from "@/lib/title-from-heading";
```

`site/lib/source.ts` lines 60–86 (the labels map and the loader):

```ts
const FOLDER_LABELS: Record<string, string> = {
  ".scratch": "Scratch (issues & research)",
};

/**
 * Re-reads the vault on every `get()` (cheap: only invalidated files are
 * re-parsed), so dev picks up new and edited pages. `bun run build` calls it
 * once per render with nothing invalidated — same output as a static loader.
 */
const loader = dynamicLoader(vault.dynamicSource(), {
  baseUrl: "/docs",
  // Default slugs are encodeURI(path segment), which keeps spaces as %20.
  // Make every URL segment lowercase-kebab instead. Links between pages are
  // resolved by file path, not slug, so this cannot break them.
  slugs: (_file, next) => next().map((seg) => slugify(decodeURI(seg))),
  plugins: [titleFromHeading],
  pageTree: {
    transformers: [
      {
        folder(node, folderPath) {
          const label = FOLDER_LABELS[folderPath];
          return label ? { ...node, name: label } : node;
        },
      },
    ],
  },
});
```

`site/lib/config-files.ts` lines 12–15 (read only — the shape of `TOOLS`):

```ts
/** Tools the editor knows about, with their source files under dotfiles/. */
export const TOOLS: Record<string, { label: string; files: string[] }> = {
  tmux: { label: "tmux", files: ["dot_config/tmux/tmux.conf"] },
};
```

`site/app/config/[tool]/page.tsx` lines 52–66 (the header; Step 6 deletes the
first `<p>` only):

```tsx
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <header className="mb-8">
        <p className="text-sm text-neutral-500">
          <Link href="/" className="hover:underline">
            Second Brain
          </Link>{" "}
          / config
        </p>
        <h1 className="mt-1 text-3xl font-bold">{entry.label}</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Edits write to <code>dotfiles/</code> and run{" "}
          <code>chezmoi apply</code>. Committing is a separate step.
        </p>
      </header>
```

### Library facts (verified against `site/node_modules` at this commit)

- `fumadocs-ui@16.15.1`, `fumadocs-core@16.15.1`, `next@16.3.2`.
- `DocsLayout` is exported from `fumadocs-ui/layouts/docs`, and
  `DocsLayoutProps extends BaseLayoutProps` with a required `tree: PageTree.Root`
  (`node_modules/fumadocs-ui/dist/layouts/docs/index.d.ts`). So
  `Omit<DocsLayoutProps, "children">` is the exact type of the object Step 1
  builds.
- **`DocsLayout` renders no `<main>` element.** The single `<main>` on a
  `/docs/*` page comes from `DocsPage`
  (`node_modules/fumadocs-ui/dist/layouts/docs/page/slots/container.js`). Every
  page this plan wraps therefore has to supply its own `<main>` — the config
  page and the home page already do, and the new 404 files below each add one.
  Expected result everywhere: exactly one `<main>`.
- `DefaultNotFound` is exported from `fumadocs-ui/layouts/home/not-found`
  (`node_modules/fumadocs-ui/dist/layouts/home/not-found.d.ts`). It is a
  `"use client"` component that renders a 404 heading, a message and a
  "Back to Home" button, and it renders no `<main>` of its own. Despite living
  under `layouts/home/`, it is just content — it composes inside `DocsLayout`
  (verified: `/nope-does-not-exist` renders `fd-sidebar` 7 times and exactly
  one `<main>` with this plan applied).
- The page-tree builder supports a `root` transformer:
  `root?: (this: PageTreeBuilderContext, node: Root) => Root`
  (`node_modules/fumadocs-core/dist/index-DQWu2opy2.d.ts:69-74`). It runs
  **after** the whole tree is built from the vault and its return value is the
  tree (`node_modules/fumadocs-core/dist/dynamic-Dgf8t2t2.js:577-581`). This is
  the correct hook for appending a node the loader cannot discover.
- The only built-in transformer that also implements `root` is
  `transformerFallback()`, and it **only sets `root.fallback`** — it never
  touches `root.children`
  (`node_modules/fumadocs-core/dist/dynamic-Dgf8t2t2.js:219-256`). Appending to
  `root.children` therefore survives it.
- `PageTree.Folder` accepts `defaultOpen?: boolean`
  (`node_modules/fumadocs-core/dist/definitions-D8-KI7Uy.d.ts`). **This is
  required here**: without it the `Config` folder renders collapsed and its
  child link is absent from the HTML until the reader clicks it. Verified both
  ways during planning.

### Next.js 16 `not-found.tsx` facts (verified empirically, not from docs)

These were measured on a working prototype of this exact change. They are the
reason this plan creates **three** not-found files rather than one:

- `site/app/not-found.tsx` handles **unmatched URLs only** (`/nope`). It
  renders fully server-side; `curl` sees the sidebar in the HTML.
- A `notFound()` call inside a route segment does **not** reach the root
  `not-found.tsx`. `/config/not-a-tool` and `/docs/no/such/page` both returned
  404 with zero sidebar markup until `site/app/config/not-found.tsx` and
  `site/app/docs/not-found.tsx` were added.
- Those two segment files render **inside their segment's `layout.tsx`**, which
  is what gives them the sidebar — they must NOT wrap themselves in another
  `DocsLayout` or the page gets two sidebars.
- **Segment 404s are streamed as an RSC payload, not as server-rendered HTML.**
  `curl` sees an empty `<body>`; the content and the layout arrive in the
  `self.__next_f.push(...)` flight payload and render on hydration. Do not
  conclude the change failed because `grep fd-sidebar` returns 0 on those two
  URLs — Step 7 gives the correct check for them.

### Conventions to match

- TypeScript strict; Prettier (`.prettierrc` at the repo root: 2 spaces, double
  quotes, semicolons, printWidth 80, trailingComma es5, arrowParens always). A
  Husky pre-commit hook runs Prettier on staged files.
- Imports use the `@/` alias (`site/tsconfig.json` `paths`).
- Comments in `site/lib/` explain *why*, often citing the upstream file that
  makes the behaviour true. Match that density — see the existing comments in
  `site/lib/source.ts` for the exemplar.
- Prettier writes spread-of-await as `{...await fn()}`, **not**
  `{...(await fn())}`. The code blocks in this plan are already in Prettier's
  canonical form; copy them verbatim.

## Commands you will need

Run all from `site/` unless stated otherwise.

| Purpose   | Command                         | Expected on success                                   |
| --------- | ------------------------------- | ----------------------------------------------------- |
| Install   | `bun install`                   | exit 0                                                |
| Typecheck | `bun run typecheck`             | exit 0, no errors                                     |
| Build     | `bun run build`                 | exit 0, ends with the route table                     |
| Serve     | `bun run start -p 3100`         | "Ready" — background it, then `curl`                  |
| Dev       | `npx next dev -H 127.0.0.1 -p 3200` | "Ready" — background it, then `curl`              |
| Format    | `bunx prettier --check app lib` | exit 0 ("All matched files use Prettier code style!") |

There is no test runner in `site/`. Verification is typecheck + build +
Prettier + HTTP probes against a running server (Steps 7 and 8).

`next.config.mjs` has **no** `output: "export"`, so there is no `out/`
directory to grep. You must run a server to verify.

## Scope

**In scope** (the only files you may modify or create):

- `site/lib/layout.shared.tsx` (edit)
- `site/lib/source.ts` (edit)
- `site/app/docs/layout.tsx` (edit)
- `site/app/page.tsx` (edit — imports and the wrapper only)
- `site/app/config/[tool]/page.tsx` (edit — Step 6, one deletion)
- `site/app/config/layout.tsx` (create)
- `site/app/not-found.tsx` (create)
- `site/app/docs/not-found.tsx` (create)
- `site/app/config/not-found.tsx` (create)
- `site/README.md` (edit — Step 9, one paragraph)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- `site/lib/config-files.ts` — read `TOOLS` from it; do not restructure it.
- `site/lib/toc.ts` — the home page's table of contents is unchanged.
- `site/components/config-editor.tsx`, `site/components/commit-box.tsx` — the
  config editor's internals and its `neutral-*` colour scheme. Making the
  config UI match the Fumadocs theme tokens is **plan 008**, which depends on
  this one. Doing it here would triple the diff. Leave those files alone.
- `site/app/api/**` — route handlers, not pages; they have no layout.
- `site/app/global.css`, `site/app/layout.tsx`, `site/next.config.mjs`.
- `site/package.json` — no new dependencies are needed.
- Anything under `wiki/`, `raw/`, `docs/`, `.scratch/`, `dotfiles/` — owned by
  other workflows. **`CLAUDE.md` says `raw/` is immutable.**
- `log.md` — the reviewer appends the log entry, not you.

## Git workflow

- Commit in the worktree you were given, on whatever branch it is already on.
- Commits may be per step or one for the lot; message style matching `git log`,
  e.g. `feat(site): sidebar on every page; config joins the page tree`.
- Do NOT push and do NOT open a PR.
- If `site/node_modules` is absent in your worktree, run `bun install` in
  `site/` first. It is gitignored; do not commit it.

## Steps

### Step 0: Record the baseline before changing anything

From `site/`, with no edits made yet:

```bash
bun install
rm -rf .next && bun run build 2>&1 | tail -20
```

The build must exit 0. From its route table, write down the number of doc paths
under `/docs/[[...slug]]` — the table prints a few then `[+N more paths]`, so
the total is (paths listed) + N. Call this number **`DOCS_BASELINE`**. Every
later step that mentions the doc-path count means this number.

`DOCS_BASELINE` was 42 when this plan was written, and will be 43 or more in
your worktree because this plan file is itself a published `plans/*.md` page.
Both are fine. Nothing in this plan changes the vault or the `include` globs,
so the only requirement is that the count is identical before and after.

Also confirm the site is in the "before" state, so you know your later probes
are measuring your own change:

```bash
bun run start -p 3100 > /tmp/site-baseline.log 2>&1 &
for i in $(seq 1 40); do curl -sf -o /dev/null http://127.0.0.1:3100/ && break; sleep 1; done
curl -s http://127.0.0.1:3100/config/tmux | grep -o 'fd-sidebar' | wc -l   # expect 0
curl -s -o /tmp/b.html -w '%{http_code}\n' http://127.0.0.1:3100/nope      # expect 404
grep -o 'fd-sidebar' /tmp/b.html | wc -l                                   # expect 0
pkill -f "next start"
```

If `/config/tmux` already reports a non-zero `fd-sidebar` count, this plan has
already been applied — STOP and report.

**Verify**: build exits 0; `DOCS_BASELINE` recorded; both `fd-sidebar` probes
print `0`.

### Step 1: Add `docsLayoutProps()` to `site/lib/layout.shared.tsx`

Four call sites are about to render a `DocsLayout` with the same tree and the
same options. Give them one source of truth. Replace the entire contents of
`site/lib/layout.shared.tsx` with:

```tsx
import { getSource } from "@/lib/source";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import type { DocsLayoutProps } from "fumadocs-ui/layouts/docs";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: "Second Brain" },
  };
}

/**
 * Props shared by every DocsLayout on the site. Every page is wrapped in one
 * — docs, home, config and the 404s — so the sidebar is configured here once
 * instead of drifting across four call sites.
 */
export async function docsLayoutProps(): Promise<
  Omit<DocsLayoutProps, "children">
> {
  const source = await getSource();
  return { tree: source.getPageTree(), ...baseOptions() };
}
```

`baseOptions` stays exported and unchanged — it is part of the file's existing
contract even though every current caller now prefers `docsLayoutProps()`.

This makes `layout.shared.tsx` server-only (it now imports `lib/source`). That
is safe: no `"use client"` file imports it. The five client components are
`components/{commit-box,provider,search,dev-client,config-editor}.tsx` and none
of them touch `layout.shared` or `lib/source`.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Add the `Config` entry to the page tree in `site/lib/source.ts`

Three edits to that one file.

**2a.** Add two imports. After the existing
`import { dynamicLoader } from "fumadocs-core/source";` line add the page-tree
type import, and after the existing `titleFromHeading` import add `TOOLS`, so
the import block reads:

```ts
import path from "node:path";
import { dynamicLoader } from "fumadocs-core/source";
import type * as PageTree from "fumadocs-core/page-tree";
import { obsidian } from "fumadocs-obsidian";
import { slug } from "github-slugger";
import { remarkLooseLinks } from "@/lib/remark-loose-links";
import { titleFromHeading } from "@/lib/title-from-heading";
import { TOOLS } from "@/lib/config-files";
```

**2b.** Immediately after the `FOLDER_LABELS` object (and before the
`/** Re-reads the vault ... */` comment above `const loader`), insert:

```ts
/**
 * Sidebar entry for the config editor: one page per TOOLS entry. `defaultOpen`
 * matters — a collapsed folder does not render its children into the HTML at
 * all, so without it the tool links are invisible until the reader clicks.
 */
function configFolder(): PageTree.Folder {
  return {
    type: "folder",
    name: "Config",
    $id: "config",
    defaultOpen: true,
    children: Object.entries(TOOLS).map(([tool, { label }]) => ({
      type: "page" as const,
      name: label,
      url: `/config/${tool}`,
      $id: `config/${tool}`,
    })),
  };
}
```

**2c.** Add a `root` transformer to the existing transformer object — the same
object literal that already has `folder(node, folderPath)`, immediately after
that method:

```ts
        /**
         * The config editor is a hand-built route with no file in the vault,
         * so the loader cannot discover it. Append it once the tree is built
         * and every sidebar on the site lists it — docs, home, config and the
         * 404s all render the same tree.
         */
        root(node) {
          return {
            ...node,
            children: [...node.children, configFolder()],
          };
        },
```

Do not change `folder()`, `slugs`, `plugins`, `baseUrl`, or anything else in
the loader options.

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Point `site/app/docs/layout.tsx` at the helper

Replace the entire contents with:

```tsx
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { docsLayoutProps } from "@/lib/layout.shared";
import type { ReactNode } from "react";

export default async function Layout({ children }: { children: ReactNode }) {
  return <DocsLayout {...await docsLayoutProps()}>{children}</DocsLayout>;
}
```

**Verify**: `bun run typecheck` → exit 0.

### Step 4: Create `site/app/config/layout.tsx`

New file, byte-identical to Step 3's file. This is what puts the sidebar on
`/config/*`.

```tsx
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { docsLayoutProps } from "@/lib/layout.shared";
import type { ReactNode } from "react";

export default async function Layout({ children }: { children: ReactNode }) {
  return <DocsLayout {...await docsLayoutProps()}>{children}</DocsLayout>;
}
```

The config page keeps its own `<main>`, and `DocsLayout` adds none, so the
result is still exactly one `<main>`.

**Verify**: `bun run typecheck` → exit 0.

### Step 5: Create the three not-found files

**5a. `site/app/not-found.tsx`** — unmatched URLs. This one is not inside any
segment layout, so it wraps itself:

```tsx
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DefaultNotFound } from "fumadocs-ui/layouts/home/not-found";
import { docsLayoutProps } from "@/lib/layout.shared";

export default async function NotFound() {
  return (
    <DocsLayout {...await docsLayoutProps()}>
      <main className="flex w-full flex-1 flex-col py-10">
        <DefaultNotFound />
      </main>
    </DocsLayout>
  );
}
```

**5b. `site/app/docs/not-found.tsx`** — `notFound()` from a docs page. It
renders inside `app/docs/layout.tsx`, which already supplies the sidebar, so it
must **not** wrap itself in `DocsLayout`:

```tsx
import { DefaultNotFound } from "fumadocs-ui/layouts/home/not-found";

export default function NotFound() {
  return (
    <main className="flex w-full flex-1 flex-col py-10">
      <DefaultNotFound />
    </main>
  );
}
```

**5c. `site/app/config/not-found.tsx`** — `notFound()` from `/config/<unknown>`.
Byte-identical to 5b.

**Verify**: `bun run typecheck` → exit 0.

### Step 6: Drop the now-redundant breadcrumb from the config page

In `site/app/config/[tool]/page.tsx`, delete this `<p>` element **and nothing
else** — it is the first child of `<header>`:

```tsx
        <p className="text-sm text-neutral-500">
          <Link href="/" className="hover:underline">
            Second Brain
          </Link>{" "}
          / config
        </p>
```

`DocsLayout`'s nav bar now renders the "Second Brain" home link on this page,
so this hand-rolled breadcrumb duplicates it. Then also change the `<h1>` on
the next line from `className="mt-1 text-3xl font-bold"` to
`className="text-3xl font-bold"` — the `mt-1` existed only to space it below
the breadcrumb.

`Link` is still used further down the file (in the Docs section), so **do not
remove the `next/link` import.** Everything else in the file — `docsForTool`,
`Object.hasOwn`, `notFound()`, the `<main>` wrapper, `ConfigEditor`,
`CommitBox` — stays byte-identical.

**Verify**:

- `bun run typecheck` → exit 0
- `grep -c 'from "next/link"' 'app/config/[tool]/page.tsx'` → `1`
- `grep -c '/ config' 'app/config/[tool]/page.tsx'` → `0`

### Step 7: Format, build, and probe a production server

```
bunx prettier --write app lib
bunx prettier --check app lib
bun run typecheck
rm -rf .next && bun run build
```

All four must exit 0, and the build's route table must still list `/`,
`/_not-found`, `/config/[tool]`, `/api/search`, the three `/api/config/*`
handlers, and `/docs/[[...slug]]` with exactly `DOCS_BASELINE` doc paths (the
number you recorded in Step 0 — unchanged by any edit in this plan).

Now start a server and probe it. Run this **from `site/`**, exactly as written:

```bash
bun run start -p 3100 > /tmp/site-prod.log 2>&1 &
for i in $(seq 1 40); do curl -sf -o /dev/null http://127.0.0.1:3100/ && break; sleep 1; done

for u in "/" "/docs/wiki/dotfiles-management" "/config/tmux" "/nope-does-not-exist"; do
  code=$(curl -s -o /tmp/p.html -w '%{http_code}' "http://127.0.0.1:3100$u")
  printf "%-32s HTTP %s | fd-sidebar=%-2s | main=%s | tmuxlink=%s | Config=%s\n" \
    "$u" "$code" \
    "$(grep -o 'fd-sidebar' /tmp/p.html | wc -l)" \
    "$(grep -o '<main' /tmp/p.html | wc -l)" \
    "$(grep -o 'href="/config/tmux"' /tmp/p.html | wc -l)" \
    "$(grep -o '>Config<' /tmp/p.html | wc -l)"
done
```

**Expected output — must match exactly:**

```
/                                HTTP 200 | fd-sidebar=7  | main=1 | tmuxlink=1 | Config=1
/docs/wiki/dotfiles-management   HTTP 200 | fd-sidebar=7  | main=1 | tmuxlink=1 | Config=1
/config/tmux                     HTTP 200 | fd-sidebar=7  | main=1 | tmuxlink=1 | Config=1
/nope-does-not-exist             HTTP 404 | fd-sidebar=7  | main=1 | tmuxlink=1 | Config=1
```

Then check the two segment 404s. As noted in "Current state", these stream
their content as an RSC payload, so `grep fd-sidebar` on the raw HTML is
**expected to be 0** — the real check is that the layout props (including the
tree with the `Config` folder) are in the flight payload. Still from `site/`:

```bash
for u in "/config/not-a-tool" "/docs/no/such/page"; do
  curl -s "http://127.0.0.1:3100$u" > /tmp/n.html
  python3 - "$u" <<'PY'
import re, json, sys
s = open('/tmp/n.html').read()
chunks = re.findall(r'self\.__next_f\.push\(\[1,(".*?")\]\)', s, flags=re.S)
p = "".join(json.loads(c) for c in chunks)
print(f"{sys.argv[1]:22} Config-in-tree={p.count(chr(34)+'name'+chr(34)+':'+chr(34)+'Config'+chr(34))} tmux-url={p.count('/config/tmux')} nav={p.count('Second Brain')}")
PY
done
```

**Expected output:**

```
/config/not-a-tool     Config-in-tree=1 tmux-url=1 nav=5
/docs/no/such/page     Config-in-tree=1 tmux-url=1 nav=5
```

(`nav=5` is the "Second Brain" nav title repeated across the payload's layout
props. If it differs by one or two but `Config-in-tree` and `tmux-url` are both
`1`, that is acceptable — report the number and continue. If `Config-in-tree`
is `0`, that is a STOP condition.)

Stop the server when done: `pkill -f "next start"` (or kill the background PID).

### Step 8: Confirm the segment 404 boundaries in dev mode

Production serves prerendered 404 shells that hide which not-found file
handled the request. Dev mode names it explicitly. From `site/`:

```bash
npx next dev -H 127.0.0.1 -p 3200 > /tmp/site-dev.log 2>&1 &
for i in $(seq 1 60); do curl -sf -o /dev/null http://127.0.0.1:3200/ && break; sleep 1; done

curl -s http://127.0.0.1:3200/config/not-a-tool | grep -o 'pagePath\\":\\"[a-z/.-]*not-found.tsx' | sort -u
curl -s http://127.0.0.1:3200/docs/no/such/page | grep -o 'pagePath\\":\\"[a-z/.-]*not-found.tsx' | sort -u
```

**Expected output:**

```
pagePath\":\"config/not-found.tsx
pagePath\":\"not-found.tsx
pagePath\":\"docs/not-found.tsx
pagePath\":\"not-found.tsx
```

Each URL must name **its own segment's** not-found file (`config/not-found.tsx`
and `docs/not-found.tsx` respectively) in addition to the root one. If only
`not-found.tsx` appears for a URL, that segment's file is not being picked up —
STOP and report.

Also re-probe the sidebar in dev, where segment 404s are not prerendered:

```bash
for u in "/" "/config/tmux" "/nope-does-not-exist"; do
  curl -s -o /tmp/d.html -w "$u %{http_code} " "http://127.0.0.1:3200$u"
  echo "fd-sidebar=$(grep -o 'fd-sidebar' /tmp/d.html | wc -l) tmuxlink=$(grep -o 'href=\"/config/tmux\"' /tmp/d.html | wc -l)"
done
```

**Expected**: `fd-sidebar=7` and `tmuxlink=1` on all three.

Stop the dev server when done.

### Step 9: Update `site/README.md`

The README's home-page paragraph is still accurate, but it says nothing about
the sidebar or the config route. Add one paragraph immediately after the
existing paragraph that begins "The home page (`/`) is a generated table of
contents":

```markdown
Every page — the home table of contents, `/docs/*`, the config editor at
`/config/<tool>`, and the 404s — renders inside Fumadocs' `DocsLayout`, so the
navigation sidebar is always present. The shared props come from
`docsLayoutProps()` in `lib/layout.shared.tsx`; add new pages through it rather
than constructing a `DocsLayout` by hand. The sidebar's `Config` folder is
injected by a page-tree `root` transformer in `lib/source.ts` and is generated
from `TOOLS` in `lib/config-files.ts` — adding a tool there adds it to the
sidebar with no other change.
```

Do **not** correct the README's other stale line about static export to `out/`
— it predates this plan and is listed as a follow-up.

**Verify**: `bunx prettier --check ../site/README.md` is not applicable
(`.prettierignore` and `.lintstagedrc` govern markdown separately); instead
just confirm `git diff --stat -- site/README.md` shows one paragraph added.

## Test plan

There is no test runner in `site/` and adding one is out of scope. Verification
is the typecheck, the build, Prettier, and the HTTP probes in Steps 7 and 8,
which cover:

- happy path, sidebar present: `/`, `/docs/*`, `/config/tmux`
- the regression this plan fixes: `/config/tmux` went from `fd-sidebar=0` to `7`
- unmatched URL 404: `/nope-does-not-exist` went from `fd-sidebar=0` to `7`
- segment `notFound()` 404s: `/config/not-a-tool`, `/docs/no/such/page` now
  resolve to their own segment's not-found file
- the new sidebar entry: `Config` folder present and expanded on every page
- no double `<main>` and no double sidebar anywhere

**Manual check the reviewer will also perform** (you may skip it — there is no
browser in the executor environment): open http://127.0.0.1:3100 in a browser,
confirm the sidebar lists `Config → tmux`, click it, confirm the editor loads
with the sidebar intact, then visit a bad URL under `/docs/` and confirm the
styled 404 renders with the sidebar rather than a blank page.

## Done criteria

Machine-checkable. ALL must hold (from `site/` unless stated):

- [ ] `bun run typecheck` exits 0
- [ ] `bun run build` exits 0 and its route table still lists exactly
      `DOCS_BASELINE` doc paths (the Step 0 number)
- [ ] `bunx prettier --check app lib` exits 0
- [ ] Step 7's first probe prints `fd-sidebar=7`, `main=1`, `tmuxlink=1`,
      `Config=1` for all four URLs, with HTTP 200/200/200/404
- [ ] Step 7's flight-payload probe prints `Config-in-tree=1` and `tmux-url=1`
      for both segment 404s
- [ ] Step 8 prints `config/not-found.tsx` for `/config/not-a-tool` and
      `docs/not-found.tsx` for `/docs/no/such/page`
- [ ] `test -f app/config/layout.tsx && test -f app/not-found.tsx && test -f app/docs/not-found.tsx && test -f app/config/not-found.tsx && echo ok` → `ok`
- [ ] `grep -c 'docsLayoutProps' app/page.tsx app/docs/layout.tsx app/config/layout.tsx app/not-found.tsx` → `2` for each of the four (the import line and the call site)
- [ ] `grep -rn 'getPageTree' app` → no matches; `grep -rn 'getPageTree' lib`
      → exactly one, in `lib/layout.shared.tsx`
- [ ] From the repo root, `git status --short` lists only the ten in-scope
      files (nine under `site/`, plus `plans/README.md`)
- [ ] From the repo root, `git diff --stat -- wiki raw docs .scratch dotfiles CLAUDE.md log.md site/package.json site/next.config.mjs` is empty
- [ ] `plans/README.md` status row for 006 updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt does not match the live file.
- `fumadocs-ui` or `fumadocs-core` is not `16.15.1`, or `next` is not `16.3.2` —
  every library fact above was verified against those exact versions.
- `PageTree.Folder` does not accept `defaultOpen`, or the transformer object
  rejects a `root` method — the page-tree API has changed.
- The `Config` folder renders but `tmuxlink=0` on `/` — `defaultOpen` is not
  taking effect. Report it; do **not** work around it by flattening the folder
  into a bare page item.
- Any probed URL shows `fd-sidebar` greater than `7` or `main` greater than `1` —
  something is double-wrapping. Most likely cause: a `DocsLayout` was added to
  `app/docs/not-found.tsx` or `app/config/not-found.tsx`, which Step 5
  explicitly forbids. Report the counts; do not add or remove wrappers to force
  the number.
- `Config-in-tree` is `0` in Step 7's flight-payload probe.
- The build's doc-path count differs from the `DOCS_BASELINE` you recorded in
  Step 0 — something changed the vault or the `include` globs, which nothing in
  this plan should. Report both numbers.
- You find yourself needing to edit `site/components/*`, `site/lib/toc.ts`,
  `site/lib/config-files.ts`, or anything outside the in-scope list.
- Any verification fails twice after a reasonable fix attempt.

## Maintenance notes

For whoever owns this next:

- **One place to change the sidebar.** `docsLayoutProps()` in
  `site/lib/layout.shared.tsx` is now the single source for every
  `DocsLayout` on the site. Sidebar customisation (the open follow-up to group
  pages by frontmatter `type`) goes there, not in the individual layouts. A
  reviewer should reject any new page that constructs a `DocsLayout` by hand.
- **Adding a config tool is a one-line change.** Add an entry to `TOOLS` in
  `site/lib/config-files.ts` and it appears in the sidebar automatically. If
  `TOOLS` ever grows past roughly a dozen entries, revisit `defaultOpen: true`
  on the `Config` folder — an always-expanded long list will crowd the vault
  pages out of view.
- **`lib/source.ts` now imports `lib/config-files.ts`**, which pulls
  `node:child_process` and `node:crypto` into the module graph of every page
  that renders the sidebar. That is fine today because nothing client-side
  imports `lib/source`, but it is a trap: if a client component ever needs
  something from `lib/source` (e.g. `slugify`), that import will break the
  build. The fix at that point is to move `slugify` and `TOOLS` into a
  dependency-free module, not to duplicate the tool list.
- **Config pages are not searchable.** The search index is built by
  `createFromSource(getSource)` in `site/app/api/search/route.ts` from vault
  pages, and the `Config` entry is a page-tree node with no backing file. It
  will not appear in search results. Making it searchable means a custom index
  entry — deliberately not done here.
- **The config editor's colours are plan 008.** `app/config/[tool]/page.tsx`,
  `components/config-editor.tsx` and `components/commit-box.tsx` use raw
  Tailwind `neutral-*` / `blue-*` classes while the rest of the site uses
  Fumadocs theme tokens. Now that the config editor sits inside the docs
  chrome, that mismatch is visible, especially in dark mode. It is written up
  as `plans/008-config-editor-theme-tokens.md`, which depends on this plan and
  re-edits `app/config/[tool]/page.tsx` — so land this one first, and do not
  pre-empt it here.
- **Segment 404s render client-side.** Anyone verifying a future change to the
  404 pages with `curl` will see an empty body for `/docs/<bad>` and
  `/config/<bad>` and may wrongly conclude they are broken. Steps 7 and 8 of
  this plan document the correct checks; keep them in mind rather than
  "fixing" a non-problem.
