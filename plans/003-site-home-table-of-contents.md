# Plan 003: Make the site's home page a generated table of contents, replacing the `Index` page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**, from the repo root:
> `git diff --stat 2c95536..HEAD -- site/app/page.tsx site/lib/source.ts site/lib/layout.shared.tsx site/README.md site/package.json wiki/index.md CLAUDE.md`
> If any of those files changed since this plan was written, compare the
> "Current state" excerpts against the live files before proceeding. Any
> differing line in an excerpt is a STOP condition. New `- [[slug]] — ...`
> lines in `wiki/index.md` are NOT drift (the wiki grows by design).

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (site-only; no file under `wiki/` or `raw/` changes)
- **Depends on**: none (plan 001 is already DONE and merged)
- **Category**: direction
- **Planned at**: commit `2c95536`, 2026-08-25

## Why this matters

The static site under `site/` currently has no real home page: `/` is a
`<meta http-equiv="refresh">` redirect to `/docs/wiki`, which renders the
hand-maintained catalog `wiki/index.md` (page title "Index"). The owner wants
the site to open on a **table of contents**: every page on the site, grouped,
with the one-line summaries — and wants that to **replace the Index page**.

After this plan lands:

- `/` renders a table of contents generated at build time from the site's own
  page list (`source.getPages()`), grouped by the wiki's page types
  (synthesis, concept, entity, source-summary, answer) plus a "Sources"
  section for `raw/`. Every entry links to its page. Wiki entries show the
  one-line summary written in `wiki/index.md`.
- `wiki/index.md` is no longer published as a site page: `/docs/wiki` and the
  "Index" sidebar entry disappear. The file itself is untouched — the wiki
  workflow in `CLAUDE.md` still requires it, and this plan reads it for the
  summaries.

**Decision (already made, do not re-litigate):** the summaries come from
`wiki/index.md`, not from a new frontmatter field. `CLAUDE.md` mandates that
`index.md` is updated on every ingest with a one-line summary per page, so it
is the maintained source of summaries; adding a `description:` frontmatter
convention would duplicate that work.

## Current state

All facts below were verified at commit `2c95536` on 2026-08-25. The site
builds cleanly at this commit (`cd site && bun run build` → 16 static pages,
12 of them under `/docs/`).

### Files

- `site/app/page.tsx` — the home page; today a redirect stub. **Rewritten by this plan.**
- `site/lib/source.ts` — builds the Fumadocs content source from the vault; owns the `include` globs. **Edited by this plan** (exclude `wiki/index.md`).
- `site/lib/layout.shared.tsx` — nav options shared by layouts. **Unchanged** (read for context; the nav title already links to `/`).
- `site/lib/toc.ts` — **created by this plan**: reads summaries from `wiki/index.md` and groups pages.
- `site/README.md` — site usage notes. **One line added.**
- `wiki/index.md` — the catalog page. **Read only. Never edit it** (`CLAUDE.md`: the LLM owns `wiki/`; the executor of this plan is working on the site, not the wiki).
- `site/app/docs/[[...slug]]/page.tsx` — renders each doc page. **Unchanged**; shown below only as the style exemplar.

### Excerpts

`site/app/page.tsx` (entire file, 12 lines):

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

`site/lib/source.ts` lines 10–25 (the `include` array is what you will edit):

```ts
export const vault = obsidian({
  dir: vaultDir,
  // Only the knowledge base. Never node_modules/, .obsidian/, plans/, docs/,
  // site/. Only *.md (not *.json/*.yaml — those are validated as meta files)
  // plus everything under raw/assets (served as media).
  include: ["wiki/**/*.md", "raw/**/*.md", "raw/assets/**/*"],
  // Media files are copied to public/vault by scripts/sync-assets.mjs, so a
  // vault path like raw/assets/x.png is served at /vault/raw/assets/x.png.
  url: (vaultPath) => `/vault/${vaultPath}`,
```

`site/lib/source.ts` lines 32–38 (the loader; `source` is what the TOC reads):

```ts
export const source = loader(await vault.staticSource(), {
  baseUrl: "/docs",
  // Default slugs are encodeURI(path segment), which keeps spaces as %20.
  // Make every URL segment lowercase-kebab instead. Links between pages are
  // resolved by file path, not slug, so this cannot break them.
  slugs: (_file, next) => next().map((seg) => slugify(decodeURI(seg))),
});
```

`site/lib/layout.shared.tsx` (entire file):

```tsx
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: "Second Brain" },
  };
}
```

`wiki/index.md` lines 1–14 (frontmatter + heading; the entry format is fixed):

```markdown
---
title: Index
updated: 2026-08-25
---

# Index

Catalog of every wiki page. Updated on every ingest.

## Syntheses

_(none yet)_

## Concepts
```

Every wiki entry in `wiki/index.md` is one line of exactly this shape
(em dash `—`, U+2014, surrounded by single spaces):

```markdown
- [[dotfiles-management]] — techniques for version-controlling dotfiles across machines; bare-repo method, secrets handling, comparison vs Stow/chezmoi.
```

Verify with: `grep -c '^- \[\[[^]]*\]\] — ' wiki/index.md` → `7` at this commit
(one per wiki page other than `index.md` itself). A section with no pages
holds the literal line `_(none yet)_`.

`CLAUDE.md` page-type vocabulary (the TOC's group order and labels):

```
type: concept # one of: source-summary | entity | concept | synthesis | answer
```

Wiki frontmatter at this commit: every page under `wiki/` except `index.md`
has `title:`, `type:`, `updated:`; none has `description:`. `raw/` files have
either Web Clipper frontmatter (`title`, `source`, ...), a minimal one
(`source_url`, `fetched`, no `title` — title falls back to the filename), or
none (`raw/README.md`).

### Library facts (verified against the installed packages in `site/node_modules`)

- `source.getPages()` (`fumadocs-core@16.15.1`) returns `Page[]`. Each page
  has `path` (vault-relative file path, e.g. `wiki/dotfiles-management.md`),
  `url` (e.g. `/docs/wiki/dotfiles-management`), `slugs: string[]`, and
  `data` (`ObsidianPage`: `title: string`, `description?: string`,
  `frontmatter: Record<string, unknown>`, `content: string`).
- `fumadocs-obsidian@1.0.3` passes `include` straight to `tinyglobby`'s
  `glob(include, { cwd, onlyFiles: true })`. `tinyglobby` treats a pattern
  starting with `!` as an ignore pattern (`processPatterns` in
  `site/node_modules/tinyglobby/dist/index.mjs`). So
  `include: ["wiki/**/*.md", "!wiki/index.md", ...]` excludes that one file.
- `fumadocs-ui@16.15.1` exports `HomeLayout` from `fumadocs-ui/layouts/home`.
  `HomeLayoutProps extends BaseLayoutProps, ComponentProps<'main'>`, so
  `<HomeLayout {...baseOptions()}>…</HomeLayout>` type-checks. It renders the
  same top nav (title "Second Brain", search, theme toggle) as the docs
  layout, without the sidebar.
- Static export: `next.config.mjs` has `output: "export"`. `/` is emitted as
  `site/out/index.html`; `/docs/wiki` is emitted as `site/out/docs/wiki.html`.

### Conventions to match

- TypeScript strict, Prettier (`.prettierrc`: 2 spaces, double quotes, semi,
  printWidth 80, trailingComma es5). The pre-commit hook runs Prettier on
  staged files.
- Frontmatter extras are untyped; read them defensively. Exemplar:
  `site/app/docs/[[...slug]]/page.tsx` lines 16–19:

  ```tsx
  /** Frontmatter is untyped beyond title/description; read extras defensively. */
  function asString(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
  ```

- Styling uses Tailwind utility classes with Fumadocs' `fd-*` color tokens
  (e.g. `text-fd-muted-foreground`), as in the same file lines 47–56.
- Imports use the `@/` alias (`tsconfig.json` `paths`).

## Commands you will need

Run all from `site/` (`cd site`).

| Purpose   | Command                         | Expected on success                                   |
| --------- | ------------------------------- | ----------------------------------------------------- |
| Install   | `bun install`                   | exit 0 (already installed; harmless to re-run)        |
| Typecheck | `bun run typecheck`             | exit 0, no errors                                     |
| Build     | `bun run build`                 | exit 0, ends with the route table                     |
| Format    | `bunx prettier --check app lib` | exit 0 ("All matched files use Prettier code style!") |

There is no test runner in `site/`; verification is typecheck + build +
`grep` on the exported HTML.

## Scope

**In scope** (the only files you should modify or create):

- `site/app/page.tsx` (rewrite)
- `site/lib/toc.ts` (create)
- `site/lib/source.ts` (one-line edit to `include`)
- `site/README.md` (one line)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch, even though they look related):

- `wiki/index.md` and anything under `wiki/` or `raw/` — owned by the wiki
  workflow, immutable for this plan. The TOC _reads_ `wiki/index.md`.
- `CLAUDE.md`, `log.md` — wiki workflow files; no site change belongs there.
- `site/app/docs/**`, `site/app/layout.tsx`, `site/components/**`,
  `site/lib/layout.shared.tsx`, `site/lib/remark-loose-links.ts` — not needed.
- `site/package.json` dependencies — no new packages are needed.

## Git workflow

- Branch: `advisor/003-site-home-toc`
- One commit per step or one for the whole plan; message style matches
  `git log` (`feat: add fumadocs site for wiki`), e.g.
  `feat(site): home page table of contents replaces index page`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Exclude `wiki/index.md` from the site

In `site/lib/source.ts`, change the `include` line to:

```ts
  include: ["wiki/**/*.md", "!wiki/index.md", "raw/**/*.md", "raw/assets/**/*"],
```

and add one comment line above it:

```ts
// wiki/index.md is not a page: the home page (app/page.tsx) replaces it
// and reads its summaries via lib/toc.ts.
```

**Verify**: `bun run build` → exit 0 and the route table no longer lists
`/docs/wiki` as a path; then `test ! -e out/docs/wiki.html && echo ok` → `ok`.
Also `grep -o 'href="/docs/wiki/[^"]*"' out/docs/wiki/dotfiles-management.html | sort -u | wc -l`
→ `7` (the other wiki pages still appear in the sidebar).

### Step 2: Create `site/lib/toc.ts`

Create the file with these exports. Write it in full; the shapes below are
load-bearing.

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { source } from "@/lib/source";

/** Group order and labels follow the page types listed in CLAUDE.md. */
export const WIKI_GROUPS: { type: string; label: string }[] = [
  { type: "synthesis", label: "Syntheses" },
  { type: "concept", label: "Concepts" },
  { type: "entity", label: "Entities" },
  { type: "source-summary", label: "Source summaries" },
  { type: "answer", label: "Answers" },
];

export type TocEntry = {
  title: string;
  url: string;
  summary?: string;
  updated?: string;
};

export type TocGroup = { label: string; entries: TocEntry[] };

/** Frontmatter is untyped beyond title/description; read extras defensively. */
function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * One-line summaries from wiki/index.md, keyed by wikilink slug.
 * Entry format (fixed by CLAUDE.md's ingest step): `- [[slug]] — summary`.
 */
export function readIndexSummaries(): Map<string, string> {
  const file = path.resolve(process.cwd(), "..", "wiki", "index.md");
  const summaries = new Map<string, string>();
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return summaries; // no index.md: entries simply have no summary
  }
  const entry = /^- \[\[([^\]|#]+)(?:[|#][^\]]*)?\]\] — (.+)$/;
  for (const line of text.split("\n")) {
    const m = entry.exec(line);
    if (m) summaries.set(m[1].trim(), m[2].trim());
  }
  return summaries;
}

/** Build the grouped table of contents from the site's own page list. */
export function buildToc(): TocGroup[] {
  const summaries = readIndexSummaries();
  const groups = new Map<string, TocEntry[]>();
  const wikiOther: TocEntry[] = [];
  const sources: TocEntry[] = [];

  for (const page of source.getPages()) {
    const fm = page.data.frontmatter as Record<string, unknown>;
    const slug = path.basename(page.path, ".md");
    const entry: TocEntry = {
      title: page.data.title,
      url: page.url,
      summary: page.data.description ?? summaries.get(slug),
      updated: asString(fm.updated),
    };
    if (page.path.startsWith("raw/")) {
      sources.push(entry);
      continue;
    }
    const type = asString(fm.type);
    if (type && WIKI_GROUPS.some((g) => g.type === type)) {
      const list = groups.get(type) ?? [];
      list.push(entry);
      groups.set(type, list);
    } else {
      wikiOther.push(entry);
    }
  }

  const byTitle = (a: TocEntry, b: TocEntry) => a.title.localeCompare(b.title);
  const result: TocGroup[] = WIKI_GROUPS.map((g) => ({
    label: g.label,
    entries: (groups.get(g.type) ?? []).sort(byTitle),
  }));
  if (wikiOther.length) {
    result.push({
      label: "Other wiki pages",
      entries: wikiOther.sort(byTitle),
    });
  }
  result.push({ label: "Sources", entries: sources.sort(byTitle) });
  return result;
}
```

Notes for the executor:

- `page.path` is the vault-relative path (`wiki/foo.md`, `raw/Bar.md`). If
  your first build shows every page landing in "Other wiki pages" or
  "Sources" being empty, log `source.getPages().map((p) => p.path)` once and
  check the prefix — see STOP conditions.
- The regex tolerates `[[slug|alias]]` and `[[slug#heading]]` forms; the
  summary key is always the bare slug, which equals the wiki filename without
  `.md`.
- Empty groups (e.g. "Syntheses", "Entities" today) are kept so the page
  mirrors `CLAUDE.md`'s type list; the page renders them as "(none yet)".

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Rewrite `site/app/page.tsx`

Replace the whole file with a server component that renders the TOC inside
`HomeLayout`. Target shape:

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
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="mb-2 text-3xl font-semibold">Table of contents</h1>
        <p className="text-fd-muted-foreground mb-8">
          Every page on this site, grouped by type.
        </p>
        {groups.map((group) => (
          <section key={group.label} className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">{group.label}</h2>
            {group.entries.length === 0 ? (
              <p className="text-fd-muted-foreground text-sm">(none yet)</p>
            ) : (
              <ul className="space-y-2">
                {group.entries.map((entry) => (
                  <li key={entry.url}>
                    <Link href={entry.url} className="font-medium underline">
                      {entry.title}
                    </Link>
                    {entry.summary ? (
                      <span className="text-fd-muted-foreground">
                        {` — ${entry.summary}`}
                      </span>
                    ) : null}
                    {entry.updated ? (
                      <span className="text-fd-muted-foreground text-xs">
                        {` (updated ${entry.updated})`}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
    </HomeLayout>
  );
}
```

There must be no `<meta httpEquiv="refresh">` left in the file.

**Verify**: `bun run typecheck` → exit 0. Then `bunx prettier --check app lib`
→ exit 0 (run `bunx prettier --write app lib` first if it fails, then re-check).

### Step 4: Build and inspect the export

Run `bun run build`.

**Verify**, all from `site/`:

- `grep -c 'http-equiv="refresh"' out/index.html` → `0`
- `grep -o 'href="/docs/[^"]*"' out/index.html | sort -u | wc -l` → `11`
  (7 wiki pages + 4 raw files at this commit; if the wiki has grown since,
  the number equals `find ../wiki ../raw -name '*.md' | wc -l` minus 1 for
  `index.md`)
- `grep -c 'Source summaries' out/index.html` → at least `1`
- `grep -o 'techniques for version-controlling dotfiles[^<]*' out/index.html | head -1`
  → prints the `dotfiles-management` summary line from `wiki/index.md`
  (proves the summaries are wired)
- `grep -c 'href="/docs/wiki"' out/index.html` → `0` (no link to the removed page)
- `test ! -e out/docs/wiki.html && echo ok` → `ok`

### Step 5: Update `site/README.md`

Add one bullet after the existing list:

```markdown
- The home page (`/`) is a generated table of contents (`lib/toc.ts`): every page grouped by frontmatter `type`, with the one-line summaries read from `../wiki/index.md`. `wiki/index.md` itself is not published as a page.
```

**Verify**: `grep -c 'table of contents' README.md` → `1`.

## Test plan

No test runner exists in `site/` and adding one is out of scope. Verification
is the build plus `grep` gates in Step 4. Manual check (optional): `bun run start`
and open http://localhost:3000 — the page lists all groups; each link opens
its doc page with the sidebar; the nav title returns to `/`.

## Done criteria

Machine-checkable. ALL must hold (run from `site/`):

- [ ] `bun run typecheck` exits 0
- [ ] `bun run build` exits 0
- [ ] `bunx prettier --check app lib` exits 0
- [ ] `grep -c 'http-equiv="refresh"' out/index.html` prints `0`
- [ ] `test ! -e out/docs/wiki.html` succeeds
- [ ] `grep -o 'href="/docs/[^"]*"' out/index.html | sort -u | wc -l` equals the number of `*.md` files under `../wiki` and `../raw` minus 1
- [ ] `grep -c 'techniques for version-controlling dotfiles' out/index.html` is at least `1`
- [ ] `git status --short` (repo root) shows only the in-scope files
- [ ] `git diff --stat -- wiki raw CLAUDE.md log.md` is empty
- [ ] `plans/README.md` status row for 003 updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt does not match the live file.
- After Step 1 the build still emits `out/docs/wiki.html` — the `!` negation
  is not being honored (tinyglobby version changed). Report; do not work
  around it by filtering in the page tree.
- `page.path` values from `source.getPages()` do not start with `wiki/` or
  `raw/` (e.g. they are absolute or slugified). Report the observed values.
- `HomeLayout` fails to type-check with `{...baseOptions()}` — the
  `fumadocs-ui` version in `site/package.json` differs from `16.15.1`.
- The Step 4 summary grep finds nothing although `wiki/index.md` contains the
  line — the entry format in `index.md` has changed; report, do not change
  `index.md`.
- A verification fails twice after a reasonable fix attempt.
- You find yourself editing any file under `wiki/` or `raw/`.

## Maintenance notes

- The TOC depends on the `- [[slug]] — summary` line format in
  `wiki/index.md`. If `CLAUDE.md`'s ingest step changes that format, update
  the regex in `site/lib/toc.ts` (`readIndexSummaries`). A page with no
  matching line renders without a summary — it never breaks the build.
- If a new page `type` is added to `CLAUDE.md`, add it to `WIKI_GROUPS` in
  `site/lib/toc.ts`; until then such pages land under "Other wiki pages".
- Reviewer focus: `site/lib/source.ts` `include` (only `wiki/index.md` is
  excluded), no edits outside `site/` and `plans/`, no redirect left in
  `site/app/page.tsx`.
- Deferred: showing summaries for `raw/` files (nothing maintains them);
  a `Home` link in the docs sidebar (the nav title already links to `/`).
