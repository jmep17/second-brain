---
title: Wayfinder Skill (mattpocock-skills)
type: answer
created: 2026-08-25
updated: 2026-08-25
sources:
  [
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/wayfinder/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/wayfinder/agents/openai.yaml",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/docs/engineering/wayfinder.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/README.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/README.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/CHANGELOG.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/ask-matt/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/setup-matt-pocock-skills/issue-tracker-local.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/setup-matt-pocock-skills/issue-tracker-github.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/setup-matt-pocock-skills/issue-tracker-gitlab.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/research/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/domain-modeling/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/to-tickets/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/implement/SKILL.md",
    "/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/productivity/grilling/SKILL.md",
    "https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wayfinder/SKILL.md",
    "https://raw.githubusercontent.com/mattpocock/skills/main/CHANGELOG.md",
    ".scratch/config-system/map.md",
    ".scratch/config-system/issues/",
    ".scratch/config-system/research/",
    "docs/agents/issue-tracker.md",
  ]
---

# Wayfinder Skill (mattpocock-skills)

**Question:** How does Matt Pocock's `wayfinder` skill work, and how do you use it?

**Short answer:** Wayfinder is a planning tool for work too big to hold in one agent session. You type `/wayfinder` with a loose idea; it interviews you to name a **destination**, then writes a **map** (one issue) plus **decision tickets** (child issues), each a question to answer rather than a thing to build. Later sessions each take one ticket off the **frontier**, answer it, record the answer, and add new tickets as the **fog** clears. When nothing is left to decide, it hands off to `/to-spec` and `/to-tickets` rather than building anything. Part of the plugin covered in [[mattpocock-skills-workflow]].

Installed version is 1.2.3; the skill file is `skills/engineering/wayfinder/SKILL.md` (128 lines). All line numbers below refer to that file unless stated.

## What it is for

- The trigger: "A loose idea has arrived — too big for one agent session, and wrapped in fog: the way from here to the destination isn't visible yet" (line 7).
- It produces **decisions, not deliverables**. "Wayfinder is planning by default ... The pull to just do the work is usually the signal you've reached the edge of the map and it's time to hand off" (line 13).
- It is user-invoked only: `disable-model-invocation: true` (line 4) and `policy.allow_implicit_invocation: false` in `agents/openai.yaml`. The model never reaches for it on its own; you type `/wayfinder`.
- The router skill positions it as "the most cognitively demanding flow" and says to use `/grill-with-docs` instead for anything that fits in one session (`ask-matt/SKILL.md` line 44). The plugin's docs page puts the rule as "session count, not project size" (`docs/engineering/wayfinder.md` line 60).
- Domain-agnostic: "engineering work, course content, whatever fits the shape" (line 9).

## Core concepts

### Destination

What reaching the end of the map looks like: "a spec to hand off and iterate on, a decision to lock before planning starts, or a change made in place like a data-structure migration" (line 9). Naming it is the first act of charting because it fixes scope for every ticket (lines 9, 111). It means the end of the whole map, not the end of one session (`docs/engineering/wayfinder.md` line 63).

### Map

- One issue on the repo's tracker, labelled `wayfinder:map`; tickets are its child issues (line 21).
- "An index, not a store": each decision lives in its ticket; the map only gists and links (line 23).
- Loaded once per session at low resolution. Open tickets are not listed in the body; they are found by query (line 29).
- Body template (lines 31-53) has five sections: `## Destination`, `## Notes` (domain, skills to consult, standing preferences), `## Decisions so far` (one line per closed ticket with a link), `## Not yet specified` (the fog), `## Out of scope`.

### Tickets

- Body is just `## Question` — "the decision or investigation this ticket resolves", sized to one 100K-token session (lines 57-63). The answer is not in the body; it is recorded on resolution (line 71).
- Each carries a `wayfinder:<type>` label: `research`, `prototype`, `grilling`, or `task` (line 65).
- **Claim** = assign to yourself before any work, so parallel sessions skip it (line 67).
- **Blocking** uses the tracker's native dependency links so the frontier is visible in the tracker UI; only trackers without native blocking fall back to a text line (line 69).
- **Frontier** = open, unblocked, unclaimed children (line 69).

### Ticket types (lines 73-80)

Every ticket is HITL (human in the loop) or AFK (agent alone). A HITL ticket only resolves through live exchange; an agent answering its own grilling questions "has broken this" (line 75).

| Type        | Mode   | Use when                                                                                                        | Resolved by                                                         |
| ----------- | ------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `research`  | AFK    | A fact outside the working directory blocks a decision                                                          | a `/research` subagent (line 77)                                    |
| `prototype` | HITL   | "How should it look / behave" is the question                                                                   | `/prototype`; artifact linked as an asset (line 78)                 |
| `grilling`  | HITL   | Default. Conversation.                                                                                          | "Always invoke the /grilling and /domain-modeling skills" (line 79) |
| `task`      | either | Manual work that must happen before a decision can be made (sign up for a service, provision access, move data) | agent alone if it can, else a checklist for the human (line 80)     |

`task` is "the one type that does rather than decides — and it earns its place by unblocking a decision, not by delivering the destination" (line 80).

### Fog of war

- The map is "deliberately incomplete: don't chart what you can't yet see" (line 84). Fog is decisions you can tell are coming but cannot yet phrase.
- Written into `## Not yet specified` (line 86).
- Test for fog vs ticket: "whether you can state the question precisely now — not whether you can answer it now" (line 88). Sharp question, even if blocked: ticket. Not yet sharp: fog. Do not pre-slice fog into ticket-sized pieces (line 91).
- Resolving a ticket "clears the fog ahead of it, graduating whatever's now specifiable into fresh tickets" (line 84).

### Out of scope

Work beyond the destination is not fog; it gets its own section and never graduates (lines 97-99). A ticket that turns out to be past the destination is closed and gets one line in `## Out of scope`, not in `## Decisions so far` (line 101).

### How it decides the next step

There is no scoring. A session loads the map, then "take[s] the first frontier ticket in order" unless the user names one (line 123). For the local-markdown tracker that means "first by number wins" (`setup-matt-pocock-skills/issue-tracker-local.md` line 28); for GitHub, "first in map order wins" (`issue-tracker-github.md` line 43).

### Refer by name

Narration and the map's Decisions-so-far refer to tickets by title, with the id or URL wrapped inside the link, never a bare `#42` (line 17).

## The two modes (the loop)

Rule for both: "never resolve more than one ticket per session — with the exception of research tickets" (line 105).

### Mode 1: Chart the map (lines 107-116)

Invoke with a loose idea.

1. Name the destination via a `/grilling` + `/domain-modeling` session.
2. Grill again, breadth-first, to surface open decisions. If this surfaces no fog, stop: you don't need a map; ask the user how to proceed (line 112).
3. Create the map (label `wayfinder:map`) with Destination and Notes filled, Decisions-so-far empty, fog sketched.
4. Create the tickets you can specify now, then wire blocking edges in a second pass (issues need ids first).
5. For each `research` ticket, fire a `/research` subagent in parallel, capturing findings on a throwaway `research/<name>` branch with a pointer from the ticket.
6. Stop. "Charting is one session's work; it hand-resolves nothing" (line 116).

### Mode 2: Work through the map (lines 118-128)

Invoke with the map (URL or number); a ticket is optional.

1. Load the map, not every ticket body.
2. Pick the ticket (user's choice, else first frontier ticket). Claim it before any work.
3. Resolve it, zooming into related or closed tickets as needed and invoking the skills named in `## Notes`. Default to `/grilling` + `/domain-modeling`.
4. Record: post the answer as a resolution comment, close the issue, append a one-line context pointer to Decisions-so-far.
5. Add newly surfaced tickets (create then wire), graduate fog into tickets and remove it from `## Not yet specified`, rule things out of scope if the answer shows they sit past the destination, and update or delete tickets the decision invalidated.

Expect concurrent sessions editing the tracker (line 128).

## Files it creates and where

Storage is tracker-specific. SKILL.md line 25 says to consult the tracker doc's "Wayfinding operations" section (set up by `/setup-matt-pocock-skills`) and to default to local markdown if no tracker is configured. The plugin ships three variants:

- **Local markdown** (`setup-matt-pocock-skills/issue-tracker-local.md` lines 21-30): map at `.scratch/<effort>/map.md`; tickets at `.scratch/<effort>/issues/NN-<slug>.md` with `Type:` and `Status:` (`claimed`/`resolved`) lines and a `Blocked by: NN, NN` line; resolve by appending `## Answer`, setting `Status: resolved`, and adding a pointer to the map.
- **GitHub** (`issue-tracker-github.md` lines 36-45): map is an issue labelled `wayfinder:map`; tickets are sub-issues labelled `wayfinder:<type>`; blocking via the native issue-dependencies API (`.../dependencies/blocked_by` with the blocker's database id); claim with `gh issue edit <n> --add-assignee @me`; resolve with a comment, close, and map pointer.
- **GitLab** (`issue-tracker-gitlab.md` lines 37-46): same shape with `glab`; blocking via the `/blocked_by` quick action (Premium/Ultimate only, else a text line).

Research findings live in a Markdown file wherever the repo keeps such notes (`research/SKILL.md` lines 10-13), on a `research/<name>` branch per SKILL.md line 115. Grilling tickets also write `CONTEXT.md` and `docs/adr/` entries through `/domain-modeling` (`domain-modeling/SKILL.md` lines 10-22, 62, 66-73).

This repo uses the local variant: `docs/agents/issue-tracker.md` lines 21-30 are the same "Wayfinding operations" text.

## Commands and trigger phrases

- `/wayfinder <loose idea>` — chart a new map (line 109).
- `/wayfinder <map URL or number> [ticket]` — work one ticket (line 120).
- There are no model-side trigger phrases; the skill is user-invoked only (line 4, `agents/openai.yaml`). The docs page adds that you can say "hand off to `/wayfinder`" from an oversized session, which routes through the `handoff` skill (`docs/engineering/wayfinder.md` line 19).

## Hand-offs to other skills

- **Into**: `/setup-matt-pocock-skills` must have configured the tracker first (line 25; `docs/engineering/wayfinder.md` line 25).
- **During**: `/grilling` + `/domain-modeling` for destination-naming and grilling tickets (lines 79, 111, 124); `/research` subagents for research tickets (lines 77, 115); `/prototype` for prototype tickets (line 78). `/grilling` itself works in rounds against a "frontier" of askable questions and insists facts are the agent's job, decisions the user's (`grilling/SKILL.md` lines 8, 20).
- **Out**: when the map clears, "merge onto the main flow at `/to-spec`, which collapses the map's linked decisions into a buildable plan, then `/to-tickets` and `/implement`" (`ask-matt/SKILL.md` line 46). `/to-tickets` turns a spec into tracer-bullet implementation tickets with blocking edges (`to-tickets/SKILL.md` lines 9, 62-63); `/implement` drives `/tdd` and closes with `/code-review` (`implement/SKILL.md` lines 9-13). Going straight to `/implement` "throws the linked detail away" unless the effort turned out small (`ask-matt/SKILL.md` line 46).

## Concrete walkthrough: this repo's `config-system` map

Real usage, all under `.scratch/config-system/` with commits prefixed `wayfinder:` (`git log --oneline | grep -i wayfinder` shows six: `a46bc44 chart config-system map` through `3035eaf resolve 02 work exclusions, add CONTEXT.md and ADR 0001`).

1. **Chart** (`a46bc44`). `map.md` names the destination as "An architecture decision and written spec describing one system that holds the second-brain wiki and the user's tool configuration ... Build happens after this map, from the spec" (`map.md` line 8). Notes record facts gathered during grilling and which skills to consult (lines 12-16). Eight tickets were created: `01-dotfiles-tool` (research), `02-work-exclusions` (grilling), `03-ui-runtime` (research), `04-repo-layout` and `05-secrets` (grilling, blocked by 01 and 02), `06-ui-edit-model` (grilling, blocked by 03), `07-ui-prototype` (prototype, blocked by 06), `08-spec` (grilling, blocked by 04, 05, 07; "This ticket closing means the map is done", `issues/08-spec.md` line 9).
2. **Research fired in parallel.** Both research tickets were resolved by subagents whose findings landed in `research/01-dotfiles-tool.md` and `research/03-ui-runtime.md`; the tickets carry a short `## Answer` pointing at the file (`issues/01-dotfiles-tool.md` lines 15-31). Commits `c928868`, `059bb2d`, `fa9f385` merged them and each added fog.
3. **Fog graduated.** `map.md` lines 28-42 hold fog lines tagged with their origin, e.g. "(from 01)", "(from 03)", and "Feeds ticket 02".
4. **One grilling ticket per session** (`3035eaf`). Ticket 02 was resolved with the human; it produced a `CONTEXT.md` glossary and `docs/adr/0001-personal-wiki-is-a-nested-repo.md`, and a one-line pointer in Decisions-so-far (`map.md` line 23).
5. **Current frontier**: 04 and 05 are now unblocked (01 and 02 resolved); 06 is unblocked (03 resolved); 07 and 08 remain blocked. `## Out of scope` (lines 46-48) rules out building the system and non-Mac machines.
6. **Next**: `/wayfinder .scratch/config-system/map.md` takes ticket 04 by number order, unless you name one.

## Gotchas

- **Not for one-session work.** If the breadth-first grill finds no fog, the skill stops and says you don't need a map (line 112). The docs page calls it "slower and denser" than grilling for well-scoped features (`docs/engineering/wayfinder.md` line 11).
- **Agents drift into building.** The plan-only default can be overridden in the map's `## Notes` (line 13), but the agent writes those notes, so it can grant itself permission. The docs page reports this as the most common failure and advises reading the Notes on any map you did not chart and treating any `task` that looks like a build slice as mis-typed (`docs/engineering/wayfinder.md` line 69).
- **One ticket per session**, except research (line 105). The docs page reports that parallel grilling sessions re-ask questions because they share no context, and that agents have picked a prototype variant themselves instead of leaving the choice to the human (line 75).
- **Big maps go stale.** A field report of 27 tickets where later ones no longer made sense; advice is to scope to a bounded destination and prototype aggressively (`docs/engineering/wayfinder.md` line 72).
- **Tracker without native blocking** degrades to text-inferred dependencies that need manual checking (`docs/engineering/wayfinder.md` line 27). The docs page also says local markdown "is not recommended" because planning material persists in the repo, while noting open-source maintainers choose it anyway to keep public trackers clean (line 78).
- **The verbose grilling questions** are a live, unresolved complaint; suggested mitigations are lower reasoning effort and a plain-language instruction in global `CLAUDE.md` (`docs/engineering/wayfinder.md` line 81).
- **Reversing a closed decision** has no official process; tell the agent plainly what changed and it revises the map and affected tickets (line 84).
- **Naming**: `decision-mapping` was renamed to `wayfinder` in v1.1.0 (upstream `CHANGELOG.md`; `docs/engineering/wayfinder.md` line 87).

## Installed 1.2.3 vs upstream `main`

Diffed the installed `SKILL.md` against `https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wayfinder/SKILL.md` (fetched 2026-08-25; upstream `CHANGELOG.md` still lists 1.2.3 as latest, so this is unreleased main).

- **Wording only for most of the file**: em-dashes replaced with colons, commas, or parentheses. No change to structure, sections, or rules.
- **Two substantive edits**:
  - Skill invocation is now spelled out for the harness: "Call the Skill tool twice, for 'grilling' and 'domain-modeling'" and "a subagent that calls the Skill tool with 'research'" replace the `/grilling`, `/domain-modeling`, `/research`, `/prototype` slash forms (upstream lines 77-80, 111, 115, 124).
  - When no tracker is configured, upstream says "tell the user to run `/setup-matt-pocock-skills`" instead of "run `/setup-matt-pocock-skills`" (upstream line 25), consistent with the rule that a user-invoked skill cannot invoke another user-invoked skill.
- `agents/openai.yaml` and the engineering README description were not diffed; no changelog entry for wayfinder exists after 1.1.0.
