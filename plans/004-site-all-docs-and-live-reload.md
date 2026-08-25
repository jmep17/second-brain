# Plan 004: Publish every repo doc on the site (plans, ADRs, agent docs, issues, root files) and make `bun run dev` pick up new and edited files without a restart

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**, from the repo root:
> `git diff --stat bce0526..HEAD -- site/lib/source.ts site/app site/components/provider.tsx site/next.config.mjs site/package.json site/README.md site/lib/toc.ts .gitignore`
> Expected: either no output, or changes only from plan 003
> (`site/app/page.tsx`, `site/lib/toc.ts`, the `!wiki/index.md` line in
> `site/lib/source.ts`, one line in `site/README.md`). Anything else that
> differs from the "Current state" excerpts is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (changes the site's content-loading path and dev script; no file outside `site/` and `plans/README.md` changes)
- **Depends on**: plans/003-site-home-table-of-contents.md — run 003 first. If 003 is still TODO when you start, do it first or STOP and report; Step 6 of this plan edits files 003 creates.
- **Category**: dx
- **Planned at**: commit `bce0526`, 2026-08-25

## Why this matters

The site under `site/` renders only `wiki/` and `raw/`. The repo also carries
implementation plans (`plans/`), architecture decision records (`docs/adr/`),
agent workflow docs (`docs/agents/`), an issue tracker and research notes
(`.scratch/config-system/`), and root-level docs (`CLAUDE.md`, `CONTEXT.md`,
`log.md`). The owner wants all of them readable on the site.

Separately, the site reads the vault once at module load
(`loader(await vault.staticSource(), …)`), so `bun run dev` shows a snapshot:
new pages, and edits to existing ones, need a server restart
(`site/README.md` says so explicitly). The owner wants the dev server to show
new files automatically. Fumadocs ships the pieces: a dynamic loader that
re-reads the vault per request, a file-watcher dev server, and a browser
client that refreshes the page on change.

After this plan lands:

- `include` covers `plans/**`, `docs/**`, `.scratch/**`, and root `*.md`.
- Pages without frontmatter (all plans, ADRs, agent docs, issues) get their
  sidebar/page title from their first `# ` heading instead of the filename.
- `bun run dev` starts a watcher; creating, editing or deleting any included
  markdown file updates the open browser tab within a second or two, no
  restart.
- `bun run build` still produces the same static export (plus the new pages).

## Current state

Verified at commit `bce0526` on 2026-08-25.

### Files

- `site/lib/source.ts` — builds the content source; owns `include` and the loader. **Rewritten by this plan.**
- `site/app/docs/layout.tsx` — sidebar layout; reads `source.getPageTree()`. **Edited** (async, `getSource()`).
- `site/app/docs/[[...slug]]/page.tsx` — page renderer; reads `source.getPage()`, `source.generateParams()`. **Edited** (`getSource()`).
- `site/app/api/search/route.ts` — static search index; `createFromSource(source, …)`. **Edited** (pass a function).
- `site/app/layout.tsx` — root layout. **Edited** (mount the dev client).
- `site/components/dev-client.tsx` — **created**: dev-only browser refresh component.
- `site/lib/title-from-heading.ts` — **created**: loader plugin that titles frontmatter-less pages from their first `# ` heading.
- `site/package.json` — `dev` script and one new dependency. **Edited.**
- `site/next.config.mjs` — **edited only if** the `ws` STOP condition in Step 3 fires.
- `site/README.md` — **one line edited.**
- `site/lib/toc.ts`, `site/app/page.tsx` — created/rewritten by plan 003; **edited** in Step 6 to use `getSource()`.
- `site/scripts/sync-assets.mjs` — copies `raw/assets` to `public/`. **Unchanged.**

### Excerpts

`site/lib/source.ts` at `bce0526` (entire file; plan 003 adds `"!wiki/index.md"` to `include` and two comment lines — that is the only expected difference):

```ts
import path from "node:path";
import { loader } from "fumadocs-core/source";
import { obsidian } from "fumadocs-obsidian";
import { slug } from "github-slugger";
import { remarkLooseLinks } from "@/lib/remark-loose-links";

/** The Obsidian vault is the whole repo, narrowed by `include`. */
const vaultDir = path.resolve(process.cwd(), "..");

export const vault = obsidian({
  dir: vaultDir,
  // Only the knowledge base. Never node_modules/, .obsidian/, plans/, docs/,
  // site/. Only *.md (not *.json/*.yaml — those are validated as meta files)
  // plus everything under raw/assets (served as media).
  include: ["wiki/**/*.md", "raw/**/*.md", "raw/assets/**/*"],
  // Media files are copied to public/vault by scripts/sync-assets.mjs, so a
  // vault path like raw/assets/x.png is served at /vault/raw/assets/x.png.
  url: (vaultPath) => `/vault/${vaultPath}`,
  // Repairs `[text](../raw/File With Spaces.md)` links the markdown parser
  // drops (see lib/remark-loose-links.ts).
  remarkPlugins: [remarkLooseLinks],
  // Disable build-time image size probing: it fetches remote images over the
  // network and fails the build on any dead URL. Images render as plain <img>.
  remarkImageOptions: false,
});

/** `How to Store Dotfiles - A Bare Git Repository` → `how-to-store-dotfiles-a-bare-git-repository` */
function slugify(segment: string): string {
  return slug(segment).replace(/-+/g, "-");
}

export const source = loader(await vault.staticSource(), {
  baseUrl: "/docs",
  // Default slugs are encodeURI(path segment), which keeps spaces as %20.
  // Make every URL segment lowercase-kebab instead. Links between pages are
  // resolved by file path, not slug, so this cannot break them.
  slugs: (_file, next) => next().map((seg) => slugify(decodeURI(seg))),
});
```

`site/app/docs/layout.tsx` (entire file):

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

`site/app/docs/[[...slug]]/page.tsx` — the four places that use `source` (lines 22–23, 36, 64–66, 69–70):

```tsx
export default async function Page({ params }: Props) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  …
    a: createRelativeLink(source, page),
  …
export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = source.getPage((await params).slug);
```

`site/app/api/search/route.ts` (entire file):

```ts
import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

export const revalidate = false;

export const { staticGET: GET } = createFromSource(source, {
  language: "english",
});
```

`site/app/layout.tsx` (entire file):

```tsx
import "./global.css";
import { Provider } from "@/components/provider";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
```

`site/package.json` scripts and the two relevant dependencies:

```json
  "scripts": {
    "sync-assets": "node scripts/sync-assets.mjs",
    "dev": "node scripts/sync-assets.mjs && next dev",
    "build": "node scripts/sync-assets.mjs && next build",
    "start": "serve out",
    "typecheck": "next typegen && tsc --noEmit"
  },
  "dependencies": {
    "fumadocs-core": "16.15.1",
    "fumadocs-obsidian": "1.0.3",
```

`site/README.md` line 7:

```
- `bun run dev` — local preview at http://localhost:3000 (restart to pick up new wiki pages)
```

### What the repo's docs look like (title derivation matters)

Every file under `plans/`, `docs/agents/`, `.scratch/**` and `log.md`,
`CLAUDE.md` has **no** `title:` frontmatter; most have no frontmatter at all.
`docs/adr/0001-personal-wiki-is-a-nested-repo.md` has frontmatter with only
`status: accepted`. Each starts with a single `# ` heading, e.g.
`plans/README.md` → `# Implementation Plans`,
`.scratch/config-system/issues/01-dotfiles-tool.md` →
`# Dotfiles tool for two Macs with per-machine differences and exclusions`.
Without Step 2, these pages would be titled by filename
(`001-fumadocs-wiki-site`, `README`, …).

Full list of files the new `include` adds at `bce0526` (from `tinyglobby`
with the exact patterns in Step 1, run from `site/` with `cwd: ".."`):
12 under `.scratch/config-system/`, 4 under `docs/`, 4 under `plans/`
(README + 001–003), and `CLAUDE.md`, `CONTEXT.md`, `log.md`. **`tinyglobby`
matches `.scratch/**` when the pattern names the dot-directory explicitly**
(verified); a bare `**/*.md` would not, and is not used.

### Library facts (verified against `site/node_modules`)

- `fumadocs-obsidian@1.0.3`: `obsidian(config)` returns a `LocalSource` with
  `staticSource()`, `dynamicSource()`, `invalidateFile(path)`,
  `invalidateAll()`, plus `dir` and `include` (used by the watcher).
  `dynamicSource()` returns `{ cache: "custom", files: () => …, invalidate }`
  — every `get()` re-globs `include` (cheap) and re-parses only files that
  were invalidated; a **new** file is only seen after `invalidateFile` (or
  `invalidateAll`) — the watcher provides that. Page title falls back to
  `path.basename(file, ext)` when frontmatter has no `title`
  (`dist/index.js`, `title: pageData.title ?? path.basename(...)`).
- `fumadocs-obsidian/dev/ws` exports `watchWithDevServer(source, options?)`:
  connects to the dev server URL from `process.env.FD_LOCAL_MD_DEV_SERVER_URL`
  (also `NEXT_PUBLIC_FD_LOCAL_MD_DEV_SERVER_URL`), sends `watch-dir` for
  `source.dir` + `source.include`, and calls `source.invalidateFile(absPath)`
  on every `add`/`change`/`unlink` event. If the env var is missing it logs a
  warning and does nothing (`warnWhenMissing: false` silences it).
- `node_modules/.bin/fumadocs-obsidian` exists. `fumadocs-obsidian dev -- <cmd>`
  starts a websocket + chokidar server on port 8000 (`-p` to change), sets
  `FD_LOCAL_MD_DEV_SERVER_URL`, `NEXT_PUBLIC_FD_LOCAL_MD_DEV_SERVER_URL`, and
  `VITE_…` in the child's env, then runs `<cmd>` with stdio inherited.
- `@fumadocs/local-content@0.2.1` (already installed as a dependency of
  `fumadocs-obsidian`, **not** yet a direct dependency) exports
  `DevClient` from `@fumadocs/local-content/dev/ws/react`: a `"use client"`
  component that opens a WebSocket to the env URL and calls
  `useRouter().refresh()` from `fumadocs-core/framework` on each change
  event. It needs Fumadocs' `RootProvider` above it (already in
  `components/provider.tsx`). It renders nothing.
- `fumadocs-core@16.15.1` `dynamicLoader(source, options)` takes the same
  `options` as `loader` (`baseUrl`, `slugs`, `plugins`, `pageTree`) and
  returns `{ get(): Promise<LoaderOutput>, invalidate(), revalidate() }`.
  `LoaderOutput` is what `loader()` returns today (`getPage`, `getPages`,
  `getPageTree`, `generateParams`).
- `createFromSource(loader | () => Awaitable<LoaderOutput>, options)` accepts
  a function; it re-indexes when the function returns a different loader
  instance (`dist/server-DRvCKdc_.d.ts:138-140`).
- Loader plugins: `plugins: [{ name, transformStorage({ storage }) }]`.
  `storage.getFiles()` lists virtual paths; `storage.read(path)` returns
  `{ format: "page" | "meta", data }`; page `data` is the `ObsidianPage`
  (`title`, `content`, `frontmatter`). `transformStorage` runs before the
  page tree is built (`dist/dynamic-Dgf8t2t2.js:190`), so a title set here
  shows in the sidebar.
- Page-tree transformers: `pageTree: { transformers: [{ folder(node, folderPath) { … } }] }`;
  `Folder.name` is a `ReactNode`.
- A throwaway script combining `obsidian({include: [the Step 1 patterns]})`,
  `dynamicLoader`, and the Step 2 title plugin against a copy of this repo
  produced 29 pages with heading titles, saw a newly written
  `plans/999-new.md` only after `invalidateFile`, and rendered it. The
  approach is proven; only the Next.js wiring is new.

### Conventions to match

- TypeScript strict; Prettier (`.prettierrc`: 2 spaces, double quotes,
  semicolons, printWidth 80, trailingComma es5). Pre-commit runs Prettier.
- Imports via `@/` alias. Short `//` comments explaining _why_, as in
  `source.ts` above.
- Frontmatter is untyped; read extras defensively (see `asString` in
  `site/app/docs/[[...slug]]/page.tsx:16-19`).
- Vocabulary from `CONTEXT.md`: the knowledge base is the **shared wiki**;
  `.scratch/` holds the **issue tracker** (see `docs/agents/issue-tracker.md`).
  Use "Scratch" / "Issues & research" for its sidebar label.

## Commands you will need

Run all from `site/` (`cd site`).

| Purpose   | Command                                    | Expected on success                                                                                                       |
| --------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Install   | `bun install`                              | exit 0                                                                                                                    |
| Typecheck | `bun run typecheck`                        | exit 0, no errors                                                                                                         |
| Build     | `bun run build`                            | exit 0, ends with the route table                                                                                         |
| Format    | `bunx prettier --check app lib components` | "All matched files use Prettier code style!"                                                                              |
| Dev       | `bun run dev`                              | prints `[@fumadocs/local-content] dev server is ready at ws://127.0.0.1:8000/_fumadocs_local_md` then Next's `Ready` line |

No test runner exists in `site/`; verification is typecheck + build + grep +
one manual dev-server check (Step 7).

## Scope

**In scope** (the only files you may modify or create):

- `site/lib/source.ts`
- `site/lib/title-from-heading.ts` (create)
- `site/app/docs/layout.tsx`
- `site/app/docs/[[...slug]]/page.tsx`
- `site/app/api/search/route.ts`
- `site/app/layout.tsx`
- `site/components/dev-client.tsx` (create)
- `site/package.json`, `site/bun.lock` (via `bun add`)
- `site/README.md`
- `site/lib/toc.ts`, `site/app/page.tsx` (only the `getSource()` adaptation in Step 6)
- `site/next.config.mjs` (only if Step 3's `ws` STOP condition fires and you were told to proceed)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- Anything under `wiki/`, `raw/`, `plans/` (other than `plans/README.md`),
  `docs/`, `.scratch/`, `CLAUDE.md`, `CONTEXT.md`, `log.md` — content the
  site reads. Never add frontmatter to these to "fix" titles; Step 2 handles it.
- `site/scripts/sync-assets.mjs` — new images in `raw/assets` still need a
  dev restart; deferred (see Maintenance notes).
- `site/lib/remark-loose-links.ts`, `site/components/search.tsx`,
  `site/components/provider.tsx`, `site/lib/layout.shared.tsx`.
- Root `.gitignore`, `.husky/`, `.prettierrc`.

## Git workflow

- Branch: `advisor/004-site-all-docs-live-reload`
- Commit per step; message style from `git log`, e.g.
  `feat(site): render plans, ADRs and issues; live reload in dev`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 0: Confirm plan 003 landed and the tree is clean

`git status --short` → empty. `test -f site/lib/toc.ts && echo has-003` →
`has-003`. If `has-003` is not printed, STOP (see Depends on).

### Step 1: Widen `include` and switch to a dynamic loader

Rewrite `site/lib/source.ts`. Keep the existing `vault` options
(`url`, `remarkPlugins`, `remarkImageOptions`), the `slugify` helper, and the
`!wiki/index.md` exclusion from plan 003. Target shape:

```ts
import path from "node:path";
import { dynamicLoader } from "fumadocs-core/source";
import { obsidian } from "fumadocs-obsidian";
import { slug } from "github-slugger";
import { remarkLooseLinks } from "@/lib/remark-loose-links";
import { titleFromHeading } from "@/lib/title-from-heading"; // created in Step 2

/** The Obsidian vault is the whole repo, narrowed by `include`. */
const vaultDir = path.resolve(process.cwd(), "..");

export const vault = obsidian({
  dir: vaultDir,
  // Everything documentary in the repo. Never node_modules/, .obsidian/,
  // site/, .claude/. Only *.md (not *.json/*.yaml — those are validated as
  // meta files) plus everything under raw/assets (served as media).
  // `.scratch/**` must be spelled out: globs do not enter dot-directories
  // on their own.
  include: [
    "*.md",
    "wiki/**/*.md",
    "!wiki/index.md", // replaced by the home page TOC (plan 003)
    "raw/**/*.md",
    "raw/assets/**/*",
    "plans/**/*.md",
    "docs/**/*.md",
    ".scratch/**/*.md",
  ],
  url: (vaultPath) => `/vault/${vaultPath}`,
  remarkPlugins: [remarkLooseLinks],
  remarkImageOptions: false,
});

// In dev, the fumadocs-obsidian dev server (see package.json "dev") watches
// the vault and tells this process which file changed, so the next request
// re-reads it. Outside dev the env var is unset and this is a no-op.
if (process.env.NODE_ENV === "development") {
  const { watchWithDevServer } = await import("fumadocs-obsidian/dev/ws");
  await watchWithDevServer(vault);
}

function slugify(segment: string): string {
  return slug(segment).replace(/-+/g, "-");
}

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

/** Await this in every server component / route that needs pages. */
export function getSource() {
  return loader.get();
}

/** The type of what `getSource()` resolves to; use it in helper signatures. */
export type Source = Awaited<ReturnType<typeof getSource>>;
```

Keep the existing comments about slugs and media where they still apply.
Do not export `source` anymore — every consumer changes in Steps 4–6, and a
leftover export would silently keep a stale snapshot.

**Verify**: nothing yet (the file will not typecheck until Step 2). Continue.

### Step 2: Create the title-from-heading loader plugin

Create `site/lib/title-from-heading.ts`:

```ts
import type { LoaderPlugin } from "fumadocs-core/source";

const H1 = /^#\s+(.+?)\s*$/m;

/**
 * Plans, ADRs, agent docs and issues have no `title:` frontmatter; without
 * this they would be titled by filename ("001-fumadocs-wiki-site"). Use the
 * first `# ` heading instead. Pages with a frontmatter title are untouched.
 */
export const titleFromHeading: LoaderPlugin = {
  name: "title-from-heading",
  transformStorage({ storage }) {
    for (const filePath of storage.getFiles()) {
      const file = storage.read(filePath);
      if (!file || file.format !== "page") continue;
      const data = file.data as {
        title: string;
        content?: unknown;
        frontmatter?: Record<string, unknown>;
      };
      if (typeof data.frontmatter?.title === "string") continue;
      if (typeof data.content !== "string") continue;
      const match = H1.exec(data.content);
      if (match) data.title = match[1];
    }
  },
};
```

If `LoaderPlugin` is not exported from `fumadocs-core/source` under that
name, run `grep -n "LoaderPlugin" site/node_modules/fumadocs-core/dist/source/index.d.ts`
and use the exported alias; at `bce0526` it is exported as `LoaderPlugin`.

**Verify**: `bunx tsc --noEmit -p . 2>&1 | grep -v "app/"` → no errors
mentioning `lib/source.ts` or `lib/title-from-heading.ts` (errors in `app/`
are expected until Step 4).

### Step 3: Dev script, dependency, and dev client

1. `cd site && bun add @fumadocs/local-content@0.2.1` (pins the version that
   `fumadocs-obsidian@1.0.3` already resolves; `bun.lock` should show no
   second copy: `grep -c '"@fumadocs/local-content@' bun.lock` → `1`).
2. In `site/package.json`, change the `dev` script to:
   `"dev": "node scripts/sync-assets.mjs && fumadocs-obsidian dev -- next dev"`.
   Leave `build` unchanged (no watcher in builds).
3. Create `site/components/dev-client.tsx`:

   ```tsx
   "use client";
   import { DevClient } from "@fumadocs/local-content/dev/ws/react";

   /** Refreshes the page when the vault watcher reports a change (dev only). */
   export function VaultDevClient() {
     if (process.env.NODE_ENV !== "development") return null;
     return <DevClient />;
   }
   ```

4. In `site/app/layout.tsx`, import it and render `<VaultDevClient />` as
   the first child inside `<Provider>` (it needs `RootProvider`'s router
   context). Result:

   ```tsx
   <Provider>
     <VaultDevClient />
     {children}
   </Provider>
   ```

**Verify**: `bunx tsc --noEmit -p . 2>&1 | grep -c "dev-client\|app/layout"`
→ `0`.

**STOP condition for this step**: if `bun run dev` (Step 7) fails at startup
with an error naming `ws`, `bufferutil`, or `utf-8-validate`, stop and
report; the likely fix is `serverExternalPackages: ["ws", "@fumadocs/local-content"]`
in `site/next.config.mjs`, but confirm with the operator before applying it.

### Step 4: Switch the docs layout and page to `getSource()`

`site/app/docs/layout.tsx`:

```tsx
import { getSource } from "@/lib/source";
…
export default async function Layout({ children }: { children: ReactNode }) {
  const source = await getSource();
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
```

`site/app/docs/[[...slug]]/page.tsx` — change the import to `getSource`
and, in each of the three functions, add `const source = await getSource();`
as the first line (`generateStaticParams` becomes `async`):

```tsx
export async function generateStaticParams() {
  const source = await getSource();
  return source.generateParams();
}
```

Everything else in the file (`createRelativeLink(source, page)`, the `img`
override, the type/updated line) stays as is.

**Verify**: `bunx tsc --noEmit -p . 2>&1 | grep -c "app/docs"` → `0`.

### Step 5: Search route

`site/app/api/search/route.ts`:

```ts
import { getSource } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

export const revalidate = false;

export const { staticGET: GET } = createFromSource(getSource, {
  language: "english",
});
```

**Verify**: `bun run typecheck` → exit 0 (first full green typecheck; if
`site/lib/toc.ts` errors, that is Step 6).

### Step 6: Adapt plan 003's TOC to the async source

In `site/lib/toc.ts`: replace `import { source } from "@/lib/source"` with
`import { getSource } from "@/lib/source"`, make `buildToc` async, and add
`const source = await getSource();` before the `for (const page of source.getPages())`
loop. In `site/app/page.tsx`: make `Home` an `async function` and
`const toc = await buildToc();` (match however 003 named the variable).
Change nothing else in either file.

**Verify**: `bun run typecheck` → exit 0; `bunx prettier --check app lib components` → clean.

### Step 7: Build and dev checks

1. `bun run build` → exit 0. Then:
   - `ls out/docs/plans/` → `001-fumadocs-wiki-site.html 002-mattpocock-skills-page-examples.html 003-site-home-table-of-contents.html 004-site-all-docs-and-live-reload.html readme.html`
   - `ls out/docs/docs/adr/` → `0001-personal-wiki-is-a-nested-repo.html`
   - `ls out/docs/.scratch/config-system/issues/ | wc -l` → `8`
   - `ls out/docs/` shows `claude.html`, `context.html`, `log.html`
   - `grep -o '<title>[^<]*</title>' out/docs/plans/readme.html` → `<title>Implementation Plans</title>` (heading title, not "README")
   - `grep -c 'Scratch (issues &amp; research)' out/docs/plans/readme.html` → `1` or more (sidebar label)
   - `grep -c '/docs/plans/001-fumadocs-wiki-site' out/api/search/route.html 2>/dev/null || grep -rl '001-fumadocs-wiki-site' out/api | head -1` → a match (the new pages are in the search index; the exact static path of the search export is whatever plan 001 produced — check `ls out/api`).
2. Live reload, manual (do it; report the result verbatim):
   - `bun run dev` in one terminal. Expect the line
     `[@fumadocs/local-content] dev server is ready at ws://127.0.0.1:8000/_fumadocs_local_md`
     before Next's `Ready`. If port 8000 is busy, use
     `fumadocs-obsidian dev -p 8765 -- next dev` for the test and note it.
   - Open `http://localhost:3000/docs/plans/readme`. Browser console shows
     `[@fumadocs/local-content] connected to dev server at ws://127.0.0.1:8000/_fumadocs_local_md`.
   - From the repo root: `printf '# Live Reload Probe\n\nhello\n' > plans/999-probe.md`.
     Within ~2 s the sidebar under "Plans" shows "Live Reload Probe" without a
     manual refresh, and `http://localhost:3000/docs/plans/999-probe` renders.
   - Edit the probe body, save → the page updates. `rm plans/999-probe.md`
     → the sidebar entry disappears on the next refresh.
   - Stop the dev server. `git status --short` must not list
     `plans/999-probe.md`.
3. `site/README.md` line 7 becomes:
   `- \`bun run dev\` — local preview at http://localhost:3000; new and edited pages show up automatically (file watcher on port 8000, \`-p\` to change)`

**Verify**: all of the above; `git status --short` shows only in-scope files.

## Test plan

There is no test runner in `site/`. The build assertions in Step 7.1 are the
regression tests: they pin that the new directories are exported, that
heading-derived titles work, and that the sidebar label transformer runs.
Record the Step 7.2 console lines in the plan's status note.

## Done criteria

ALL must hold:

- [ ] `cd site && bun run typecheck` exits 0
- [ ] `cd site && bun run build` exits 0 and every `ls`/`grep` in Step 7.1 matches
- [ ] `grep -n "staticSource\|export const source" site/lib/source.ts` → no matches
- [ ] `grep -n "fumadocs-obsidian dev -- next dev" site/package.json` → 1 match
- [ ] `grep -n '"@fumadocs/local-content"' site/package.json` → 1 match
- [ ] Step 7.2 performed: new file appeared without restart (state the probe file name and the console line seen)
- [ ] `bunx prettier --check app lib components` clean
- [ ] `git status --short` lists only in-scope files; `plans/999-probe.md` does not exist
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report (do not improvise) if:

- Step 0: `site/lib/toc.ts` is missing (plan 003 not done) or the tree is dirty.
- The drift check shows changes to `site/lib/source.ts` beyond plan 003's `!wiki/index.md` line.
- `fumadocs-obsidian/dev/ws` or `@fumadocs/local-content/dev/ws/react` fails to resolve after `bun add` (check `ls site/node_modules/@fumadocs/local-content/dist/dev/ws/react.js`).
- `next dev` errors at startup mentioning `ws`, `bufferutil` or `utf-8-validate` (Step 3 note).
- In Step 7.2 the console shows `dev server URL could not be found` — the env var did not reach Next; report the exact `dev` script and how you launched it.
- In Step 7.2 the watcher logs `add at …/plans/999-probe.md` but the browser does not update: report whether `router.refresh()` logged (`"…" updated`) and whether a manual reload shows the page. Do not add `export const dynamic = "force-dynamic"` or similar — that changes the static export and is out of scope.
- `bun run build` output differs from plan 001's static export in any way other than the added pages (e.g. `/api/search` path changes).
- Any step's verification fails twice.

## Maintenance notes

- `getSource()` is now the only way to read pages. Any new server component
  must `await` it; never cache the result at module scope or dev goes stale
  again.
- New images dropped into `raw/assets` during `bun run dev` are still not
  served until restart (`scripts/sync-assets.mjs` runs once). Follow-up:
  serve `raw/assets` via a route handler in dev, or chokidar-copy it.
- The watcher watches the whole repo root filtered by `include`; adding a
  new directory to `include` automatically extends both the site and the
  watcher.
- Title derivation reads the first `# ` line of the body. A doc whose first
  heading is not its title (rare) can add `title:` frontmatter — but never
  edit files under `wiki/`/`raw/` for this; only the site is in scope.
- Reviewer focus: every former `source.` call now sits after
  `await getSource()`; `generateStaticParams` is async; the `dev` script's
  `--` separator is present (without it the CLI prints usage and exits 1).
- Root `*.md` pages land at `/docs/claude`, `/docs/context`, `/docs/log`
  alongside the folders. If that clutters the sidebar, a follow-up can group
  them via a `pageTree` transformer — not a `meta.json` in the repo root.
