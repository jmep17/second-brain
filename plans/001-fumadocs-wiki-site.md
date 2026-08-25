# Plan 001: Add a Fumadocs web UI (`site/`) that renders `wiki/` and `raw/` as a static docs site

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 17e982c..HEAD -- wiki/index.md raw/README.md CLAUDE.md .gitignore .lintstagedrc .prettierrc package.json`
> If any of those files changed since this plan was written, compare the
> "Current state" excerpts against the live files before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (purely additive — a new `site/` directory; no existing file's meaning changes)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `17e982c`, 2026-08-25

## Why this matters

This repo is a personal knowledge base (Karpathy "LLM Wiki" pattern): the LLM writes markdown pages into `wiki/` and the human reads them, today only through Obsidian. The owner wants a browsable documentation-style UI (Fumadocs or similar) for the wiki: sidebar navigation, full-text search, table of contents, dark mode, readable typography.

**Decision (already made, do not re-litigate):** use **Fumadocs** with its official **`fumadocs-obsidian`** content source. Reasons:

- The wiki uses Obsidian conventions the owner relies on — `[[wikilinks]]` and YAML frontmatter (see `CLAUDE.md`). `fumadocs-obsidian` renders wikilinks, embeds and callouts natively, so **no conversion step and no changes to `wiki/` or `raw/`** are needed.
- It reads the vault at build time (`staticSource()`), so the site can be a fully static export (`next build` → `out/`), which is cheap to host anywhere.
- Alternatives were considered: Quartz (Obsidian-native but a "digital garden" look, not a docs UI, and requires cloning its repo) and Astro Starlight (docs UI, but wikilinks need a third-party remark plugin). Fumadocs gives the requested docs UI _and_ native Obsidian support.

After this plan lands: `cd site && bun run build` produces a static site in `site/out/` where every page in `wiki/` and every markdown file in `raw/` is a rendered page, wikilinks between them work, images from `raw/assets/` display, and search works offline.

## Current state

Repo root layout (verified at `17e982c`):

```
.claude/commands/{ingest,lint}.md   # slash commands for the wiki workflow
.husky/pre-commit                   # runs: bunx lint-staged
.lintstagedrc                       # {"*": "prettier --ignore-unknown --write"}
.prettierrc                         # tabWidth 2, printWidth 80, double quotes, semi, trailingComma es5
.prettierignore                     # contains only: raw/
.gitignore                          # .DS_Store, .obsidian/workspace*.json, node_modules/
CLAUDE.md                           # the wiki schema (see excerpts below)
docs/agents/*.md                    # agent workflow docs — unrelated to this plan
log.md                              # append-only wiki operations log
package.json                        # devDeps only: husky, lint-staged, prettier. Package manager: bun (bun.lock present)
raw/README.md, raw/assets/          # immutable sources; assets = images
wiki/index.md                       # the only wiki page so far
```

Toolchain present on the machine (verified): `bun 1.3.14`, `node v26.6.0`. Fumadocs requires Node ≥ 22 — satisfied.

Relevant excerpts:

`CLAUDE.md` (wiki page conventions the site must honor):

```yaml
---
title: Attention Mechanisms
type: concept # one of: source-summary | entity | concept | synthesis | answer
created: 2026-08-25
updated: 2026-08-25
sources: [raw/some-article.md]
---
```

> Link between pages with Obsidian wikilinks: `[[attention-mechanisms]]`.
> Cite raw sources inline where a claim comes from, e.g. `([source](../raw/some-article.md))`.
> `raw/` — immutable source documents ... Read them, never edit them. `raw/assets/` holds downloaded images.
> `wiki/` — LLM-generated markdown pages. The LLM owns this directory entirely.

`wiki/index.md` lines 1–8:

```markdown
---
title: Index
updated: 2026-08-25
---

# Index

Catalog of every wiki page. Updated on every ingest.
```

`.gitignore` (whole file):

```
.DS_Store
.obsidian/workspace.json
.obsidian/workspace-mobile.json
node_modules/
```

Implications for the site:

1. Two kinds of links must resolve: `[[page-name]]` wikilinks (handled by `fumadocs-obsidian`) and **relative markdown links** like `../raw/some-article.md` (handled by Fumadocs' `createRelativeLink(source, page)` — only if `raw/` markdown files are _also_ pages in the same source). Therefore the vault root is the **repo root**, restricted with `include` globs to `wiki/**` and `raw/**`, giving URLs `/docs/wiki/<page>` and `/docs/raw/<file>`.
2. Images live in `raw/assets/`. `fumadocs-obsidian` never serves files; it only maps attachment paths to URLs via a `url()` callback. So a small script copies `raw/assets/` into `site/public/vault/raw/assets/` before dev/build (the copy is git-ignored).
3. Frontmatter fields `type`, `created`, `updated`, `sources` are not in Fumadocs' default schema. `fumadocs-obsidian` lets you extend `frontmatterSchema` with zod; the plan surfaces `type` and `updated` under the page title.
4. Root `package.json` has lint-staged running Prettier on **every** staged file with the root `.prettierrc`. Files under `site/` will be auto-formatted on commit. That is fine — do not fight it, and do not add a second Prettier config.

## Commands you will need

All commands run from `/Users/jorden/second-brain/site` unless stated.

| Purpose                     | Command                               | Expected on success                                                             |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------------------------- |
| Install                     | `bun install`                         | exit 0, `node_modules/` and `bun.lock` present                                  |
| Sync images                 | `bun run sync-assets`                 | exit 0; `ls public/vault/raw/assets` lists the same files as `ls ../raw/assets` |
| Typecheck                   | `bun run typecheck`                   | exit 0, no errors                                                               |
| Build (static export)       | `bun run build`                       | exit 0; `out/docs/wiki/index.html` exists                                       |
| Dev server                  | `bun run dev`                         | prints a `http://localhost:3000` URL                                            |
| Prettier (root, check mode) | `cd .. && bunx prettier --check site` | exit 0                                                                          |

(Exact scripts are defined in Step 2. Verified against Fumadocs' official `examples/next-static` on 2026-08-25; package versions verified on npm the same day: `next 16.3.2`, `fumadocs-core 16.15.1`, `fumadocs-ui 16.15.1`, `fumadocs-obsidian 1.0.3` (peer: `fumadocs-core ^16.8.0`, `react ^19.2.0`).)

## Suggested executor toolkit

- Official guide (read before Step 4): https://fumadocs.dev/docs/integrations/content/obsidian — the relevant code is inlined in this plan, but read it if an API name does not typecheck; the package is young and may have moved an export.
- Static-export reference: https://github.com/fuma-nama/fumadocs/tree/main/examples/next-static — Steps 5–7 mirror its `components/provider.tsx`, `components/search.tsx`, `app/api/search/route.ts`.
- If a Context7 / docs-lookup tool is available, query library `/fuma-nama/fumadocs` for "fumadocs-obsidian staticSource" on any API mismatch.

## Scope

**In scope** (the only paths you may create or modify):

- `site/**` (new directory — everything in it)
- `.gitignore` (append three lines, Step 1)
- `plans/README.md` (status row only)
- **Temporary only**: `wiki/_fumadocs-smoke.md` (created in Step 8, deleted in Step 9; must not exist at the end)

**Out of scope** (do NOT touch, even though they look related):

- `wiki/**` (other than the temporary smoke file) and `raw/**` — `CLAUDE.md` says the LLM ingest workflow owns `wiki/` and `raw/` is immutable. Do not add `meta.json` files, do not rename or reformat pages, do not add frontmatter.
- `CLAUDE.md`, `log.md`, `docs/**`, `.claude/**` — wiki workflow docs; the site is read-only tooling and needs no workflow changes.
- Root `package.json`, `.prettierrc`, `.lintstagedrc`, `.husky/**` — keep the site's dependencies isolated inside `site/package.json`.
- Deployment (GitHub Pages / Vercel / CI) — deferred; see Maintenance notes.
- Hot reload of vault edits during `bun run dev` — deferred; restart the dev server to see new wiki pages.

## Git workflow

- Branch: `advisor/001-fumadocs-wiki-site` (no branch convention is evident in the repo; `main` is the only branch).
- Commit per step or per logical unit. Message style is conventional-commits, matching `git log`: e.g. `chore: add pre-commit hooks (husky + lint-staged + prettier)`. Use `feat: add fumadocs site for wiki` for the main commit.
- The pre-commit hook runs Prettier on staged files. If a commit is rejected or files are rewritten, re-stage and commit again.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Ignore build outputs in the root `.gitignore`

Append exactly these lines to `/Users/jorden/second-brain/.gitignore`:

```
site/.next/
site/out/
site/public/vault/
```

(`node_modules/` is already ignored and matches `site/node_modules/`.)

**Verify**: `tail -3 .gitignore` (from repo root) → prints the three lines above.

### Step 2: Scaffold `site/` with `package.json` and config files

Create `site/` by hand (do **not** run `create-fumadocs-app` — its interactive prompts and template choices vary; writing the ~10 files directly is deterministic).

`site/package.json`:

```json
{
  "name": "second-brain-site",
  "private": true,
  "scripts": {
    "sync-assets": "node scripts/sync-assets.mjs",
    "predev": "node scripts/sync-assets.mjs",
    "dev": "next dev",
    "prebuild": "node scripts/sync-assets.mjs",
    "build": "next build",
    "start": "serve out",
    "typecheck": "next typegen && tsc --noEmit"
  },
  "dependencies": {
    "fumadocs-core": "^16.15.1",
    "fumadocs-obsidian": "^1.0.3",
    "fumadocs-ui": "^16.15.1",
    "next": "^16.3.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "shiki": "^3.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/mdx": "^2.0.13",
    "@types/node": "^24.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "postcss": "^8.5.0",
    "serve": "^14.2.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.9.0"
  }
}
```

`site/next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
};

export default config;
```

(No `fumadocs-mdx` and no `createMDX` wrapper — the Obsidian source compiles markdown at runtime, so the MDX build plugin is not needed.)

`site/postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

`site/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "paths": { "@/*": ["./*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules", "out"]
}
```

`site/scripts/sync-assets.mjs` (copies `raw/assets` → `public/vault/raw/assets`; idempotent):

```js
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(siteDir, "..", "raw", "assets");
const dest = resolve(siteDir, "public", "vault", "raw", "assets");

rmSync(dest, { recursive: true, force: true });
mkdirSync(dirname(dest), { recursive: true });
if (existsSync(src)) {
  cpSync(src, dest, { recursive: true });
  console.log(`synced ${src} -> ${dest}`);
} else {
  mkdirSync(dest, { recursive: true });
  console.log(`no ${src}; created empty ${dest}`);
}
```

`site/README.md` (short, normal prose):

```markdown
# site

Fumadocs UI for the second-brain wiki. Reads `../wiki` and `../raw` directly
(Obsidian syntax supported) and builds a static site into `out/`.

- `bun install`
- `bun run dev` — local preview at http://localhost:3000 (restart to pick up new wiki pages)
- `bun run build` — static export to `out/`
- `bun run start` — serve the export locally

Images in `../raw/assets` are copied to `public/vault/raw/assets` automatically before dev/build.
```

Then install:

**Verify**: `cd site && bun install` → exit 0; `ls node_modules/fumadocs-obsidian/package.json` → exists.
**Verify**: `bun run sync-assets` → exit 0; `ls public/vault/raw/assets` succeeds (may be empty if `../raw/assets` is empty).

### Step 3: Global styles and root layout

`site/app/global.css`:

```css
@import "tailwindcss";
@import "fumadocs-ui/css/neutral.css";
@import "fumadocs-ui/css/preset.css";
@import "fumadocs-obsidian/css/preset.css";

html {
  scrollbar-gutter: stable;
}
```

`site/app/layout.tsx`:

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

`site/components/provider.tsx`:

```tsx
"use client";
import SearchDialog from "@/components/search";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

export function Provider({ children }: { children: ReactNode }) {
  return <RootProvider search={{ SearchDialog }}>{children}</RootProvider>;
}
```

`site/components/search.tsx` (static search client — required because the site is a static export with no server):

```tsx
"use client";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search";
import { useDocsSearch } from "fumadocs-core/search/client";
import { staticClient } from "fumadocs-core/search/client/orama-static";

export default function StaticSearchDialog(props: SharedProps) {
  const { search, setSearch, query } = useDocsSearch({
    client: staticClient({}),
  });

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== "empty" ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  );
}
```

**Verify**: nothing to run yet (typecheck happens after Step 6, when `@/lib/source` exists).

### Step 4: The content source (`site/lib/source.ts`)

This is the load-bearing file. Vault root = repo root; only `wiki/` and `raw/` are scanned.

```ts
import path from "node:path";
import { loader } from "fumadocs-core/source";
import { frontmatterSchema, obsidian } from "fumadocs-obsidian";
import { z } from "zod";

/** Repo root: the Obsidian vault is the whole repo, filtered by `include`. */
const vaultDir = path.resolve(process.cwd(), "..");

export const vault = obsidian({
  dir: vaultDir,
  // Only the knowledge base, never node_modules/, plans/, docs/, site/ …
  include: ["wiki/**/*.md", "raw/**/*"],
  // Attachments (images in raw/assets) are copied to public/vault by
  // scripts/sync-assets.mjs, so they are served at /vault/<vault-path>.
  url: (p) => `/vault/${p}`,
  frontmatterSchema: frontmatterSchema.extend({
    type: z.string().optional(),
    created: z.union([z.string(), z.date()]).optional(),
    updated: z.union([z.string(), z.date()]).optional(),
    sources: z.array(z.string()).optional(),
  }),
});

export const source = loader(await vault.staticSource(), {
  baseUrl: "/docs",
});
```

Notes for the executor:

- `include` is documented in the package source (`ObsidianConfig.include`: "glob patterns to scan, relative to the vault directory"; default `['**/*']`). Without it the scan would include `node_modules/` and `.git/` — that is a STOP condition if you ever see them in the page tree.
- YAML dates (`updated: 2026-08-25`) may parse as a `Date` object or a string depending on the YAML parser, hence the union. If the extended schema fails to typecheck, fall back to `z.unknown().optional()` for `created`/`updated`.
- Top-level `await` in a module is fine here (ESM, `module: esnext`); the official Fumadocs static-source example uses exactly this shape.

**Verify**: `ls lib/source.ts` → exists. (Typecheck in Step 6.)

### Step 5: Docs layout, page route, redirect from `/`

`site/lib/layout.shared.tsx`:

```tsx
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: "Second Brain" },
  };
}
```

`site/app/docs/layout.tsx`:

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

`site/app/docs/[[...slug]]/page.tsx`:

```tsx
import { source } from "@/lib/source";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import defaultMdxComponents, { createRelativeLink } from "fumadocs-ui/mdx";
import * as ObsidianComponents from "fumadocs-obsidian/ui";
import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

type Props = { params: Promise<{ slug?: string[] }> };

function formatDate(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value;
  return undefined;
}

export default async function Page({ params }: Props) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();

  const { body, toc } = await (
    await page.data.load()
  ).render({
    ...defaultMdxComponents,
    ...ObsidianComponents,
    // resolves relative markdown links such as ../raw/some-article.md
    a: createRelativeLink(source, page),
  });

  const fm = page.data.frontmatter;
  const updated = formatDate(fm.updated);

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {(fm.type || updated) && (
        <p className="text-fd-muted-foreground text-sm">
          {fm.type ? <span>{fm.type}</span> : null}
          {fm.type && updated ? " · " : null}
          {updated ? <span>updated {updated}</span> : null}
        </p>
      )}
      <DocsBody>{body}</DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  return { title: page.data.title, description: page.data.description };
}
```

`site/app/page.tsx` (root → wiki index):

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/docs/wiki");
}
```

**Verify**: `ls app/docs/layout.tsx "app/docs/[[...slug]]/page.tsx" app/page.tsx lib/layout.shared.tsx` → all exist.

### Step 6: Static search index route, then typecheck

`site/app/api/search/route.ts`:

```ts
import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

export const revalidate = false;

export const { staticGET: GET } = createFromSource(source, {
  language: "english",
});
```

**Verify**: `bun run typecheck` → exit 0. If it fails on an import path from `fumadocs-obsidian` or `fumadocs-core/search/client/orama-static`, inspect `node_modules/<pkg>/package.json` `exports` for the correct subpath, fix the import, and re-run. Two failures after fixes → STOP.

### Step 7: Build the static export

**Verify**: `bun run build` → exit 0 and:

- `ls out/docs/wiki/index.html` → exists (from `wiki/index.md`)
- `ls out/docs/raw/readme.html out/docs/raw/README.html 2>/dev/null | head -1` → one of them exists (slug casing is decided by the library; either is acceptable)
- `ls out/api/` → contains a `search` file or directory (the pre-rendered search index)
- `grep -c "Catalog of every wiki page" out/docs/wiki/index.html` → `1` or more
- `ls out/vault/raw/assets` → succeeds (attachments copied into the export)

### Step 8: Smoke-test wikilinks, relative links and search with a temporary page

Create **temporary** `wiki/_fumadocs-smoke.md` (this file is deleted in Step 9):

```markdown
---
title: Fumadocs Smoke Test
type: concept
updated: 2026-08-25
---

# Fumadocs Smoke Test

Wikilink to the index: [[index]].

Relative link to a raw source: [raw readme](../raw/README.md).

> [!note]
> Callout syntax check. Unique token: zebra-quokka-7731
```

Rebuild: `bun run build` → exit 0.

**Verify** (from `site/`):

- `ls out/docs/wiki/_fumadocs-smoke.html` → exists
- `grep -o 'href="/docs/wiki[^"]*"' out/docs/wiki/_fumadocs-smoke.html | head` → includes `href="/docs/wiki"` or `href="/docs/wiki/index"` (the wikilink resolved to a site URL, not left as literal `[[index]]`)
- `grep -c '\[\[index\]\]' out/docs/wiki/_fumadocs-smoke.html` → `0`
- `grep -o 'href="/docs/raw[^"]*"' out/docs/wiki/_fumadocs-smoke.html | head -1` → non-empty (relative `../raw/README.md` link resolved to the raw page)
- `grep -rl "zebra-quokka-7731" out/api/` → at least one file (the page is in the search index)
- `grep -c "updated 2026-08-25" out/docs/wiki/_fumadocs-smoke.html` → `1` or more (frontmatter shown under title)

If the relative-link check fails but wikilinks pass, that is acceptable — record it in the plan status as a known limitation ("relative `../raw/*.md` links not resolved") and continue; do not spend more than one fix attempt on it.

### Step 9: Remove the smoke page and rebuild clean

- `rm ../wiki/_fumadocs-smoke.md`
- `bun run build` → exit 0
- `ls out/docs/wiki/_fumadocs-smoke.html` → **does not exist**
- `cd .. && git status --porcelain wiki raw` → empty (nothing changed under `wiki/` or `raw/`)

### Step 10: Format check and commit

- `bunx prettier --check site .gitignore` → exit 0 (run `bunx prettier --write site` first if it reports files).
- Commit on branch `advisor/001-fumadocs-wiki-site`: `feat: add fumadocs site for wiki`.
- `git status --porcelain` → only `plans/README.md` may remain modified (status update).

## Test plan

The repo has no test runner and the site is a thin integration over Fumadocs; no unit tests are added. Verification is the build plus the smoke page in Step 8, which covers:

- happy path: an existing wiki page renders (`wiki/index.md` → `out/docs/wiki/index.html`)
- wikilink resolution (`[[index]]` → `/docs/wiki...` href)
- relative source-citation links (`../raw/README.md` → `/docs/raw/...`)
- callout rendering does not break the build
- search index contains page body text
- custom frontmatter (`type`, `updated`) surfaces in the page
- no leakage of non-vault directories into the page tree (Done criteria below)

## Done criteria

Machine-checkable. ALL must hold (from `site/` unless noted):

- [ ] `bun run typecheck` exits 0
- [ ] `bun run build` exits 0 and `out/docs/wiki/index.html` exists
- [ ] `ls out/docs` lists only `wiki` and `raw` (plus loose `.html`/`.txt` files Next may emit) — no `node_modules`, `plans`, `docs`, `site`
- [ ] `ls out/api/` shows the search index
- [ ] `test ! -e ../wiki/_fumadocs-smoke.md` (smoke page removed)
- [ ] `cd .. && git status --porcelain wiki raw CLAUDE.md log.md package.json` → empty
- [ ] `cd .. && bunx prettier --check site` exits 0
- [ ] `cd .. && git check-ignore site/out site/.next site/public/vault` → prints all three paths
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows `CLAUDE.md` changed the frontmatter conventions or the `wiki/`/`raw/` layout.
- `bun install` cannot resolve `fumadocs-obsidian@^1.0.3` with `fumadocs-core@^16.15.1` (peer conflict) — report the exact resolver error; do not force-install or pin to unrelated majors.
- After the source is configured, the page tree / `out/docs` contains `node_modules`, `.git`, `plans`, `docs` or `site` — the `include` filter is not being honored; do not "fix" by moving the vault.
- `page.data.load()` / `.render()` do not exist on the static-source page object (API moved since 1.0.3) — report the actual shape of `page.data` (`Object.keys`) rather than guessing.
- Typecheck or build fails twice after a fix attempt on the same error.
- Fixing anything appears to require editing `wiki/` (other than the smoke file), `raw/`, `CLAUDE.md`, or the root `package.json`.

## Maintenance notes

- **New wiki pages need no site changes.** Any `.md` added to `wiki/` or `raw/` appears on the next build. The dev server uses a one-time snapshot (`staticSource`), so restart `bun run dev` after ingesting. If live reload becomes important, switch `lib/source.ts` to `dynamicLoader(vault.dynamicSource())` + `vault.devServer()` and the `fumadocs-obsidian dev -- next dev` script per the official guide; that is a deliberate follow-up, not part of this plan.
- **Sidebar order** is alphabetical within `wiki/` and `raw/`. Fumadocs can read `meta.json` files from the vault for custom ordering/titles — but `wiki/` is LLM-owned per `CLAUDE.md`, so adding `wiki/meta.json` should be a conscious workflow decision recorded in `CLAUDE.md`, not a silent addition.
- **Frontmatter drift**: the site's zod schema is permissive (all custom fields optional). If `CLAUDE.md` later adds required fields or renames `type`, update `lib/source.ts` and the badge in `app/docs/[[...slug]]/page.tsx`.
- **Images**: `scripts/sync-assets.mjs` copies `raw/assets` wholesale. If `raw/assets` grows large, the build gets slower and `out/` bigger; consider hosting assets separately and changing the `url()` callback.
- **Reviewer focus**: `lib/source.ts` `include` globs (nothing outside `wiki/`, `raw/` must be scanned) and the `.gitignore` additions (no `out/`, `.next/`, `public/vault/` committed).
- **Deferred**: deployment (GitHub Pages / Vercel / Cloudflare Pages all work with the `out/` static export), an `llms.txt` route, OG images, and a `type`-based grouping of the sidebar (would need a custom page-tree transform).
