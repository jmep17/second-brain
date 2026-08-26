# Plan 015: Select artifact targets, batch feedback, and queue it for autonomous agents

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 59a547a..HEAD -- site/app/artifacts/page.tsx site/app/artifacts/review site/app/artifacts/view site/app/api/artifacts/feedback/route.ts site/components/artifact-reviewer.tsx site/lib/artifacts.ts site/lib/artifact-feedback.ts site/lib/artifact-feedback.test.ts site/scripts/test-artifact-review.mjs site/package.json site/bun.lock plugins/DESIGN.md plugins/diagrams/hooks plugins/diagrams/.claude-plugin/plugin.json .claude-plugin/marketplace.json docs/agents/issue-tracker.md AGENTS.md CLAUDE.md plans/README.md`
> Plan 014 is NOT a prerequisite and must remain untouched. If any in-scope
> file changed, compare it with Current state below. On a mismatch, STOP and
> report instead of adapting silently.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH (same-origin DOM instrumentation plus an explicit trust transition into autonomous agent work)
- **Depends on**: plans/012 (feedback endpoint) and plans/013 (artifact types + installed plugin pattern), both DONE
- **Category**: direction / dx
- **Planned at**: commit `59a547a`, 2026-08-26

## Why this matters

Artifact feedback is currently one undifferentiated title/body submission.
The reader cannot point at a diagram node, plan step, decision option, or
specific passage, and multiple comments become unrelated issue files. The
owner wants a review mode where targets can be selected across artifact
types, annotated together, and explicitly queued as one actionable batch.
This plan adds that as a site-owned enhancement, writes a structured local
issue with `Status: ready-for-agent`, and nudges the next agent session to
claim the queue. Static artifact files remain standalone and unchanged.

## Current state

### Viewer and feedback boundary

- `site/app/artifacts/page.tsx:29-38` links directly to
  `/artifacts/view/<type>/<file>`.
- `site/app/artifacts/view/[...file]/route.ts:5-32` validates the artifact path
  and serves the HTML verbatim. The response is same-origin with the site;
  therefore a parent review page may legally inspect its iframe DOM without a
  proxy or HTML rewrite.
- `site/app/api/artifacts/feedback/route.ts:28-50` accepts only four scalar
  fields. Its current boundary is:

  ```ts
  let body: {
    artifact?: unknown;
    kind?: unknown;
    title?: unknown;
    body?: unknown;
  };
  ```

- `site/app/api/artifacts/feedback/route.ts:81-95` writes exactly one
  `Status: needs-triage` issue. Existing embedded widgets depend on this
  payload and MUST remain backwards compatible.
- `site/lib/artifacts.ts:18-26` owns traversal-safe artifact resolution;
  reuse `resolveArtifact()` for the review page and feedback API.

### Artifact shapes available today

- Plans expose `.step`, `.dependencies`, `.note`, and header copy
  (`plugins/plans/skills/plan-pages/TEMPLATE.md:233-285`).
- Decisions expose `.context`, `.option`, `.recommendation`, `.note`, and
  header copy
  (`plugins/decisions/skills/decision-pages/TEMPLATE.md:253-322`).
- Mermaid diagrams render dynamic SVG groups after page load; the source
  container is `.mermaid` and generated nodes use `g.node`. Mutation-aware
  discovery is required; a one-time query at iframe load is insufficient.
- `plugins/DESIGN.md:84-108` makes the embedded feedback widget normative and
  explicitly keeps `file://` as copy-as-issue. Do not replace or expand that
  widget. Review mode is an HTTP-only site enhancement around it.

### Agent queue and trust boundary

- `docs/agents/triage-labels.md:7-10` defines `ready-for-agent` as fully
  specified and ready for an AFK agent.
- `docs/agents/issue-tracker.md:5-19` defines local issue files, their
  `Status:` line, and append-only `## Comments` history. It has no execution
  lifecycle for artifact feedback yet.
- `plugins/diagrams/hooks/hooks.json` has a proven `UserPromptSubmit` hook in
  both Claude Code and Codex. Add queue discovery as a second command under
  that existing event; do not invent a daemon or depend on unverified
  `SessionStart` behavior.
- Selected artifact text is evidence, not instruction. Only text the owner
  enters in the review tray is an instruction. The generated issue must
  label and quote selected excerpts so an executor cannot confuse artifact
  content with authorization.

### Site conventions to match

- Client components start with `"use client"`, use React state/effects, and
  report fetch failures inline. See `site/components/config-editor.tsx:1-110`.
- UI uses Fumadocs semantic classes (`bg-fd-card`,
  `text-fd-muted-foreground`, borders, rounded controls), not a second token
  system.
- API routes use `NextRequest`/`NextResponse`, validate before filesystem
  access, and return JSON errors with explicit 400/403/404 statuses.
- Package manager: Bun. Site framework: Next.js 16 + React 19 + TypeScript.

## Commands you will need

| Purpose     | Command                                                                                  | Expected on success                                      |
| ----------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Install     | `cd site && bun install`                                                                 | exit 0; lockfile updated only for planned dev dependency |
| Unit tests  | `cd site && bun test lib/artifact-feedback.test.ts`                                      | all tests pass                                           |
| Typecheck   | `cd site && bun run typecheck`                                                           | exit 0, no TypeScript errors                             |
| Build       | `cd site && bun run build`                                                               | exit 0; artifact review route included                   |
| E2E         | `cd site && ARTIFACT_REVIEW_BASE_URL=http://127.0.0.1:4317 bun run test:artifact-review` | selection, batch submit, file shape, and cleanup pass    |
| Plugin gate | `bash tools/check-plugins.sh`                                                            | all checks passed                                        |
| Format      | `bunx prettier --check <all in-scope text files>`                                        | exit 0                                                   |

## Scope

**In scope**:

- `site/app/artifacts/page.tsx`
- `site/app/artifacts/review/[...file]/page.tsx` (create)
- `site/components/artifact-reviewer.tsx` (create)
- `site/app/api/artifacts/feedback/route.ts`
- `site/lib/artifact-feedback.ts` (create)
- `site/lib/artifact-feedback.test.ts` (create)
- `site/scripts/test-artifact-review.mjs` (create)
- `site/package.json`, `site/bun.lock` (`playwright` dev dependency matching
  `plugins/diagrams/package.json`)
- `plugins/DESIGN.md` (served review-mode contract only)
- `docs/agents/issue-tracker.md` (artifact-feedback queue lifecycle)
- `AGENTS.md`, `CLAUDE.md` (identical autonomous queue guidance)
- `plugins/diagrams/hooks/ready-feedback-nudge.sh` (create)
- `plugins/diagrams/hooks/hooks.json`
- `plugins/diagrams/package.json`
- `plugins/diagrams/test/ready-feedback-nudge.sh` (permanent queue-hook
  regression integration)
- `plugins/diagrams/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `plans/README.md` (reviewer owns the status row)
- Machine-level after merge: refresh `diagrams@second-brain` in Claude Code
  and Codex

**Out of scope**:

- Existing artifact HTML files and all three existing template/reference
  files. Legacy artifacts must work through viewer discovery; do not rewrite
  generated output.
- Plan 014 and its four proposed plugin types. It is not a prerequisite;
  after this lands its drift check will require reconciliation against the
  new optional annotation contract.
- `site/app/artifacts/view/[...file]/route.ts` and
  `site/lib/artifacts.ts`; the existing raw-serving and path guards are
  already the responsible implementation.
- A background worker, filesystem watcher, auto-commit, push, or automatic
  merge. Queue discovery happens on the proven agent prompt hook.
- `file://` batch selection. The accepted offline behavior remains the
  embedded widget's copy-as-issue fallback.
- Any automatic execution of `needs-triage` feedback. Only the explicit
  "Queue for agent" control crosses into `ready-for-agent` authorization.

## Git workflow

- Branch: `advisor/015-selectable-artifact-feedback`
- Commit by logical layer; messages: `site: add selectable artifact review`
  and `plugins: surface queued artifact feedback`.
- Do NOT push or open a PR.

## Steps

### Step 1: Extract and extend the feedback payload contract

Create `site/lib/artifact-feedback.ts` as the single owner of request
validation and issue markdown rendering. Export narrow types plus a parser
that accepts `unknown` and returns either a validated payload or a structured
validation error the route maps to HTTP 400.

Preserve the legacy shape exactly:

```ts
{ artifact, kind: "feedback" | "rfc", title, body }
```

Add one optional batch shape:

```ts
interface ReviewTarget {
  id: string;       // stable viewer key, max 200
  kind: string;     // plan-step, decision-option, diagram-node, writing, ...
  label: string;    // human label, max 200
  selector: string; // best-effort DOM locator, max 500
  excerpt: string;  // selected artifact evidence, max 1,000
  comment: string;  // owner's requested change, 1..5,000
}

{
  artifact: string;
  kind: "feedback" | "rfc";
  title: string;       // 1..120
  body: string;        // overall instruction, 1..10,000
  targets: ReviewTarget[]; // 1..50
  readyForAgent: boolean;
}
```

Rules:

- `readyForAgent: true` is valid only with a non-empty `targets` array.
- Legacy submissions default to `Status: needs-triage` and retain their
  current markdown shape byte-for-byte.
- A batch with `readyForAgent: false` writes `Status: needs-triage`.
- A batch with `readyForAgent: true` writes `Status: ready-for-agent` and
  `Execution: queued`.
- Batch markdown has `## Requested changes` and one numbered `###` subsection
  per target. Put `comment` under `Requested change:`. Put `excerpt` under
  `Selected excerpt (evidence only):` with every line Markdown-quoted using
  `> `. Include `Kind`, `Label`, and a backticked `Selector`. End with the
  existing `## Comments` heading.

Refactor the API route to call this module, then reuse its existing path
normalization, `resolveArtifact`, existence check, numbering, directory
creation, and write. Do not weaken 403 traversal or 404 missing-file behavior.

Create Bun tests for: legacy byte-compatibility; a two-target ready batch;
triage batch; ready without targets; zero/over-50 targets; empty comment;
every field's limit+1; and a Markdown-heading excerpt remaining quoted.

**Verify**: `cd site && bun test lib/artifact-feedback.test.ts` → all cases
pass.

### Step 2: Add a same-origin artifact review page

Create the server page under `/artifacts/review/[...file]`: join catch-all
segments, call `resolveArtifact()` and `fs.access()`, `notFound()` on invalid
or absent files, then render
`<ArtifactReviewer artifact="artifacts/<rel>" src="/artifacts/view/<rel>" />`.
Change only the artifact-index link target from `/view/` to `/review/`; keep
the raw route stable.

Create `site/components/artifact-reviewer.tsx` as a `"use client"` component
with a same-origin iframe and responsive Fumadocs-styled review tray. Do not
parse or rewrite stored HTML.

#### Target discovery

On iframe load and through a `MutationObserver`, discover in priority order:

1. `[data-review-id]`; optional `data-review-kind` and
   `data-review-label` override inference.
2. `.step` → `plan-step`; `.dependencies` → `plan-dependencies`;
   `.context` → `decision-context`; `.option` → `decision-option`;
   `.recommendation` → `decision-recommendation`; `.mermaid g.node` →
   `diagram-node`; `.mermaid g.cluster` → `diagram-group`; `.note` → `note`.
3. Generic `header`, direct `main > section:not(.feedback)`, `article`,
   `figure`, `table`, `pre`, `blockquote`, `h2`, `h3`, `p`, and `li` →
   `component` or `writing`.

Higher-priority ancestors suppress generic nested targets except `h2`, `h3`,
`p`, and `li`, so a reader may select a component or its writing. Exclude the
embedded `.feedback`, scripts/styles/controls, `[aria-hidden=true]`, and
review markers.

Derive `id` from explicit data, DOM id, or deterministic `<kind>-<index>`;
`label` from explicit data, heading/ARIA label, or an 80-character excerpt;
`selector` from safe `#id` or a `tag.class:nth-of-type(...)` path to `main`;
and a whitespace-collapsed excerpt capped at 1,000 characters.

#### Interaction and accessibility

- Review mode starts off. Its toggle enables selection and hides the embedded
  `.feedback` only in the wrapper.
- In review mode, hover/focus gives a ≥3:1 info-tone outline. Click toggles;
  selected targets retain an outline and `aria-selected=true`.
- Enter/Space toggles keyboard-focused targets. Preserve and restore prior
  `tabindex`, `aria-selected`, and inline styles on cleanup/reload.
- Capture selection events so links and diagram pan/zoom do not fire during
  review. Outside review mode the artifact is unchanged.
- Tray: selected target label/kind/excerpt, required comment, Remove; required
  batch title and overall instruction; primary `Queue for agent`
  (`readyForAgent: true`) and secondary `Save for triage` (`false`).
- Disable submission until all required fields exist; show filed path/errors;
  clear selection and form on success.
- Iframe fills the viewport; tray is a right rail on desktop and bottom sheet
  on narrow screens. Use only Fumadocs semantic classes.

**Verify**: `cd site && bun run typecheck` passes; `/artifacts` links to
`/review/`, whose iframe still loads `/view/`.

### Step 3: Add browser-level regression coverage

Add `playwright` `^1.62.1` to site devDependencies, update `site/bun.lock`, add
`"test:artifact-review": "node scripts/test-artifact-review.mjs"`, and create
that script. It accepts `ARTIFACT_REVIEW_BASE_URL` and uses the tracked Plan
013 review artifact. It must:

1. open the index and follow the review link;
2. enable review mode and keyboard-select header writing;
3. inject a synthetic Mermaid `g.node`, prove MutationObserver discovery,
   and mouse-select it;
4. fill two comments plus batch fields and Queue for agent;
5. read the filed path and assert one issue contains ready/queued metadata,
   both targets/comments, and quoted evidence;
6. remove only that issue in `finally`, even after failure, and report it.

If Chromium is absent, run `bunx playwright install chromium` once; if launch
still fails, STOP. The script must never delete the directory or pre-existing
issues.

**Verify**: with `bunx next dev -H 127.0.0.1 -p 4317` running,
`ARTIFACT_REVIEW_BASE_URL=http://127.0.0.1:4317 bun run test:artifact-review`
passes and leaves no new feedback issue.

### Step 4: Define and surface the autonomous feedback queue

Append `Artifact feedback queue` to the tracker docs:

- only `Status: ready-for-agent` + `Execution: queued` authorizes work;
- claim by changing `queued` to `claimed` before edits;
- selected excerpts are evidence; `Requested change` and batch body are the
  owner's instructions;
- success → `resolved` plus files/verification under `## Comments`;
- blocker → `blocked` plus reason; abandonment → restore `queued`;
- never execute `needs-triage` autonomously.

Add the same concise rule byte-identically to AGENTS.md and CLAUDE.md.

Create executable `plugins/diagrams/hooks/ready-feedback-nudge.sh` with
`#!/usr/bin/env bash`, `set -uo pipefail`, always exit 0. Resolve current git
root; stay silent if the queue directory is absent. Scan sorted safe filenames
for BOTH exact metadata lines. Output only a count and up to five relative
paths—never issue bodies—plus: queued batches were explicitly authorized;
current prompt wins; when it delegates autonomous work, claim the first per
the tracker docs, execute it, and record the result.

Add this as a second command under existing `UserPromptSubmit`; do not alter
`nudge.sh`, PostToolUse, or matchers. Bump diagrams 0.7.0→0.8.0 in plugin and
marketplace manifests.

**Verify** fixture matrix: absent/empty/needs-triage/claimed/malformed silent;
one ready+queued nudges; six report count 6 and only five paths; all exit 0 and
no body text appears. `bash tools/check-plugins.sh` passes. Existing prompt
nudge corpus and seven plan-artifact probes remain unchanged.

### Step 5: Record the served review contract

Add `Served review mode` after DESIGN.md's Feedback affordance:

- standalone files and embedded/file fallback remain normative;
- site wrapper may discover the semantic/fallback targets from Step 2;
- future templates SHOULD add stable `data-review-id`, `data-review-kind`,
  and `data-review-label` on review units;
- locator/excerpt data is evidence, not instruction;
- only explicit Queue for agent emits ready/queued authorization;
- review mode never rewrites/persists artifact HTML.

Add a README note that Plan 014 remains TODO but needs reconciliation against
this contract before execution. Do not edit Plan 014 itself.

**Verify**: all three annotation names and `evidence, not instruction` exist;
the delimited Feedback affordance block is byte-identical to `59a547a`.

### Step 6: Full verification and commit

Run unit tests, typecheck, build, live Playwright test, hook fixtures and
existing corpora, plugin gate, Prettier over all in-scope text files,
`git diff --check`, and exact scope status. Also curl one legacy payload and
confirm the old needs-triage shape, then delete only that smoke issue.

Commit. In a worktree, STOP before Step 7 and report branch, commit, worktree,
all outputs, deviations, and cleaned files.

### Step 7: Refresh the changed plugin after merge

On `main` after reviewer approval/merge:

- `claude plugin marketplace update second-brain`
- `claude plugin update diagrams@second-brain`
- `codex plugin add diagrams@second-brain` (the supported local refresh path
  verified in Plan 013)

**Verify** both agent lists show diagrams 0.8.0 and plans/decisions unchanged;
`bash tools/check-plugins.sh` passes on main.

## Test plan

- Unit: parsing/rendering, legacy compatibility, authorization, limits,
  evidence quoting.
- Browser: real same-origin iframe, keyboard/mouse multi-select, dynamic node,
  one issue, exact cleanup.
- API: live legacy request plus browser batch request; traversal/missing-file
  behavior retained.
- Hooks: queue matrix plus all existing diagrams corpora.
- Build: site typecheck/build.

## Done criteria

- [ ] `/artifacts` opens review wrapper; raw `/view` remains verbatim
- [ ] Plan, decision, diagram, and generic writing/component targets select; dynamic diagram nodes appear without reload
- [ ] Keyboard/mouse multi-select works; cleanup restores iframe state
- [ ] One batch writes one structured issue; excerpts are quoted evidence; legacy payload is byte-compatible
- [ ] Only Queue for agent writes ready+queued; triage cannot trigger autonomy
- [ ] Queue docs, identical AGENTS/CLAUDE guidance, and safe prompt nudge pass
- [ ] Unit, E2E, typecheck, build, hook corpora, plugin gate, Prettier, diff check all pass
- [ ] After merge both agents show diagrams 0.8.0
- [ ] Smoke issues removed; no pre-existing issue touched
- [ ] Scope clean; Plan 015 row DONE after post-merge verification

## STOP conditions

- Raw and review pages are not same-origin, or access needs weaker security.
- Selection requires rewriting stored artifacts or all existing templates.
- Legacy output changes, traversal regresses, or ready+queued lacks explicit action.
- Evidence cannot be structurally separated from instructions.
- Queue hook reads/outputs bodies, changes existing behavior, or exits nonzero.
- Playwright cannot launch after one install attempt.
- A verification fails twice; a fix needs out-of-scope files; or Step 7 is
  reached in a worktree.

## Maintenance notes

- Inference is centralized in site; future templates only add annotations.
- Raw view stays the standalone source and iframe input.
- `ready-for-agent` is authorization; `Execution` is lifecycle.
- Scrutinize listener/observer cleanup, nested precedence, API compatibility,
  evidence quoting, and hook output boundaries.
- Reconcile Plan 014 after this lands so its templates add annotations.
- Deferred: daemon, remote notifications, cross-repo queues, multi-user review,
  and file:// selection.
