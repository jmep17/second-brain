# Plan 014: Artifact types for every output shape of the mattpocock and improve skills — boards, reviews, questionnaires, reports

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: verify plans 010–013 are all DONE in
> `plans/README.md` — every one is a hard prerequisite. Then
> `git diff --stat f17627f..HEAD -- plugins .claude-plugin/marketplace.json site tools artifacts/README.md CLAUDE.md AGENTS.md`
> and attribute every changed path to plans 010–013 (or plugin plans
> 004–008). Unattributable drift: compare against Current state; mismatch =
> STOP.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED (four new plugins, one small API amendment, cross-agent installs)
- **Depends on**: plans/011 (DESIGN.md), plans/012 (feedback API + widget), plans/013 (plugin pattern, `tools/check-plugins.sh`, hook routing shape). 010 transitively (install pipeline).
- **Category**: dx / direction
- **Planned at**: commit `f17627f`, 2026-08-26

## Why this matters

The owner requires an artifact for every output the installed skills
produce — not only plans, decisions, and diagrams. Inventorying the
mattpocock skills (`~/.agents/skills`, symlinked into `~/.claude/skills`)
and this repo's `improve` skill (verified 2026-08-26 by reading each
SKILL.md) leaves four response shapes with no artifact type: ticket sets and
maps (**boards**), findings and diagnoses (**reviews**), questionnaires and
grilling sessions (**questionnaires** — the natural interactive case: the
recipient answers *on the page* and the answers flow back through the plan
012 feedback API), and research/report documents (**reports**). This plan
ships those four types as sibling plugins, writes the normative
output→type mapping into `plugins/DESIGN.md`, and extends the enforcement
hook so file-shaped outputs route to the right type automatically.

## Current state

At `f17627f` + plans 010–013 (verify their status rows first).

### The output inventory (ground truth, from the skills' own SKILL.md files)

| Output shape | Producers (verified) | Where it lands today | Artifact type |
| --- | --- | --- | --- |
| Spec / plan document | `to-spec` (`.scratch/<f>/spec.md`), `improve` (`plans/NNN-*.md`) | tracker / `plans/` | `plans` (013 — covered) |
| Decision / ADR / RFC | `domain-modeling` (ADRs), grill verdicts | `docs/adr/` | `decisions` (013 — covered) |
| Brainstorm / architecture / roadmap | `codebase-design`, `prototype` design questions, planning prompts | chat | `diagrams` (shipped) |
| Ticket set with blocking edges | `to-tickets` (`.scratch/<f>/issues/<NN>-<slug>.md`, "edges as text in one file per ticket") | tracker | **`boards` (this plan)** |
| Decision map + child tickets | `wayfinder` (`.scratch/<effort>/map.md` + `issues/NN-*.md`, `Blocked by:` lines) | tracker | **`boards`** |
| Triage pass / status index | `triage` (Status state machine), `improve` (`plans/README.md` status table) | tracker / `plans/` | **`boards`** |
| Review findings | `code-review` (two axes: Standards + Spec, side by side), `improve` (findings table: evidence `file:line`, impact, effort, risk, confidence) | chat | **`reviews` (this plan)** |
| Diagnosis | `diagnosing-bugs` (hypotheses, evidence, pass/fail signal; secrets `<REDACTED>`) | chat | **`reviews`** |
| Retro findings | `retro` (session findings → steering/check improvements) | chat | **`reviews`** |
| Deepening report | `improve-codebase-architecture` ("visual HTML report" — already page-shaped; conform it, don't wrap it) | HTML | **`reviews`** |
| Questionnaire | `to-questionnaire` (`to-questionnaire-<slug>.md` in cwd; most-important-first; `##` theme groups; hand to a recipient async) | cwd file | **`questionnaires` (this plan)** |
| Grilling session | `grilling` / `grill-me` / `grill-with-docs` (frontier questions put to the user; decisions are the user's) | chat | **`questionnaires`** |
| Research / report doc | `research` ("single Markdown file, citing each claim's source", saved per repo convention) | repo md | **`reports` (this plan)** |
| Teaching writeup | `teach` | chat | **`reports`** |

**Exempt (record in the mapping, produce no artifact)**: `handoff` /
`claude-handoff` (agent-to-agent, saved to OS temp by design — no human
reader); code-producing skills (`implement`, `implement-spec`, `tdd`,
`migrate-to-shoehorn`, `scaffold-exercises`, setup skills); `wizard`
(interactive bash is the artifact); `resolving-merge-conflicts`;
`find-skills` / `ask-matt` (conversational).

### Platform state this plan builds on

- Plugin pattern (013): `plugins/<name>/{.claude-plugin/plugin.json, skills/<skill>/SKILL.md, skills/<skill>/TEMPLATE.md, bin/diagram-open}`; no `hooks` key on secondary plugins; versions in root `.claude-plugin/marketplace.json`; `tools/check-plugins.sh` validates every plugin generically; skills follow the five-step shape ending in the DESIGN.md §8 reply contract; openers resolve PATH → `${CLAUDE_PLUGIN_ROOT}` → `<dir-of-SKILL.md>/../../bin/diagram-open`.
- `plugins/DESIGN.md` (011, amended by 012): tokens, page contract §7, reply contract §8, feedback widget §9 (delimited snippet with `data-artifact`, `kind` field `feedback|rfc`, file:// copy-as-issue fallback).
- Feedback API (012): `POST /api/artifacts/feedback` accepts `kind: "feedback" | "rfc"`, files `.scratch/artifact-feedback/issues/NN-<slug>.md` with `Status: needs-triage`.
- Hook (010, message routed in 013): `plugins/diagrams/hooks/plan-artifact-nudge.sh` fires on Write of `.md` under `(plans|\.scratch|specs?|tickets?)/`, excluding `README.md`/`index.md` basenames.
- 013's maintenance note said "consolidate `bin/diagram-open` at a third consumer" — **this plan supersedes that**: install caches are per-plugin in both Claude Code and Codex, so no shared parent exists at runtime; copies are structural. Step 6 adds a drift guard instead.

## Commands you will need

| Purpose           | Command                                             | Expected on success         |
| ----------------- | --------------------------------------------------- | --------------------------- |
| All plugin checks | `bash tools/check-plugins.sh`                       | `all checks passed`, exit 0 |
| Site gates        | `cd site && bun run typecheck && bun run build`     | exit 0                      |
| Format            | `bunx prettier --ignore-unknown --write plugins`    | exit 0                      |

## Scope

**In scope**:

- `plugins/boards/**`, `plugins/reviews/**`, `plugins/questionnaires/**`, `plugins/reports/**` (create; skills `board-pages`, `review-pages`, `questionnaire-pages`, `report-pages`; env overrides `BOARDS_DIR` etc.; `DIAGRAMS_OPEN` stays the single open toggle)
- `.claude-plugin/marketplace.json` (four entries + diagrams bump)
- `plugins/DESIGN.md` (new §11: the mapping table above, verbatim, plus the exempt list)
- `plugins/diagrams/hooks/plan-artifact-nudge.sh` (path→type routing — Step 5)
- `site/app/api/artifacts/feedback/route.ts` (allowed kinds += `"answers"` — one-line set change + its 400 test)
- `tools/check-plugins.sh` (opener-identity assertion)
- `artifacts/README.md`, `CLAUDE.md` + `AGENTS.md` (§Artifact responses wording — Step 7)
- `plugins/diagrams/.claude-plugin/plugin.json` (bump), `plans/README.md` (status row)
- Machine-level (after merge): install the four plugins in Claude Code + Codex

**Out of scope**: third-party skill files (the mapping layers above them —
never edit `~/.agents` or `~/.claude/skills`); `nudge.sh`; `MERMAID.md`;
existing templates from 013; the rest of `site/`.

## Git workflow

- Branch: `advisor/014-all-output-types`. Messages: `plugins: <imperative>` / `site: <imperative>`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Scaffold four plugins

Exactly the 013 pattern per plugin (manifest v0.1.0, no `hooks` key,
`bin/diagram-open` byte-copy, executable). **Verify**:
`bash tools/check-plugins.sh` passes listing seven plugins;
`for p in boards reviews questionnaires reports; do cmp plugins/$p/bin/diagram-open plugins/diagrams/bin/diagram-open; done` → silent.

### Step 2: `board-pages` — tickets, maps, status tables

SKILL.md: fires on the hook nudge for ticket/map writes or on request
("show the board"). Sources: a tracker directory
(`.scratch/<f>/issues/*.md` — parse `Status:`, `Blocked by:`, `Type:`
lines per `docs/agents/issue-tracker.md`), a wayfinder `map.md`, or a
plans README status table. TEMPLATE.md body (per DESIGN.md; no CDN beyond
fonts): status columns (group by `Status:`; board falls back to
`open|claimed|resolved` for wayfinder, triage labels otherwise) rendered as
a Geist cell-and-guide grid (one column per status, `aria-hidden` guides);
each card = mono `NN`, title, blocking strip (`← 01, 02`, mono), type
chip. A note card carries the source directory path. Feedback widget as on
every page.

**Verify**: template greps — `cdn.jsdelivr` count 0, `fonts.googleapis`
≥ 1, `aria-hidden` ≥ 1, `feedback` ≥ 1; render a filled example from
`.scratch/config-system/issues/` (13 real files exist) and eyeball columns.

### Step 3: `review-pages` and `report-pages`

- `review-pages` SKILL.md: for code-review (two-axis side-by-side —
  preserve the Standards/Spec split as two column groups), improve
  findings, diagnoses, retros. TEMPLATE.md body: a summary strip (counts
  by severity, mono), then a findings table — severity chip
  (border-tint, AA), category/axis, one-line claim, evidence as mono
  `file:line`, optional verdict chip (`CONFIRMED`/`PLAUSIBLE`). A rule in
  SKILL.md, copied from diagnosing-bugs' own discipline: **secrets never
  reach the page — `<REDACTED>` replaces them before writing.**
- `report-pages` SKILL.md: research/teach documents. TEMPLATE.md body: the
  one type where flowing prose lives *inside the artifact* — header,
  `h2`-sectioned copy at 14px/1.6, a right-hand mono anchor rail
  (document mode only; stacks under 640px), and a Sources card listing each
  citation as a mono link. The markdown file remains the source of truth;
  the page cites it in the kicker.

**Verify**: same four greps per template; reviews template additionally
`grep -c "REDACTED" plugins/reviews/skills/review-pages/SKILL.md` → ≥ 1.

### Step 4: `questionnaire-pages` — answers flow back through the API

SKILL.md: for `to-questionnaire` documents and grilling sessions. The page
is the questionnaire the recipient fills in. TEMPLATE.md body: intro card
(who it's for, the context they need — from the skill's own structure),
then question cards grouped under theme headings, most-important-first,
each with a labelled `<textarea>`; ONE submit control for the whole page.
Submit behaviour extends the §9 widget contract: serialize all Q/A pairs
into a markdown body (`## <question>\n\n<answer>` per pair, unanswered
marked `_unanswered_`), POST to `/api/artifacts/feedback` with
`kind: "answers"`, `title: "Answers: <questionnaire title>"`; on `file://`,
copy-as-issue with the same body. Filed answers land as a `needs-triage`
issue the requesting agent reads next session — closing the
questionnaire loop without new infrastructure.

**Amend `site/app/api/artifacts/feedback/route.ts`**: allowed kinds become
`"feedback" | "rfc" | "answers"` (update the validation set and the type;
nothing else). Amend DESIGN.md §9's kind list to match.

**Verify**: template greps as above; API — with the dev server on a
verified-free port, POST `kind":"answers"` → 200 + filed path;
`kind":"praise"` → 400. Delete smoke residue and say so.

### Step 5: Route the hook by path shape

In `plan-artifact-nudge.sh`, extend ONLY the python matcher and message:
map path → type — `spec.md` or under `plans/` → `plan-pages`;
`map.md` or under `issues/` → `board-pages`;
basename starts `to-questionnaire-` → `questionnaire-pages`
(also ADD that basename glob to the fire patterns — it lands in the cwd,
which the current pattern misses); everything else that already fired →
`plan-pages`. The message names the chosen skill and keeps the 013 wording
(reply contract, prose escape, "diagram-plans if the plugin is missing").
Chat-shaped outputs (code-review, grilling, research summaries) can't be
caught by a Write hook — they are covered by the mapping in DESIGN.md §11
and the CLAUDE.md rule (Step 7); do not try to hook them.

**Verify**: re-run 013's seven probes (message may differ, fire/quiet must
not) plus three new: `{"file_path":"/r/.scratch/auth/issues/03-api.md"}` →
fires naming `board-pages`; `{"file_path":"/r/to-questionnaire-caching.md"}`
→ fires naming `questionnaire-pages`; `{"file_path":"/r/src/notes.md"}` →
quiet. All exit 0.

### Step 6: Guards, taxonomy, wording, bumps

- `tools/check-plugins.sh`: add the opener-identity check (`cmp` every
  `plugins/*/bin/diagram-open` against the diagrams copy; fail on drift).
- `plugins/DESIGN.md`: append §11 "Output → artifact type" — the full
  mapping table and exempt list from Current state, verbatim.
- `CLAUDE.md` + `AGENTS.md` §Artifact responses: extend the first sentence
  to "planning, decision, review, diagnosis, research, questionnaire,
  ticket/board, or architecture request" (keep the rest byte-identical
  between the two files).
- `artifacts/README.md`: seven shipped types.
- Bump diagrams (hook changed) + marketplace entries; prettier everything.

**Verify**: `bash tools/check-plugins.sh` → pass; corrupt one opener copy
in a scratch copy → fail naming it; restore. `diff <(tail -14 CLAUDE.md)
<(tail -14 AGENTS.md)` → empty. Site gates still pass (Step 4 touched a
route): `cd site && bun run typecheck && bun run build` → exit 0.

### Step 7: Install in both agents (machine-level, after merge — worktree STOP applies)

`/plugin marketplace update second-brain` + `/plugin install
<name>@second-brain` for the four; `codex plugin marketplace upgrade` +
`codex plugin add <name>@second-brain` for the four. **Verify**: both
agents list seven `@second-brain` plugins (same probes as 013 Step 7,
expected list grows to seven).

## Test plan

- Hook: 013's seven probes + Step 5's three new = ten-case regression.
- API: the `answers`/`praise` pair in Step 4.
- End-to-end (manual, after Step 7): `/to-questionnaire` on any topic →
  page opens, answer two questions, submit against the running site →
  issue appears with the Q/A body; `/to-tickets` on a toy spec → board
  page; ask for a code review → findings page with `file:line` evidence.
- Conformance: each new template diffed against DESIGN.md §§3–9 checklist
  (tokens copied verbatim; widget block byte-identical to §9's snippet
  apart from `data-artifact` and the questionnaires' submit variant).

## Done criteria

ALL must hold:

- [ ] Four plugins exist; `tools/check-plugins.sh` passes covering seven plugins incl. opener-identity
- [ ] All four templates: zero jsDelivr, fonts present, widget present; boards+questionnaires interactive behaviours verified; reviews SKILL.md carries the REDACTED rule
- [ ] Feedback API accepts `answers`, rejects unknown kinds; site typecheck+build pass
- [ ] Hook: ten probes pass; exit 0 always; fire/quiet unchanged for the original seven
- [ ] DESIGN.md §11 mapping present incl. exempt list; CLAUDE.md/AGENTS.md wording extended and byte-identical tails
- [ ] `artifacts/README.md` lists seven shipped types; marketplace has seven entries, versions in sync
- [ ] Step 7 outputs in your report: both agents list seven plugins
- [ ] `git status --porcelain` shows only in-scope files; `plans/README.md` row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any of plans 011–013 is not DONE, or DESIGN.md §9's widget snippet is
  missing (nothing to embed).
- The questionnaire submit cannot serialize/POST from a served page after
  one fix attempt (report the console error; no CORS speculation).
- Step 5's routing cannot express a mapping without changing an original
  probe's fire/quiet result.
- Seven plugins overwhelm an agent's plugin validation (any install
  rejection — report the exact error).
- You are in a worktree at Step 7 (merge boundary).

## Maintenance notes

- The mapping table (DESIGN.md §11) is now the contract third-party skills
  are read against; when a new skill is installed, extend the table — never
  the skill.
- `improve-codebase-architecture` already emits a visual HTML report; a
  follow-up may conform its output to DESIGN.md rather than double-wrapping
  it. Deferred: it is upstream-owned.
- Questionnaire answers arrive as `needs-triage` issues; a future plan can
  auto-link them back to the questionnaire artifact page (the `Artifact:`
  line already carries the pointer).
- Reviewers should scrutinize: widget-snippet fidelity across four
  templates, the REDACTED rule, and that the hook's original corpus is
  untouched.
- Deferred: artifact types for `wizard` transcripts and merge-conflict
  reports (no reader demand yet); auto-generating a board from
  `plans/README.md` on the site (needs no plugin — a site page could parse
  the table).
