# Plan 001: Add a Fumadocs web UI (`site/`) that renders `wiki/` and `raw/` as a static docs site

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**, from the repo root:
> `git diff --stat 3b71e42..HEAD -- .gitignore CLAUDE.md package.json .prettierrc .lintstagedrc .prettierignore wiki raw`
> If any of those paths changed since this plan was written, compare the
> "Current state" excerpts against the live files before proceeding: run
> `sed -n '1,9p;33p;39p' wiki/dotfiles-bare-git-repo.md`, `sed -n '1,11p' "raw/How to Store Dotfiles - A Bare Git Repository.md"`,
> `sed -n '8p' wiki/index.md` and `cat .gitignore`, and check each printed
> line against the excerpt quoted below. Any differing line is a STOP
> condition. New files under `wiki/` or `raw/` are NOT drift (the wiki grows
> by design) — only changes to the quoted lines matter.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (purely additive — a new `site/` directory plus four `.gitignore` lines; no existing file's meaning changes)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `3b71e42`, 2026-08-25 (revised; the first draft was written at `17e982c`)

## Why this matters

This repo is a personal knowledge base (Karpathy "LLM Wiki" pattern): the LLM writes markdown pages into `wiki/`, sources live in `raw/`, and the human reads them — today only through Obsidian. The owner wants a browsable documentation-style UI for the wiki: sidebar navigation, full-text search, table of contents, dark mode, readable typography.

**Decision (already made, do not re-litigate):** use **Fumadocs** with its official **`fumadocs-obsidian`** content source. Reasons:

- The wiki uses Obsidian conventions the owner relies on — `[[wikilinks]]` and YAML frontmatter (see `CLAUDE.md`). `fumadocs-obsidian` resolves wikilinks, embeds and callouts natively, so **no conversion step and no changes to `wiki/` or `raw/`** are needed.
- It reads the vault at build time (`staticSource()`), so the site is a fully static export (`next build` → `site/out/`), cheap to host anywhere.
- Alternatives (Quartz, Astro Starlight, converting the wiki to MDX) were considered and rejected — see `plans/README.md`.

After this plan lands: `cd site && bun run build` produces a static site in `site/out/` where every `.md` in `wiki/` and `raw/` is a page, wikilinks and `../raw/...` citation links between them work, images from `raw/assets/` display, and search works offline.

## Current state

All facts below were verified at commit `3b71e42` on 2026-08-25.

Repo root layout:

```
.claude/commands/{ingest,lint}.md   # slash commands for the wiki workflow
.husky/pre-commit                   # runs: bunx lint-staged
.lintstagedrc                       # {"*": "prettier --ignore-unknown --write"}
.prettierrc                         # tabWidth 2, printWidth 80, double quotes, semi, trailingComma es5, arrowParens always
.prettierignore                     # contains only: raw/
.gitignore                          # see excerpt below
.obsidian/                          # untracked Obsidian config (app.json, workspace.json, ...) — must NOT become pages
CLAUDE.md                           # the wiki schema (see excerpts below)
docs/agents/*.md                    # agent workflow docs — must NOT become pages
plans/                              # these plans — must NOT become pages
log.md                              # append-only wiki operations log
package.json                        # devDeps only: husky, lint-staged, prettier. Package manager: bun (bun.lock present)
raw/README.md                       # no frontmatter → page title falls back to "README"
raw/How to Store Dotfiles - A Bare Git Repository.md   # Obsidian Web Clipper output; NOTE the spaces in the name
raw/chezmoi-design-faq.md           # frontmatter has source_url/fetched but NO title → title falls back to the filename
raw/eshlox-dotfiles-bare-git-repo-secrets.md            # same shape as above
raw/assets/                         # empty AND untracked: does not exist in a fresh clone; the sync script tolerates that
wiki/index.md                       # the catalog page
wiki/dotfiles-management.md         # type: concept
wiki/dotfiles-bare-git-repo.md      # type: source-summary; cites the raw file via a relative link
wiki/tmux-pane-keybindings.md       # type: answer
wiki/mattpocock-skills-workflow.md  # type: answer
```

Toolchain on the machine (verified): `bun 1.3.14`, `node v26.6.0`. Fumadocs requires Node ≥ 22 — satisfied.

### Excerpts

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

`wiki/dotfiles-bare-git-repo.md` lines 1–9 (a real page; used by the verification steps):

```markdown
---
title: "How to Store Dotfiles - A Bare Git Repository"
type: source-summary
created: 2026-08-25
updated: 2026-08-25
sources: [raw/How to Store Dotfiles - A Bare Git Repository.md]
---

Atlassian tutorial (attributed to a technique by HN user `StreakyCobra`) on tracking dotfiles with a bare git repo instead of symlink managers. ([source](../raw/How to Store Dotfiles - A Bare Git Repository.md))
```

Lines 33 and 39 of the same file contain the wikilink `[[dotfiles-management]]` (line 39 is exactly `- [[dotfiles-management]]`).

`raw/How to Store Dotfiles - A Bare Git Repository.md` lines 1–11 (Web Clipper frontmatter — note the extra keys):

```yaml
---
title: "How to Store Dotfiles - A Bare Git Repository"
source: "https://www.atlassian.com/git/tutorials/dotfiles"
author:
  - "[[Atlassian]]"
published: 2025-12-15
created: 2026-08-25
description: "It's time to find a better way to store your dotfiles. Learn why you should start using a bare Git repository instead."
tags:
  - "clippings"
---
```

`.gitignore` (whole file):

```
.DS_Store
.obsidian/workspace.json
.obsidian/workspace-mobile.json
node_modules/
```

### Library facts the plan relies on (verified by reading the published packages)

Versions on npm on 2026-08-25: `next 16.3.2`, `fumadocs-core 16.15.1`, `fumadocs-ui 16.15.1` (peer-depends on **exactly** `fumadocs-core 16.15.1`), `fumadocs-obsidian 1.0.3` (peers: `fumadocs-core ^16.8.0`, `react ^19.2.0`, `react-dom ^19.2.0`).

1. **`obsidian({ dir, include, url, remarkPlugins, remarkImageOptions, frontmatterSchema })`** — `include` is "glob patterns to scan, relative to the vault directory" (default `['**/*']`). Any file that is not `.md/.mdx` (content) or `.json/.yaml/.yml/.toml` (data) is treated as a media file whose URL comes from `url(vaultPath)`. **`.json` files are validated as Fumadocs `meta.json` and throw on mismatch**, so the include globs must not pick up arbitrary data files.
2. **Page objects**: `page.data.title` (falls back to the filename when frontmatter has no `title`), `page.data.frontmatter` (the validated frontmatter object — extra keys are kept because the default schema is "loose"), `page.data.load()` → renderer with `.render(components)` → `{ body, toc }`, and `page.data.structuredData()` (used by search automatically).
3. **Link resolution**: `fumadocs-obsidian` rewrites both `[[wikilinks]]` and relative markdown links into **relative file hrefs** like `./index.md` or `../raw/x.md`. Turning those into site URLs is the job of `createRelativeLink(source, page)` from `fumadocs-ui/mdx`, passed as the `a` component. Without it, every internal link is broken — not only the `../raw` ones.
4. **Links whose destination contains spaces are dropped by the markdown parser.** CommonMark does not allow unescaped spaces in a link destination, so `[source](../raw/How to Store Dotfiles - A Bare Git Repository.md)` is parsed as plain text (verified with `remark-parse@11` on the real page: the whole `([source](../raw/How to ...md))` stays one text node). Obsidian tolerates this, and every Web Clipper file name has spaces, so **every citation link in the wiki would render as literal text** unless the site repairs them. Step 5 adds a tiny remark plugin for that. (`[text](<../raw/File With Spaces.md>)` and `%20`-encoded destinations parse fine — that is the workflow-side alternative, recorded as a follow-up in `plans/README.md`.)
5. **Frontmatter dates**: the parser is the `yaml` package with its default schema, which returns `2026-08-25` as the **string** `"2026-08-25"`, not a `Date`. Verified. So no date handling is needed.
6. **Slugs**: Fumadocs' default slug for `raw/How to Store Dotfiles - A Bare Git Repository.md` is `encodeURI` of each path segment → `/docs/raw/How%20to%20Store%20Dotfiles%20-%20A%20Bare%20Git%20Repository`. Static-export file names with spaces/percent-escapes are a hosting gray zone, so the loader gets a `slugs` function that produces `/docs/raw/how-to-store-dotfiles-a-bare-git-repository`. Link resolution (fact 3) works by **file path**, not slug, so custom slugs do not break links.
7. **Images**: `fumadocs-obsidian` always runs Fumadocs' `remarkImage` plugin, whose defaults are `external: true` (fetches every remote image over the network at build time to learn its size) and `onError: 'error'` (a single dead image URL fails the whole build). Fumadocs-ui's default `img` component is `next/image`, which refuses to build under `output: 'export'` unless `images.unoptimized` is set. The plan disables `remarkImage` (`remarkImageOptions: false`), renders plain `<img>` tags, and sets `images.unoptimized: true` as a safety net. Result: no network at build time, no size probing, no failures on dead links.
8. **Search**: `createFromSource(source).staticGET` from `fumadocs-core/search/server` exports the whole index as JSON at build time; its default index builder calls `page.data.structuredData()` when that is a function (it is, for Obsidian pages). The browser side is `staticClient()` from `fumadocs-core/search/client/orama-static`, which fetches `/api/search`.
9. **Static export shape** (no `trailingSlash`, matching Fumadocs' official `examples/next-static`): `/docs/wiki` → `out/docs/wiki.html`; `/docs/wiki/dotfiles-management` → `out/docs/wiki/dotfiles-management.html`. `wiki/index.md` becomes the `/docs/wiki` folder page. Next forbids `dynamicParams: true` with `output: 'export'`; the plan never sets it (default is fine).
10. Root `package.json` has lint-staged running Prettier on **every** staged file with the root `.prettierrc`. Files under `site/` will be auto-formatted on commit. That is fine — do not fight it, and do not add a second Prettier config. Prettier 3 also honors `.gitignore`, so build outputs are skipped. Prettier cannot infer a parser for `.gitignore` itself, so never pass that file to `prettier --check`.
11. **Import subpaths used by this plan, all present in the packages' `exports` maps**: `fumadocs-core/source` (`loader(source, options)` two-argument form, `source.getPage`, `source.getPageTree`, `source.generateParams`, `source.resolveHref`), `fumadocs-core/search/server`, `fumadocs-core/search/client`, `fumadocs-core/search/client/orama-static`, `fumadocs-ui/mdx`, `fumadocs-ui/provider/next`, `fumadocs-ui/layouts/docs`, `fumadocs-ui/layouts/docs/page` (`DocsPage`, `DocsBody`, `DocsTitle`, `DocsDescription`), `fumadocs-ui/layouts/shared`, `fumadocs-ui/components/dialog/search`, `fumadocs-ui/css/neutral.css`, `fumadocs-ui/css/preset.css`, `fumadocs-obsidian` (`obsidian`), `fumadocs-obsidian/ui` (`ObsidianCallout`, `ObsidianCalloutTitle`, `ObsidianCalloutBody` — the exact component names the renderer looks up for callouts), `fumadocs-obsidian/css/preset.css`, `github-slugger` (`slug`).
12. **Slug of `README.md`**: only `index` is special-cased by Fumadocs; `raw/README.md` gets the default segment `README`, which the `slugs` function lowercases to `readme` → `/docs/raw/readme`.
13. **Other dependency versions** (chosen to match Fumadocs' official `examples/next-static` on 2026-08-25, which builds with them): `typescript ^6.0.0` (the example uses `^6.0.3`; the newest TypeScript, 7.x, is deliberately avoided), `@types/node ^26.0.0` (example: `^26.2.0`; Node here is 26), `serve ^14.2.0`, `postcss ^8.5.0`, `tailwindcss` / `@tailwindcss/postcss` `^4.0.0`. `github-slugger 2.0.0` is the current release (ESM, named export `slug`; also a dependency of `fumadocs-obsidian` itself). `unist-util-visit ^5.1.0` and `@types/mdast ^4.0.4` are what `fumadocs-obsidian` itself depends on. `@types/mdx` is an (optional) peer dependency of `fumadocs-obsidian` and `fumadocs-ui`, declared so the `MDXComponents` type used by `.render()` resolves.

## Commands you will need

All commands run from `/Users/jorden/second-brain/site` unless stated.

| Purpose                     | Command                               | Expected on success                                                             |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------------------------- |
| Install                     | `bun install`                         | exit 0; `node_modules/` and `bun.lock` present                                  |
| Sync images                 | `bun run sync-assets`                 | exit 0; `ls public/vault/raw/assets` lists the same files as `ls ../raw/assets` |
| Typecheck                   | `bun run typecheck`                   | exit 0, no errors                                                               |
| Build (static export)       | `bun run build`                       | exit 0; `out/docs/wiki.html` exists                                             |
| Dev server                  | `bun run dev`                         | prints a `http://localhost:3000` URL (restart it to pick up new wiki pages)     |
| Serve the export            | `bun run start`                       | serves `out/` locally                                                           |
| Prettier (root, check mode) | `cd .. && bunx prettier --check site` | exit 0                                                                          |

(Exact scripts are defined in Step 2.)

## Suggested executor toolkit

- Official Obsidian guide: https://fumadocs.dev/docs/integrations/content/obsidian — the relevant code is inlined in this plan; read the guide only if an import does not typecheck.
- Static-export reference: https://github.com/fuma-nama/fumadocs/tree/main/examples/next-static — Steps 3, 6 and 7 mirror its `components/provider.tsx`, `components/search.tsx`, `app/api/search/route.ts`.
- If a Context7 / docs-lookup tool is available, query library `/fuma-nama/fumadocs` on any API mismatch.
- When an import fails, the ground truth is `node_modules/<pkg>/package.json` → `exports`.

## Scope

**In scope** (the only paths you may create or modify):

- `site/**` (new directory — everything in it)
- `.gitignore` (append four lines, Step 1)
- `plans/README.md` (status row only)
- **Temporary only**: `wiki/fumadocs-smoke.md` (created in Step 9, deleted in Step 10; must not exist at the end)

**Out of scope** (do NOT touch, even though they look related):

- `wiki/**` (other than the temporary smoke file) and `raw/**` — `CLAUDE.md` says the ingest workflow owns `wiki/` and `raw/` is immutable. Do not add `meta.json` files, do not rename files, do not "fix" the spaces in raw file names, do not edit frontmatter or links.
- `CLAUDE.md`, `log.md`, `docs/**`, `.claude/**`, `.obsidian/**` — the site is read-only tooling and needs no workflow changes.
- Root `package.json`, `bun.lock`, `.prettierrc`, `.lintstagedrc`, `.prettierignore`, `.husky/**` — keep the site's dependencies isolated inside `site/package.json`.
- Deployment (GitHub Pages / Vercel / CI), live reload of vault edits, sidebar grouping by `type` — deferred; see Maintenance notes.

## Git workflow

- Branch: `advisor/001-fumadocs-wiki-site` (no branch convention is evident in the repo; `main` is the only branch).
- Commit per step or per logical unit. Message style is conventional-commits, matching `git log`: e.g. `chore: add pre-commit hooks (husky + lint-staged + prettier)`, `ingest: dotfiles-bare-git-repo`. Use `feat: add fumadocs site for wiki` for the main commit.
- The pre-commit hook runs Prettier on staged files. If files are rewritten during commit, re-stage and commit again.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Ignore build outputs in the root `.gitignore`

Append exactly these lines to `/Users/jorden/second-brain/.gitignore`:

```
site/.next/
site/out/
site/public/vault/
site/next-env.d.ts
```

(`node_modules/` is already ignored and matches `site/node_modules/`. `next-env.d.ts` is regenerated by Next on every build; Next's own template ignores it.)

**Verify** (repo root): `tail -4 .gitignore` → prints the four lines above.

### Step 2: Scaffold `site/` with `package.json`, config files and the asset-sync script

Create `site/` by hand (do **not** run `create-fumadocs-app` — its interactive prompts and template choices vary; writing the files directly is deterministic).

`site/package.json` — versions are pinned exactly where a peer dependency demands it (`fumadocs-ui` requires exactly `fumadocs-core 16.15.1`):

```json
{
  "name": "second-brain-site",
  "private": true,
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
    "fumadocs-ui": "16.15.1",
    "github-slugger": "^2.0.0",
    "next": "16.3.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "unist-util-visit": "^5.1.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/mdast": "^4.0.4",
    "@types/mdx": "^2.0.13",
    "@types/node": "^26.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "postcss": "^8.5.0",
    "serve": "^14.2.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^6.0.0"
  }
}
```

(The `dev`/`build` scripts chain the asset sync explicitly instead of relying on `predev`/`prebuild` lifecycle hooks, so behavior does not depend on the package runner.)

`site/next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  // Static export has no image optimizer. Content images are rendered as
  // plain <img> (see app/docs/[[...slug]]/page.tsx); this is a safety net
  // for any next/image usage inside fumadocs-ui.
  images: { unoptimized: true },
};

export default config;
```

(No `fumadocs-mdx` and no `createMDX` wrapper — the Obsidian source compiles markdown itself at build time.)

`site/postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

`site/tsconfig.json` (identical to Fumadocs' official `examples/next-static`, plus `out` excluded):

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

`site/scripts/sync-assets.mjs` (copies `raw/assets` → `public/vault/raw/assets`; idempotent; tolerates an empty or missing source):

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

`site/README.md`:

```markdown
# site

Fumadocs UI for the second-brain wiki. Reads `../wiki` and `../raw` directly
(Obsidian syntax supported) and builds a static site into `out/`.

- `bun install`
- `bun run dev` — local preview at http://localhost:3000 (restart to pick up new wiki pages)
- `bun run build` — static export to `out/`
- `bun run start` — serve the export locally

Images in `../raw/assets` are copied to `public/vault/raw/assets` before dev/build.
```

Then install and sync:

**Verify** (from `site/`): `bun install` → exit 0; `ls node_modules/fumadocs-obsidian/package.json node_modules/github-slugger/package.json` → both exist.
**Verify**: `bun run sync-assets` → exit 0; `ls -d public/vault/raw/assets` → prints the path (the directory may be empty).

### Step 3: Global styles, root layout, provider, search dialog

`site/app/global.css` (the `body[data-scroll-locked]` block comes from the official static example):

```css
@import "tailwindcss";
@import "fumadocs-ui/css/neutral.css";
@import "fumadocs-ui/css/preset.css";
@import "fumadocs-obsidian/css/preset.css";

html {
  scrollbar-gutter: stable;
}

html > body[data-scroll-locked] {
  margin-right: 0px !important;
  --removed-body-scroll-bar-size: 0px !important;
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

`site/components/search.tsx` (static search client — required because the export has no server; identical to the official example minus i18n):

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

**Verify**: `ls app/global.css app/layout.tsx components/provider.tsx components/search.tsx` → all exist. (Typecheck happens in Step 7.)

### Step 4: The content source (`site/lib/source.ts`)

This is the load-bearing file. Vault root = repo root; only markdown under `wiki/` and `raw/`, plus files under `raw/assets/`, are scanned.

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

Notes for the executor:

- Do **not** pass a custom `frontmatterSchema`. The default one is "loose": it validates only `title`/`description`/`icon`/`full`/`aliases` and passes every other key (`type`, `created`, `updated`, `sources`, the Web Clipper's `author`/`tags`/`published`, …) through to `page.data.frontmatter` untyped. A stricter schema would turn one oddly-formatted page into a failed build.
- Top-level `await` is fine here (ESM, `module: esnext`); the official Fumadocs static example uses exactly this shape.
- If `slugs` does not typecheck, the option's type is `(file, next: () => string[]) => string[] | undefined` from `fumadocs-core`'s `SlugsPluginOptions`, which `LoaderOptions` extends. Check `node_modules/fumadocs-core/dist/index-*.d.ts` for `interface LoaderOptions` before changing anything.

**Verify**: `ls lib/source.ts` → exists. (Typecheck in Step 7, after the plugin from Step 5 exists.)

### Step 5: The loose-link repair plugin (`site/lib/remark-loose-links.ts`)

Why (see fact 4): the wiki cites sources as `([source](../raw/How to Store Dotfiles - A Bare Git Repository.md))`. Spaces in a link destination are illegal in CommonMark, so the parser leaves the whole thing as text. This plugin runs after `fumadocs-obsidian`'s own transforms (that is where `remarkPlugins` are applied) and converts any leftover `[label](destination.md)` whose destination contains whitespace into a real link node with the destination as-is. At render time `createRelativeLink` (Step 6) resolves that relative path to the raw page's URL, exactly as it does for wikilinks.

```ts
import type { Link, PhrasingContent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

/**
 * CommonMark forbids unescaped spaces in a link destination, so remark leaves
 * `[label](../raw/File With Spaces.md)` as literal text. Obsidian accepts it,
 * and the wiki's citations to `raw/` files are written that way. Turn such
 * leftovers back into link nodes; `createRelativeLink` resolves the path.
 *
 * Only destinations ending in `.md` (optionally `#heading`) that contain
 * whitespace are touched — anything else was either already parsed as a
 * link or is not a vault link.
 */
const LOOSE_LINK = /\[([^\]\n]+)\]\(([^()\n]*\.md(?:#[^()\n]*)?)\)/g;

export function remarkLooseLinks() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      const value = node.value;
      const out: PhrasingContent[] = [];
      let last = 0;

      for (const match of value.matchAll(LOOSE_LINK)) {
        const [whole, label, destination] = match;
        if (!/\s/.test(destination)) continue; // a valid link; already parsed
        const start = match.index ?? 0;
        if (start > last) {
          out.push({ type: "text", value: value.slice(last, start) });
        }
        const link: Link = {
          type: "link",
          url: destination,
          children: [{ type: "text", value: label }],
        };
        out.push(link);
        last = start + whole.length;
      }

      if (last === 0) return; // nothing converted in this text node
      if (last < value.length) {
        out.push({ type: "text", value: value.slice(last) });
      }
      (parent.children as PhrasingContent[]).splice(index, 1, ...out);
      return index + out.length; // continue after the inserted nodes
    });
  };
}
```

**Verify**: `ls lib/remark-loose-links.ts` → exists. Its behavior is checked against the real page in Step 8.

### Step 6: Docs layout, page route, home page

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

`site/app/docs/[[...slug]]/page.tsx` (the directory name is literally `[[...slug]]`):

```tsx
import { source } from "@/lib/source";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ImgHTMLAttributes } from "react";
import defaultMdxComponents, { createRelativeLink } from "fumadocs-ui/mdx";
import * as ObsidianComponents from "fumadocs-obsidian/ui";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";

type Props = { params: Promise<{ slug?: string[] }> };

/** Frontmatter is untyped beyond title/description; read extras defensively. */
function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default async function Page({ params }: Props) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();

  const { body, toc } = await (
    await page.data.load()
  ).render({
    ...defaultMdxComponents,
    ...ObsidianComponents,
    // Turns the relative file hrefs produced for wikilinks and
    // ../raw/... citations into site URLs.
    a: createRelativeLink(source, page),
    // Plain <img>: no next/image (needs width/height + optimizer), so local
    // and remote images render without build-time size probing.
    img: (props: ImgHTMLAttributes<HTMLImageElement>) => (
      <img loading="lazy" {...props} />
    ),
  });

  const fm = page.data.frontmatter as Record<string, unknown>;
  const type = asString(fm.type);
  const updated = asString(fm.updated);

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? (
        <DocsDescription>{page.data.description}</DocsDescription>
      ) : null}
      {type || updated ? (
        <p className="text-fd-muted-foreground text-sm">
          {type ? <span>{type}</span> : null}
          {type && updated ? " · " : null}
          {/* one string, not two text children: React SSR would otherwise
              insert a comment between them and break the grep in Step 8 */}
          {updated ? <span>{`updated ${updated}`}</span> : null}
        </p>
      ) : null}
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

`site/app/page.tsx` — sends `/` to the wiki index. A `<meta http-equiv="refresh">` is used instead of `redirect()` because it is guaranteed to work in a static export on any host; React 19 hoists the `<meta>` into `<head>`:

```tsx
export default function Home() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/docs/wiki" />
      <main className="flex flex-1 items-center justify-center p-8">
        <a className="underline" href="/docs/wiki">
          Open the wiki
        </a>
      </main>
    </>
  );
}
```

**Verify**: `ls app/docs/layout.tsx "app/docs/[[...slug]]/page.tsx" app/page.tsx lib/layout.shared.tsx` → all exist.

### Step 7: Static search index route, then typecheck

`site/app/api/search/route.ts` (identical to the official static example):

```ts
import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

export const revalidate = false;

export const { staticGET: GET } = createFromSource(source, {
  language: "english",
});
```

**Verify**: `bun run typecheck` → exit 0. If it fails on an import subpath, inspect `node_modules/<pkg>/package.json` → `exports` for the correct one, fix the import, re-run. If it fails on the `slugs` option or on `page.data.frontmatter`, re-read the notes in Step 4. Two failures after fixes on the same error → STOP.

### Step 8: Build the static export and check it against the real pages

**Verify**: `bun run build` → exit 0, then all of the following (from `site/`). Note: `grep -c` exits with status 1 when it prints `0`; for the checks whose expected value is `0`, the printed `0` is the pass condition, not the exit status.

- `ls out/docs/wiki.html out/docs/wiki/dotfiles-management.html out/docs/wiki/dotfiles-bare-git-repo.html` → all exist (pages from `wiki/`)
- `ls out/docs/raw/readme.html out/docs/raw/how-to-store-dotfiles-a-bare-git-repository.html` → both exist (pages from `raw/`, slugified)
- `ls -A out/docs | grep -Ex 'node_modules|plans|docs|site|\.obsidian|\.git'` → prints nothing (exit status 1 is the pass condition: no non-vault directory leaked into the page tree)
- `grep -c "Catalog of every wiki page" out/docs/wiki.html` → `1` or more
- `grep -c 'href="/docs/wiki/dotfiles-management"' out/docs/wiki/dotfiles-bare-git-repo.html` → `1` or more (wikilink `[[dotfiles-management]]` resolved to a site URL)
- `grep -c 'href="/docs/raw/how-to-store-dotfiles-a-bare-git-repository"' out/docs/wiki/dotfiles-bare-git-repo.html` → `1` or more (the space-containing citation link, repaired by Step 5 and resolved by `createRelativeLink`)
- `grep -c '\[source\](' out/docs/wiki/dotfiles-bare-git-repo.html` → `0` (no literal markdown left behind)
- `grep -c "updated 2026-08-25" out/docs/wiki/dotfiles-bare-git-repo.html` → `1` or more (frontmatter `updated` shown under the title)
- `grep -c ">source-summary<" out/docs/wiki/dotfiles-bare-git-repo.html` → `1` or more (frontmatter `type` shown)
- `grep -rl "StreakyCobra" out/api/` → at least one file (page body text is in the pre-rendered search index)
- `grep -c 'url=/docs/wiki' out/index.html` → `1` or more (home page redirects to the wiki)
- `test -z "$(ls -A ../raw/assets)" || ls out/vault/raw/assets` → passes (attachments copied into the export whenever `raw/assets` is non-empty)

If **only** the citation-link check (the `/docs/raw/how-to-store-...` href) fails: make at most one fix attempt on `lib/remark-loose-links.ts`. If it still fails, remove `remarkPlugins: [remarkLooseLinks]` from `lib/source.ts`, delete the plugin file, rebuild, write `DONE — known limitation: citation links whose destination contains spaces render as text (see Follow-ups)` in the Status cell of plan 001's row in `plans/README.md` when you finish, and continue. Do not touch `wiki/` or `raw/` to work around it.

### Step 9: Smoke-test callouts and images with a temporary page

Create **temporary** `wiki/fumadocs-smoke.md` (deleted in Step 10):

```markdown
---
title: Fumadocs Smoke Test
type: concept
updated: 2026-08-25
---

# Fumadocs Smoke Test

> [!note]
> Callout syntax check. Unique token: zebra-quokka-7731

External image (must not be fetched at build time):

![smoke](https://example.com/smoke.png)
```

Rebuild: `bun run build` → exit 0. If instead the build fails with an error mentioning `example.com/smoke.png`, "image size", or a fetch/network failure, `remarkImageOptions: false` is not taking effect (the image plugin tried to download the image) — STOP.

**Verify** (from `site/`):

- `ls out/docs/wiki/fumadocs-smoke.html` → exists
- `grep -c "zebra-quokka-7731" out/docs/wiki/fumadocs-smoke.html` → `1` or more
- `grep -c '\[!note\]' out/docs/wiki/fumadocs-smoke.html` → `0` (the callout was converted, not left as text)
- `grep -c 'src="https://example.com/smoke.png"' out/docs/wiki/fumadocs-smoke.html` → `1` (plain `<img>`, URL untouched)
- `grep -rl "zebra-quokka-7731" out/api/` → at least one file (new page is in the search index)

### Step 10: Remove the smoke page and rebuild clean

- `rm ../wiki/fumadocs-smoke.md`
- `bun run build` → exit 0
- `ls out/docs/wiki/fumadocs-smoke.html` → **does not exist**
- `cd .. && git status --porcelain wiki raw` → empty (nothing changed under `wiki/` or `raw/`)

### Step 11: Format check and commit

- From the repo root: `bunx prettier --check site` → exit 0 (run `bunx prettier --write site` first if it lists files). Do not pass `.gitignore` to Prettier — it has no parser for it and exits non-zero.
- Commit on branch `advisor/001-fumadocs-wiki-site`: `feat: add fumadocs site for wiki`.
- `git status --porcelain --untracked-files=no` → at most ` M plans/README.md` (status update). (`?? .obsidian/` shows up without the flag; it is pre-existing and expected.)

## Test plan

The repo has no test runner and the site is a thin integration over Fumadocs; no unit tests are added. Verification is the build checked against the **real** wiki pages (Step 8) plus one temporary page (Step 9), covering:

- happy path: existing wiki and raw pages render at slugified URLs
- wikilink resolution (`[[dotfiles-management]]` → `/docs/wiki/dotfiles-management`)
- citation links with spaces in the destination (`../raw/How to Store ....md` → `/docs/raw/how-to-store-...`)
- custom frontmatter (`type`, `updated`) shown under the title; Web Clipper frontmatter with extra keys does not break the build
- callouts render; external images are neither fetched at build time nor run through `next/image`
- search index contains page body text
- no leakage of non-vault directories into the page tree
- `wiki/` and `raw/` are byte-for-byte unchanged at the end

## Done criteria

Machine-checkable. ALL must hold (from `site/` unless noted):

- [ ] `bun run typecheck` exits 0
- [ ] `bun run build` exits 0 and `out/docs/wiki.html` exists
- [ ] `ls out/docs` shows no `node_modules`, `plans`, `docs`, `site`, `.obsidian` entries
- [ ] `grep -c 'href="/docs/raw/how-to-store-dotfiles-a-bare-git-repository"' out/docs/wiki/dotfiles-bare-git-repo.html` ≥ 1 (or the known-limitation note from Step 8 is recorded in the status row)
- [ ] `grep -rl "StreakyCobra" out/api/` prints at least one file
- [ ] `test ! -e ../wiki/fumadocs-smoke.md` (smoke page removed)
- [ ] `cd .. && git status --porcelain wiki raw CLAUDE.md log.md package.json bun.lock` → empty
- [ ] `cd .. && bunx prettier --check site` exits 0
- [ ] `cd .. && git check-ignore site/out site/.next site/public/vault site/next-env.d.ts` → prints all four paths
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows `CLAUDE.md` changed the frontmatter conventions or the `wiki/`/`raw/` layout, or the excerpts of `wiki/dotfiles-bare-git-repo.md` / the raw clipping no longer match (the verification greps depend on them).
- `bun install` cannot resolve `fumadocs-obsidian@1.0.3` with `fumadocs-core@16.15.1` / `fumadocs-ui@16.15.1` / `next@16.3.2` — report the exact resolver error; do not force-install or change majors.
- After the source is configured, `out/docs` or the sidebar contains `node_modules`, `.git`, `.obsidian`, `plans`, `docs` or `site` — the `include` filter is not being honored; do not "fix" by moving the vault.
- The build fails with `invalid frontmatter in "<path>"` — report the path and message; do not edit the page and do not add a custom schema.
- `page.data.load()` / `.render()` / `page.data.frontmatter` do not exist on the page object (API moved since 1.0.3) — report `Object.keys(page.data)` rather than guessing.
- The build attempts network access for images (Step 9).
- Typecheck or build fails twice after a fix attempt on the same error.
- Fixing anything appears to require editing `wiki/` (other than the smoke file), `raw/`, `CLAUDE.md`, or the root `package.json`.

## Maintenance notes

- **New wiki pages need no site changes.** Any `.md` added to `wiki/` or `raw/` appears on the next build. The dev server uses a one-time snapshot (`staticSource`), so restart `bun run dev` after ingesting. If live reload becomes important, switch `lib/source.ts` to `dynamicLoader(vault.dynamicSource())` plus the `@fumadocs/local-content` dev watcher per the official guide; that is a deliberate follow-up, not part of this plan.
- **Citation links with spaces** work only because of `lib/remark-loose-links.ts`. The durable fix is a workflow convention in `CLAUDE.md` — write citations as `([source](<../raw/File With Spaces.md>))` (angle brackets) or `%20`-encode the destination; both parse as real links in CommonMark and in Obsidian. Recorded as a follow-up in `plans/README.md`. If that convention is adopted, the plugin becomes dead code that can be removed.
- **Frontmatter is validated by `fumadocs-obsidian`'s default loose schema.** A page whose `title` is not a scalar, or whose `description`/`icon` is not a string, fails the build with `invalid frontmatter in "<path>"`. The message names the file; the fix belongs in the wiki workflow, not the site.
- **Slugs** come from `slugify()` in `lib/source.ts` (github-slugger, hyphens collapsed). Two files whose names differ only by case/punctuation would collide and fail the build with `Duplicated slugs`; the message names the slug.
- **Sidebar order** is alphabetical within `wiki/` and `raw/`. Fumadocs can read `meta.json` files from the vault for custom ordering/titles — but `wiki/` is LLM-owned per `CLAUDE.md`, so adding `wiki/meta.json` should be a conscious workflow decision recorded in `CLAUDE.md`, not a silent addition. Grouping the sidebar by frontmatter `type` would need a page-tree transformer in `loader()`; deferred.
- **Images** render as plain `<img>` with no size probing, so pages may shift as images load and there is no zoom. If that matters later, re-enable `remarkImageOptions` with `{ external: false, onError: "hide" }` and remove the `img` override — and expect `next/image` sizing rules to apply.
- **Include globs**: `raw/**/*.md` deliberately excludes `.json`/`.yaml` data files at the top of `raw/` (they would be validated as Fumadocs meta files). `raw/assets/**/*` is unfiltered, so a `.json` placed under `raw/assets/` WOULD be validated and could fail the build — keep `raw/assets/` to images and binaries. Non-markdown sources elsewhere in `raw/` are simply not pages.
- **Reviewer focus**: `lib/source.ts` (`include` globs, `slugs`, `remarkImageOptions: false`), `lib/remark-loose-links.ts` (regex scope), `app/docs/[[...slug]]/page.tsx` (`a` and `img` overrides), and the `.gitignore` additions (no `out/`, `.next/`, `public/vault/`, `next-env.d.ts` committed).
- **Deferred**: deployment (GitHub Pages / Vercel / Cloudflare Pages all serve the `out/` export), live reload, `llms.txt` route, OG images, `type`-based sidebar grouping. Next 16 may print a "multiple lockfiles" workspace-root warning because both the repo root and `site/` have a `bun.lock`; it is harmless for a static export and can be silenced later with `turbopack.root` in `next.config.mjs` if desired.
