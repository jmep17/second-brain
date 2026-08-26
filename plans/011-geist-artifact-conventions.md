# Plan 011: A normative Geist design contract for all artifact types, and "the artifact IS the response" enforcement

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat f17627f..HEAD -- plugins/diagrams artifacts/README.md CLAUDE.md AGENTS.md .claude-plugin/marketplace.json`
> Expected drift: plan 010 may have landed (new
> `plugins/diagrams/hooks/plan-artifact-nudge.sh`, README/SKILL.md additions,
> version `0.4.0`) — that is fine. Plugin plan 008 may have rewritten
> `hooks/nudge.sh` — see Step 4's two variants. Any drift in
> `CLAUDE.md`/`AGENTS.md`'s tail sections or `artifacts/README.md` beyond
> plan 009's version: STOP.

## Status

- **Priority**: P1 (everything in plans 012–013 builds on this contract)
- **Effort**: S
- **Risk**: LOW (docs + one message string + one skill rule; no rendering change)
- **Depends on**: none strictly; 010 recommended first (both touch SKILL.md/README — running 011 second keeps merges trivial)
- **Category**: dx
- **Planned at**: commit `f17627f`, 2026-08-26

## Why this matters

The owner's directive: for ANY planning, decision, brainstorm, or architecture
request, agents must not answer in prose — they must present an artifact, and
every artifact type must follow Vercel's Geist design system. Today the only
codified design lives inside one plugin's `MERMAID.md` (diagrams), there is no
shared contract new artifact types (plans, decisions — plan 013) can build
on, and the enforcement wording still says "answer with a diagram" rather
than "the artifact is the response". This plan writes the normative contract
once (`plugins/DESIGN.md`), points the repo instructions and the enforcement
hooks at it, and tightens the reply contract so the chat reply shrinks to the
artifact path plus at most one open question.

## Current state

All verified at commit `f17627f`, 2026-08-26.

- `plugins/diagrams/skills/diagram-plans/MERMAID.md` (400 lines) — holds the
  only Geist implementation: a full standalone HTML template (lines 32–331)
  with tokens:

  ```css
  :root {
    --geist-bg: #ffffff; --geist-fg: #171717;
    --accents-1: #fafafa; --accents-2: #eaeaea; --accents-3: #999999; --accents-5: #666666;
    /* Text tones, not brand fills: both clear WCAG AA on --geist-bg. */
    --text-warning: #8a4b00; --text-info: #0057b7;
    --radius: 10px;
    --font-sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) { /* #000000/#ededed + dark accents */ }
  ```

  plus page chrome (kicker/h1/sub header, `figure` with 1px `--accents-2`
  borders, notes grid with `note`/`note.risk`/`note.open` cards) and a
  document/canvas dual mode. **Owned by plugin plans 004–007 — do not edit
  it in this plan** except the single additive pointer line in Step 2.

- **Vercel's published Geist docs** (fetched 2026-08-26 from
  vercel.com/geist/{colors,typography,materials,grid}.md — append `.md` to
  any Geist page URL for markdown):
  - Colors: 10 scales (`backgrounds`, `gray`, `gray-alpha`, `blue`, `red`,
    `amber`, `green`, `teal`, `purple`, `pink`), steps 100–1000 with fixed
    roles — 100–300 backgrounds (default/hover/active), 400–600 borders
    (default/hover/active), 700–800 high-contrast backgrounds, 900–1000 text
    and icons (secondary/primary). Two page backgrounds:
    `--ds-background-100` (default) and `--ds-background-200` (secondary).
  - Typography: four categories — Headings (72→14px; ≤32px may take a Subtle
    modifier), Labels (single-line, ample line-height; **Label 14 Strong is
    the most common style**; mono variants for technical content; Label 12
    for tertiary/dense), Copy (multi-line, higher line-height; Copy 14 most
    used; mono variant for inline code), Buttons (16/14/12).
  - Materials: radii **6px** (base/small/tooltip), **12px**
    (medium/large/menu/modal), **16px** (fullscreen); surfaces progress
    base → small → medium → large; floating elevations tooltip → menu →
    modal → fullscreen.
  - Grid: cell-and-guide layouts where "the rule lines and cell borders are
    part of the design"; guides are decorative (`aria-hidden="true"`, ≥3:1
    contrast both themes); crosses mark intersections; never nest grids more
    than one level.

- `artifacts/README.md` — currently lists only `diagrams/` and says more
  types "land here as their plugins ship".
- `CLAUDE.md` and `AGENTS.md` (repo root) — byte-identical schema docs; the
  final section is `## Agent skills` (subsections `### Issue tracker`,
  `### Triage labels`, `### Domain docs`). No artifact-response rule exists.
- `plugins/diagrams/hooks/nudge.sh` — on a planning-shaped prompt injects:

  ```
  diagram-plans: this prompt is a plan/brainstorm/design request. Answer with a diagram artifact, not paragraphs — invoke the diagrams:diagram-plans skill. Save dir: ${dir}.
  ```

  **Plugin plan 008** (`plugins/diagrams/plans/008-…`, status TODO) rewrites
  this script and specifies its own message text in its Step 2.
- `plugins/diagrams/skills/diagram-plans/SKILL.md` step 5:

  ```
  5. **Reply in ≤ 5 lines**: the saved path, and the one decision or open question the user must answer. Every other word belongs inside the diagram.
  ```

- An earlier advisory rejection worth honouring (plugin plans README,
  "Findings considered and rejected"): adopting `vercel-brand.css` outright
  was rejected because it carries Vercel's wordmark/triangle identity —
  "Plan 004 takes the token values, not the identity." DESIGN.md must codify
  exactly that line.
- Conventions: Prettier on everything; version bump rule (both manifests,
  `tools/check-version-sync.sh`); `bun run test` inside `plugins/diagrams`.

## Commands you will need

| Purpose        | Command                                                    | Expected on success            |
| -------------- | ---------------------------------------------------------- | ------------------------------ |
| Plugin checks  | `cd plugins/diagrams && bun run test`                      | `all checks passed`, exit 0    |
| Version sync   | `cd plugins/diagrams && bash tools/check-version-sync.sh`  | `version in sync: <new>`       |
| Format         | `bunx prettier --ignore-unknown --write <files>`           | exit 0                         |

## Scope

**In scope** (the only files you may modify):

- `plugins/DESIGN.md` (create — the normative contract)
- `artifacts/README.md` (taxonomy)
- `CLAUDE.md` and `AGENTS.md` (identical new section each)
- `plugins/diagrams/hooks/nudge.sh` (message string ONLY — Step 4)
- `plugins/diagrams/skills/diagram-plans/SKILL.md` (step 5 wording + one pointer line)
- `plugins/diagrams/skills/diagram-plans/MERMAID.md` (ONE additive pointer line at the top — nothing else)
- `plugins/diagrams/.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` (version bump)
- `plugins/diagrams/plans/README.md` (one reconciliation paragraph for 008)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- Everything else in `MERMAID.md` — template/tokens/rules are plugin plans
  004–007 territory. This plan does not restyle the diagram page; the current
  template is documented as a *conforming instance*, not rewritten.
- `nudge.sh` beyond the message string (008 owns the parse and pattern).
- `site/` (plan 012), new plugins (plan 013), `hooks/hooks.json`.
- `wiki/`, `log.md`, `raw/`.

## Git workflow

- Branch: `advisor/011-geist-conventions`
- Message style: `diagrams: <imperative>` for plugin files, `docs: <imperative>` for root docs.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write `plugins/DESIGN.md` — the normative Geist contract

Create `plugins/DESIGN.md`. It is the single document every artifact plugin
(current and future) must follow. Required sections and content (write in
this order; keep it under ~180 lines — normative, not tutorial):

1. **Scope line**: "Normative for every plugin in this marketplace and every
   page under `artifacts/`. Grounded in vercel.com/geist (fetch any page as
   markdown by appending `.md`)."
2. **Tokens, not identity**: token values and structure come from Geist; the
   Vercel wordmark, triangle, and brand assets are Vercel's identity and
   MUST NOT appear. (Carries forward the recorded rejection of
   `vercel-brand.css`.)
3. **Color**: pages are black-on-white (`#ffffff`/`#171717` light,
   `#000000`/`#ededed` dark) with a neutral gray scale following Geist scale
   roles — steps 100–300 backgrounds, 400–600 borders, 900–1000 text; two
   background levels (page + raised surface). Color is semantic and sparse:
   text tones for warning/info must clear WCAG AA as text on the page
   background in BOTH themes (light `#8a4b00`/`#0057b7`, dark
   `#f5a623`/`#52a8ff` are the proven values from the diagram template).
   Never use a semantic tone as a text color at low-contrast tint strength;
   tints are for backgrounds/borders only.
4. **Typography**: Geist Sans + Geist Mono via Google Fonts with full
   fallback stacks (copy the two `--font-*` stacks from the diagram
   template, quoted in Current state above). Geist categories: mono
   uppercase micro-labels for kickers/tags (Label-style, 10.5–11px,
   letter-spacing ≥ .06em), one clamp()-sized 600-weight heading per page,
   14px body copy at ≥1.5 line-height, mono for paths/code.
5. **Materials**: 1px borders in the border-role gray; radii from Geist
   materials — 6px small controls/chips, 10–12px cards and surfaces, 16px
   full-screen; shadows only on floating layers (rails/menus), subtle
   (`0 4px 16px rgb(0 0 0 / .06)`).
6. **Grid (optional flourish)**: cell-and-guide layouts may be used for
   option grids (decision pages); guides are decorative →
   `aria-hidden="true"`, ≥3:1 contrast in both themes, never nested more
   than one level.
7. **Page contract** (every artifact page): standalone HTML file; network
   allowed ONLY for Google Fonts and (where needed) the jsDelivr Mermaid/ELK
   CDN, everything else inline; light + dark via `prefers-color-scheme`;
   header = mono kicker (`TYPE · YYYY-MM-DD · <shape>`) + h1 + optional
   one-line sub; content on raised-surface cards; a Notes region using the
   `note` / `note.risk` (warning tone) / `note.open` (info tone) card
   pattern; every failure path renders a visible message, never an empty
   card; filenames `YYYY-MM-DD-<kebab-slug>.html` under
   `artifacts/<type>/`; re-render the same topic to the same path.
8. **The artifact IS the response** (reply contract): when a skill produces
   an artifact, the chat reply is at most: the saved path, the opener
   status, and ONE open question. No summaries, no restating the content in
   prose. An explicit user request for prose overrides everything.
9. **Feedback affordance (placeholder)**: every artifact page reserves a
   feedback affordance; its concrete widget and API contract are defined by
   plan 012 and appended to this document then. (One sentence; do not
   invent the widget here.)
10. **Conforming instance**: state that
    `plugins/diagrams/skills/diagram-plans/MERMAID.md` is the reference
    implementation; its `--accents-1/2/3/5` map to the gray-scale roles
    (bg-100 / border-400 / text-secondary / text-primary-muted) and its
    `--radius: 10px` sits inside the 6–12px card band. New types copy its
    token block verbatim unless this document says otherwise.

**Verify**: `bunx prettier --check plugins/DESIGN.md` → exits 0 (run
`--write` first); `grep -c "MUST NOT" plugins/DESIGN.md` → ≥ 1;
`grep -c "artifact IS the response\|artifact is the response" plugins/DESIGN.md` → ≥ 1.

### Step 2: Point the diagram plugin at the contract

- `MERMAID.md`: insert exactly one line after the `# Mermaid reference…`
  heading: `> Design contract: this template implements
  [\`plugins/DESIGN.md\`](../../../DESIGN.md); change tokens there first.`
  Nothing else in the file changes.
- `SKILL.md`: rewrite step 5 to the reply contract:

  ```markdown
  5. **The artifact is the response.** Reply with at most: the saved path, the opener status, and the one decision or open question the user must answer. No prose summary of the diagram — every other word belongs inside it. (Per `plugins/DESIGN.md`.)
  ```

  Do not change the `description:` frontmatter.

**Verify**: `git diff plugins/diagrams/skills/diagram-plans/MERMAID.md | grep -c "^+"` → `1` addition (plus header lines); `grep -c "DESIGN.md" plugins/diagrams/skills/diagram-plans/SKILL.md` → ≥ 1.

### Step 3: Repo-wide taxonomy and instruction rule

- `artifacts/README.md`: replace the body with a table of the three types —
  `diagrams/` (shipped — brainstorms, architectures, roadmaps, option maps;
  plugin `diagrams`), `plans/` (planned — plan/spec documents as pages; plan
  013), `decisions/` (planned — decision/RFC pages; plan 013) — plus: "All
  types follow `plugins/DESIGN.md`. Feedback on any artifact is filed in the
  issue tracker (plan 012)."
- `CLAUDE.md` AND `AGENTS.md` (keep byte-identical): append a new top-level
  section after `## Agent skills`:

  ```markdown
  ## Artifact responses

  For any planning, decision, brainstorming, or architecture request, the
  response is an artifact — a Geist-styled HTML page under `artifacts/`
  (see `plugins/DESIGN.md` and `artifacts/README.md`), opened in the
  browser. Do not answer these requests in prose: the chat reply is the
  artifact path plus at most one open question. An explicit request for
  prose ("write it up", "in paragraphs") overrides this.
  ```

**Verify**: `diff <(tail -12 CLAUDE.md) <(tail -12 AGENTS.md)` → empty;
`grep -c "## Artifact responses" CLAUDE.md AGENTS.md` → 1 each;
`grep -c "plans/\|decisions/\|diagrams/" artifacts/README.md` → ≥ 3.

### Step 4: Escalate the nudge message (string only)

Two variants — pick by what the drift check found:

- **008 not yet landed** (`nudge.sh` still matches the excerpt in Current
  state): change ONLY the `echo` string to:

  ```
  diagram-plans: this prompt is a plan/brainstorm/design request. Present an artifact, not a prose answer — invoke the diagrams:diagram-plans skill, then reply with only the artifact path and at most one open question. Save dir: ${dir}.
  ```

- **008 already landed** (script rewritten, corpus test exists): make the
  same message-text change in the rewritten script's echo line, run
  `bash test/test-nudge.sh`, and expect it to still pass (the corpus asserts
  fire/quiet, not message wording — if it asserts wording, update the
  expected string there too and say so in your report).

Then append one paragraph to `plugins/diagrams/plans/README.md` (below the
existing deviation notes): "Plan 011 (root `plans/`) changed the nudge
message to the 'present an artifact / reply = path + one question' wording
on <date>. Plan 008's Step 2 message text is superseded by that wording —
executors of 008 must carry it, not the text printed in 008."

**Verify**: `bash -n plugins/diagrams/hooks/nudge.sh` → exit 0;
`printf '{"prompt":"plan a cache layer"}' | bash plugins/diagrams/hooks/nudge.sh`
→ one line containing `Present an artifact` and `one open question`.

### Step 5: Version bump and checks

Bump the minor version in BOTH `plugins/diagrams/.claude-plugin/plugin.json`
and the `diagrams` entry in `.claude-plugin/marketplace.json` — read the
current value first (it is `0.3.0` if plan 010 has not landed, `0.4.0` if it
has; bump to `0.4.0` or `0.5.0` accordingly).

**Verify**: `cd plugins/diagrams && bash tools/check-version-sync.sh` →
`version in sync: <new>`; `bun run test` → `all checks passed`;
`cd ../.. && bunx prettier --check plugins/DESIGN.md artifacts/README.md CLAUDE.md AGENTS.md` → exit 0.

## Test plan

- The Step 4 stdin probe is the only executable behaviour change; run it in
  both themes of phrasing (a firing prompt and a quiet one, e.g.
  `{"prompt":"rename this variable"}` → no output).
- Everything else is documentation verified by the greps above plus one
  human read-through of `plugins/DESIGN.md` against the Geist facts in
  Current state (scales/roles, radii, type categories) — flag any claim you
  cannot trace to those facts.

## Done criteria

ALL must hold:

- [ ] `plugins/DESIGN.md` exists with all ten sections; prettier-clean
- [ ] `CLAUDE.md` and `AGENTS.md` gained the identical `## Artifact responses` section; `diff` of tails is empty
- [ ] `artifacts/README.md` lists all three types and points at `plugins/DESIGN.md`
- [ ] Nudge message contains "Present an artifact" and "one open question"; `bash -n` clean; firing/quiet probes behave
- [ ] SKILL.md step 5 is the reply contract; `description:` frontmatter unchanged
- [ ] `MERMAID.md` diff is exactly the one pointer line
- [ ] Both manifests bumped and in sync; `bun run test` passes
- [ ] `plugins/diagrams/plans/README.md` carries the 008 reconciliation paragraph
- [ ] `git status --porcelain` shows only in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `CLAUDE.md` and `AGENTS.md` are not byte-identical before your edit
  (someone diverged them; do not guess which is canonical).
- The nudge.sh you find matches neither the excerpt here nor plan 008's
  rewritten shape.
- You feel the need to restyle the diagram template to "really" match Geist
  (e.g. renaming `--accents-*` to `--ds-gray-*`) — that is plugin plans
  004–007 territory and out of scope.
- Writing DESIGN.md requires inventing a Geist fact not present in Current
  state (e.g. exact hex for a scale step): mark it "unverified — confirm
  against vercel.com/geist/<page>.md" rather than guessing, and if more
  than two such gaps appear, stop and report.

## Maintenance notes

- Plan 012 appends the concrete feedback-widget contract to DESIGN.md §9;
  plan 013 builds two new templates against this contract. Reviewers of
  those plans should re-read DESIGN.md first.
- The enforcement wording now exists in four places by design — hook message,
  SKILL.md step 5, CLAUDE.md/AGENTS.md, DESIGN.md §8. They must keep saying
  the same thing; change all or none.
- Deferred: migrating MERMAID.md's `--accents-*` names onto `--ds-*` scale
  names (pure rename, belongs with plugin plan 004's remaining font work);
  a lint that greps artifact pages for the forbidden Vercel identity assets.
