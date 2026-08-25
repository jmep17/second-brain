---
title: mattpocock-skills Plugin Workflow
type: answer
created: 2026-08-25
updated: 2026-08-25
sources:
  [
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/.claude-plugin/plugin.json",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/README.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/CONTEXT.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/.agents/invocation.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/README.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/productivity/README.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/misc/README.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/in-progress/README.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/deprecated/README.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/ask-matt/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/code-review/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/codebase-design/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/diagnosing-bugs/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/domain-modeling/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/grill-with-docs/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/implement/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/improve-codebase-architecture/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/prototype/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/research/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/resolving-merge-conflicts/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/setup-matt-pocock-skills/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/tdd/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/to-spec/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/to-tickets/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/triage/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/wayfinder/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/wizard/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/productivity/grill-me/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/productivity/grilling/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/productivity/handoff/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/productivity/teach/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/productivity/to-questionnaire/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/productivity/wait-what/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/productivity/writing-for-agents/SKILL.md",
  ]
---

# mattpocock-skills Plugin Workflow

**Question:** For the `mattpocock-skills` Claude Code plugin (installed at
`/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/`),
what skills does it ship, what order are they used in, and when does each fire?

## What's actually in the plugin

`.claude-plugin/plugin.json` (lines 21–47) registers exactly **25 skills**, all from
`skills/engineering/` and `skills/productivity/`. `skills/misc/`, `skills/in-progress/`,
and `skills/deprecated/` exist in the repo but are **not** in `plugin.json`'s skill
list, so they don't ship with the Claude Code plugin (confirmed by
`skills/in-progress/README.md` line 3: "excluded from the plugin"; `skills/misc/README.md`
line 3: "not promoted in the plugin"; `skills/deprecated/README.md` — currently empty).

## The invocation axis (not a phase — a permission split)

`.agents/invocation.md` (lines 3–8) defines two kinds of skill:

- **User-invoked** — reachable only by the human typing the slash command
  (`disable-model-invocation: true` in frontmatter). Description is human-facing.
- **Model-invoked** — reachable by the model reaching for it automatically, or by the
  user. Description carries trigger phrasing.

Rule (line 8): "A user-invoked skill may invoke model-invoked skills, but it can never
reach another user-invoked one."

## Full skill list, grouped as the plugin groups them

### Engineering — user-invoked (`skills/engineering/README.md` lines 5–17)

| Skill                           | Purpose                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| `ask-matt`                      | Router — asks which skill/flow fits your situation                         |
| `grill-with-docs`               | Grilling interview that also builds `CONTEXT.md`/ADRs                      |
| `triage`                        | Moves issues through a triage-role state machine                           |
| `improve-codebase-architecture` | Scans for deepening opportunities, HTML report, then grills the chosen one |
| `setup-matt-pocock-skills`      | One-time repo config (issue tracker, triage labels, doc layout)            |
| `to-spec`                       | Turns the current conversation into a spec, no interview                   |
| `to-tickets`                    | Splits a plan/spec into tracer-bullet tickets with blocking edges          |
| `implement`                     | Builds a spec/ticket's work, driving `/tdd`, closing with `/code-review`   |
| `wayfinder`                     | Charts a "map" of decision tickets for work too big for one session        |

### Engineering — model-invoked (`skills/engineering/README.md` lines 19–32)

| Skill                       | Purpose                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `prototype`                 | Throwaway code to answer a design question                                           |
| `diagnosing-bugs`           | Disciplined red→minimise→hypothesise→instrument→fix→regression-test loop             |
| `research`                  | Background-agent primary-source investigation, cited Markdown output                 |
| `tdd`                       | Red-green-refactor, one vertical slice at a time                                     |
| `domain-modeling`           | Active glossary/ADR discipline for `CONTEXT.md`                                      |
| `codebase-design`           | Deep-module vocabulary (module, interface, depth, seam, adapter, leverage, locality) |
| `code-review`               | Two-axis (Standards + Spec) parallel-subagent review of a diff                       |
| `resolving-merge-conflicts` | Hunk-by-hunk conflict resolution by intent, never `--abort`                          |
| `wizard`                    | Generates a bash wizard for human-only setup steps                                   |

### Productivity — user-invoked (`skills/productivity/README.md` lines 5–13)

| Skill              | Purpose                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `grill-me`         | Stateless version of `grill-with-docs`, no repo/paper trail                                           |
| `handoff`          | Compacts conversation into a handoff doc for another agent                                            |
| `teach`            | Multi-session teaching using the directory as a workspace                                             |
| `to-questionnaire` | Writes a questionnaire for someone else to fill in (interviews you about the _send_, not the subject) |
| `wait-what`        | Fired mid-conversation when a message didn't land; re-pitches in plain English                        |

### Productivity — model-invoked (`skills/productivity/README.md` lines 15–20)

| Skill                | Purpose                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `grilling`           | The reusable interview primitive underneath `grill-me`, `grill-with-docs`, `triage`, `wayfinder`, `improve-codebase-architecture` |
| `writing-for-agents` | Reference for writing skills / AGENTS.md / CLAUDE.md                                                                              |

### Not in the plugin (present in repo, excluded from `plugin.json`)

- `skills/misc/`: `git-guardrails-claude-code`, `migrate-to-shoehorn`, `scaffold-exercises`, `setup-pre-commit`
- `skills/in-progress/` (beta, install manually via `npx skills@latest add mattpocock/skills --skill=<name>`): `loop-me`, `writing-beats`, `writing-fragments`, `writing-shape`, `claude-handoff`, `setup-ts-deep-modules`
- `skills/deprecated/`: empty

## Order of use — the "main flow"

Primary source: `skills/engineering/ask-matt/SKILL.md` lines 17–90 (this is the plugin's
own router/order document) and `README.md` lines 84–182 ("Why These Skills Exist").

**Step 0 — once per repo:** `setup-matt-pocock-skills` — "run before your first
engineering flow to configure the issue tracker, triage labels, and doc layout the
other skills assume" (`ask-matt/SKILL.md` line 90; also stated in
`skills/engineering/README.md` line 13 and top-level `README.md` line 198).

**Step 1 — sharpen the idea:** `grill-with-docs` — "Start here whenever you are
working in a working directory" (`ask-matt/SKILL.md` line 17). Its own SKILL.md
(`grill-with-docs/SKILL.md` line 7) says it literally runs "a `/grilling` session,
using the `/domain-modeling` skill." Outside a repo, use `grill-me` instead
(stateless, same underlying `/grilling` primitive — `ask-matt/SKILL.md` lines 17, 77).

**Step 1b — optional detour for anything needing a runnable answer** (state, business
logic, a UI you must see): bridge via `handoff` out → `prototype` → `handoff` back
into the original thread (`ask-matt/SKILL.md` lines 18–21).

**Step 2 — branch on "can you settle every question in conversation?"**
(`ask-matt/SKILL.md` lines 22–26):

- **Yes** → `to-spec` (turn thread into a spec) → `to-tickets` (split into tracer-bullet
  tickets with blocking edges) → `implement` per ticket, clearing context between each.
- **No** → `implement` directly in the same context window.

**Step 3 — `implement` internally drives `tdd`** "one red-green slice at a time,"
then closes by running `code-review` (a two-axis Standards+Spec review) **before
committing** (`ask-matt/SKILL.md` line 26; also `implement/SKILL.md` lines 9 and 13:
"Use /tdd where possible, at pre-agreed seams" ... "Once done, use /code-review to
review the work."). `tdd` on its own is for a single behaviour test-first without a
full spec; `code-review` on its own is for reviewing an existing branch/PR
(`ask-matt/SKILL.md` line 26).

`ask-matt/SKILL.md` line 30 stresses keeping grilling → spec → tickets in **one
unbroken context window** (don't `/compact` or clear until after `/to-tickets`), each
subsequent `/implement` starting fresh from the ticket. Line 32 ties this to the
"smart zone" (~150k tokens) — compact at a phase boundary if approaching it, not mid-flow.

## Branches off the main flow

All from `ask-matt/SKILL.md`:

- **Incoming bugs/requests** (line 38) → `triage`. Moves issues through triage roles
  into agent-ready form that `implement` later picks up. Explicitly _not_ for tickets
  `to-tickets` already produced — "don't triage them" (line 40).
- **Something's broken, hard bug** (line 42) → `diagnosing-bugs`. Refuses to theorize
  until it has a tight red-failing feedback loop, fixes with a regression test. Its
  post-mortem hands off to `improve-codebase-architecture` when the root cause is "no
  good seam to lock the bug down" — confirmed independently in
  `diagnosing-bugs/SKILL.md` line 140.
- **Huge, foggy effort** (too big for one session) (lines 44–46) → `wayfinder`. Charts
  a shared map of "decision tickets," resolved one at a time. When the map clears it
  hands off to `to-spec` → `to-tickets` → `implement` as usual — it doesn't build
  directly (skip that collapse only when the effort turned out small).
- **Codebase maintenance / "spare moment"** (line 52) → `improve-codebase-architecture`.
  Surfaces "deepening opportunities"; picking one feeds back into `grill-with-docs`.
  Uses `codebase-design` for its vocabulary (confirmed in
  `improve-codebase-architecture/SKILL.md` line 13) and, once a candidate is picked,
  runs `grilling` to walk the decision tree (line 64) and `domain-modeling` inline as
  decisions crystallize (line 66).
- **Domain language work** (line 58) → `domain-modeling`. The active discipline
  `grill-with-docs` drives to keep `CONTEXT.md` a clean glossary.
- **Module/interface shape questions** (line 59) → `codebase-design`. Shared by `tdd`
  and `improve-codebase-architecture`. Confirmed in `tdd/SKILL.md` line 26: used "when
  the shape of that interface is itself in question... It is a reference to consult,
  not a session to run."
- **New harness / new directory / colleague / mid-phase fork** (line 67) → `handoff`.
- **Standalone, no wrapper needed:**
  - `grilling` (line 78) — the raw interview primitive; `grill-me`/`grill-with-docs`
    are the named entry points, and `triage`, `wayfinder`, `improve-codebase-architecture`
    all run it internally.
  - `resolving-merge-conflicts` (line 79) — "off every flow: reach for it when you are
    already mid-conflict." Never runs `--abort`.
  - `prototype` (line 80) — the step-2 detour, but usable any time a design question is
    hard to settle on paper. Kept as a primary source on a `prototype/<name>` branch.
  - `research` (line 81) — background-agent primary-source investigation; its output
    feeds _into_ `grill-with-docs`, doesn't replace the thinking.
  - `to-questionnaire` (line 82) — inverse of `grill-me`: interviews you about the
    _send_ (who/what), not the subject; output feeds `grill-with-docs` or `to-spec`.
  - `wizard` (line 83) — for steps only a human can do (credentials, dashboards,
    migrations); model-invoked, fires "the moment it hits a wall only you can pass."
  - `wait-what` (line 84) — corrective for a message that didn't land, usable mid-
    conversation inside any other skill; "the corrective... `/grill-with-docs` is the
    upfront cure."
  - `teach` (line 85) — multi-session concept teaching.
  - `writing-for-agents` (line 86) — reference for writing skill/AGENTS.md/CLAUDE.md docs.

## wayfinder's internal ticket types

`skills/engineering/wayfinder/SKILL.md` lines 77–79 define three resolution modes for
a decision ticket:

- **Research** (AFK) — resolved by a `/research` subagent, for facts outside the
  working directory.
- **Prototype** (HITL) — resolved via the `/prototype` skill, for "how should it
  look/behave" questions.
- **Grilling** (HITL, default) — "Always invoke the /grilling and /domain-modeling skills."

Line 111: naming the destination itself runs a `/grilling` + `/domain-modeling`
session first. Line 115: research tickets fire `/research` subagents in parallel.
Line 46 (from `ask-matt/SKILL.md`) confirms wayfinder hands its resolved map to
`to-spec` to rejoin the main flow.

## Why the ordering exists (rationale, not just sequence)

Top-level `README.md` "Why These Skills Exist" (lines 84–182) frames four failure
modes each skill/step addresses:

1. **Misalignment** ("the agent didn't do what I want") → fixed by grilling
   (`grill-me`/`grill-with-docs`), lines 88–103.
2. **Verbosity/jargon drift** → fixed by the shared-language discipline built into
   `grill-with-docs` (updates `CONTEXT.md`/ADRs), lines 105–141.
3. **Code doesn't work** → fixed by tight feedback loops: `tdd` (red-green-refactor)
   and `diagnosing-bugs`, lines 142–158.
4. **Codebase entropy ("ball of mud")** → fixed by `to-spec`'s module-quizzing and,
   periodically, `improve-codebase-architecture` ("run it... once every few days...
   It is a survey, not a rescue"), lines 160–178.

## Notes on gaps / unverifiable claims

- The task prompt guessed at skill names like `wizard`, `domain-modeling`, etc. under
  a flat `engineering/` list — the actual plugin has **9 more skills** than that list
  implied (`ask-matt`, `triage`, `improve-codebase-architecture`,
  `setup-matt-pocock-skills`, `to-spec`, `to-tickets`, `implement`, `wayfinder`, plus
  all of `productivity/`). Corrected above from primary sources.
- No claim here is from memory of "Matt Pocock" or generic skill-pattern knowledge —
  every statement traces to the file/line cited inline.
