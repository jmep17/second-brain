# Plan 035: Declare dynamic rendering on fs-reading pages; correct site/README

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- site/app/artifacts/page.tsx site/app/page.tsx "site/app/artifacts/review/[...file]/page.tsx" site/app/config/[tool]/page.tsx site/next.config.mjs site/README.md site/package.json`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## At a glance

- **What**: Declare the three fs-reading pages dynamic and rewrite `site/README.md` to match the real `next build`/`next start` serve model.
- **Why**: Under the real serve model those pages are baked at build time, so a new artifact silently doesn't show up until a rebuild, and the README still describes a dropped static export and a renamed file.
- **Next action**: Step 1 — Declare the three pages dynamic

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW (declaring dynamic only removes caching that isn't wanted; the
  README change is doc-only)
- **Depends on**: none (the README "Verify" section is richer once
  `plans/024-verification-baseline.md` adds `bun test`, but this plan does not
  require it)
- **Category**: bug (build-time staleness) + docs
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

Four pages read the filesystem at render time, but only one declares itself
dynamic. Under `next build` + `next start` (the real serve model — `output:
"export"` was dropped), Next has no signal that the other three are dynamic, so
the artifacts index, the home table of contents, and the review page are baked
at build time. The first person to run the production server hits "my new
artifact doesn't show up until I rebuild." The dev workflow hides this entirely,
which is why it will surface at the worst time. Meanwhile `site/README.md` — the
only setup doc for the only runnable app in the repo — still describes a static
`out/` export that no longer exists and points at a file (`lib/source.ts`) that
was renamed. Anyone (human or agent) following it is wrong about what
`bun run build` produces and misses that `/config` needs a real `chezmoi`
binary and that the server is deliberately localhost-only.

## Current state

- `site/app/config/[tool]/page.tsx:10` — the **only**
  `export const dynamic = "force-dynamic"` in the app.
- `site/app/artifacts/page.tsx:12-13` — `export default async function ArtifactsPage()`
  calls `await listArtifacts()` (which does `fs.readdir` in
  `site/lib/artifacts.ts`). No `dynamic`/`revalidate` export.
- `site/app/page.tsx:12-13` — `export default async function Home()` calls
  `await buildToc()` (which does `readFileSync` via `site/lib/toc.ts`). No
  `dynamic`/`revalidate` export.
- `site/app/artifacts/review/[...file]/page.tsx:22-26` — awaits `fs.access(abs)`
  at render time. No `dynamic`/`revalidate` export.
- `site/next.config.mjs:3-5` — records that `output: "export"` was dropped
  because the config editor needs request-driven route handlers.
- `site/package.json:5-10` — scripts are `sync-assets`, `dev`
  (`… next dev -H 127.0.0.1`), `build` (`… next build`), `start`
  (`next start -H 127.0.0.1`), `test:artifact-review`, `typecheck`
  (`next typegen && tsc --noEmit`). There is **no** `out/` export and dev/start
  bind `127.0.0.1`.
- `site/README.md` current text (the wrong parts):
  - `:4` — "…and builds a static site into `out/`."
  - `:8` — "`bun run build` — static export to `out/`"
  - `:9` — "`bun run start` — serve the export locally"
  - `:18` — "injected by a page-tree `root` transformer in `lib/source.ts`" —
    the file is now `site/lib/source.tsx` (renamed by plan 019).
  - Documents 4 scripts; `package.json` has 6 (`typecheck`,
    `test:artifact-review` undocumented). Nothing states `/config` shells out to
    `chezmoi` or that the server is localhost-only (docs/adr/0003).

Convention: existing `dynamic` export is written exactly as
`export const dynamic = "force-dynamic";` (`config/[tool]/page.tsx:10`) — match
that spelling.

## Commands you will need

| Purpose   | Command                        | Expected on success |
|-----------|--------------------------------|---------------------|
| Typecheck | `cd site && bun run typecheck` | exit 0, no errors   |
| Build     | `cd site && bun run build`     | build completes, exit 0 |
| Confirm dynamic | `cd site && bun run build 2>&1 \| grep -iE "route \(app\)\|ƒ \|dynamic"` | the four fs-reading routes are marked dynamic (ƒ), not static (○) |

`bun run typecheck` writes into `.next/` and `tsconfig.tsbuildinfo` — accept it.

## Scope

**In scope** (the only files you should modify):
- `site/app/artifacts/page.tsx`
- `site/app/page.tsx`
- `site/app/artifacts/review/[...file]/page.tsx`
- `site/README.md`

**Out of scope** (do NOT touch, even though they look related):
- `site/app/config/[tool]/page.tsx` — already declares `dynamic`; leave it.
- The route handlers under `site/app/api/**` and
  `site/app/artifacts/view/[...file]/route.ts` — route handlers are dynamic by
  default; this plan is about **pages**.
- `site/lib/artifacts.ts` / `site/lib/toc.ts` — their fs behaviour is fine; only
  the pages need the render-mode hint.
- Any other README in the repo (`plans/021` owns the install runbook,
  `plans/038` owns the other stale docs).

## Git workflow

- Branch: `advisor/035-dynamic-render-readme`
- Commit style matches `git log`, e.g.
  `site: render fs-reading pages dynamically; fix README build model`.
- Do NOT push or open a PR.

## Steps

### Step 1: Declare the three pages dynamic

Add, at the top level of each of the three in-scope page files (after the
imports, matching the spelling in `config/[tool]/page.tsx:10`):

```ts
export const dynamic = "force-dynamic";
```

Files: `site/app/artifacts/page.tsx`, `site/app/page.tsx`,
`site/app/artifacts/review/[...file]/page.tsx`.

**Verify**: `grep -rn 'export const dynamic = "force-dynamic"' site/app` →
exactly 4 matches (the three added + the pre-existing config page).

### Step 2: Confirm the build marks them dynamic

**Verify**: `cd site && bun run build` → exit 0. In the route table Next prints,
`/`, `/artifacts`, and `/artifacts/review/[...file]` are listed as dynamic
(`ƒ`), not static (`○`). If the build errors, this is a STOP condition — capture
the Next 16 message.

### Step 3: Rewrite `site/README.md`

Correct these, keeping the file's terse bullet style:
- Line ~4: drop "builds a static site into `out/`"; describe it as a Next.js
  app served by a Node server (dev/start bind `127.0.0.1`).
- The script bullets: make them match `site/package.json` — `bun install`;
  `bun run dev` (localhost preview, sync-assets + fumadocs-obsidian watcher);
  `bun run build` (Next build, **not** a static `out/` export); `bun run start`
  (`next start -H 127.0.0.1`). Add `bun run typecheck` and
  `bun run test:artifact-review` as the verification commands.
- Line ~18: `lib/source.ts` → `lib/source.tsx`.
- Add a two-line **Prerequisites** note: `/config/*` shells out to a real
  `chezmoi` binary (must be installed), and the server is deliberately
  localhost-only and unauthenticated per `docs/adr/0003`.
- Add a short **Verify** section: `bun run typecheck`; `bun test` (once
  `plans/024` adds the `test` script — note this dependency inline); and the
  E2E's prerequisites — `bunx playwright install chromium` and the required
  `ARTIFACTS_SITE_URL` env var for `bun run test:artifact-review`.

Do not invent behaviour — every claim must be checkable against
`package.json`, `next.config.mjs`, or an ADR.

**Verify**: `grep -c "out/" site/README.md` → 0;
`grep -c "lib/source.ts\b" site/README.md` → 0;
`grep -c "chezmoi" site/README.md` → ≥1.

## Test plan

- No unit tests. The verification is the build route-table (Step 2) plus the
  three README greps (Step 3). Record the route-table lines for `/` and
  `/artifacts` in your completion note as evidence they render dynamically.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn 'export const dynamic = "force-dynamic"' site/app` → 4 matches
- [ ] `cd site && bun run build` exits 0 and marks `/`, `/artifacts`,
      `/artifacts/review/[...file]` as dynamic
- [ ] `cd site && bun run typecheck` exits 0
- [ ] `grep -c "out/" site/README.md` → 0 and `grep -c "lib/source.ts\b" site/README.md` → 0
- [ ] `site/README.md` mentions chezmoi and localhost-only
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `bun run build` errors after adding `export const dynamic` (capture the exact
  Next 16 message — the fix may differ across Next versions).
- The build route table does not distinguish static/dynamic in this Next
  version (report what it prints instead so the done-criterion can be adjusted).
- The excerpts in "Current state" don't match the live files (drift since
  `c0ee11c`) — in particular if `site/lib/source.ts` exists again (plan 019 may
  have been reverted).

## Maintenance notes

- **Plan 021** (install runbook) and **plan 038** (docs truth-up) are adjacent
  doc work. This plan owns `site/README.md` specifically; 038 owns
  `CONTEXT.md`, `log.md`, `artifacts/README.md`, and the wiki plugin page. Keep
  them from overlapping.
- A reviewer should check that no page that must be prerendered was made dynamic
  by mistake, and that the README's Verify section does not claim `bun test`
  works before plan 024 lands (it should say "once the test runner is wired").
- Deferred: if the site is ever deployed to a host that wants ISR/caching, the
  blanket `force-dynamic` should be revisited per page (some, like `/`, could
  use `revalidate` instead). Out of scope now — the goal is correctness under
  `next start`, not cache tuning.
