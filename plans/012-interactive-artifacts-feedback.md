# Plan 012: Artifacts become interactive — the site serves them, and a feedback/RFC widget files into the issue tracker

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat f17627f..HEAD -- site plugins/DESIGN.md plugins/diagrams/skills/diagram-plans/MERMAID.md .scratch/artifact-feedback`
> Plan 011 must be DONE (`plugins/DESIGN.md` exists) — verify its status row.
> `MERMAID.md` should differ from `f17627f` only by 011's pointer line (and
> possibly plugin plans 004–007 if they ran — compare the template region
> against the excerpts here; mismatch beyond the token block = STOP).
> `site/` drift beyond plans 001–008's recorded state: STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (new API endpoint that writes repo files; template surgery in a shared file)
- **Depends on**: plans/011 (DESIGN.md exists; its §9 placeholder is what this plan fills)
- **Category**: dx / direction
- **Planned at**: commit `f17627f`, 2026-08-26

## Why this matters

The owner's directive: artifacts must be interactive — the reader submits
feedback and RFCs from the artifact itself. Today an artifact is a static
`file://` page; reactions travel by telling the agent in chat, and nothing
is captured. This plan closes the loop with machinery the repo already has:
the `site/` Next.js app (request-driven route handlers since config-system
ticket 07) serves the artifact pages, and a feedback widget on every page
POSTs to a route that files a markdown issue in the existing local issue
tracker (`.scratch/`, `Status: needs-triage`) — the same tracker the
triage-labels vocabulary and the mattpocock skills already speak. Feedback
becomes a file the owner triages and an agent can pick up next session.

## Current state

At `f17627f` + plan 011. All excerpts verified 2026-08-26.

### The site

- `site/` is Next.js 16 + Fumadocs, **not** a static export
  (`site/next.config.mjs`: "static export dropped per the runtime decision
  in .scratch/config-system/issues/03-ui-runtime.md — the config editor
  needs request-driven route handlers"). Dev: `bun run dev` (add
  `-p <port>`; binds `127.0.0.1`). Gates: `bun run typecheck`
  (`next typegen && tsc --noEmit`), `bun run build`, `bunx prettier --check`.
- Existing API routes: `site/app/api/search/route.ts`,
  `site/app/api/config/{file,git,drift}/route.ts`.
- **Write exemplar** — `site/app/api/config/file/route.ts` (PUT): parses
  JSON body defensively (400 on malformed), validates field types (400),
  path-allow-lists via `resolveSource` (403), writes with
  `fs.mkdir(path.dirname(abs), { recursive: true })` + `fs.writeFile`.
  Match this shape.
- **Path allow-list exemplar** — `site/lib/config-files.ts`:

  ```ts
  export const repoRoot = path.resolve(process.cwd(), "..");
  export const dotfilesDir = path.join(repoRoot, "dotfiles");
  export function resolveSource(rel: string): string {
    const abs = path.resolve(dotfilesDir, rel);
    if (abs !== dotfilesDir && !abs.startsWith(dotfilesDir + path.sep)) {
      throw new Error(`path escapes dotfiles/: ${rel}`);
    }
    return abs;
  }
  ```

- **Sidebar injection exemplar** — `site/lib/source.ts` appends a synthetic
  folder in a page-tree `root` transformer (plan 006; `defaultOpen: true`
  is REQUIRED — a collapsed folder renders no children at all):

  ```ts
  function configFolder(): PageTree.Folder {
    return {
      type: "folder", name: "Config", $id: "config", defaultOpen: true,
      children: Object.entries(TOOLS).map(([tool, { label }]) => ({
        type: "page" as const, name: label,
        url: `/config/${tool}`, $id: `config/${tool}`,
      })),
    };
  }
  // …pageTree.transformers[0].root(node) => { ...node, children: [...node.children, configFolder()] }
  ```

- The vault `include` list in `source.ts` already contains
  `".scratch/**/*.md"` — feedback issues filed by this plan will therefore
  **automatically appear on the site** under Scratch. That is a feature;
  no work needed, but know it when testing.
- Every page shares `docsLayoutProps()` from `site/lib/layout.shared.tsx`
  (plan 006). New pages wrap in `DocsLayout` with it.
- Client-component exemplar: `site/components/commit-box.tsx` (`"use
  client"`, `fetch` + `useState`, `buttonVariants` from
  `fumadocs-ui/components/ui/button`, `ObsidianCallout` for alerts).

### The tracker (docs/agents/issue-tracker.md + triage-labels.md)

- Issues are markdown files: one feature per directory
  `.scratch/<feature-slug>/`, tickets at
  `.scratch/<feature-slug>/issues/<NN>-<slug>.md` numbered from `01`,
  triage state as a `Status:` line near the top, conversation under a
  `## Comments` heading. Canonical labels include `needs-triage`.

### The artifact pages

- Template: `plugins/diagrams/skills/diagram-plans/MERMAID.md` lines
  32–331 — standalone HTML, tokens `--geist-bg/fg`, `--accents-1/2/3/5`,
  `--text-warning/info`, `--radius`; `<main>` ends with
  `<section class="notes" id="notes">…</section>` followed by
  `</main>`, then the zoombar div and the `<script type="module">`.
  Owned by plugin plans 004–007; this plan inserts ONE delimited block
  (Step 4) and nothing else.
- Existing artifact:
  `artifacts/diagrams/2026-08-26-claude-diagrams-into-second-brain.html`
  (an instance of the template; not edited by this plan — old artifacts
  simply lack the widget).
- `plugins/DESIGN.md` §9 (from plan 011) is a one-sentence placeholder
  reserving the feedback affordance for this plan to define.

## Commands you will need

| Purpose        | Command                                              | Expected on success       |
| -------------- | ---------------------------------------------------- | ------------------------- |
| Typecheck      | `cd site && bun run typecheck`                       | exit 0                    |
| Build          | `cd site && bun run build`                           | exit 0                    |
| Format check   | `cd site && bunx prettier --check app lib components`| exit 0                    |
| Dev server     | `cd site && bun run dev -- -p <FREE_PORT>`           | Ready line                |
| Free-port test | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:<FREE_PORT>/` | `000` BEFORE starting dev (port truly free — a stale server silently validates a no-op; lesson from plan 006's execution) |

## Scope

**In scope**:

- `site/lib/artifacts.ts` (create)
- `site/app/artifacts/page.tsx` (create — index)
- `site/app/artifacts/view/[...file]/route.ts` (create — serves pages)
- `site/app/api/artifacts/feedback/route.ts` (create — files issues)
- `site/lib/source.ts` (add `artifactsFolder()` beside `configFolder()`, append in the same `root` transformer)
- `plugins/DESIGN.md` (replace §9 placeholder with the widget contract + snippet)
- `plugins/diagrams/skills/diagram-plans/MERMAID.md` (ONE delimited widget block in the template — Step 4)
- `plugins/diagrams/plans/README.md` (reconciliation paragraph)
- `plugins/diagrams/.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` (version bump, minor)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- `site/app/api/config/**`, `site/components/config-editor.tsx`,
  `commit-box.tsx` — the config editor is a separate feature.
- Existing files under `artifacts/` — old pages stay widget-less.
- `hooks/` (010/011 own them), `SKILL.md`, everything else in `MERMAID.md`.
- Auth for the feedback API — the server already runs unauthenticated,
  localhost-only, as the owner (ADR 0003 consequence: "binds `127.0.0.1`
  only"). Do not invent an auth layer.

## Git workflow

- Branch: `advisor/012-interactive-artifacts`
- Message style: `site: <imperative>` for site files, `diagrams: <imperative>` for plugin files.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: `site/lib/artifacts.ts`

Model on `config-files.ts`. Exports:

- `artifactsDir = path.join(repoRoot, "artifacts")` (import `repoRoot` from
  `@/lib/config-files`).
- `resolveArtifact(rel: string): string` — resolve under `artifactsDir`,
  reject escapes (same guard shape as `resolveSource`), and additionally
  reject anything not ending `.html`.
- `listArtifacts(): Promise<Record<string, { file: string; name: string }[]>>`
  — read one directory level (`artifacts/<type>/*.html`), newest first by
  filename (the `YYYY-MM-DD-` prefix sorts), `name` = filename without
  date-prefix/extension, kebab→spaced.
- `feedbackDir = path.join(repoRoot, ".scratch", "artifact-feedback", "issues")`
  and `nextIssueNumber(): Promise<string>` — scan `feedbackDir` for
  `NN-*.md`, return zero-padded max+1 (`"01"` when empty/absent).

**Verify**: `cd site && bun run typecheck` → exit 0.

### Step 2: Serve and list artifacts

- `site/app/artifacts/view/[...file]/route.ts` — `GET`: join the segments,
  `resolveArtifact` (404 JSON on rejection), read the file, return
  `new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })`.
  The artifact page keeps its own chrome — no docs layout here.
- `site/app/artifacts/page.tsx` — server component wrapped in `DocsLayout`
  with `await docsLayoutProps()` (import from `@/lib/layout.shared`; follow
  `site/app/page.tsx`'s wrapping shape). Body: one section per type from
  `listArtifacts()`, each artifact a link to
  `/artifacts/view/<type>/<file>`, styled with the same Fumadocs classes
  the home TOC uses (match `page.tsx`, do not hand-roll CSS).
- `site/lib/source.ts` — add `artifactsFolder(): PageTree.Folder` beside
  `configFolder()` (same shape, `name: "Artifacts"`, `$id: "artifacts"`,
  `defaultOpen: true`, single page child `{ name: "Browse artifacts", url:
  "/artifacts", $id: "artifacts/index" }`) and append it in the existing
  `root` transformer after `configFolder()`.

**Verify** (dev server on a verified-free port):

- `curl -s http://127.0.0.1:<P>/artifacts/view/diagrams/2026-08-26-claude-diagrams-into-second-brain.html | grep -c "<title>"` → `1`
- `curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:<P>/artifacts/view/../CLAUDE.md"` → `404` (curl normalizes the traversal; ALSO probe with `--path-as-is` → `404`)
- `curl -s http://127.0.0.1:<P>/artifacts | grep -c "fd-sidebar"` → ≥ 1
- Sidebar shows `Artifacts` on `/` too: `curl -s http://127.0.0.1:<P>/ | grep -c "Artifacts"` → ≥ 1

### Step 3: The feedback API

`site/app/api/artifacts/feedback/route.ts` — `POST` only. Body:
`{ artifact: string, kind: "feedback" | "rfc", title: string, body: string }`.
Mirror the config route's defensive shape: 400 malformed JSON, 400 wrong
types/empty title or body/unknown kind, 403 when `artifact` fails
`resolveArtifact` (it must name a real, existing artifact file — 404 if
absent). Then write
`.scratch/artifact-feedback/issues/<NN>-<slug>.md` (slug from the title,
kebab, ≤ 60 chars; `mkdir recursive` first):

```markdown
# <title>

Status: needs-triage
Kind: <feedback|rfc>
Artifact: <repo-relative artifact path>
Date: <YYYY-MM-DD>

<body>

## Comments
```

Return `{ filed: ".scratch/artifact-feedback/issues/<NN>-<slug>.md" }`.
Concurrent-write collisions on NN are acceptable at this scale (single
owner, localhost) — note that in a code comment rather than adding locking.

**Verify** (dev server running):

```bash
curl -s -X POST http://127.0.0.1:<P>/api/artifacts/feedback \
  -H 'Content-Type: application/json' \
  -d '{"artifact":"diagrams/2026-08-26-claude-diagrams-into-second-brain.html","kind":"rfc","title":"Smoke test","body":"Widget loop works."}'
# → {"filed":".scratch/artifact-feedback/issues/01-smoke-test.md"}
cat ../.scratch/artifact-feedback/issues/01-smoke-test.md   # matches the format above
curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:<P>/api/artifacts/feedback -d 'nope'  # → 400
curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:<P>/api/artifacts/feedback \
  -H 'Content-Type: application/json' -d '{"artifact":"../../CLAUDE.md","kind":"rfc","title":"x","body":"y"}'  # → 403
```

Delete the smoke-test issue file afterwards
(`rm ../.scratch/artifact-feedback/issues/01-smoke-test.md`) — it is test
residue, not content; say so in your report.

### Step 4: The widget — DESIGN.md contract + template block

**4a — `plugins/DESIGN.md` §9** replaces the placeholder with the normative
contract: every artifact page ends `<main>` with a delimited feedback
section; fields `kind` (`feedback`/`rfc`), `title`, `body`; the page carries
its repo-relative path in `data-artifact` on that section; behaviour —
served over http(s): POST to `/api/artifacts/feedback` (same origin) and
show the returned `filed` path inline; opened from `file://`: the submit
button is replaced by "copy as issue", which puts the exact tracker-format
markdown (the Step 3 block) on the clipboard for the reader to hand to an
agent or paste into `.scratch/` themselves. All controls styled from the
existing tokens (mono labels, `--accents-2` borders, radius 6–8px, AA text)
— include the full snippet (HTML + ~30-line script + the small CSS) in §9
verbatim, marked between `<!-- feedback-widget:start -->` and
`<!-- feedback-widget:end -->`.

**4b — `MERMAID.md`**: insert that exact snippet into the template between
the closing `</section>` of the notes region and `</main>`, with the
`data-artifact` attribute templated as
`artifacts/diagrams/YYYY-MM-DD-<kebab-slug>.html` (same placeholder style
the template already uses). Touch nothing else. Append a reconciliation
paragraph to `plugins/diagrams/plans/README.md`: "Plan 012 (root `plans/`)
inserted the feedback-widget block into the template on <date>; plans
006/007 executors must preserve the delimited block."

**4c** — bump both manifests (minor, read current value first).

**Verify**:

- `git diff plugins/diagrams/skills/diagram-plans/MERMAID.md` — additions
  only between the two delimiter comments (plus the README paragraph);
- generate a scratch page from the updated template (fill TOPIC + a
  two-node diagram), open over the dev server via `/artifacts/view/…` after
  copying it into `artifacts/diagrams/`, POST through the widget manually
  in a browser OR replay its fetch with curl — a new issue file appears;
  open the same file via `file://` — the submit control reads "copy as
  issue". Delete the scratch page + issue afterwards.
- `cd plugins/diagrams && bash tools/check-version-sync.sh` → in sync;
  `bun run test` → passes.

### Step 5: Full gates

`cd site && bun run typecheck && bun run build && bunx prettier --check app lib components`
→ all exit 0. Build page count grows by 1 (`/artifacts`; the view route and
API are handlers, not pages).

## Test plan

- Step 2/3 curl probes are the regression suite for serving + filing
  (happy path, traversal ×2, malformed body, bad kind→400 — add one:
  `"kind":"praise"` → 400).
- Step 4's dual-mode widget test (http POST fires; file:// degrades to
  copy) is the interactivity acceptance test.
- Existing-behaviour guard: `/`, a docs page, and `/config/tmux` still
  render with sidebar (`grep -c fd-sidebar` ≥ 1 each) — the transformer
  edit is the only shared-surface change.

## Done criteria

ALL must hold:

- [ ] `bun run typecheck`, `bun run build`, prettier check — all exit 0
- [ ] `/artifacts` renders in the docs chrome; `Artifacts` appears in the sidebar on `/`
- [ ] `/artifacts/view/...` serves the existing diagram artifact; both traversal probes → 404/403
- [ ] Feedback POST files a correctly-formatted `needs-triage` issue; 400/403 paths verified; smoke residue deleted
- [ ] `plugins/DESIGN.md` §9 carries the full widget contract + delimited snippet
- [ ] Template block present in `MERMAID.md` between delimiters; nothing else changed there; plugin README reconciliation paragraph added
- [ ] Manifests bumped and in sync; `bun run test` (plugin) passes
- [ ] `git status --porcelain` shows only in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 011 is not DONE (no `plugins/DESIGN.md` §9 to fill).
- A route handler at `app/artifacts/view/[...file]/route.ts` conflicts with
  the page at `app/artifacts/page.tsx` in this Next version (route-group
  the page as a fix attempt; if that also fails, STOP).
- The `root` transformer edit changes the page tree anywhere except the
  appended folder (compare sidebars before/after).
- The widget cannot POST same-origin from a served artifact page (CSP or
  fetch failure in the served context) — report the exact console error;
  do not add CORS headers speculatively.
- You need to edit anything in `MERMAID.md` outside the delimited block.

## Maintenance notes

- Plan 013's two new templates must embed the §9 snippet verbatim — DESIGN.md
  is now the single source for the widget; fix it there, then re-sync
  templates.
- Feedback issues render on the site automatically (vault includes
  `.scratch/**/*.md`) — triage happens by editing the `Status:` line, per
  `docs/agents/triage-labels.md`. A future plan may surface
  `needs-triage` counts on `/artifacts`.
- Reviewers should scrutinize: the traversal guards (both probes), that the
  POST body validation rejects unknown `kind`, and that old artifacts still
  serve unmodified.
- Deferred: opener preferring the site URL when the dev server is up
  (`diagram-open` stays file-based — pages work identically in both, only
  submission differs); feedback threading (the `## Comments` heading exists
  for it); site auth (localhost-only by ADR). An offline
  submission queue was considered and REJECTED by owner decision
  (2026-08-26): copy-as-issue is the accepted `file://` degradation — do
  not build queueing.
