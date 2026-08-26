# Plan 013: Two new artifact types — `plans/` and `decisions/` (RFC) pages — as marketplace plugins

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat f17627f..HEAD -- plugins .claude-plugin/marketplace.json .husky/pre-commit artifacts/README.md`
> Plans 010–012 are REQUIRED prerequisites (see Depends on); their changes
> are expected drift. Verify each prerequisite's status row is DONE in
> `plans/README.md`; if any is not, STOP. Any drift NOT attributable to
> 010–012 or plugin plan 008: compare against Current state; on a mismatch,
> STOP.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED (two new plugins, a pre-commit change, and cross-agent installs)
- **Depends on**: plans/010 (hook + install pipeline), plans/011 (`plugins/DESIGN.md`), plans/012 (feedback widget contract appended to DESIGN.md)
- **Category**: dx / direction
- **Planned at**: commit `f17627f`, 2026-08-26

## Why this matters

The owner's directive covers "ANY planning, decisions, brainstorming,
architecting" and says artifact types must exist for all of it — "not just
diagrams". Diagrams cover brainstorms/architecture/roadmaps, but two response
shapes have no artifact type: a **plan** (ordered steps, dependencies,
status) and a **decision/RFC** (context, options, trade-offs,
recommendation, feedback). Plan 010's hook already fires when any skill
writes a plan/spec file — but the only thing it can tell the agent to make
is a diagram. This plan ships `plans` and `decisions` as sibling plugins in
the `second-brain` marketplace ("one plugin per artifact type", per the
marketplace's own metadata), each with a Geist page template conforming to
`plugins/DESIGN.md`, and routes the existing enforcement to the right type.

## Current state

At `f17627f` plus prerequisites 010–012 (verify via their status rows):

- Marketplace: `.claude-plugin/marketplace.json` — one entry (`diagrams`).
  Metadata description: "one plugin per artifact type".
- `plugins/diagrams/` — the exemplar plugin. Its layout is the pattern to
  copy: `.claude-plugin/plugin.json`, `skills/<name>/SKILL.md` (+ reference
  md), `hooks/`, `bin/diagram-open`, `tools/`, `package.json`.
- After 011: `plugins/DESIGN.md` is the normative Geist contract (tokens,
  type, materials, page contract §7, reply contract §8, feedback affordance
  §9 as amended by 012). After 012: DESIGN.md §9 contains the concrete
  feedback widget snippet and API contract, and the site serves artifact
  pages with a working `POST /api/artifacts/feedback`.
- After 010: `plugins/diagrams/hooks/plan-artifact-nudge.sh` fires on writes
  of `.md` files under `plans/`, `.scratch/`, `specs/`, `tickets/` with a
  message telling the agent to render the document as a *diagram*.
- Pre-commit (`.husky/pre-commit`):

  ```
  bunx lint-staged
  bash plugins/diagrams/tools/check.sh
  ```

  `check.sh` is diagrams-specific: version sync via
  `tools/check-version-sync.sh` (hardcodes the `diagrams` entry), JSON
  validity, `bash -n` on tracked `*.sh`, opener executable bit.
- `artifacts/README.md` (after 011) lists `plans/` and `decisions/` as
  "planned — plan 013".
- Cross-agent installs (after 010): Claude Code has `diagrams@second-brain`;
  Codex has the `second-brain` marketplace registered and `diagrams`
  installed. Adding marketplace plugins for both agents is
  `/plugin install <name>@second-brain` and
  `codex plugin add <name>@second-brain`.
- The opener `bin/diagram-open` is generic (opens any file/URL). New plugins
  must NOT duplicate it (SessionStart rule: reuse, don't copy) — their
  skills call it by the same PATH / `${CLAUDE_PLUGIN_ROOT}`-of-diagrams? No:
  a plugin cannot reference another plugin's root. Resolution in Step 2.

## Commands you will need

| Purpose            | Command                                            | Expected on success         |
| ------------------ | -------------------------------------------------- | --------------------------- |
| All plugin checks  | `bash tools/check-plugins.sh` (created in Step 5)  | `all checks passed`, exit 0 |
| Format             | `bunx prettier --ignore-unknown --write plugins`   | exit 0                      |
| Codex install      | `codex plugin add plans@second-brain` etc.         | success line                |

## Scope

**In scope**:

- `plugins/plans/**` (create): `.claude-plugin/plugin.json`,
  `skills/plan-pages/SKILL.md`, `skills/plan-pages/TEMPLATE.md`
- `plugins/decisions/**` (create): `.claude-plugin/plugin.json`,
  `skills/decision-pages/SKILL.md`, `skills/decision-pages/TEMPLATE.md`
- `plugins/diagrams/bin/diagram-open` → moved? NO — stays; see Step 2 (a
  copy is added per new plugin under `bin/`, smallest change that keeps
  plugins self-contained; revisit consolidation when a third consumer
  appears)
- `.claude-plugin/marketplace.json` (two new entries + version bumps)
- `plugins/diagrams/hooks/plan-artifact-nudge.sh` (message routing only)
- `tools/check-plugins.sh` (create, repo root) + `.husky/pre-commit` (one
  line swap) + retire `plugins/diagrams/tools/check-version-sync.sh`'s
  hardcoding (Step 5)
- `artifacts/README.md` (flip `plans/`/`decisions/` to shipped)
- `plans/README.md` (status row)
- Machine-level (after merge): install both plugins in Claude Code + Codex

**Out of scope**:

- `site/` (012 already serves any `artifacts/<type>/*.html`; nothing new
  needed — verify, don't edit)
- `plugins/diagrams/skills/**` (the diagram skill is untouched)
- `nudge.sh` (UserPromptSubmit; plugin plan 008 owns it — decision-shaped
  *prompts* already fire it via "decision|options|trade-offs" words)
- Third-party skills; `~/.codex/config.toml` by hand; `wiki/`, `log.md`

## Git workflow

- Branch: `advisor/013-plan-decision-types`
- Message style: `plugins: <imperative>` (spans multiple plugins).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Scaffold the two plugins

For each of `plans` (skill `plan-pages`, output `artifacts/plans/`) and
`decisions` (skill `decision-pages`, output `artifacts/decisions/`):

- `plugins/<name>/.claude-plugin/plugin.json` — mirror the diagrams manifest
  shape: `name`, `version: "0.1.0"`, one-sentence description, author
  `Jorden Parker`, keywords. No `hooks` key (the shared write-trigger hook
  stays in the diagrams plugin — Step 4 — because Codex validation rejects
  unknown manifest fields and duplicating the hook would double-fire).
- `bin/diagram-open` — byte-for-byte copy of
  `plugins/diagrams/bin/diagram-open`, executable
  (`chmod +x`). A shared opener would need cross-plugin path resolution that
  neither Claude Code nor Codex defines; two tracked copies with a
  consolidation note beat an invented mechanism.

**Verify**: `ls plugins/plans/bin plugins/decisions/bin` → `diagram-open`
each, and `cmp plugins/plans/bin/diagram-open plugins/diagrams/bin/diagram-open`
→ silent (identical); `python3 -m json.tool plugins/plans/.claude-plugin/plugin.json`
→ valid (same for decisions).

### Step 2: The `plan-pages` skill + template

`plugins/plans/skills/plan-pages/SKILL.md` — frontmatter `name: plan-pages`,
`description:` covering: rendering a plan/spec/tickets document (or a plan
the agent is about to deliver) as a standalone Geist plan page opened in the
browser; triggered by the plan-artifact hook nudge or by request. Steps
mirror the diagram skill's five-step shape (pick content → gather → write
HTML from TEMPLATE.md verbatim → open via `diagram-open` (PATH →
`${CLAUDE_PLUGIN_ROOT}/bin/diagram-open` → `<dir-of-SKILL.md>/../../bin/diagram-open`)
→ reply per DESIGN.md §8). Path: `artifacts/plans/YYYY-MM-DD-<slug>.html`
(same `DIAGRAMS_DIR`-style override: `PLANS_DIR`; `DIAGRAMS_OPEN` governs
opening for ALL artifact types — do not mint a second opt-out).

`TEMPLATE.md` — a complete standalone HTML template conforming to
`plugins/DESIGN.md`: copy the diagram template's token block, header, notes
grid, and feedback widget (DESIGN.md §9) verbatim; the body replaces the
mermaid figure with:

- a **step list**: ordered cards, each with a mono step number, title, an
  optional status chip (`todo`/`doing`/`done`/`blocked` — border-tint chips,
  AA text per DESIGN.md §3), and a one-line detail;
- a **dependencies strip**: mono text like `03 ← 01, 02` per dependent step
  (no JS graph — plans that need a real graph get a companion diagram
  artifact);
- the notes region (`note` / `note.risk` / `note.open`) and feedback widget.

No Mermaid, no CDN beyond Google Fonts: the page must render fully offline.

**Verify**: open the template's HTML skeleton with a filled example in a
browser (or `python3 -m http.server` + curl for structure):
`grep -c "cdn.jsdelivr" plugins/plans/skills/plan-pages/TEMPLATE.md` → `0`;
`grep -c "fonts.googleapis.com" …/TEMPLATE.md` → ≥ 1;
`grep -c "feedback" …/TEMPLATE.md` → ≥ 1.

### Step 3: The `decision-pages` skill + template

Same skill shape (`name: decision-pages`; env override `DECISIONS_DIR`).
`description:` covers: decisions, RFCs, "should we X or Y", ADR-shaped
requests → a decision page. `TEMPLATE.md` body, conforming to DESIGN.md:

- header kicker `DECISION · YYYY-MM-DD · <status>` where status ∈
  `proposed | accepted | rejected` (mono chip);
- **Context** card (≤ 3 sentences);
- **Options grid**: a Geist cell-and-guide grid (DESIGN.md §6 —
  `aria-hidden` guides, ≥3:1, one level only), one cell per option: option
  name (Label-style), trade-off bullets (two mono micro-labels `+` / `−`);
- **Recommendation** card carrying the info-tone border (`note.open`
  pattern) with the recommended option and the one-line why;
- notes region + feedback widget — the widget's `kind` select defaults to
  `rfc` on this template (012 defined the field).

**Verify**: same greps as Step 2 against the decisions TEMPLATE.md; plus
`grep -c "aria-hidden" plugins/decisions/skills/decision-pages/TEMPLATE.md` → ≥ 1.

### Step 4: Route the write-trigger hook by type

In `plugins/diagrams/hooks/plan-artifact-nudge.sh` (from plan 010), change
ONLY the echoed message so it routes:

```
diagram-plans: a plan/spec document was just written (${path}). Present it as an artifact — invoke the plan-pages skill (decision/RFC documents: decision-pages; if neither plugin is installed, diagram-plans) on that document and open the page in the browser. The markdown stays the source of truth. Reply per the artifact reply contract: path + at most one open question. Skip only if the user explicitly asked for prose.
```

Do not touch the parse, the path patterns, or the exit behaviour. Re-run
plan 010's seven stdin probes — all seven must behave identically apart
from the message text.

**Verify**: the two "fire" probes print the new message; the five "quiet"
probes stay silent; every probe exits 0.

### Step 5: One check script for all plugins; wire pre-commit

Create `tools/check-plugins.sh` (repo root): for every directory
`plugins/*/` containing `.claude-plugin/plugin.json` — validate JSON;
verify its `version` matches its entry in `.claude-plugin/marketplace.json`
(fail listing both values on mismatch, and fail if the marketplace entry is
missing); `bash -n` every tracked `*.sh` under it; require the executable
bit on `bin/*` files. Also validate `hooks/hooks.json` files and the root
marketplace JSON once. Repo shell conventions: `#!/usr/bin/env bash`,
`set -euo pipefail`, `python3` for JSON (same as
`check-version-sync.sh`). Keep `plugins/diagrams/tools/check.sh` working
(it is referenced by `plugins/diagrams/package.json`'s `test` script) but
reduce it to `exec bash "$(git rev-parse --show-toplevel)/tools/check-plugins.sh"`
so there is exactly one implementation. Update `.husky/pre-commit`'s second
line to `bash tools/check-plugins.sh`.

**Verify**: `bash tools/check-plugins.sh` → `all checks passed`, exit 0,
and its output names all three plugins; break a version on purpose in a
scratch copy → non-zero with both values printed; restore.

### Step 6: Marketplace entries, taxonomy flip, bumps

- `.claude-plugin/marketplace.json`: append entries `plans` and `decisions`
  (`"source": "./plugins/<name>"`, version `0.1.0`, category
  `productivity`, one-line descriptions naming the artifact type). Bump the
  `diagrams` entry and `plugins/diagrams/.claude-plugin/plugin.json`
  (minor — the hook message changed).
- `artifacts/README.md`: flip `plans/` and `decisions/` from "planned" to
  shipped, naming their plugins.

**Verify**: `bash tools/check-plugins.sh` → pass (this now checks all three
version pairs); `bunx prettier --check .claude-plugin/marketplace.json artifacts/README.md` → exit 0.

Commit everything. Steps 7 is machine-level and needs the work merged to
`main` first (same worktree rule as plan 010 Step 6 — STOP at this boundary
if executing in a worktree).

### Step 7: Install in both agents (machine-level, after merge)

- Claude Code: `/plugin marketplace update second-brain`, then
  `/plugin install plans@second-brain`, `/plugin install decisions@second-brain`,
  `/plugin update diagrams@second-brain`.
- Codex: `codex plugin marketplace upgrade`, then
  `codex plugin add plans@second-brain`, `codex plugin add decisions@second-brain`.

**Verify**: `codex plugin list` shows all three `@second-brain` plugins
installed+enabled at the expected versions;
`python3 -c 'import json;d=json.load(open("/home/jorden/.claude/plugins/installed_plugins.json"));print(sorted(k for k in d["plugins"] if k.endswith("@second-brain")))'`
→ `['decisions@second-brain', 'diagrams@second-brain', 'plans@second-brain']`.

## Test plan

- Step 4's seven probes are the hook regression test.
- `tools/check-plugins.sh` self-test: the deliberate version-break in Step 5.
- End-to-end, per type (manual, after Step 7): in a Claude Code session,
  (a) ask "should we use X or Y for Z?" → a decisions page appears under
  `artifacts/decisions/` and opens; (b) run a skill that writes a spec
  (e.g. `/to-spec`) → the hook fires and a plan page appears under
  `artifacts/plans/`; (c) confirm both pages render offline (disconnect
  network after fonts cache) and their feedback widgets submit against the
  running site (plan 012's loop) and file into `.scratch/artifact-feedback/`.

## Done criteria

ALL must hold:

- [ ] Both plugins exist with valid manifests, skills, templates, executable openers identical to the diagrams opener
- [ ] Both templates: zero jsDelivr references, fonts + feedback widget present; decisions template has the aria-hidden options grid
- [ ] Hook message routes by type; all seven probes pass; exit 0 always
- [ ] `bash tools/check-plugins.sh` passes and covers all three plugins; `.husky/pre-commit` calls it; `plugins/diagrams/tools/check.sh` delegates to it; `cd plugins/diagrams && bun run test` still passes
- [ ] Marketplace has three entries; all version pairs in sync
- [ ] `artifacts/README.md` shows all three types shipped
- [ ] Step 7 ran; both agents list all three plugins (outputs in your report)
- [ ] `git status --porcelain` shows only in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any prerequisite (010, 011, 012) is not DONE — especially if
  `plugins/DESIGN.md` lacks the §9 feedback widget contract (012 unfinished
  means the templates have nothing to embed).
- Codex or Claude Code rejects a plugin manifest field you copied from the
  diagrams plugin (report the exact validation error).
- The hook probes change fire/quiet behaviour, not just message text.
- Reducing `check.sh` to a delegate breaks `bun run test` in a way one fix
  attempt doesn't cure (report; do not fork the check logic).
- You are in a worktree at Step 7 (merge boundary — same as plan 010).

## Maintenance notes

- Two copies of `diagram-open` now exist by explicit decision; consolidate
  into a shared location only when a third consumer appears or an agent
  ships cross-plugin path resolution — record the move in
  `plugins/DESIGN.md` when it happens.
- `tools/check-plugins.sh` is now the single structural gate; any new
  plugin is covered automatically. Adding a per-plugin render test belongs
  with plugin plan 002's harness, not here.
- Reviewers should scrutinize: template conformance against DESIGN.md
  section by section (tokens copied, not re-invented); that the hook's
  fire/quiet corpus was truly unchanged; and that plugin.json carries no
  `hooks` key on the two new plugins.
- Deferred: a `brainstorms/` alias type (diagrams already cover it); RFC
  status transitions (proposed→accepted) driven from feedback triage — a
  future plan once 012's loop has real usage; template render checks in CI.
