# Plan 044: ADHD-friendly authoring standard — research-backed rules every plan, spec, and summary in this repo follows

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 094fc01..HEAD -- CLAUDE.md AGENTS.md docs/agents/ plugins/diagrams/hooks/ plans/README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live files before proceeding;
> on a mismatch, treat it as a STOP condition.

## At a glance

- **What**: distill the ADHD-friendly-writing research (already done, inlined
  below) into `docs/agents/adhd-writing.md`, then wire it into the places
  that author documents: `CLAUDE.md`/`AGENTS.md`, the issue tracker doc, the
  improve skill's plan template, the artifact-nudge hooks, and
  `plans/README.md` itself — then retrofit "At a glance" blocks onto the
  not-yet-done plans (owner decision, 2026-08-27).
- **Why**: the repo owner has ADHD; documents that front-load conclusions,
  chunk aggressively, and always show one next action get read — walls of
  prose get skimmed and dropped.
- **Next action**: Step 1 — write `docs/agents/adhd-writing.md`.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx | docs
- **Planned at**: commit `094fc01`, 2026-08-27

## Why this matters

Every agent in this repo writes documents the owner must read: audit plans
(`plans/`), specs and tickets (`.scratch/<feature>/`, written by the
mattpocock skills per `docs/agents/issue-tracker.md`), wiki pages, and HTML
artifact pages. The owner has ADHD. The repo has already invested in this
constraint — the `adhd-summarize` skill
(`.claude/skills/adhd-summarize/`) and the Barkley-principles artifact
(`artifacts/diagrams/2026-08-27-barkley-principles-ai-setup.html`) — but the
knowledge lives in a summarization skill and a brainstorm, not in the
authoring path. Nothing tells the agent writing plan 051 next month to put
the conclusion first. This plan creates the single normative standard and
installs it at the point of performance (hooks and templates), which is
exactly what the owner's own Barkley artifact recommends: "docs
('knowledge') don't change behavior — help at the point of performance
does."

Plan 045 then applies the same standard to the three HTML artifact
templates; this plan is its prerequisite because 045 references the
standard doc created here.

## The research (inlined — do not re-research)

The advisor session did the research the invocation asked for. The standard
in Step 1 distills these findings; they are reproduced here so the executor
and future maintainers can trace every rule to evidence.

**Core finding — working memory, not intelligence.** ADHD readers decode
text fine but struggle to hold earlier sentences in mind long enough to
connect ideas; long texts get skimmed, and re-entry after an attention lapse
is expensive. Structure (headings, chunks, white space) acts as external
working memory. (Sources: Bedrock Learning on reading comprehension;
PMC 6966739 on working memory in ADHD; ADDitude on skim-then-forget —
full URLs in `.claude/skills/adhd-summarize/references/research.md`,
which this repo already tracks.)

**Evidence-backed techniques**, from the adhd-summarize research file plus
the advisor session's web research on neurodivergent UX
([Welcoming Web](https://welcomingweb.com/learn/designing-for-neurodiversity-adhd-ux),
[accessiBe](https://accessibe.com/blog/knowledgebase/how-to-design-digital-environments-for-people-with-neuro-divergency),
[Stéphanie Walter's cognitive-accessibility resources](https://stephaniewalter.design/blog/neurodiversity-and-ux-essential-resources-for-cognitive-accessibility/),
[Accessible Minds](https://accessiblemindstech.com/adhd-friendly-web-design-reducing-distractions-for-better-focus/))
and on ADHD task/plan design
([ADDA on time blindness](https://add.org/adhd-time-blindness/),
[Beyond BookSmart](https://www.beyondbooksmart.com/executive-functioning-strategies-blog/how-to-manage-time-blindness-with-executive-function-strategies),
[EnvisionADHD on to-do lists](https://www.envisionadhd.com/single-post/why-your-to-do-list-might-be-the-wrong-tool-for-an-adhd-brain-and-what-to-use-instead),
[Kantoko on ADHD planners](https://www.kantoko.com.au/articles/adhd-planners)):

1. **BLUF** (bottom line up front): conclusion first, detail after — the
   reader gets the payoff before attention drifts, and the conclusion
   scaffolds every detail that follows.
2. **One visible next action.** ADHD to-do research: 3–5 visible tasks max;
   a single unambiguous "start here" beats a complete but flat list.
3. **Chunk by intent**: small labeled chunks; don't mix what/why/how in one
   paragraph; ≤3 sentences per paragraph, ~5 items per group.
4. **Headings state the point** ("Vendoring Mermaid removes the CDN risk"),
   never tease it ("Mermaid considerations") — headings alone should carry
   the argument for skim-first readers.
5. **Make time concrete**: effort/size tags on tasks (time blindness —
   untagged tasks feel infinite and get deferred).
6. **Make progress visible**: status chips, N-of-M counts, done items kept
   visible — the shrinking list is the motivation loop (Barkley:
   "externalized motivation — immediate feedback, small chunks").
7. **Layered depth / progressive disclosure**: 10-second layer → 2-minute
   layer → full depth, so re-entry can happen at any layer without
   starting over.
8. **Consistency**: same template every time — the reader learns the format
   once and stops paying a parsing cost. Predictable placement > novelty.
9. **Restraint in emphasis and stimulus**: bold only load-bearing phrases;
   sparse color; no animation/autoplay; dark mode available. If everything
   is emphasized, nothing is.
10. **Concrete beats abstract**: numbers, names, file paths give attention
    something to grip; trim filler ruthlessly.

**Barkley principles** (owner's own distillation, in the artifact named
above): fix the environment at the point of performance, not the knowledge;
externalize working memory, time, and motivation; prosthetics must be
sustained — prefer wiring existing machinery over building new tools. This
plan follows that: it edits existing templates and hooks; it builds no new
tool.

## Current state

### Files in play

- `docs/agents/adhd-writing.md` — does not exist; Step 1 creates it.
- `CLAUDE.md` — repo schema. Has an `## Agent skills` section with
  subsections `### Issue tracker`, `### Artifact feedback queue`,
  `### Triage labels`, `### Domain docs`, then `## Artifact responses`.
- `AGENTS.md` — a plain-file mirror of `CLAUDE.md` (5,186 bytes, not a
  symlink). Any CLAUDE.md edit is duplicated there byte-for-byte.
- `docs/agents/issue-tracker.md` — conventions for `.scratch/` specs and
  issues. Its `## Conventions` list currently ends:
  `- Comments and conversation history append to the bottom of the file under a "## Comments" heading`
- `/home/jorden/.agents/skills/improve/references/plan-template.md` —
  the template every `/improve` plan is written from. **Outside this repo,
  not under version control** (`~/.agents` is not a git repo; the repo's
  `.claude/skills/*` symlink into it). Its template body starts:

  ```markdown
  # Plan NNN: <Imperative title — what will be true after this plan>

  > **Executor instructions**: Follow this plan step by step. ...
  ```

  and its `## Status` block is followed directly by `## Why this matters`.
  Near the end it has a `## Quality bar — check before finishing each plan`
  checklist.
- `plugins/diagrams/hooks/nudge.sh` — UserPromptSubmit hook; on
  plan/brainstorm-shaped prompts it echoes one line ending
  `Save dir: ${dir}.`
- `plugins/diagrams/hooks/plan-artifact-nudge.sh` — PostToolUse(Write)
  hook; when a `.md` file lands under `plans/`, `.scratch/`, `specs/`, or
  `tickets/` it echoes a reminder ending
  `Skip only if the user explicitly asked for prose.`
- `plugins/diagrams/.claude-plugin/plugin.json` +
  `.claude-plugin/marketplace.json` — version numbers must stay in sync
  (`tools/check-plugins.sh` enforces).
- `plans/README.md` — the plan index. Starts with the `# Implementation
  Plans` heading, a short preamble paragraph, then `## Execution order &
  status`.

### Conventions that apply

- Docs under `docs/agents/` are short, imperative, agent-facing — see
  `docs/agents/issue-tracker.md` as the exemplar. Match its tone.
- Commit messages: `<area>: <summary>` (e.g. `site: dedupe AGENTS.md from
  sidebar`, `feedback: copyable new-session prompt`). Use `docs:` /
  `plugins:` prefixes accordingly.
- `log.md` is append-only; operations use the
  `## [YYYY-MM-DD] maintenance | <title>` prefix.

## Commands you will need

| Purpose        | Command                                   | Expected on success |
| -------------- | ----------------------------------------- | ------------------- |
| Plugin checks  | `bash tools/check-plugins.sh`             | exit 0              |
| Mirror check   | `diff CLAUDE.md AGENTS.md`                | exit 0, no output   |
| Hook dry-run   | see Step 5                                | nudge line printed  |

(There is no repo-wide test suite or markdown linter; grep gates below are
the verification.)

## Scope

**In scope** (the only files you should modify or create):

- `docs/agents/adhd-writing.md` (create)
- `CLAUDE.md`, `AGENTS.md` (add one subsection, keep them identical)
- `docs/agents/issue-tracker.md` (one bullet)
- `/home/jorden/.agents/skills/improve/references/plan-template.md`
- `plugins/diagrams/hooks/nudge.sh`,
  `plugins/diagrams/hooks/plan-artifact-nudge.sh`
- `plugins/diagrams/.claude-plugin/plugin.json`,
  `.claude-plugin/marketplace.json` (version bump only)
- `plans/README.md` (At-a-glance block + status row)
- open plan files under `plans/NNN-*.md` (At-a-glance retrofit — Step 7)
- `log.md` (append one maintenance entry)

**Out of scope** (do NOT touch, even though they look related):

- The three HTML artifact templates and `plugins/DESIGN.md` — that is
  plan 045, which coordinates with plans 022/023/027.
- Plan files whose `plans/README.md` row is `DONE` — completed work is
  not retrofitted (owner decision, 2026-08-27: retrofit only the plans
  that haven't been done yet).
- `.claude/skills/adhd-summarize/` — already aligned; it is a *reader-side*
  skill and stays as is.
- Any other skill under `~/.agents/skills/` (to-spec, to-tickets,
  wayfinder, …). Their outputs are covered by the repo-level rule added to
  `CLAUDE.md` and `docs/agents/issue-tracker.md`; editing upstream skill
  bodies multiplies the maintenance surface for marginal gain.
- `wiki/` pages and `site/`.

## Git workflow

- Work on `main` (repo convention — single-owner repo; executors commit
  directly).
- One commit at the end: `docs: ADHD-friendly authoring standard (plan 044)`.
- Do NOT push.

## Steps

### Step 1: Write `docs/agents/adhd-writing.md` (the standard)

Create the file with exactly this content shape — it must itself follow its
own rules (BLUF, chunks, stated-point headings, ≤ ~90 lines). Use this as
the draft; you may tighten wording but not drop rules:

```markdown
# ADHD-friendly writing

Every document an agent writes for the human in this repo — plans, specs,
tickets, wiki pages, answers, artifact pages, README index files — follows
these rules. They exist because structure is external working memory: the
page holds the outline so the reader doesn't have to. Evidence and sources:
`.claude/skills/adhd-summarize/references/research.md` and plan
`plans/044-adhd-friendly-authoring-standard.md`.

## The ten rules

1. **Conclusion first (BLUF).** Open with ≤3 sentences: what this is, why
   it matters, what happens next. Never make the reader earn the point.
2. **One next action, always visible.** Every actionable document names
   exactly one "start here". A reader with 15 seconds leaves knowing it.
3. **Chunk by intent.** ≤3 sentences per paragraph, ~5 items per group,
   one idea per chunk. Don't mix what/why/how in one paragraph.
4. **Headings state the point.** "Vendoring Mermaid removes the CDN risk",
   not "Mermaid considerations". Headings alone must carry the argument.
5. **Tag effort.** Steps and tasks carry a size (S/M/L or minutes). An
   untagged task feels infinite and gets deferred (time blindness).
6. **Show progress.** Status per step (todo/doing/done/blocked), N-of-M
   counts. Keep done items visible — the shrinking list is the reward.
7. **Layer the depth.** 10-second TL;DR → 2-minute skim layer → full
   detail. Fold long detail so re-entry works at any layer.
8. **Same shape every time.** Reuse the repo's templates verbatim; never
   invent a new layout when an existing one fits. Predictable beats novel.
9. **Emphasis is a budget.** Bold only load-bearing phrases; sparse
   semantic color; no decorative stimulus. If everything is loud, nothing is.
10. **Concrete beats abstract.** Numbers, file paths, names, commands —
    give attention something to grip; delete filler.

## Where each rule binds

- Markdown plans/specs/tickets: rules 1–8 are the "At a glance" block,
  effort tags, and status lines their templates carry.
- HTML artifact pages: `plugins/DESIGN.md` maps these rules onto the page
  contract (TL;DR card, next-action line, status chips, folded depth).
- Summaries of external documents: the `adhd-summarize` skill already
  implements these rules reader-side.
```

**Verify**: `grep -c "^[0-9]*\." docs/agents/adhd-writing.md` → `10`;
`head -1 docs/agents/adhd-writing.md` → `# ADHD-friendly writing`.

### Step 2: Reference the standard from `CLAUDE.md` and `AGENTS.md`

In `CLAUDE.md`, under `## Agent skills`, after the `### Domain docs`
subsection, add:

```markdown
### ADHD-friendly writing

Every document written for the human — plans, specs, tickets, wiki pages,
answers, artifact pages, index files — follows `docs/agents/adhd-writing.md`:
conclusion first, one visible next action, chunked sections, stated-point
headings, effort tags, visible progress, layered depth.
```

Apply the identical edit to `AGENTS.md` (it mirrors `CLAUDE.md`).

**Verify**: `diff CLAUDE.md AGENTS.md` → exit 0 **only if the files were
identical before** — first run `diff` before editing; if they already
differ, replicate only your added block and report the pre-existing diff in
your completion note. Then
`grep -c "adhd-writing.md" CLAUDE.md AGENTS.md` → `1` in each.

### Step 3: Bind mattpocock skill outputs via the issue-tracker doc

In `docs/agents/issue-tracker.md`, append to the `## Conventions` list:

```markdown
- Spec and issue bodies follow `docs/agents/adhd-writing.md` — problem and
  next action first, chunked sections, one `Status:` line the reader can
  find without scrolling
```

**Verify**: `grep -c "adhd-writing.md" docs/agents/issue-tracker.md` → `1`.

### Step 4: Add the "At a glance" block to the improve plan template

Edit `/home/jorden/.agents/skills/improve/references/plan-template.md`:

4a. In the template body (inside the ```markdown fence), between the
`> **Drift check (run first)**: ...` blockquote and `## Status`, insert:

```markdown
## At a glance

- **What**: <one sentence — the change>
- **Why**: <one sentence — the cost of not doing it>
- **Next action**: Step 1 — <its imperative title>
```

4b. In `## Quality bar — check before finishing each plan`, add one item:

```markdown
- Does the plan follow the ADHD-friendly rules (BLUF "At a glance" filled
  in, stated-point step titles, effort on the Status block, ≤5-item
  groups)? Repo-local standard, where present: docs/agents/adhd-writing.md.
```

**Verify**:
`grep -c "At a glance" /home/jorden/.agents/skills/improve/references/plan-template.md`
→ `2` or more (template + quality bar).

### Step 5: Nudge at the point of performance (hooks)

5a. In `plugins/diagrams/hooks/nudge.sh`, extend the echoed message: after
`Save dir: ${dir}.` append
` Follow docs/agents/adhd-writing.md: conclusion first, one next action, chunked.`

5b. In `plugins/diagrams/hooks/plan-artifact-nudge.sh`, extend its echoed
message: after `Skip only if the user explicitly asked for prose.` append
` The document itself must follow docs/agents/adhd-writing.md (At-a-glance block, one next action, effort tags).`

5c. Bump the `diagrams` plugin version (patch level) in BOTH
`plugins/diagrams/.claude-plugin/plugin.json` and
`.claude-plugin/marketplace.json`.

**Verify**:
`echo '{"prompt":"plan a thing"}' | CLAUDE_PLUGIN_ROOT=plugins/diagrams bash plugins/diagrams/hooks/nudge.sh`
→ one line containing `adhd-writing.md`; then `bash tools/check-plugins.sh`
→ exit 0.

### Step 6: Give `plans/README.md` a re-entry header

Directly under the `# Implementation Plans` heading (before the existing
preamble paragraph), insert:

```markdown
## At a glance

- **Where you are**: 29 of 45 plans open; secure-baseline critical path
  `024 → 025 → 026` (+ `027`) is the front of the queue.
- **Next action**: execute the first TODO plan in Phase A below.
- **Re-entry**: each phase heading states what it achieves; read only the
  phase you're in.
```

Adjust the counts to be true at execution time (count rows in the status
table: `DONE` vs total; open = non-DONE). Keep it to these three bullets.

**Verify**: `grep -A1 "^# Implementation Plans" plans/README.md` then
`grep -c "Next action" plans/README.md` → `1`.

### Step 7: Retrofit the open plans with "At a glance" blocks

Owner decision (2026-08-27): plans not yet executed get the block; DONE
plans do not. For every file matching `plans/[0-9]*-*.md`:

- Look up its status row in `plans/README.md`.
- **Skip** if the row is `DONE`, if the row is `IN PROGRESS` (an executor
  may hold the file — list these in your completion report instead), or if
  the file already contains a `## At a glance` heading (044 and 045 do).
- Otherwise insert, between the `> **Executor instructions**: ...`
  blockquote and `## Status`:

  ```markdown
  ## At a glance

  - **What**: <one sentence — the change, distilled from that plan's "Why this matters">
  - **Why**: <one sentence — the cost of not doing it, same source>
  - **Next action**: Step 1 — <that plan's Step 1 title, verbatim>
  ```

- Distill, don't invent: every claim in the block must trace to that plan's
  own "Why this matters" or steps. Change no other line of the plan.

**Verify**:
`grep -L "^## At a glance" plans/[0-9]*-*.md` → lists exactly the files
whose README rows are `DONE` or `IN PROGRESS`, nothing else; and for a
spot-checked retrofitted file,
`git diff -- <file>` shows only the inserted block.

### Step 8: Log, index, commit

- Append to `log.md`:
  `## [<today>] maintenance | Plan 044 — ADHD-friendly authoring standard`
  with a one-line list of files touched.
- Set plan 044's row in `plans/README.md` to `DONE`.
- Commit: `docs: ADHD-friendly authoring standard (plan 044)`.

**Verify**: `git status --short` → only in-scope files staged/committed;
`grep "^## \[" log.md | tail -1` → the new entry.

## Test plan

No test suite covers docs or hooks. The gates are:

- the grep checks in each step above;
- the Step 5 hook dry-run (both hooks still exit 0 and print one line);
- `bash tools/check-plugins.sh` exit 0 after the version bump.

## Done criteria

ALL must hold:

- [ ] `docs/agents/adhd-writing.md` exists with the ten numbered rules
- [ ] `grep -l "adhd-writing.md" CLAUDE.md AGENTS.md docs/agents/issue-tracker.md` lists all three
- [ ] `CLAUDE.md` and `AGENTS.md` contain the identical new subsection
- [ ] improve plan template contains the `## At a glance` block
- [ ] both hook scripts print a message containing `adhd-writing.md` and exit 0
- [ ] `bash tools/check-plugins.sh` exits 0
- [ ] `plans/README.md` has the At-a-glance header and this plan's row is DONE
- [ ] every open (non-DONE, non-IN-PROGRESS) plan file contains exactly one
      `## At a glance` block; DONE plans are untouched (`git diff --stat`)
- [ ] no files outside the in-scope list modified (`git status`)

## STOP conditions

Stop and report back (do not improvise) if:

- `~/.agents/skills/improve/references/plan-template.md` does not contain
  the excerpts quoted in "Current state" (the skill was updated upstream —
  the insert points may have moved or the ADHD block may already exist).
- `CLAUDE.md` and `AGENTS.md` differ *within the `## Agent skills`
  section* before you edit (a half-landed change you'd be entangling).
- Plan 014's status in `plans/README.md` is `IN PROGRESS` (it edits the
  same `plan-artifact-nudge.sh` message — coordinate, don't collide; if it
  is DONE, apply 5b to the message text as it now stands).
- `tools/check-plugins.sh` fails for a reason unrelated to your version
  bump.
- More than two plans are `IN PROGRESS` when you reach Step 7 (the index
  is churning — retrofitting under it invites collisions; report instead).

## Maintenance notes

- **The template edit is un-versioned.** `~/.agents` is not a git repo;
  re-running `setup-matt-pocock-skills` or updating the skills collection
  may silently revert Step 4. The durable layers are the repo-side ones
  (CLAUDE.md rule + hooks); if the template reverts, the quality bar in the
  repo still catches it. Plan 021 (new-machine install runbook) should
  record Step 4 as part of the layer to re-apply.
- Plan 045 consumes `docs/agents/adhd-writing.md` — if you rename it or
  renumber its rules, update 045 before it executes.
- Future artifact types (plan 014) must carry the standard's page mapping
  from the start; reviewers should check new templates against rule
  bindings in `plugins/DESIGN.md` once 045 lands.
