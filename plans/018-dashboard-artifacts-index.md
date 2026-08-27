# Plan 018: Dashboard artifacts index

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- site/lib/artifacts.ts site/app/artifacts/page.tsx plugins/DESIGN.md plugins/plans/skills/plan-pages/TEMPLATE.md plugins/decisions/skills/decision-pages/TEMPLATE.md plugins/diagrams/skills/diagram-plans/MERMAID.md`
> If any in-scope file changed since `c0ee11c`, re-read it and compare
> against "Current state" below. On a mismatch, STOP and report instead of
> adapting silently.

## At a glance

- **What**: Add a machine-readable meta block to artifact templates and render real cards (title, date, type, status) on `/artifacts`.
- **Why**: `/artifacts` gives no re-entry signal today — a reader can't tell what an artifact is, when it was made, or whether it's still open, approved, or stale.
- **Next action**: Step 1 — Define and document the meta block contract

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MEDIUM (touches every artifact template plus all already-generated artifact files' inferred metadata; a bad fallback silently mis-labels old artifacts)
- **Depends on**: plans/009 (artifacts/ layout), plans/011–013 (DESIGN.md, serving, plan/decision types), all DONE. Plan 014 (four more templates, still TODO) is NOT a prerequisite but its future templates must add the meta block this plan introduces — see `plans/README.md`'s dependency notes, which this plan extends.
- **Category**: direction / dx (ADHD re-entry)
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

`artifacts/decisions/2026-08-27-artifacts-workflow-direction.html` (Option
2) found that `/artifacts` gives no re-entry signal: it is a bare link list
with the date-prefix visually stripped out of the label. A reader scanning
it cannot tell what an artifact *is* (plan vs. decision vs. diagram is
implied only by which `<h2>` section it sits under), when it was made, or
whether it is still open, approved, or stale. The owner approved this
option in
`.scratch/artifact-feedback/issues/04-approve-geist-review-chrome-dashboard-artifacts-index-open-q.md`.

## Current state

### The index has no metadata to render

`site/lib/artifacts.ts:29-63` builds the index entirely from the
filesystem: `listArtifacts()` reads `artifacts/<type>/*.html`, and
`nameFromFilename()` (`:30-35`) derives a title by stripping the
`YYYY-MM-DD-` prefix from the filename and title-casing the remaining
slug — the date itself is discarded, not surfaced. There is no read of the
HTML content at all, so no `status` (proposed/approved/done), no real
title distinct from the slug, and no per-artifact freshness signal.

`site/app/artifacts/page.tsx:12-46` renders exactly what `listArtifacts()`
gives it: an `<h2>` per type directory, a plain `<ul>` of underlined links
under each.

### No artifact carries machine-readable metadata today

Checked directly (not just via the decision artifact's claim): every
existing artifact under `artifacts/*/*.html` and all three plugin
templates (`plugins/plans/skills/plan-pages/TEMPLATE.md`,
`plugins/decisions/skills/decision-pages/TEMPLATE.md`,
`plugins/diagrams/skills/diagram-plans/MERMAID.md`) render only a
human-readable kicker line — e.g. `<div class="kicker">Plan · YYYY-MM-DD ·
ordered steps</div><h1>TOPIC</h1>` (`plan-pages/TEMPLATE.md:237-238`),
`<span>Decision · YYYY-MM-DD ·</span><span class="decision-status">proposed</span>`
(`decision-pages/TEMPLATE.md:249-253`, also the live pattern in
`artifacts/decisions/2026-08-27-artifacts-workflow-direction.html:244-247`),
`<div class="kicker">Plan · YYYY-MM-DD · flowchart</div>` for diagrams
(`MERMAID.md:168`). None of this is machine-parseable without an HTML
parser reading rendered text, and status only exists at all on the
decisions template (`proposed`/other free text in a `<span
class="decision-status">`) — plans and diagrams have no status concept in
their markup whatsoever. `plugins/DESIGN.md` currently has no section
defining a metadata contract (its 9 sections run Tokens → Color →
Typography → Materials → Grid → Page contract → "artifact IS the
response" → Feedback affordance → Conforming instance; the decision
artifact's citation of "DESIGN.md §8" for this was imprecise — §8 is the
Feedback affordance, unrelated. This plan adds a new §10.)

### Reviews directory has the same shape

`artifacts/reviews/*.html` (plan-010/011/012 execution reviews) are hand-
authored, predate any plugin template, and also carry only a kicker/h1
pattern — they are in scope for the fallback-inference path (Step 3), not
for retrofitting the meta block (out of scope, see below).

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Typecheck | `cd site && bun run typecheck` | exit 0 |
| Unit tests | `cd site && bun test lib/artifacts.test.ts` | all tests pass |
| Build | `cd site && bun run build` | exit 0; `/artifacts` route unchanged in path, new markup |
| Format | `bunx prettier --check <touched files>` | exit 0 |
| Plugin gate | `bash tools/check-plugins.sh` | all checks passed |
| Manual check | `cd site && bunx next dev -H 127.0.0.1 -p 4317`, open `/artifacts` | cards render title/date/type/status for every existing artifact, including ones with no meta block |

## Scope

**In scope**:

- `plugins/DESIGN.md` — new `## 10. Metadata block` section (renumber
  "Conforming instance" from §9 to §11, or insert before it and leave §9 in
  place, whichever keeps the smaller diff — insert-before is smaller since
  §9's own text does not depend on being last; use insert-before and do NOT
  renumber §9's cross-references elsewhere, since `plans/README.md` already
  notes DESIGN.md sections are cited **by name**, not number, since plan
  011, precisely to avoid this class of churn).
- `plugins/plans/skills/plan-pages/TEMPLATE.md`,
  `plugins/decisions/skills/decision-pages/TEMPLATE.md`,
  `plugins/diagrams/skills/diagram-plans/MERMAID.md` — add the meta block
  to each template's `<head>`.
- `site/lib/artifacts.ts` — parse the meta block when present; fall back to
  filename-derived name/date and `status: "unknown"` when absent.
- `site/lib/artifacts.test.ts` (create) — unit coverage for the parser and
  fallback.
- `site/app/artifacts/page.tsx` — render cards instead of a bare link list.
- Existing artifact files that predate this plan: **do not edit them.**
  They exercise the fallback path (Step 3) instead — see "Out of scope."

**Out of scope**:

- Retrofitting the meta block into already-generated `artifacts/*/*.html`
  files. `plans/README.md`'s plan-004 precedent ("a site-side loader plugin
  reading the first `# ` heading is zero-touch" — rejected editing
  generated docs to add frontmatter) applies here too: generated artifacts
  are re-rendered by their producing skill, not hand-patched. The fallback
  path (Step 3) is what makes old artifacts still show correctly.
- Plan 014's four new plugin types (boards, reviews, questionnaires,
  reports) — still TODO. This plan's meta-block contract is written so
  that when 014 lands, its templates only need to add the same block (per
  `plans/README.md`'s existing note that 014 "remains TODO and independent
  ... its future templates add `data-review-*` annotations" — this plan
  adds one more thing 014's templates must include: the meta block).
- `site/app/artifacts/review/[...file]/page.tsx` and the reviewer
  component (plan 017's scope) — untouched here except that plan 017's
  Geist tokens, if landed first, should be reused for card styling (see
  Step 4); if plan 017 has not landed, style cards with the existing
  Fumadocs `fd-*` classes already used elsewhere on `/artifacts` and
  revisit once 017 lands.
- Search/filter/sort UI on the index — cards render in the existing
  per-type, newest-first grouping; no new interaction surface.
- A build-time or CI validation step that fails on a missing meta block —
  the fallback path is the accepted degradation, not an error.

## Git workflow

- Branch: `advisor/018-dashboard-artifacts-index`
- Commits by logical layer: `plugins: add machine-readable meta block to
  artifact templates` and `site: render artifact cards with title, date,
  type, status`.
- Do NOT push or open a PR.

## Steps

### Step 1: Define and document the meta block contract

Add to `plugins/DESIGN.md`, before "## 9. Conforming instance":

```markdown
## Metadata block

Every artifact page's `<head>` carries one machine-readable `<meta>` tag
so the site index can render real cards without parsing rendered HTML:

```html
<meta name="artifact:meta" content='{"title":"TOPIC","type":"plan","date":"YYYY-MM-DD","status":"proposed"}'>
```

- `title` — the page's own `<h1>` text, kept in sync by hand (templates
  set both from the same `TOPIC` placeholder).
- `type` — one of `plan`, `decision`, `diagram`, `review` today; a new
  plugin type (plan 014) adds its own value here, not a new attribute.
- `date` — `YYYY-MM-DD`, matches the filename's date prefix.
- `status` — free text; plans use `todo`/`doing`/`done`/`blocked`
  (matching the status chips already in `plan-pages/TEMPLATE.md`),
  decisions use `proposed`/`approved`/`rejected` (matching
  `decision-status`), diagrams and reviews use `draft`/`final`.

Pages without this tag (legacy artifacts, hand-authored files) are not
broken — the site index falls back to the filename date and a title-cased
slug, and shows no status badge. Adding the tag is required for all NEW
templates from this point forward; it is optional, not retrofitted, on
existing generated files.
```

**Verify**: `grep -n "^## Metadata block\|^## 9. Conforming instance" plugins/DESIGN.md` shows Metadata block immediately before Conforming instance, and `grep -c "^## " plugins/DESIGN.md` increased by exactly 1 over the pre-change count.

### Step 2: Add the meta tag to all three templates

In each of `plugins/plans/skills/plan-pages/TEMPLATE.md`,
`plugins/decisions/skills/decision-pages/TEMPLATE.md`,
`plugins/diagrams/skills/diagram-plans/MERMAID.md`: add the `<meta
name="artifact:meta" ...>` tag inside `<head>`, right after `<title>TOPIC</title>`,
with `content` reading the same `TOPIC`/date/status placeholders the
kicker and `<h1>` already use in that template (so a single find-replace
of `TOPIC` and the date/status placeholder fills in both the visible
kicker and the meta tag consistently — do not introduce a second set of
placeholder names). For `plan-pages/TEMPLATE.md`, `status` should default
to `todo` (matching its status-chip vocabulary at `:249-265`); for
`decision-pages/TEMPLATE.md`, default to `proposed` (matching
`decision-pages/TEMPLATE.md:251`); for `MERMAID.md`, default to `draft`.

**Verify**: `grep -n 'artifact:meta' plugins/*/skills/*/TEMPLATE.md plugins/diagrams/skills/diagram-plans/MERMAID.md` shows exactly one match per file, each syntactically valid JSON inside the `content` attribute (spot-check by hand — no build step parses templates).

### Step 3: Parse the meta block on the site, with a fallback

In `site/lib/artifacts.ts`, extend the `{ file, name }` record type to `{
file, name, date, type, status }` and change `listArtifacts()` to read
each file's contents (it already does a directory read; add one
`fs.readFile` per file — acceptable cost at this repo's scale, matching
`nextIssueNumber()`'s existing pattern of trading a bit of I/O for
correctness over caching) and extract the meta tag with a narrow regex
(not a full HTML parser — this repo has no HTML-parsing dependency yet and
one `<meta>` tag does not justify adding one):

```ts
const META_RE = /<meta\s+name="artifact:meta"\s+content='([^']*)'/;

interface ArtifactMeta {
  title: string;
  type: string;
  date: string;
  status: string;
}

function parseMeta(html: string, file: string, dirType: string): ArtifactMeta {
  const match = META_RE.exec(html);
  if (match) {
    try {
      const parsed = JSON.parse(match[1].replace(/&quot;/g, '"'));
      if (
        typeof parsed.title === "string" &&
        typeof parsed.type === "string" &&
        typeof parsed.date === "string" &&
        typeof parsed.status === "string"
      ) {
        return parsed;
      }
    } catch {
      // fall through to filename-derived metadata
    }
  }
  const dateMatch = /^(\d{4}-\d{2}-\d{2})-/.exec(file);
  return {
    title: nameFromFilename(file),
    type: dirType,
    date: dateMatch ? dateMatch[1] : "",
    status: "unknown",
  };
}
```

Wire this into `listArtifacts()`'s existing per-directory loop
(`:53-61`), reading each file once. Keep `nameFromFilename()` unchanged —
it is still the fallback path's title source.

Note the HTML-escaping edge case explicitly: the `content` attribute uses
single quotes so a title containing an apostrophe or double quotes needs
no escaping in the template author's hand-written HTML, but a title
containing a literal `'` would break the regex's naive extraction — accept
this as a known limitation (templates should avoid `'` in `TOPIC`) rather
than building a full attribute-value parser for one edge case; record it
in the maintenance notes.

Create `site/lib/artifacts.test.ts` covering:

- a file with a valid meta tag → parsed fields returned verbatim,
- a file with no meta tag → filename-derived fallback, `status: "unknown"`,
- a file with a malformed meta tag (invalid JSON, missing field) →
  falls back cleanly, does not throw,
- an empty `artifacts/` directory → `{}` (existing behavior preserved).

**Verify**: `cd site && bun test lib/artifacts.test.ts` → all pass.

### Step 4: Render cards on `/artifacts`

Replace the `<ul>` link list in `site/app/artifacts/page.tsx` (`:28-39`)
with a card grid per type section: each card shows the artifact's title
(`<h3>`, links to `/artifacts/review/<type>/<file>`, matching the existing
link target), a mono date label, a type badge if useful (redundant with
the section `<h2>` — consider omitting to avoid restating it; a status
badge if `status !== "unknown"`. Use the existing Fumadocs `fd-*` classes
for card chrome (`bg-fd-card`, `border`, `rounded-lg`, `text-fd-muted-foreground`)
consistent with the rest of `/artifacts`'s current styling — do not import
plan 017's Geist tokens here unless plan 017 has already landed on `main`
(check `git log --oneline -1 -- site/components/artifact-reviewer.tsx` for
a commit referencing "Geist" before deciding; if absent, stay on `fd-*`
and leave a one-line comment noting this page should be revisited once
017 lands, so the dashboard and the reviewer chrome read as one system
rather than drifting onto two token languages).

Sort within each type: already newest-first via the existing filename
sort (`:56` `files.sort().reverse()`); no change needed since `date` in
the parsed meta should match the filename prefix by convention.

**Verify**: `bun run typecheck` passes; manual check (below) shows real
titles/dates for every artifact including ones with no meta tag (all
current ones, until plan 014 or a re-render of an existing type adds one)
falling back correctly with no crash and no "unknown" title.

### Step 5: Manual verification

```
cd site && bunx next dev -H 127.0.0.1 -p 4317
```

Open `/artifacts`. Confirm every existing artifact (all currently lack a
meta tag) renders with a real title and date via the fallback, no
"unknown"/`undefined` text, no broken links. Manually add a meta tag to a
scratch copy of one template-rendered file (do not touch
`artifacts/` itself) and confirm the card picks up the real title/status
instead of the fallback.

### Step 6: Full verification and commit

```
cd site && bun run typecheck
cd site && bun test lib/artifacts.test.ts
cd site && bun run build
bunx prettier --check site/lib/artifacts.ts site/lib/artifacts.test.ts site/app/artifacts/page.tsx plugins/DESIGN.md plugins/plans/skills/plan-pages/TEMPLATE.md plugins/decisions/skills/decision-pages/TEMPLATE.md plugins/diagrams/skills/diagram-plans/MERMAID.md
bash tools/check-plugins.sh
git diff --stat
```

Confirm the diff is exactly the in-scope files and no `artifacts/*.html`
file changed. Commit.

## Test plan

- Unit: `site/lib/artifacts.test.ts` (Step 3) — valid meta, missing meta,
  malformed meta, empty directory.
- Manual: Step 5's fallback-and-real-meta walkthrough is the acceptance
  test for the rendering path; no existing browser-test harness covers
  `/artifacts` (the Playwright script from plan 015 targets the review
  page, not the index) and adding one is out of scope for an M-effort
  presentational change.
- Build: `bun run build` must include `/artifacts` in its route output
  with no new type errors.

## Done criteria

- [ ] `plugins/DESIGN.md` has a `## Metadata block` section before
      "Conforming instance"; no existing section was renumbered
- [ ] All three templates (`plan-pages`, `decision-pages`, `MERMAID.md`)
      carry exactly one `artifact:meta` tag each, wired to the same
      placeholders as the visible kicker
- [ ] `site/lib/artifacts.ts` parses the meta tag when present and falls
      back cleanly (no throw, sane defaults) when absent or malformed
- [ ] `bun test lib/artifacts.test.ts` covers all four cases and passes
- [ ] `/artifacts` renders cards with title/date/status for every
      artifact; existing (meta-less) artifacts show correctly via fallback
- [ ] `bun run typecheck`, `bun run build`, `bunx prettier --check`,
      `bash tools/check-plugins.sh` all pass
- [ ] No file under `artifacts/**` was modified
- [ ] Scope exactly the files listed above

## STOP conditions

- The meta-tag regex needs to handle nested single quotes or arbitrary
  HTML-entity escaping to work reliably — stop and report; that means the
  narrow-regex approach was wrong and the fix needs an actual HTML parser
  dependency, which is a bigger decision than this plan's effort budget.
- Any existing `artifacts/*.html` file would need editing to make the
  fallback path work correctly — stop; the fallback must work against the
  files as they exist today, unedited.
- `/artifacts/review/[...file]/page.tsx` or `resolveArtifact()` needs a
  behavior change to support this — stop; both are explicitly out of
  scope (plan 015 already made them the stable, tested traversal-safe
  boundary).

## Maintenance notes

- The apostrophe/quote edge case in the meta-tag regex (Step 3) is a known
  limitation, not a bug to silently work around — if a template author
  hits it, fix the parser then, don't pre-empt with premature robustness.
- Plan 014's future templates must add the same `artifact:meta` tag; note
  this in that plan's own review when it starts (do not edit
  `plans/014-artifact-types-for-all-skill-outputs.md` from this plan, per
  its own STOP condition against being touched by unrelated plans).
- Once plan 017 lands, revisit `/artifacts` card styling to move off
  `fd-*` onto the same Geist tokens the reviewer chrome uses, so the two
  surfaces read as one system.
- `listArtifacts()` now does one file read per artifact on every request;
  fine at current scale (dozens of files), but if the artifact count grows
  into the hundreds this should gain the same kind of caching
  `site/lib/source.ts` uses for the docs vault.
