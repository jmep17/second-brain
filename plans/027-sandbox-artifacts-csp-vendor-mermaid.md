# Plan 027: Deny served artifacts same-origin API access (CSP) and vendor Mermaid off the CDN

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0ee11c..HEAD -- site/app/artifacts site/components/artifact-reviewer.tsx plugins/diagrams/skills/diagram-plans/MERMAID.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## At a glance

- **What**: Add a restrictive CSP to served artifact responses and replace the floating jsDelivr Mermaid/ELK imports with pinned, vendored builds served from the site.
- **Why**: Artifact HTML is agent-generated and served same-origin with the site's write APIs with no sandbox or CSP, so any script in an artifact can reach the run-dispatch path or execute a hijacked CDN build.
- **Next action**: Step 1 — Vendor pinned Mermaid + ELK

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (a wrong CSP can blank served artifacts; the reviewer reads the
  iframe's `contentDocument`, so the parent-side access must keep working)
- **Depends on**: none strictly, but lands best after/with
  plans/025-cross-origin-request-guard.md and plans/026-separate-filing-from-dispatch.md
  (defense-in-depth for the same threat)
- **Category**: security
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

Artifact HTML is agent-generated (partly from `raw/` sources ingested from
outside the repo) and is served **same-origin** with the site's write APIs,
inside an `<iframe>` that has no `sandbox` and whose response carries no
`Content-Security-Policy`. Any script in an artifact therefore has full
same-origin access to `/api/config/*` and `/api/artifacts/feedback` — including
the run-dispatch path — and can reach out to the network freely. On top of
that, diagram artifacts load Mermaid and the ELK layout engine by dynamic
`import()` from a **floating** jsDelivr range (`mermaid@11`, `layout-elk@0`)
with no Subresource Integrity, so a compromised or hijacked CDN build executes
with review-page privileges, and dynamic `import()` cannot carry an SRI hash to
prevent it. This plan closes both: a restrictive CSP on the served-artifact
response so artifact scripts can neither call the APIs nor fetch remote code,
and pinned, vendored Mermaid/ELK builds served from the site so the CSP can
fail closed. The two ship together because the CSP *breaks* CDN Mermaid — you
must vendor first or diagram artifacts go blank.

## Current state

Files and their role:

- `site/app/artifacts/view/[...file]/route.ts` — `GET` that serves an artifact
  HTML file verbatim. Sets only `Content-Type`.
- `site/app/artifacts/review/[...file]/page.tsx` — the review page; passes the
  artifact path as the iframe `src` (via the `<ArtifactReviewer>` prop).
- `site/components/artifact-reviewer.tsx` — renders the `<iframe>` and, in its
  effect, reads/mutates `iframe.contentDocument` throughout (selection layer).
- `plugins/diagrams/skills/diagram-plans/MERMAID.md` — the diagram artifact
  template; its emitted HTML `import()`s Mermaid + ELK from the CDN. **This is
  the only template that does so** — the `plugins/plans` and `plugins/decisions`
  templates render decision/plan cards, not Mermaid (verified: no `import(` /
  `jsdelivr` in their `TEMPLATE.md`).
- `site/public/` — currently holds only `vault/` (gitignored). A new
  `site/public/vendor/` will be tracked and served at `/vendor/...`.

The served artifact response sets no CSP
(`site/app/artifacts/view/[...file]/route.ts`, tail):

```ts
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
```

The iframe has no `sandbox` (`artifact-reviewer.tsx:929-935`):

```tsx
        <iframe
          ref={iframeRef}
          src={src}
          title="Artifact under review"
          onLoad={recordIframeLoad}
          className="block min-h-0 w-full flex-1 border-0 bg-white"
        />
```

The review page wires same-origin `src` (`review/[...file]/page.tsx`, JSX):

```tsx
      <ArtifactReviewer
        artifact={`artifacts/${rel}`}
        src={`/artifacts/view/${rel}`}
      />
```

The CDN imports (`MERMAID.md:298,300`):

```js
    mermaid = (await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")).default;
    // ...
      const elk = await import("https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs");
```

Seven existing artifacts under `artifacts/diagrams/` contain these CDN imports
(grep `cdn.jsdelivr` across `artifacts/*/*.html`). They will fail to render
their diagrams under the new CSP until regenerated or rewritten — this is
expected and called out in Step 4.

Design constraint (`plugins/DESIGN.md`): artifacts are **standalone** pages
that inline everything. Vendored Mermaid served from `/vendor/` keeps them
standalone within the site origin while removing the third-party dependency.

## Commands you will need

| Purpose   | Command                                        | Expected on success |
|-----------|------------------------------------------------|---------------------|
| Typecheck | `cd site && bun run typecheck`                 | exit 0, no errors   |
| Build     | `cd site && bun run build`                     | exit 0              |
| E2E (manual) | `ARTIFACT_REVIEW_BASE_URL=http://127.0.0.1:3000 bun run test:artifact-review` (server up) | passes |
| Full verify | `bun run verify` (root, added by plan 024)   | exit 0              |
| Plugin gate | `bash tools/check-plugins.sh`                | `all checks passed` |

## Scope

**In scope** (the only files you should modify/create):

- `site/app/artifacts/view/[...file]/route.ts` — add the CSP header.
- `site/public/vendor/mermaid/` and `site/public/vendor/elk/` (create) — the
  pinned ESM builds. Include a `VERSION` note recording the exact versions.
- `plugins/diagrams/skills/diagram-plans/MERMAID.md` — import from `/vendor/`
  instead of the CDN.

**Out of scope** (do NOT touch, even though they look related):

- The `<iframe>` `sandbox` attribute / a separate-origin rearchitecture. A
  naive `sandbox` breaks the reviewer's `contentDocument` access; full
  origin-isolation (a distinct loopback port + `postMessage`) is the deferred
  long-term fix. This plan hardens via CSP only. Note this in Maintenance.
- The seven existing artifact HTML files under `artifacts/`. Do NOT hand-edit
  them; Step 4 documents the regeneration path. (`raw/` is immutable per
  `CLAUDE.md`; `artifacts/` are generated outputs — leave them to regeneration.)
- `plugins/plans` and `plugins/decisions` templates — they do not import
  Mermaid.

## Git workflow

- Branch: `advisor/027-sandbox-artifacts-csp-vendor-mermaid`
- Commit per logical unit: (1) vendor the builds, (2) template imports local,
  (3) CSP header. Conventional lowercase prefixes (e.g.
  `security: serve pinned mermaid and add artifact CSP`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Vendor pinned Mermaid + ELK

Pick exact versions (resolve `mermaid@11` and `@mermaid-js/layout-elk@0` to
concrete patch versions — record them). Fetch the ESM builds and place them
under `site/public/vendor/`:

- `site/public/vendor/mermaid/mermaid.esm.min.mjs` (from the pinned
  `mermaid@<X.Y.Z>/dist/mermaid.esm.min.mjs`)
- `site/public/vendor/elk/mermaid-layout-elk.esm.min.mjs` (from the pinned
  `@mermaid-js/layout-elk@<X.Y.Z>/dist/mermaid-layout-elk.esm.min.mjs`)
- `site/public/vendor/VERSION` — a text note with the exact versions and the
  source URLs, for future updates.

Note: Mermaid's ESM build may itself lazily import sibling chunks by relative
path. After Step 3's CSP is in place, verify a diagram actually renders
(Step 5) — if Mermaid tries to fetch a chunk the vendor dir doesn't contain,
that surfaces as a blank diagram and is a STOP condition (you may need to
vendor the full `dist/` tree, not just the entry file).

**Verify**: `ls site/public/vendor/mermaid site/public/vendor/elk` → the
`.mjs` files exist and are non-empty (`test -s`).

### Step 2: Point the diagram template at the vendored paths

In `plugins/diagrams/skills/diagram-plans/MERMAID.md`, change lines 298 and
300 (and any sibling references) so the imports are site-local:

```js
    mermaid = (await import("/vendor/mermaid/mermaid.esm.min.mjs")).default;
    // ...
      const elk = await import("/vendor/elk/mermaid-layout-elk.esm.min.mjs");
```

Keep the surrounding registration/init logic identical. If the template
documents the CDN URL in prose nearby, update that prose too.

**Verify**: `grep -n "jsdelivr\|cdn\." plugins/diagrams/skills/diagram-plans/MERMAID.md`
→ no matches. `grep -n "/vendor/" plugins/diagrams/skills/diagram-plans/MERMAID.md`
→ 2 matches.

### Step 3: Add the CSP to the served-artifact response

In `site/app/artifacts/view/[...file]/route.ts`, set a Content-Security-Policy
on the returned `Response` so artifact scripts cannot reach the site's APIs or
fetch remote code, while still allowing inline scripts/styles (artifacts are
inline-authored) and same-origin module imports (the vendored Mermaid):

```ts
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'none'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "font-src 'self' data:; " +
        "connect-src 'none'; " +
        "base-uri 'none'; " +
        "form-action 'none'",
    },
  });
```

Rationale for each: `connect-src 'none'` blocks `fetch`/XHR/WebSocket to the
APIs; `default-src 'none'` blocks any load not explicitly allowed (so a stray
CDN `import()` fails closed); `script-src 'self' 'unsafe-inline'` permits the
artifact's inline scripts and the `/vendor/` module import; `img-src`/`font-src`
allow the artifact's own assets and data URIs. Do NOT add `https:` to any
directive — that would re-open the CDN hole.

**Verify**: `cd site && bun run typecheck` → exit 0. With a server up:
`curl -sI http://127.0.0.1:3000/artifacts/view/diagrams/2026-08-26-artifact-platform.html | grep -i content-security-policy`
→ shows the header with `connect-src 'none'`.

### Step 4: Document the existing-artifact regeneration path

The seven existing `artifacts/diagrams/*.html` still import from the CDN and
will render a blank diagram under the new CSP (their `import()` of a `https://`
URL is blocked by `default-src 'none'`). Do **not** hand-edit them. Add a short
note to this plan's status row / `log.md` (per repo convention) that these need
regeneration through the updated diagram skill, and — if a batch rewrite is
wanted — it is a follow-up, not part of this plan. Call this out explicitly so
the blank-diagram behavior is understood as expected, not a regression.

**Verify**: `grep -rl "cdn.jsdelivr" artifacts/*/*.html | wc -l` → still 7
(this plan intentionally does not rewrite them); the fix for those is
regeneration.

### Step 5: Confirm the reviewer still works and a vendored diagram renders

- The CSP is on the **served artifact document**, not on the parent site page.
  The parent (`artifact-reviewer.tsx`) is same-origin with the iframe and its
  `contentDocument` access is unaffected by the child's CSP. Confirm this
  reasoning holds by running the reviewer against a **newly generated** diagram
  artifact (one that imports `/vendor/`): open its review page, enter review
  mode, confirm elements are selectable (the selection layer reads
  `contentDocument`).
- Confirm a `/vendor/`-importing artifact actually renders its Mermaid diagram
  under the CSP (not blank).

**Verify**: `ARTIFACT_REVIEW_BASE_URL=http://127.0.0.1:3000 bun run test:artifact-review`
→ passes (its fixture `2026-08-26-plan-013-execution-review.html` is a CDN
artifact and will render blank, but the harness asserts on **prose text**, not
the diagram — confirm it still passes; if it asserts on rendered SVG, that
assertion needs a vendored fixture, which is a STOP condition to report).

### Step 6: Full gate

**Verify**: `cd site && bun run build` → exit 0; `bun run verify` (root) →
exit 0; `bash tools/check-plugins.sh` → `all checks passed`.

## Test plan

- No new unit test file is strictly required (the change is a response header
  plus vendored assets), but add a `bun:test` in
  `site/app/artifacts/view/__csp.test.ts` (or nearest convention) asserting the
  `view` route response carries `connect-src 'none'` if the route can be
  invoked in isolation; if invoking the App Router handler in a unit test is
  awkward, rely on the Step 3 `curl` gate and the E2E instead and say so.
- Manual E2E via `test:artifact-review` confirms the reviewer's
  `contentDocument` path still functions under the child CSP.
- Verification: `cd site && bun run build` → exit 0, and the Step 3 `curl`
  shows the header.

## Done criteria

- [ ] `cd site && bun run typecheck` exits 0
- [ ] `cd site && bun run build` exits 0
- [ ] `site/public/vendor/mermaid/*.mjs` and `site/public/vendor/elk/*.mjs`
      exist and are non-empty
- [ ] `grep -rn "jsdelivr\|cdn\." plugins/diagrams/skills/diagram-plans/MERMAID.md`
      → no matches
- [ ] The `view` route response includes
      `Content-Security-Policy: ...; connect-src 'none'; ...` (curl check)
- [ ] A newly generated diagram artifact renders its diagram and is reviewable
      (manual)
- [ ] `bun run verify` exits 0; `bash tools/check-plugins.sh` passes
- [ ] No files outside the in-scope list are modified (`git status`) — in
      particular, the seven existing `artifacts/*.html` are untouched
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" no longer match the live code (drift) — in
  particular if `plugins/plans`/`plugins/decisions` templates have gained a
  Mermaid import (then they need the same treatment, which widens scope).
- Vendored Mermaid renders blank under the CSP because it lazy-loads sibling
  chunks by a path the vendor dir lacks — report it; the fix is vendoring the
  full `dist/` tree, which is a deliberate scope bump.
- `test:artifact-review` fails because it asserts on **rendered SVG** rather
  than prose (its fixture is a CDN artifact that now renders blank) — report;
  the harness needs a vendored fixture (overlaps plan 032/036 fixture work).
- A `sandbox` attribute or separate-origin change appears necessary to close
  the exposure — that is deliberately deferred; report rather than starting the
  rearchitecture here.

## Maintenance notes

- **Deferred (out of scope):** true origin isolation — serving artifacts from a
  distinct loopback port and driving the reviewer over `postMessage` — is the
  complete fix for same-origin artifact scripts. This plan reduces the blast
  radius with a CSP; a future plan should still isolate the origin, especially
  if artifacts ever need their own network access.
- Updating Mermaid means re-vendoring: fetch the new pinned build into
  `site/public/vendor/`, bump `VERSION`, and confirm a diagram still renders
  under the CSP. Never revert to a CDN `import()` — that re-opens F4.
- The seven pre-CSP artifacts render blank diagrams until regenerated; a
  follow-up batch-regeneration pass (through the updated diagram skill) is the
  intended cleanup.
- A reviewer should scrutinize: that no CSP directive contains `https:` or a
  CDN host (which would re-open the hole), and that `connect-src 'none'` is
  present (this is the directive that actually blocks API calls from an
  artifact script).
