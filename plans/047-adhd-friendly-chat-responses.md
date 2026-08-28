# Plan 047: ADHD-friendly chat responses — a repo-versioned output style plus the standard's chat rules

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 5285c91..HEAD -- CLAUDE.md AGENTS.md docs/agents/adhd-writing.md .claude/ wiki/claude-diagrams-plugin.md plans/README.md`
> Uncommitted advisor-session changes to `plans/README.md` are expected.
> If any other in-scope file changed since this plan was written, compare
> the "Current state" excerpts below against the live files before
> proceeding; on a mismatch, treat it as a STOP condition.

## At a glance

- **What**: make chat replies ADHD-friendly at the system-prompt layer — a
  repo-versioned Claude Code output style (`.claude/output-styles/adhd-brief.md`
  + `"outputStyle"` in project settings), backed by a `## Chat replies`
  section in `docs/agents/adhd-writing.md` and a mirror rule in
  `CLAUDE.md`/`AGENTS.md` for non-Claude agents.
- **Why**: the standard (plan 044) covers every *document* but not the chat
  channel, so terminal replies still arrive as walls of prose; an output
  style binds at the strongest supported layer.
- **Next action**: Step 1 — append the `## Chat replies` section to
  `docs/agents/adhd-writing.md`.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/044-adhd-friendly-authoring-standard.md (DONE)
- **Category**: dx | docs
- **Planned at**: commit `5285c91`, 2026-08-27 (amended same day after
  mechanism research — see "Why this matters")

## Why this matters

The repo owner has ADHD. Plan 044 installed a writing standard
(`docs/agents/adhd-writing.md`) at every *document* authoring point, but
the most frequent thing an agent writes for the owner is the chat reply
itself, and nothing governs it.

**Mechanism (researched 2026-08-27, verified against official docs at
Claude Code v2.1.247 — supersedes the stale repo wiki claim):**

- Output styles are **fully supported**, not deprecated. History: deprecated
  in v2.0.30, **un-deprecated in v2.0.32** after community feedback; only
  the standalone `/output-style` command was removed (v2.1.91) in favor of
  `/config`. Source: https://code.claude.com/docs/en/output-styles.md and
  the claude-code CHANGELOG.
- An output style modifies the **system prompt itself** — official docs
  recommend it precisely for "a different role, tone, or default response
  format every turn"; CLAUDE.md is the layer for project conventions.
- Custom styles live in `./.claude/output-styles/` (project-versioned) and
  activate via `"outputStyle": "<name>"` in settings.json. A repo checkout
  carries both — zero per-machine install, unlike an
  `--append-system-prompt` shell alias.
- Frontmatter `keep-coding-instructions: true` keeps the default
  software-engineering instructions and adds the style on top.
- The wiki page `wiki/claude-diagrams-plugin.md` records "output styles are
  deprecated (v2.1.246)" — this is wrong today and gets a contradiction
  note per the CLAUDE.md convention (never silently overwrite).

Output styles are Claude-Code-only, so the `AGENTS.md` mirror rule (Step 3)
still carries the contract to Codex and other AGENTS.md-reading agents.

## Current state

- `docs/agents/adhd-writing.md` — the standard: ten numbered rules, then
  `## Where each rule binds`, whose last bullet is:

  ```markdown
  - Summaries of external documents: the `adhd-summarize` skill already
    implements these rules reader-side.
  ```

  Nothing mentions chat replies. Step 1 appends a section at end of file.

- `.claude/` in this repo contains only `commands/`, `skills/`,
  `worktrees/`. **No** `settings.json`, **no** `output-styles/` — Step 2
  creates both. (`~/.claude/output-styles/` doesn't exist either; we use
  the project dir so it's versioned.)

- `CLAUDE.md` — section order at end of file: `## Agent skills` →
  `## Artifact responses` → `## Verification`. The `## Artifact responses`
  section ends:

  ```markdown
  artifact path plus at most one open question. An explicit request for
  prose ("write it up", "in paragraphs") overrides this.
  ```

- `AGENTS.md` — byte-identical mirror of `CLAUDE.md` (verified at
  `5285c91`: `diff CLAUDE.md AGENTS.md` → empty).

- `wiki/claude-diagrams-plugin.md` — its Decision table's "Mechanism" row
  says: "Output styles are deprecated in Claude Code (v2.1.246 at build
  time)." Stale claim; Step 4 adds the contradiction note.

- Conventions: `docs/agents/` files are short and imperative; commits are
  `<area>: <summary>`; `log.md` is append-only with
  `## [YYYY-MM-DD] maintenance | <title>` prefixes; wiki pages carry
  frontmatter with an `updated:` date.

## Commands you will need

| Purpose      | Command                    | Expected on success |
| ------------ | -------------------------- | ------------------- |
| Full gate    | `bun run verify`           | exit 0              |
| Mirror check | `diff CLAUDE.md AGENTS.md` | exit 0, no output   |
| JSON check   | `python3 -m json.tool .claude/settings.json` | pretty JSON, exit 0 |

## Scope

**In scope** (the only files you should modify or create):

- `docs/agents/adhd-writing.md` (append one section)
- `.claude/output-styles/adhd-brief.md` (create)
- `.claude/settings.json` (create)
- `CLAUDE.md`, `AGENTS.md` (insert one section, keep identical)
- `wiki/claude-diagrams-plugin.md` (contradiction note + `updated:` date)
- `plans/README.md` (status row 047 → DONE), `log.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):

- `plugins/*` — no plugin ships this style. Plugin distribution
  (`force-for-plugin`) buys nothing here: the project dir is already
  versioned and repo-scoped, and a plugin route would add version-bump +
  marketplace ceremony.
- `~/.claude/settings.json`, `~/.claude/output-styles/` — user-level
  config is per-machine; the point is a versioned repo layer.
- `.claude/skills/caveman*` — opt-in compression voice, orthogonal.
- The HTML artifact templates, `plugins/DESIGN.md`, `site/`.

## Git workflow

- Work on `main` (single-owner repo; executors commit directly).
- One commit at the end: `docs: ADHD-friendly chat responses (plan 047)`.
- Do NOT push.

## Steps

### Step 1: The standard learns about chat — append `## Chat replies`

Append to the end of `docs/agents/adhd-writing.md` exactly this content —
you may tighten wording but not drop bullets:

```markdown
## Chat replies

The terminal reply is a document too — the one the human reads most often.
The ten rules bind on it as:

- **Answer first (rule 1).** Line one is the result or the answer. No
  preamble ("Great question…", "Let me explain…"), no restating the ask.
- **Bullets over paragraphs (rule 3).** Default to bullets; when prose is
  unavoidable, ≤3 sentences per paragraph. A routine reply fits in ~10
  lines.
- **Concrete anchors (rule 10).** `file:line`, commands, and numbers —
  never re-explain in prose a file the reply just wrote; give its path.
- **Depth on demand (rule 7).** Offer detail ("ask for the full trace")
  instead of dumping it. Anything long goes in a file or artifact; the
  reply carries the path.
- **One next action or one line of proof (rules 2, 6).** Mid-task replies
  end with exactly one next action; completion replies end with the
  verification command and its result, not reassurance.

An explicit request for depth ("explain", "walk me through it") overrides
the length default — never the answer-first order.

Claude Code enforces this at the system-prompt layer via the repo output
style `.claude/output-styles/adhd-brief.md`; other agents inherit it from
the `## Chat responses` rule in `AGENTS.md`.
```

**Verify**: `grep -c "^## Chat replies" docs/agents/adhd-writing.md` → `1`;
`grep -c "^[0-9]*\." docs/agents/adhd-writing.md` → still `10`.

### Step 2: The output style — versioned in the repo, active by default

2a. Create `.claude/output-styles/adhd-brief.md`:

```markdown
---
name: ADHD Brief
description: Answer-first, bulleted, ~10-line replies per docs/agents/adhd-writing.md
keep-coding-instructions: true
---

# ADHD-friendly replies

Your chat replies go to a reader with ADHD. Structure is their external
working memory (repo standard: docs/agents/adhd-writing.md, "Chat replies").

- Line one is the answer or the result. No preamble, no restating the ask.
- Bullets over paragraphs; ≤3 sentences per paragraph when prose is
  unavoidable; a routine reply fits in ~10 lines.
- Anchor with `file:line`, commands, and numbers. Never re-explain in
  prose a file you just wrote — give its path.
- Long content goes into a file or artifact; the reply carries the path
  and offers depth on demand instead of dumping it.
- End a mid-task reply with exactly one next action; end a completion
  reply with the verification command and its result, not reassurance.
- An explicit request for depth ("explain", "walk me through it") lifts
  the length cap — never the answer-first order.
```

2b. Create `.claude/settings.json`:

```json
{
  "outputStyle": "ADHD Brief"
}
```

**Verify**:
`head -5 .claude/output-styles/adhd-brief.md` → frontmatter with
`name: ADHD Brief` and `keep-coding-instructions: true`;
`python3 -m json.tool .claude/settings.json` → exit 0. Acceptance is
manual (style takes effect on new sessions): after commit, the owner opens
a fresh session and `/config` shows Output style = ADHD Brief. Record this
handoff line in your completion report.

### Step 3: Non-Claude agents inherit it — `## Chat responses` in CLAUDE.md + AGENTS.md

First run `diff CLAUDE.md AGENTS.md` — must be empty (STOP otherwise).
Then insert into `CLAUDE.md` between `## Artifact responses` and
`## Verification`:

```markdown
## Chat responses

Chat replies follow `docs/agents/adhd-writing.md` ("Chat replies"): the
answer or result in the first line, bullets over paragraphs, ≤3 sentences
per paragraph, concrete anchors (`file:line`, commands) instead of
explanation, and one next action — or one line of proof — at the end. A
routine reply fits in ~10 lines; anything longer goes into a file or
artifact and the reply carries its path. Claude Code loads this as the
`ADHD Brief` output style (`.claude/output-styles/adhd-brief.md`); agents
without output styles apply it from here. An explicit request for depth
("explain", "walk me through it") overrides the length default.
```

Apply the identical edit to `AGENTS.md`.

**Verify**: `diff CLAUDE.md AGENTS.md` → exit 0;
`grep -c "^## Chat responses" CLAUDE.md AGENTS.md` → `1` in each;
`grep -n "^## " CLAUDE.md | tail -3` → `Artifact responses`,
`Chat responses`, `Verification` in that order.

### Step 4: Correct the stale wiki claim — contradiction note, not overwrite

In `wiki/claude-diagrams-plugin.md`, directly below the Decision table,
add (CLAUDE.md convention: note contradictions, never silently overwrite):

```markdown
> **Contradiction note (2026-08-27):** the Mechanism row above records
> "output styles are deprecated (v2.1.246)". Verified against official
> docs at v2.1.247: output styles are fully supported — deprecated in
> v2.0.30, un-deprecated in v2.0.32; only the `/output-style` command was
> removed (v2.1.91) in favor of `/config`. The hook-over-style decision
> for *this plugin* still stands on its determinism rationale. The repo
> now also ships an output style: `.claude/output-styles/adhd-brief.md`
> (plan 047). Source: https://code.claude.com/docs/en/output-styles.md
```

Bump the page's frontmatter `updated:` to today.

**Verify**: `grep -c "Contradiction note" wiki/claude-diagrams-plugin.md`
→ `1`.

### Step 5: Prove nothing else moved — gate, log, index, commit

- `bun run verify` → exit 0.
- Append to `log.md`:
  `## [<today>] maintenance | Plan 047 — ADHD-friendly chat responses (output style + standard)`
  with a one-line file list, flagging the wiki contradiction per the log
  convention.
- Flip plan 047's row in `plans/README.md` to `DONE`.
- Commit: `docs: ADHD-friendly chat responses (plan 047)`.

**Verify**: `git show --stat HEAD` → only in-scope files;
`grep "^## \[" log.md | tail -1` → the new entry.

## Test plan

No test suite covers docs or settings. Gates: the grep/diff/JSON checks in
Steps 1–4, `bun run verify` in Step 5, and the manual acceptance handoff
in Step 2 (owner confirms the style is active in a fresh session).

## Done criteria

ALL must hold:

- [ ] `docs/agents/adhd-writing.md` ends with `## Chat replies`; ten rules unchanged
- [ ] `.claude/output-styles/adhd-brief.md` exists with
      `keep-coding-instructions: true`; `.claude/settings.json` is valid
      JSON setting `"outputStyle": "ADHD Brief"`
- [ ] `CLAUDE.md`/`AGENTS.md` each contain `## Chat responses` between
      `## Artifact responses` and `## Verification`; `diff` → exit 0
- [ ] `wiki/claude-diagrams-plugin.md` carries the contradiction note and a
      bumped `updated:` date
- [ ] `bun run verify` → exit 0; log entry appended; README row DONE
- [ ] No files outside the in-scope list in the commit (`git show --stat HEAD`)

## STOP conditions

Stop and report back (do not improvise) if:

- `.claude/settings.json` or `.claude/output-styles/` already exists (a
  concurrent change landed — merge, don't clobber).
- `diff CLAUDE.md AGENTS.md` is non-empty before your edit.
- `CLAUDE.md` lacks `## Artifact responses`/`## Verification`, or a
  `## Chat responses` section already exists.
- `docs/agents/adhd-writing.md` no longer has ten numbered rules (the
  standard was restructured; Step 1's rule references may be wrong).
- The installed Claude Code no longer lists the style after Step 2 (check
  with the owner before assuming the `name:` ↔ `outputStyle` match is
  right — if activation fails, try the file basename `adhd-brief` as the
  settings value and report which worked).
- `bun run verify` fails for a reason unrelated to your change.

## Maintenance notes

- **Layering**: output style = system-prompt layer (Claude Code only);
  `AGENTS.md` rule = every other agent; `docs/agents/adhd-writing.md`
  `## Chat replies` = single source of truth. Edit the standard first,
  then propagate to the other two — never let them diverge silently.
- The built-in `Concise` style (since v2.1.237) is the zero-config
  fallback if the custom style ever misbehaves: `/config` → Output style.
- `.claude/settings.json` is now created — future project-level settings
  (hooks, permissions) belong there; plan 021's install runbook should
  note that a checkout brings the style with it (no per-machine step).
- If long-form replies still slip through late in long sessions, the
  deferred escalation remains a one-line `UserPromptSubmit` nudge — weigh
  against plan 043's token budget once its baseline exists.
