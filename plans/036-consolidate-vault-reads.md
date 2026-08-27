# Plan 036: One owner for the vault-content format (stop three parallel readers)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- site/lib/source.tsx site/lib/toc.ts "site/app/config/[tool]/page.tsx" site/app/page.tsx`
> The file `site/lib/source.tsx` was renamed from `site/lib/source.ts` by plan
> 019 (commit `094fc01`), so expect that rename to appear in the diff against
> `c0ee11c` — it is **not** drift and not a blocker. If any of the four files'
> **contents** differ from the "Current state" excerpts below (beyond that
> rename), compare against the live code before proceeding; on a real mismatch,
> treat it as a STOP condition.

## At a glance

- **What**: Consolidate the three independent vault-content readers (the loader, `toc.ts`, and the config page) onto the one designed loader pipeline.
- **Why**: The frontmatter/index/slug contract is re-derived in three places, so a change to the loader's slug rule or the ingest skill's index format can silently break the home page or config page with nothing to catch it.
- **Next action**: Step 1 — Confirm whether the loader already passes `tool:` through

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/024-verification-baseline.md (needs `bun test` + a green `bun run verify`)
- **Category**: tech-debt
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

The vault-content format — the `type:`/`tool:`/`updated:` frontmatter contract,
the `wiki/index.md` summary-line format, and the loader's URL/slug rule — is
currently enforced in **three** places that each re-derive it independently.
The Fumadocs loader in `site/lib/source.tsx` is the designed pipeline, but
`site/lib/toc.ts` re-reads `wiki/index.md` with a bespoke regex, and
`site/app/config/[tool]/page.tsx` walks all of `wiki/` on every request with
its own frontmatter regexes while *still* borrowing the loader's `slugify` to
build URLs. A change to the loader's slug rule or to the ingest skill's
`index.md` format silently breaks the home page's summaries or the config
page's doc links, and nothing type-checks or tests the coupling. Collapsing to
one owner makes the format single-sourced and the two consumers cheap and
correct.

## Current state

The three readers and how they diverge:

- `site/lib/source.tsx` — the Fumadocs `dynamicLoader` (the designed content
  pipeline). It already exposes raw frontmatter to callers via
  `page.data.frontmatter` (see the next bullet — `toc.ts` reads it). The loader
  is created at lines 143–177 and surfaced by `getSource()` at line 180:

  ```ts
  // site/lib/source.tsx:143
  const loader = dynamicLoader(vault.dynamicSource(), {
    baseUrl: "/docs",
    slugs: (_file, next) => next().map((seg) => slugify(decodeURI(seg))),
    plugins: [titleFromHeading],
    pageTree: { transformers: [ /* … */ ] },
  });
  // …
  export function getSource() { return loader.get(); }
  export type Source = Awaited<ReturnType<typeof getSource>>;
  ```

- `site/lib/toc.ts` — `readIndexSummaries()` (lines 32–47) uses `readFileSync`
  and a bespoke regex for the `wiki/index.md` line format documented only in
  `CLAUDE.md`. `buildToc()` (lines 50–92) then iterates
  `source.getPages()` and reads frontmatter **through the loader** as
  `page.data.frontmatter`:

  ```ts
  // site/lib/toc.ts:41
  const entry = /^- \[\[([^\]|#]+)(?:[|#][^\]]*)?\]\] — (.+)$/;
  // …
  // site/lib/toc.ts:57
  for (const page of source.getPages()) {
    const fm = page.data.frontmatter as Record<string, unknown>;   // ← frontmatter IS available here
    const slug = path.basename(page.path, ".md");
    const entry: TocEntry = {
      title: page.data.title,
      url: page.url,
      summary: page.data.description ?? summaries.get(slug),
      updated: asString(fm.updated),                                // ← reads an "unknown" field fine
    };
    // …
  }
  ```

  **This is the key fact for Step 1**: `page.data.frontmatter` already carries
  arbitrary frontmatter fields (`updated` is read here and it is not a typed
  field), so the loader is *not* stripping unknown keys in practice. Verify this
  holds for `tool:` before assuming a schema change is needed.

- `site/app/config/[tool]/page.tsx` — `docsForTool()` (lines 22–39) is the
  third reader. It `force-dynamic`s the route (line 10) and re-reads every
  `wiki/*.md` file on each request, re-implementing frontmatter parsing, then
  reuses the loader's `slugify` to build the href — depending on the loader's
  slug rule while refusing its data:

  ```ts
  // site/app/config/[tool]/page.tsx:17
  /**
   * Wiki pages carrying `tool: <name>` frontmatter (ADR 0003: ingest adds the
   * field, no site-side mapping). Read directly rather than through the
   * Fumadocs loader: the loader strips unknown frontmatter fields.
   */
  async function docsForTool(tool: string): Promise<DocLink[]> {
    const wikiDir = path.join(repoRoot, "wiki");
    const docs: DocLink[] = [];
    for (const name of await fs.readdir(wikiDir)) {
      if (!name.endsWith(".md")) continue;
      const text = await fs.readFile(path.join(wikiDir, name), "utf8");
      const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1];
      if (!fm) continue;
      const toolField = fm.match(/^tool:\s*(\S+)\s*$/m)?.[1];
      if (toolField !== tool) continue;
      const title = fm.match(/^title:\s*(.+)$/m)?.[1] ?? name;
      docs.push({ title: title.trim(), href: `/docs/wiki/${slugify(name.replace(/\.md$/, ""))}` });
    }
    return docs;
  }
  ```

  The comment at line 20 ("the loader strips unknown frontmatter fields") is the
  stated reason for the duplication — but `toc.ts:64` reading `fm.updated`
  through the loader is direct evidence it does **not** strip them. Confirm
  which is true (Step 1) before choosing the path.

Repo conventions to honor:

- `CLAUDE.md` fixes the `wiki/index.md` line format as `- [[slug]] — summary`
  (ingest step) and the wiki page `type:` frontmatter values
  (`synthesis | concept | entity | source-summary | answer`). Do not change
  these formats — this plan centralizes *how the site reads* them, not the
  format itself.
- ADR `docs/adr/0003` records that ingest adds the `tool:` field and there is
  "no site-side mapping" — i.e. the site is expected to read `tool:` straight
  from frontmatter. Keep that property.
- The loader's URL for a wiki page is `/docs/wiki/<slugify(basename)>`
  (`baseUrl: "/docs"` + the `slugs` rule at `source.tsx:148`). The config page's
  hrefs must keep matching page URLs exactly.

## Commands you will need

| Purpose   | Command                              | Expected on success                 |
| --------- | ------------------------------------ | ----------------------------------- |
| Typecheck | `cd site && bun run typecheck`       | exit 0, no errors (writes `.next`)  |
| Unit test | `cd site && bun test`                | all pass                            |
| Build     | `cd site && bun run build`           | exit 0; static/render succeeds      |
| Full gate | `bun run verify` (repo root)         | exit 0 (added by plan 024)          |

## Scope

**In scope** (the only files you should modify):

- `site/lib/source.tsx` — the single vault-format owner; add the summary reader
  and/or a typed frontmatter passthrough here.
- `site/lib/toc.ts` — consume the centralized summary reader instead of its own.
- `site/app/config/[tool]/page.tsx` — replace `docsForTool`'s manual walk with
  a `getSource().getPages()` filter on `page.data.frontmatter.tool`.
- New: a colocated test if you add a pure parser (e.g. `site/lib/source.test.ts`
  or extend an existing test file) — see Test plan.

**Out of scope** (do NOT touch, even though they look related):

- `wiki/index.md` and any `wiki/*.md` frontmatter — the *format* is owned by the
  ingest workflow in `CLAUDE.md`; this plan changes readers, not content.
- The sidebar/page-tree transformers in `source.tsx` (lines 150–177) — unrelated
  to content reads; plan 019 owns that area.
- `site/app/page.tsx`'s JSX — it consumes `buildToc()`'s output shape; keep that
  shape (`TocGroup[]`) unchanged so the page needs no edit.

## Git workflow

- Branch: `advisor/036-consolidate-vault-reads`
- Commit per logical unit; message style: lowercase prefix, e.g.
  `site: single-source the vault frontmatter reads`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm whether the loader already passes `tool:` through

Add a temporary probe (a throwaway script or a `console.log` in a dev render) —
or simply reason from `toc.ts:64` — to determine whether
`page.data.frontmatter.tool` is populated for a wiki page that has `tool:` in
its frontmatter.

- If **yes** (most likely, given `toc.ts` reads `fm.updated` the same way):
  proceed to Step 2A. No schema change is needed.
- If **no**: proceed to Step 2B (add a frontmatter passthrough), and heed the
  STOP condition about the loose-frontmatter build.

**Verify**: you can state, with evidence, which branch applies. Remove any
throwaway probe before continuing (`git status` shows only in-scope files).

### Step 2A: Serve `docsForTool` from the loader (passthrough already works)

Rewrite `docsForTool(tool)` in `site/app/config/[tool]/page.tsx` to iterate
`(await getSource()).getPages()`, keep only pages whose
`page.path.startsWith("wiki/")` and whose
`page.data.frontmatter.tool === tool`, and build `DocLink` from
`page.data.title` and `page.url` (the loader's own URL — drop the hand-rolled
`/docs/wiki/${slugify(...)}` construction and the `slugify` import if now
unused). Remove the now-dead `fs`/`path` walk and the frontmatter regexes.
Update the comment at line 17–21 to state the loader now supplies `tool:`.

**Verify**: `cd site && bun run typecheck` → exit 0. Then
`cd site && bun run build` → exit 0.

### Step 2B: Add a frontmatter passthrough to the loader (only if Step 1 said "no")

In `site/lib/source.tsx`, configure the loader / `obsidian(...)` source so
`tool:` and `updated:` survive into `page.data.frontmatter` (Fumadocs supports a
`frontmatter`/schema option on the source). Keep the schema **loose** — do not
introduce a strict zod schema that rejects unknown or malformed frontmatter
(see STOP conditions). Then do Step 2A.

**Verify**: `cd site && bun run build` → exit 0, and a config page still lists
its docs (Step 4 checks the links).

### Step 3: Centralize the `index.md` summary reader in `source.tsx`

Move `readIndexSummaries()` out of `site/lib/toc.ts` into `site/lib/source.tsx`
as the single vault-format owner (export it from there), and have `toc.ts`
import it. If it is cheap, make it `async` for consistency with the loader API;
if that ripples into `app/page.tsx`, keep it sync to avoid touching the
out-of-scope JSX — either is acceptable as long as `TocGroup[]` output is
unchanged. Keep the exact regex `/^- \[\[([^\]|#]+)(?:[|#][^\]]*)?\]\] — (.+)$/`
and the em-dash separator — the format is fixed by `CLAUDE.md`.

**Verify**: `cd site && bun run typecheck` → exit 0.

### Step 4: Confirm behavior is unchanged

Build and confirm the home TOC still shows grouped pages with their summaries,
and a config page (e.g. `/config/tmux`) still renders its "Docs" links pointing
at valid `/docs/wiki/...` URLs.

**Verify**: `cd site && bun run build` → exit 0. Grep the build output or load
the pages in `bun run start` and confirm: the home page shows non-empty
summaries under at least one group, and `/config/tmux`'s doc links resolve to
the same URLs the loader assigns those pages (open one; it must not 404).

## Test plan

- Add a unit test for the centralized summary reader (the one pure, parser-like
  piece): `site/lib/source.test.ts` (or extend the nearest existing
  `bun:test` file — model structure after `site/lib/artifact-feedback.test.ts`).
  Cover: a well-formed `- [[slug]] — summary` line parses to `{slug: summary}`;
  a line with a `|alias` or `#heading` inside the wikilink still keys on the
  base slug; a non-matching line is ignored; missing file yields an empty map.
- If you added Step 2B's passthrough, no new test is required for it beyond the
  build succeeding, but confirm `docsForTool`'s filter is exercised by loading a
  config page in Step 4.
- Verification: `cd site && bun test` → all pass, including the new summary
  tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd site && bun run typecheck` exits 0
- [ ] `cd site && bun test` exits 0; new summary-reader tests exist and pass
- [ ] `cd site && bun run build` exits 0
- [ ] `grep -n "readFile" "site/app/config/[tool]/page.tsx"` returns nothing —
      the manual `wiki/` walk is gone (the route reads via `getSource()`)
- [ ] `readIndexSummaries` is defined in `site/lib/source.tsx` and imported by
      `site/lib/toc.ts` (`grep -n "readIndexSummaries" site/lib/toc.ts` shows an
      import, not a definition)
- [ ] `site/app/page.tsx` is unmodified (`git status` — its `TocGroup[]` shape
      is preserved)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (beyond the `source.ts`→`source.tsx` rename already noted).
- Step 2B is required **and** adding a Fumadocs frontmatter schema cannot pass
  `tool:`/`updated:` through without switching to a strict schema that fails the
  build on the wiki's loosely-structured, LLM-written frontmatter. The repo has
  already rejected zod frontmatter for exactly this reason (see
  `plans/README.md` "Findings considered and rejected" → "Extending
  `fumadocs-obsidian`'s frontmatter schema with zod"). In that case, do **not**
  force a schema — keep a small dedicated parser but relocate it into
  `site/lib/source.tsx` as the single owner, wire both consumers to it, and
  report that the loader passthrough was not viable.
- A step's verification fails twice after a reasonable fix attempt.
- Removing `slugify` from the config page changes any doc-link URL (the loader's
  `page.url` must equal the old `/docs/wiki/${slugify(name)}` — if it differs,
  the loader's slug rule and the hand-rolled one have diverged; report it).

## Maintenance notes

For the human/agent who owns this after the change lands:

- The vault-format contract now lives in `site/lib/source.tsx`. Any future
  change to the `wiki/index.md` line format (owned by `CLAUDE.md`'s ingest step)
  or to wiki `tool:`/`type:` frontmatter should be reflected here, in one place.
- A reviewer should scrutinize that the config page's doc links still resolve to
  real pages (the loader's `page.url`), and that no strict frontmatter schema
  crept in that could fail the build on a future oddly-shaped wiki page.
- Deferred: `site/app/config/[tool]/page.tsx` keeps `force-dynamic` — the
  render-mode question is owned by plan 035, not this plan.
