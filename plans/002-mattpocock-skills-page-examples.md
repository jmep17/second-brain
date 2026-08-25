# Plan 002: Rewrite `wiki/mattpocock-skills-workflow.md` as an example-carrying reference with durable citations

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 3b71e42..HEAD -- wiki/mattpocock-skills-workflow.md wiki/index.md log.md`
> If either file changed since this plan was written, compare the "Current
> state" excerpts below against the live files before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `3b71e42`, 2026-08-25

## Why this matters

`wiki/mattpocock-skills-workflow.md` is an accurate map of the
`mattpocock-skills` plugin — 25 skills, who invokes each, and the order they
run in — but it is a map with no worked route on it. Every claim is a
paraphrase of a `SKILL.md`; nothing on the page shows what any skill actually
emits, so the reader still has to open the plugin to find out what a spec, a
ticket file, or a grilling round looks like. Two concrete defects follow from
that: the page has no routing entry point (you must read the whole thing to
find which skill fits your situation), and it silently omits the
phase-boundary decision tree that `ask-matt` treats as a first-class part of
the flow.

Separately, every one of the page's 33 `sources:` entries is an absolute path
into a **version-pinned plugin cache directory** (`.../mattpocock-skills/1.2.3/`).
When the plugin updates to 1.2.4 that directory is replaced and every citation
on the page dangles — a wiki page whose entire evidence base evaporates on the
next `/plugin update`. This plan re-points citations at the upstream repository
at a pinned commit, which is immutable.

After this lands: a reader can route themselves in one table, see a real
artifact for every skill that produces one, follow one end-to-end worked
example, and every citation still resolves after the plugin updates.

## Current state

### Files in play

- `wiki/mattpocock-skills-workflow.md` — the page being rewritten. 183 lines.
  `type: answer`, created and updated `2026-08-25`. Frontmatter `sources:` is a
  33-entry list of absolute local paths (lines 6–39).
- `wiki/index.md` — the catalog. The page's one-line entry is the last line
  under `## Answers`.
- `log.md` — append-only operations log. The last entry is the
  `[2026-08-25] answer | mattpocock-skills plugin: skill list and workflow order`
  block.
- `CLAUDE.md` — repo schema. Governs frontmatter, wikilinks, citation style,
  index upkeep, and the log format. Read it before editing.

### What the page looks like today

Frontmatter (`wiki/mattpocock-skills-workflow.md:1-40`), abridged:

```yaml
---
title: mattpocock-skills Plugin Workflow
type: answer
created: 2026-08-25
updated: 2026-08-25
sources:
  [
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/.claude-plugin/plugin.json",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/README.md",
    ... 31 more entries,
    all under the same 1.2.3 cache directory ...,
  ]
---
```

Its current top-level headings, in order:

```
# mattpocock-skills Plugin Workflow
## What's actually in the plugin
## The invocation axis (not a phase — a permission split)
## Full skill list, grouped as the plugin groups them
### Engineering — user-invoked (…)
### Engineering — model-invoked (…)
### Productivity — user-invoked (…)
### Productivity — model-invoked (…)
### Not in the plugin (present in repo, excluded from `plugin.json`)
## Order of use — the "main flow"
## Branches off the main flow
## wayfinder's internal ticket types
## Why the ordering exists (rationale, not just sequence)
## Notes on gaps / unverifiable claims
```

A representative inline citation, as written today
(`wiki/mattpocock-skills-workflow.md`, "Order of use" section):

```markdown
**Step 0 — once per repo:** `setup-matt-pocock-skills` — "run before your first
engineering flow to configure the issue tracker, triage labels, and doc layout the
other skills assume" (`ask-matt/SKILL.md` line 90; also stated in
`skills/engineering/README.md` line 13 and top-level `README.md` line 198).
```

### Repo conventions this page must follow

From `CLAUDE.md`:

- Frontmatter keys are exactly `title`, `type`, `created`, `updated`, `sources`.
  `type` is one of `source-summary | entity | concept | synthesis | answer`.
  This page stays `answer`.
- "Link between pages with Obsidian wikilinks: `[[attention-mechanisms]]`."
- "Cite raw sources inline where a claim comes from, e.g.
  `([source](../raw/some-article.md))`."
- "Keep `index.md` complete — every wiki page appears in it exactly once."
- "Never modify anything in `raw/`."
- Log entries use the grep-able prefix
  `## [YYYY-MM-DD] <op> | <Title>` where op ∈
  `ingest | query | lint | answer | maintenance`.
- "Commit after each ingest or lint session with a short message."

Formatting is enforced by Prettier (`.prettierrc`: `printWidth: 80`,
`tabWidth: 2`, no tabs) via a Husky `pre-commit` hook running
`bunx lint-staged` with `{"*": "prettier --ignore-unknown --write"}`.
`.prettierignore` contains only `raw/`, so `wiki/` **is** formatted. Prettier's
default `proseWrap` is `preserve`, so it will not rewrap your paragraphs, but it
**will** normalise markdown tables — expect table pipes to be realigned on
commit and do not fight it.

An exemplar of the house voice and citation density to match:
`wiki/tmux-pane-keybindings.md` (short, table-led, every claim carrying its
source).

### The plugin, as installed on this machine

Facts verified during planning — do not re-derive them, but do re-check the
version (Step 1):

- Install path:
  `/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/`
- Registered in `/Users/jorden/.claude/plugins/installed_plugins.json` as
  version `1.2.3`, `gitCommitSha` `84fdeffd12f2ee307994d1eb6feb48173b6e0502`,
  installed `2026-08-13`.
- Upstream repository, from `.claude-plugin/plugin.json`:
  `https://github.com/mattpocock/skills`.
- `.claude-plugin/plugin.json` lines 21–47 register exactly **25** skills.

## Commands you will need

| Purpose            | Command                                                                  | Expected on success                 |
| ------------------ | ------------------------------------------------------------------------ | ----------------------------------- |
| Format check       | `bunx prettier --check wiki/mattpocock-skills-workflow.md wiki/index.md` | exit 0, "All matched files use..."  |
| Format write       | `bunx prettier --write wiki/mattpocock-skills-workflow.md wiki/index.md` | exit 0                              |
| Confirm plugin ver | `cat /Users/jorden/.claude/plugins/installed_plugins.json`               | shows a `mattpocock-skills` entry   |
| Resolve a citation | `ls <plugin-root>/skills/engineering/ask-matt/SKILL.md`                  | path exists                         |
| Line-check a quote | `sed -n '<N>p' <plugin-root>/skills/engineering/ask-matt/SKILL.md`       | prints the line you are citing      |
| Scope check        | `git status --porcelain`                                                 | only the four in-scope files listed |

There is no test suite, typechecker, or linter in this repo beyond Prettier —
`package.json` has one script (`prepare: husky`). Prettier plus the greps in
"Done criteria" are the whole verification surface. Do not add tooling.

## Suggested executor toolkit

- Read `CLAUDE.md` at the repo root in full before editing. It is short and it
  is the schema you are being graded against.
- Read `wiki/tmux-pane-keybindings.md` as the tone exemplar.
- You will be reading many files under the plugin root. Resolve the root once
  (Step 1) into a shell variable and reuse it.

## Scope

**In scope** (the only files you may modify):

- `wiki/mattpocock-skills-workflow.md` (rewrite)
- `wiki/index.md` (update the one existing entry's summary line)
- `log.md` (append one entry at the end)
- `plans/README.md` (update this plan's status row)

**Out of scope** (do NOT touch, even though they look related):

- Anything under `raw/` — immutable by repo rule.
- Anything under the plugin cache directory
  (`/Users/jorden/.claude/plugins/...`). It is a read-only managed install and
  not part of this repository. You read from it; you never write to it.
- `CLAUDE.md` — the schema is not being changed by this plan.
- `plans/001-fumadocs-wiki-site.md` — unrelated, in progress.
- The other wiki pages (`dotfiles-*.md`, `tmux-pane-keybindings.md`). You may
  read them; do not edit them.
- Do **not** create new wiki pages. The examples belong on this page.

## Git workflow

- Work directly on `main` — this repo has no branch convention
  (`git log --oneline` shows a single linear history on `main`).
- One commit at the end. Message style follows the existing log, which uses an
  operation prefix: `git log --oneline` shows `answer: mattpocock-skills plugin workflow order`,
  `query: tmux pane keybindings`, `ingest: dotfiles-bare-git-repo`.
  Use: `answer: mattpocock-skills workflow examples + durable citations`
- The pre-commit hook will run Prettier and may restage files. That is expected.
- Do not push and do not open a PR.

## Steps

### Step 1: Resolve the plugin root and confirm the version

Do not assume `1.2.3`. Run:

```bash
ls -d /Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/*/
```

Take the single directory it prints as `<plugin-root>` for the rest of this
plan, and read the version and `gitCommitSha` out of
`/Users/jorden/.claude/plugins/installed_plugins.json`.

- If the version is still `1.2.3` with sha `84fdeffd12f2ee307994d1eb6feb48173b6e0502`,
  every excerpt in this plan is current — continue.
- If the version differs, **STOP and report** (see STOP conditions). A newer
  plugin means the line numbers this plan quotes are unreliable and the page
  needs re-verification, not a mechanical rewrite.

**Verify**: `ls <plugin-root>/.claude-plugin/plugin.json` → path exists, and the
version string in `installed_plugins.json` matches the directory name.

### Step 2: Decide the citation scheme

Two schemes, in preference order.

**Preferred — upstream permalinks.** Base URL:

```
https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/
```

(substitute the `gitCommitSha` you read in Step 1). A commit-pinned GitHub URL
is immutable, so it survives plugin updates.

Check that the base resolves before committing to it:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/README.md
```

- `200` → use the permalink scheme.
- `404`, or no network access → **fall back** to scheme B below. Do not retry
  more than twice, and do not go hunting for an alternative mirror.

**Fallback (scheme B) — repo-relative paths plus a stated pin.** Cite files as
repo-relative paths (`skills/engineering/ask-matt/SKILL.md:17`) and state the
pin once, in a "Source of truth" note directly under the H1:

```markdown
> **Source of truth.** All citations below are paths inside the
> `mattpocock/skills` repository (<https://github.com/mattpocock/skills>), read
> at plugin version **1.2.3**, commit `84fdeff`. On this machine that tree is
> installed read-only at
> `~/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/`;
> that path is version-pinned and will move when the plugin updates, so the
> repo-relative path plus the commit is the durable reference.
```

Either way, that "Source of truth" note goes on the page. Under the preferred
scheme the inline citations become links; under the fallback they stay bare
paths. **Record which scheme you used** in the log entry (Step 8).

**Verify**: you can state, in one sentence, which scheme you chose and why.

### Step 3: Rewrite the frontmatter

Replace the 33-entry absolute-path `sources:` list with a short list under the
chosen scheme, and bump `updated`. Keep `created` unchanged.

Target (permalink scheme shown; under scheme B use repo-relative paths):

```yaml
---
title: mattpocock-skills Plugin Workflow
type: answer
created: 2026-08-25
updated: 2026-08-25
sources:
  [
    "https://github.com/mattpocock/skills/tree/84fdeffd12f2ee307994d1eb6feb48173b6e0502",
    "skills/engineering/ask-matt/SKILL.md",
    "skills/engineering/ask-matt/PHASE-BOUNDARIES.md",
    "skills/engineering/to-spec/SKILL.md",
    "skills/engineering/to-tickets/SKILL.md",
    "skills/engineering/tdd/SKILL.md",
    "skills/engineering/wayfinder/SKILL.md",
    "skills/engineering/diagnosing-bugs/SKILL.md",
    "skills/productivity/grilling/SKILL.md",
    ".agents/invocation.md",
    ".claude-plugin/plugin.json",
    "README.md",
    "docs/agents/issue-tracker.md",
    "docs/agents/triage-labels.md",
  ]
---
```

Note the last two entries are **this repo's own** `docs/agents/` files — they
are cited by the new "How this repo is already wired" section (Step 6f).

Rationale for shortening: the old list enumerated all 25 `SKILL.md` files
whether or not the page quoted them. The list should name what the page
actually cites.

**Verify**: `head -25 wiki/mattpocock-skills-workflow.md` → frontmatter is valid
YAML, `updated: 2026-08-25`, no string in `sources` starts with
`/Users/jorden/.claude/plugins`.

### Step 4: Preserve the existing body

Everything currently on the page is verified and stays. Do not delete or
rewrite these sections' claims:

- `## What's actually in the plugin`
- `## The invocation axis (not a phase — a permission split)`
- `## Full skill list, grouped as the plugin groups them` (all five subsections,
  including the four tables and "Not in the plugin")
- `## Order of use — the "main flow"`
- `## Branches off the main flow`
- `## wayfinder's internal ticket types`
- `## Why the ordering exists (rationale, not just sequence)`
- `## Notes on gaps / unverifiable claims`

Your only edits to them are **mechanical**: rewrite each inline citation into
the Step 2 scheme (e.g. `` `ask-matt/SKILL.md` line 17 `` becomes
`` `skills/engineering/ask-matt/SKILL.md:17` `` or the permalink form). Do not
change any quoted text, any line number, or any claim.

**Verify**:
`grep -c 'SKILL.md' wiki/mattpocock-skills-workflow.md` → a non-zero count, and
`grep -n 'plugins/cache' wiki/mattpocock-skills-workflow.md` → matches only
inside the "Source of truth" note (at most one line).

### Step 5: Add the routing table, directly under the H1 and the Source-of-truth note

New section, placed **before** `## What's actually in the plugin`. It is the
entry point: a reader with a situation finds their row and leaves.

Every row's right-hand column is sourced from
`skills/engineering/ask-matt/SKILL.md`. Use exactly these rows and these
citations:

```markdown
## Start here — situation → skill

| Your situation                                                     | Reach for                                                  | Source                    |
| ------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------- |
| First time using these skills in this repo                         | `/setup-matt-pocock-skills`                                | `ask-matt/SKILL.md:88-90` |
| You have an idea, you're in a repo, you want it built              | `/grill-with-docs`                                         | `ask-matt/SKILL.md:17`    |
| Same, but there's no repo (a plan, a design, some writing)         | `/grill-me`                                                | `ask-matt/SKILL.md:77`    |
| A question needs a runnable answer (state, logic, a UI to see)     | `/handoff` → `/prototype` → `/handoff`                     | `ask-matt/SKILL.md:18-21` |
| Grilling is done, the build spans multiple sessions                | `/to-spec` → `/to-tickets` → `/implement` per ticket       | `ask-matt/SKILL.md:23`    |
| Grilling is done, it fits in this window                           | `/implement` right here                                    | `ask-matt/SKILL.md:24`    |
| You want one concrete behaviour built test-first, no spec          | `/tdd`                                                     | `ask-matt/SKILL.md:26`    |
| You want an existing branch or PR reviewed                         | `/code-review`                                             | `ask-matt/SKILL.md:26`    |
| Bug reports and requests you didn't write are piling up            | `/triage`                                                  | `ask-matt/SKILL.md:38`    |
| Something's broken and resisted a first glance                     | `/diagnosing-bugs`                                         | `ask-matt/SKILL.md:42`    |
| The effort is too big to hold in one session; the way isn't clear  | `/wayfinder`                                               | `ask-matt/SKILL.md:44-46` |
| Spare moment, want the codebase kept good for agents               | `/improve-codebase-architecture`                           | `ask-matt/SKILL.md:52`    |
| A word in the project is doing three jobs                          | `/domain-modeling`                                         | `ask-matt/SKILL.md:58`    |
| You're unsure what shape a module or its interface should be       | `/codebase-design`                                         | `ask-matt/SKILL.md:59`    |
| You're mid-merge, staring at conflict markers                      | `/resolving-merge-conflicts`                               | `ask-matt/SKILL.md:79`    |
| You need facts from outside the repo before you can decide         | `/research`                                                | `ask-matt/SKILL.md:81`    |
| The blocker is in someone else's head                              | `/to-questionnaire`                                        | `ask-matt/SKILL.md:82`    |
| The next step is one only a human can take (credentials, a portal) | `/wizard`                                                  | `ask-matt/SKILL.md:83`    |
| The agent just said something that didn't land                     | `/wait-what`                                               | `ask-matt/SKILL.md:84`    |
| You're at a phase boundary and don't know whether to compact       | see [Phase boundaries](#phase-boundaries-the-five-options) | `ask-matt/SKILL.md:61-71` |
```

Before writing each row, spot-check at least five of the cited line numbers
with `sed -n '<N>p' <plugin-root>/skills/engineering/ask-matt/SKILL.md` and
confirm the line is about the skill the row names. If a spot-check fails, treat
it as drift and STOP.

**Verify**: `grep -n 'Start here — situation → skill' wiki/mattpocock-skills-workflow.md`
→ exactly one match, and it appears before the `## What's actually in the plugin`
line number.

### Step 6: Add the example sections

These are the substance of this plan. Add them in the order below. Every
example is either **quoted from a plugin file** (cite it) or **explicitly
labelled as constructed** — never presented as a transcript that happened.

#### 6a. `## Phase boundaries — the five options`

Place after `## Branches off the main flow`. This closes a real gap: the current
page never mentions `ask-matt/PHASE-BOUNDARIES.md`, which `ask-matt/SKILL.md:71`
points at.

Content, sourced from `skills/engineering/ask-matt/PHASE-BOUNDARIES.md`:

- Open with the definition (`PHASE-BOUNDARIES.md:3`): a phase ends when you
  think _"ok, we're done with that"_, and the boundary is the only place the
  decision belongs.
- Reproduce the five-option table (`PHASE-BOUNDARIES.md`, "## The five options"):
  Continue / `/clear` / `/handoff` / Subagent / `/compact`, with each row's
  "what it does" text.
- Then the tree as a numbered list, first-yes-wins, one line each:
  1. Can you continue here? Yes if the next phase needs this one as a primary
     source, or the smart zone (~150k tokens) has room.
  2. Is this context irrelevant to what's next? → `/clear`. Cheapest move; the
     old session stays resumable. Getting it wrong is one-way — you lose the
     _why_.
  3. Do you need portability — new harness, new directory, a colleague, or a
     mid-phase fork? → `/handoff`. "That list is the whole clause."
  4. Can it run AFK, tightly scoped, no steering? → subagent.
  5. Otherwise `/compact`, and pass it an instruction. It is "the **default**,
     not the first reach."
- Close with the failure mode, quoted: starting at `/compact` gives you "a fresh
  session that is confidently wrong about a decision the summary flattened."

#### 6b. `## What each skill actually emits`

Place after the phase-boundaries section. This is the artifact gallery. Give
each of the following its own `###` subsection with the artifact in a fenced
block and a one-line citation.

**A grilling round** — quote the required question format verbatim from
`skills/productivity/grilling/SKILL.md:12-16`:

````markdown
```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```
````

State the two rules that make the format work, cited to
`grilling/SKILL.md:8` and `:20`: ask the **whole frontier** in one numbered
round then wait; and "Finding _facts_ is your job, never the user's" — the agent
dispatches a sub-agent for anything it could look up, and only the questions
downstream of that exploration wait.

**A spec** — reproduce the section skeleton of `<spec-template>` from
`skills/engineering/to-spec/SKILL.md:21-71`: Problem Statement, Solution, User
Stories, Implementation Decisions, Testing Decisions, Out of Scope, Further
Notes. Include the user-story format line verbatim
(`1. As an <actor>, I want a <feature>, so that <benefit>`) and the worked
example the skill itself ships:

> 1. As a mobile bank customer, I want to see balance on my accounts, so that I
>    can make better informed decisions about my spending

Add the defining constraint, cited to `to-spec/SKILL.md:7`: it does **not**
interview you — "just synthesize what you already know."

**A ticket file** — reproduce `<local-ticket-template>` verbatim from
`skills/engineering/to-tickets/SKILL.md`:

````markdown
```markdown
# <NN> — <Ticket title>

**What to build:** the end-to-end behaviour this ticket makes work, from the user's perspective — not a layer-by-layer implementation list.

**Blocked by:** the numbers/titles of the tickets that gate this one, or "None — can start immediately".

**Status:** ready-for-agent

- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2
```
````

Note the placement rule, cited to `to-tickets/SKILL.md`: one file per ticket at
`.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in
dependency order, "never a single combined file"; and the content rule — "avoid
specific file paths or code snippets — they go stale fast," with the single
exception of a decision-encoding snippet from a prototype.

**A wayfinder map** — describe the two-file shape, citing **this repo's**
`docs/agents/issue-tracker.md` ("Wayfinding operations") because that file is
what actually configures the local tracker here: `map.md` with Notes /
Decisions-so-far / Fog, child tickets at `.scratch/<effort>/issues/NN-<slug>.md`
carrying `Type:` (`research`/`prototype`/`grilling`/`task`) and `Status:`
(`claimed`/`resolved`), a `Blocked by: NN, NN` line, and the resolve ritual
(append `## Answer`, set `Status: resolved`, append a pointer to the map's
Decisions-so-far).

**A triage state line** — show the `Status:` line convention from this repo's
`docs/agents/issue-tracker.md` and reproduce the five canonical roles from
`docs/agents/triage-labels.md`: `needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`.

**A test that `/tdd` would reject** — quote the tautological anti-pattern
verbatim from `skills/engineering/tdd/SKILL.md:31`, including the example
`expect(add(a, b)).toBe(a + b)`, and the reason: the assertion recomputes the
expected value the way the code does, "so it passes by construction and can
never disagree with the code." Pair it with the horizontal-slicing anti-pattern
(`tdd/SKILL.md:32`) and the vertical-slice alternative — one test, one
implementation, each test a **tracer bullet**.

**A shared-language win** — reproduce the before/after from the plugin's
top-level `README.md`, "#2: The Agent Is Way Too Verbose":

> - **BEFORE**: "There's a problem when a lesson inside a section of a course is
>   made 'real' (i.e. given a spot in the file system)"
> - **AFTER**: "There's a problem with the materialization cascade"

This is the single most concrete illustration of why `/grill-with-docs` writes
`CONTEXT.md`, and the page currently only asserts the benefit abstractly.

#### 6c. `## A worked run through the main flow`

Place after the artifact gallery. **Label it explicitly as constructed** — open
with a sentence like: "Constructed illustration, not a transcript: the sequence
and the artifact shapes are sourced as cited; the feature is a stand-in."

Use a feature from this repo so it stays concrete: adding the Fumadocs wiki site
described in `plans/001-fumadocs-wiki-site.md`. Walk the seven beats, each one
line, each naming the artifact it leaves behind:

1. `/setup-matt-pocock-skills` (once, already done here — it produced
   `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`,
   `docs/agents/domain.md`).
2. `/grill-with-docs` — rounds of `❓ Q1 … ➡️ recommendation` until the frontier
   empties; leaves sharpened terms in `CONTEXT.md` and any hard-to-reverse
   choice as an ADR.
3. Branch: a "what should the sidebar feel like" question can't be settled on
   paper → `/handoff` out, `/prototype`, `/handoff` back.
4. Multi-session? Yes → `/to-spec` publishes `.scratch/fumadocs-site/spec.md`.
5. `/to-tickets` splits it into `.scratch/fumadocs-site/issues/01-*.md`,
   `02-*.md`, … each with its `Blocked by:` line.
6. `/clear`, then `/implement` on ticket `01` — which drives `/tdd` one
   red-green slice at a time and closes with `/code-review`.
7. Repeat 6 per ticket, clearing between each.

Then add the context-hygiene rule as a callout, cited to
`ask-matt/SKILL.md:30-32`: keep beats 2–5 in **one unbroken context window** —
do not compact or clear until after `/to-tickets` — and if you approach the
smart zone before then, compact at the nearest phase boundary rather than
pushing on degraded.

#### 6d. `## Invocation, by example`

Short section illustrating the user-invoked / model-invoked split the page
already describes in prose. Show the two frontmatter shapes, quoting real
files:

- User-invoked, from `skills/engineering/grill-with-docs/SKILL.md:1-5` — note
  `disable-model-invocation: true` and the human-facing description.
- Model-invoked, from `skills/productivity/grilling/SKILL.md:1-4` — no
  `disable-model-invocation`, and the description carries trigger phrasing
  ("Use when the user wants to stress-test their thinking, or uses any 'grill'
  trigger phrases").

Then the consequence, quoted from `.agents/invocation.md:8`: "A user-invoked
skill may invoke model-invoked skills, but it can never reach another
user-invoked skill." Illustrate with the real case already on the page:
`/grill-with-docs` is a seven-line file whose whole body is "Run a `/grilling`
session, using the `/domain-modeling` skill" — both of those are model-invoked,
which is exactly why it can reach them.

#### 6e. `## How thin some of these skills are`

Two-sentence section with one table. It is a genuinely useful observation for a
reader deciding whether to adopt them, and it is verifiable:

| Skill             | `SKILL.md` lines | Body                                                      |
| ----------------- | ---------------- | --------------------------------------------------------- |
| `grill-with-docs` | 7                | One sentence: run `/grilling` with `/domain-modeling`     |
| `research`        | 12               | Three numbered instructions for a background agent        |
| `implement`       | 15               | Five lines: use `/tdd`, typecheck, `/code-review`, commit |
| `handoff`         | 16               | Write a portable doc; redact secrets; don't duplicate     |
| `grilling`        | 22               | The frontier/rounds primitive                             |
| `tdd`             | 38               | Good tests, seams, anti-patterns, rules of the loop       |
| `diagnosing-bugs` | 140              | Six gated phases                                          |

Re-verify every number with `wc -l` before writing the table — do not copy these
figures on trust:

```bash
for f in grill-with-docs research implement tdd diagnosing-bugs; do
  wc -l "<plugin-root>/skills/engineering/$f/SKILL.md"
done
for f in handoff grilling; do
  wc -l "<plugin-root>/skills/productivity/$f/SKILL.md"
done
```

Draw the conclusion in one line: the orchestration skills are thin on purpose —
the weight lives in the model-invoked primitives they call, which is what makes
the set composable rather than a framework.

#### 6f. `## How this repo is already wired`

Short closing section. This vault has already run
`/setup-matt-pocock-skills` — the evidence is `docs/agents/` and the pointers in
`CLAUDE.md` under "## Agent skills". Name the three files and what each decides:

- `docs/agents/issue-tracker.md` — issues are local markdown under
  `.scratch/<feature>/`, spec at `spec.md`, one file per ticket under `issues/`.
- `docs/agents/triage-labels.md` — the five canonical roles map 1:1 to
  themselves here.
- `docs/agents/domain.md` — `CONTEXT.md` at the root, ADRs under `docs/adr/`,
  and the instruction to **proceed silently** when they don't exist (they don't
  yet, in this repo).

Note the one open thread plainly: neither `CONTEXT.md` nor `docs/adr/` nor
`.scratch/` exists here yet, so no flow past `/grill-with-docs` has actually
been run in this vault. State it as fact, not as a to-do.

**Verify for all of Step 6**: every fenced block you added is either quoted from
a file you opened, or sits under a heading/sentence that labels it constructed.
Run
`grep -n '^## ' wiki/mattpocock-skills-workflow.md`
and confirm all six new sections are present and in the specified order.

### Step 7: Update `wiki/index.md`

The page already has an entry under `## Answers`. Replace only its summary text
so it advertises the examples. Target line:

```markdown
- [[mattpocock-skills-workflow]] — full skill list, invocation model, the main flow and its branches, the phase-boundary tree, and worked examples of what each skill emits (grilling round, spec, ticket file, wayfinder map, triage state) for the mattpocock-skills Claude Code plugin.
```

Do not add a second entry (`CLAUDE.md`: every page appears exactly once). Do not
change `updated:` in `index.md`'s frontmatter to anything other than
`2026-08-25`.

**Verify**: `grep -c 'mattpocock-skills-workflow' wiki/index.md` → `1`.

### Step 8: Append the log entry

Append to the **end** of `log.md`. Never edit an existing entry.

```markdown
## [2026-08-25] answer | mattpocock-skills workflow page: examples + durable citations

- Rewrote wiki/mattpocock-skills-workflow.md: added a situation→skill routing table, the phase-boundary five-option tree (from ask-matt/PHASE-BOUNDARIES.md, previously missing), an artifact gallery (grilling round, spec template, local ticket file, wayfinder map, triage state line, tdd anti-pattern, CONTEXT.md before/after), a constructed end-to-end walkthrough, an invocation-by-example section, a SKILL.md line-count table, and a note on how this repo is already wired via docs/agents/.
- Re-pointed all citations from the version-pinned local cache path (.../mattpocock-skills/1.2.3/) to <SCHEME USED — permalinks at commit 84fdeff, or repo-relative paths plus a stated pin>; the old paths would have dangled on the next plugin update.
- No claims changed; the previous body's verified statements were preserved and only their citations reformatted.
- Updated wiki/index.md.
```

Replace `<SCHEME USED …>` with what you actually did in Step 2.

**Verify**: `grep '^## \[' log.md | tail -1` → prints the new entry's heading.

### Step 9: Format, scope-check, commit

```bash
bunx prettier --write wiki/mattpocock-skills-workflow.md wiki/index.md log.md plans/README.md
bunx prettier --check wiki/mattpocock-skills-workflow.md wiki/index.md log.md plans/README.md
git status --porcelain
```

`git status --porcelain` must list only the four in-scope files (plus any
pre-existing untracked entries such as `.obsidian/`, which you leave alone).

Then update this plan's row in `plans/README.md` to `DONE`, and commit:

```bash
git add wiki/mattpocock-skills-workflow.md wiki/index.md log.md plans/README.md
git commit -m "answer: mattpocock-skills workflow examples + durable citations"
```

Do not push.

**Verify**: `git show --stat HEAD` → exactly four files changed.

## Test plan

There is no test framework in this repo. The equivalent is a citation audit —
do it before Step 9.

1. **Every quoted string is real.** For each verbatim quotation you added, run
   `grep -F '<the quoted string>' <plugin-root>/<cited file>` and confirm a hit.
   A quotation with no hit is a fabrication — fix or drop it.
2. **Every cited line number is right.** For each `file:N` citation, run
   `sed -n '<N>p' <plugin-root>/<file>` and confirm the line supports the claim.
   Off-by-a-few from a whitespace difference is acceptable if the surrounding
   lines carry the claim; a citation pointing at unrelated content is not.
3. **No dangling local paths.** `grep -n 'plugins/cache' wiki/mattpocock-skills-workflow.md`
   returns at most one line, inside the "Source of truth" note.
4. **Wikilinks resolve.** For every `[[name]]` on the page, `ls wiki/name.md`
   must succeed. (You are not required to add any; if you add none, this check
   passes vacuously.)
5. **Frontmatter parses.** The `sources:` flow-sequence is valid YAML — no
   unescaped `#`, every entry double-quoted.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bunx prettier --check wiki/mattpocock-skills-workflow.md wiki/index.md log.md plans/README.md` exits 0
- [ ] `grep -c 'plugins/cache' wiki/mattpocock-skills-workflow.md` returns `0` or `1`
- [ ] `grep -c '^## ' wiki/mattpocock-skills-workflow.md` returns at least `14` (8 preserved + 6 new)
- [ ] `grep -q 'Start here — situation → skill' wiki/mattpocock-skills-workflow.md` exits 0
- [ ] `grep -q 'Phase boundaries' wiki/mattpocock-skills-workflow.md` exits 0
- [ ] `grep -q 'materialization cascade' wiki/mattpocock-skills-workflow.md` exits 0
- [ ] `grep -q 'expect(add(a, b))' wiki/mattpocock-skills-workflow.md` exits 0
- [ ] `grep -q 'Constructed illustration' wiki/mattpocock-skills-workflow.md` exits 0
- [ ] `grep -c 'mattpocock-skills-workflow' wiki/index.md` returns `1`
- [ ] `grep '^## \[' log.md | tail -1` shows the new `answer |` entry
- [ ] `git show --stat HEAD` lists exactly four files
- [ ] `plans/README.md` row for 002 reads `DONE`
- [ ] The citation audit in "Test plan" ran, and every quotation was found in
      its cited file

## STOP conditions

Stop and report back (do not improvise) if:

- **The plugin version is not `1.2.3`** (Step 1). Every line number in this plan
  was verified against 1.2.3 at commit `84fdeff`. A different version means the
  page needs re-verification against the new tree, which is a different job than
  this plan.
- **A spot-checked line number doesn't match** what this plan says is there
  (Steps 5, 6, and the citation audit) — the tree has drifted.
- **`wiki/mattpocock-skills-workflow.md` no longer matches the "Current state"
  headings list** — someone else has edited it since this plan was written.
- **`curl` to GitHub fails and you cannot determine whether the permalink base
  resolves.** Do not guess: fall back to scheme B, and say so in the log. (This
  one is a documented fallback, not a stop — proceed.)
- **You find yourself wanting to edit a file outside the four in scope** —
  especially anything under `raw/` or under the plugin cache directory.
- **You cannot find a source for an example you want to include.** Drop the
  example rather than inventing one. An unsourced example on this page is worse
  than a missing one; the whole value of the page is that every claim traces.
- A verification command fails twice after a reasonable fix attempt.

## Maintenance notes

For whoever owns this page next:

- **The page is pinned to plugin 1.2.3 / commit `84fdeff`.** When
  `/plugin update` bumps the version, the line numbers in every citation go
  stale even though the URLs still resolve. The re-verification job is
  mechanical: re-run the citation audit from "Test plan" against the new tree
  and fix the drifted numbers. Consider doing it as part of `/lint`.
- **Line-number citations are the fragile part; the quoted strings are not.**
  If maintaining line numbers becomes tiresome, the cheaper convention is to
  cite file + section heading instead. That is a deliberate trade — worse
  precision, much better durability — and it is not made by this plan.
- **The "How this repo is already wired" section will go stale first.** It
  states that `CONTEXT.md`, `docs/adr/`, and `.scratch/` do not exist in this
  vault. The moment any flow past `/grill-with-docs` is actually run here, that
  sentence is wrong. Whoever runs it should update the section in the same
  session.
- **What a reviewer should scrutinise**: that no example is presented as a
  transcript of something that happened (only the walkthrough is illustrative,
  and it says so), and that the preserved sections' claims are byte-identical to
  before apart from citation reformatting —
  `git diff HEAD~1 -- wiki/mattpocock-skills-workflow.md` should show citation
  churn plus additions, not rewritten claims.

### Deliberately deferred

- **Snapshotting the plugin's docs into `raw/`.** That would make citations
  fully self-contained rather than depending on GitHub or the local install. It
  was considered and left out: `raw/` is for sources the human curates, 25
  `SKILL.md` files is a large import, and the upstream commit pin already gives
  immutability. Revisit if the upstream repo ever goes private or disappears.
- **Splitting the artifact gallery into its own `concept` page.** The gallery is
  useful on its own, but the page is still readable at this length, and a split
  costs a round of cross-linking. Do it if the page grows past roughly 400 lines.
- **Cross-links to other wiki pages.** There is currently no other page in this
  vault this one relates to, so the page carries no `[[wikilinks]]`. That is a
  gap in the vault, not in the page — it closes on its own as more agent-tooling
  pages get filed.
