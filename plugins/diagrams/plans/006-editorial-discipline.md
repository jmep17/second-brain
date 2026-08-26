# Plan 006: Give the skill a complexity budget and editorial rules so diagrams stay readable by construction

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat cd109ef..HEAD -- plugins/diagram-plans/skills/diagram-plans/SKILL.md`
> If the file changed beyond what plans 001, 004 and 005 did, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/005-elk-layout-drop-mindmap.md`
- **Category**: tech-debt
- **Planned at**: commit `cd109ef`, 2026-08-26

## Why this matters

Plans 003–005 fix how a diagram is _rendered_. They cannot fix a diagram that
has thirty nodes in it. Unbounded node count is the root cause of auto-layout
collisions: no layout engine untangles a graph that should have been two
diagrams, and ELK will happily lay out a 40-node flowchart into something no one
can read.

The skill currently has exactly one quantitative constraint — "three levels is
the ceiling for a mindmap" — and after plan 005 even that no longer refers to a
supported type. Everything else is left to the model's judgement in the moment,
which is how a "quick plan" becomes a wall of boxes.

The budgets below are adapted from `cathrynlavery/diagram-design`, a skill built
around the premise that the highest-quality move is deletion. Its numbers (9
nodes, 12 arrows, 2 accents) are the load-bearing part; adopting them costs
nothing at authoring time and is what makes the rendering work in plans 003–005
pay off.

## Current state

One file changes: `plugins/diagram-plans/skills/diagram-plans/SKILL.md`. After
plans 001, 004 and 005 it contains a `## Steps` section (steps 1–5), a
`Done when:` line, and a `## Rules` bullet list.

The relevant existing text, as it stands after plan 005:

```
   - Node labels: short noun phrases, ≤ 6 words. Detail that cannot fit a label goes in a single "Notes" list under the diagram, one line each.
   - The page contains one diagram (two only when a tree needs a companion flowchart for sequencing).
```

```
## Rules

- The page is a plain file opened from disk: Mermaid loads from the jsDelivr CDN and Geist from Google Fonts, so it needs network on first view. Keep every other asset inline.
- Diagram theme follows the OS color scheme; Geist tokens do the rest. Custom colors belong in Mermaid `classDef`s, not ad-hoc CSS.
- Prefer breadth in the tree over depth: three levels is the ceiling; split into a second diagram past that.
- Contradictions, risks, and unknowns are nodes too (`⚠ risk: …`, `? open: …`), never hidden in prose.
- When the user then asks to "expand X" or "change Y", edit the same file; the browser tab refreshes to the new version.
- Explicit request for prose ("write it up", "in paragraphs", "as a doc") overrides this skill.
```

Note the first Rules bullet is now factually wrong — plan 004 inlined the fonts,
so Geist no longer comes from Google Fonts. Fixing it is in scope here.

Two constraints on how you write this:

- **The budgets must match `test/lint-page.py` exactly.** Plan 002 encoded
  `node-budget` at 9, `edge-budget` at 12, and `label-length` at 6 words. If you
  change a number here you must change it there in the same commit, or the skill
  and its linter will disagree and the model will be told off for following its
  own instructions.
- **`SKILL.md` is read into the model's context on every invocation.** Keep the
  additions tight. Prose that restates the same rule twice costs tokens on every
  single diagram, forever. Aim to add under 40 lines.

Repo convention for this file: terse imperative bullets, backticked identifiers,
no headings below `##`.

## Commands you will need

| Purpose                | Command                                         | Expected on success |
| ---------------------- | ----------------------------------------------- | ------------------- |
| Budget/skill agreement | `bash test/lint-budgets.sh` (created in step 3) | exit 0              |
| Everything             | `npm test`                                      | exit 0              |
| Version sync           | `bash tools/check-version-sync.sh`              | exit 0              |

## Scope

**In scope**:

- `plugins/diagram-plans/skills/diagram-plans/SKILL.md` — a new `## Budget`
  section, a new `## Anti-patterns` section, edits to two existing bullets, and
  the frontmatter `description`
- `plugins/diagram-plans/.claude-plugin/plugin.json` — the `description` field
  (plan 001 deferred it here)
- `test/lint-budgets.sh` (create)
- `package.json` — add the new lint to the `lint` script
- `.claude-plugin/marketplace.json` — `description` and version
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- `MERMAID.md` — plans 003–005 own it. The budget lives in `SKILL.md` because
  it governs _authoring_, not the template.
- The validation gate and the `Done when:` line — plan 007 rewrites that line;
  leave it alone or you will conflict.
- `test/lint-page.py`'s rule _implementations_ — you are only reading its
  constants, not changing behaviour.
- Adding a diagram type. Plan 005 settled the supported set.

## Git workflow

- Branch: `advisor/006-editorial-discipline`
- Message style `diagram-plans: <imperative>`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the budget

Insert a new `## Budget` section immediately after the `Done when:` line and
before `## Rules`:

```markdown
## Budget

Per diagram. These are ceilings, not targets — a plan that fits in 5 nodes
should use 5. `diagram-check` enforces them and will reject the page.

| Limit                                     | Value                                                             |
| ----------------------------------------- | ----------------------------------------------------------------- |
| Nodes                                     | 9                                                                 |
| Edges                                     | 12                                                                |
| Words per node label                      | 6                                                                 |
| Tree depth                                | 3                                                                 |
| Accented nodes (`risk` / `focus` classes) | 2                                                                 |
| Diagrams per page                         | 1 (2 only when a tree needs a companion flowchart for sequencing) |

Over budget means the diagram is two diagrams. Split it into an overview plus a
detail page rather than shrinking labels or dropping the notes list.

Before writing, apply the remove test:

- Can any node go? Would the reader still understand?
- Do any two nodes always travel together? Then they are one node.
- Is any edge implied by the layout already? Remove it.
```

**Verify**:

- `grep -c '## Budget' plugins/diagram-plans/skills/diagram-plans/SKILL.md` → `1`
- `grep -c '| Nodes | 9 |' .../SKILL.md` → `1`

### Step 2: Add the anti-patterns and fix the stale rules

Add a `## Anti-patterns` section at the end of the file:

```markdown
## Anti-patterns

- **Colour as decoration.** Geist is monochrome by default. The only coloured
  elements are risks (`--warning`), open questions (`--info`), and errors
  (`--error`) — at most 2 accented nodes per diagram. Colouring five nodes
  "important" means none of them are.
- **Identical boxes for everything.** If every node has the same shape, the
  diagram carries no hierarchy. Use `(( ))` for a root, `[ ]` for steps,
  `{ }` for decisions.
- **A label that is a sentence.** Six words. Detail goes in the Notes list.
- **Restating the diagram in the chat reply.** The reply is the path and the one
  open question. Everything else belongs in the file.
- **A diagram where a table would do.** Three attributes across four items is a
  table. Draw only when the _relationships_ carry the meaning.
- **Guessing.** Every node's claim comes from something you actually read. An
  invented box is worse than an absent one.
```

Then fix the two stale/duplicated bullets in `## Rules`:

- Replace the first bullet with:
  `- The page is a plain file opened from disk. Geist is embedded in it; only Mermaid loads from the jsDelivr CDN, on first view. Keep every other asset inline.`
- Delete the `Prefer breadth in the tree over depth…` bullet entirely — the
  `Tree depth | 3` row of the budget table now says it, and saying it twice
  wastes context on every invocation.

**Verify**:

- `grep -c 'Google Fonts' .../SKILL.md` → `0`
- `grep -c '## Anti-patterns' .../SKILL.md` → `1`
- `grep -c 'Prefer breadth in the tree' .../SKILL.md` → `0`

### Step 3: Guard the budget against drift

Create `test/lint-budgets.sh`, which fails if `SKILL.md`'s stated numbers and
`test/lint-page.py`'s enforced constants disagree:

```bash
#!/usr/bin/env bash
# The budget appears twice by design: as instructions in SKILL.md and as limits
# in test/lint-page.py. This fails the build when they drift apart.
# Usage: bash test/lint-budgets.sh
set -euo pipefail

python3 - <<'PY'
import re, sys

skill = open("plugins/diagram-plans/skills/diagram-plans/SKILL.md").read()
lint  = open("test/lint-page.py").read()

def from_table(label):
    m = re.search(rf'^\|\s*{re.escape(label)}\s*\|\s*(\d+)\s*\|', skill, re.M)
    if not m: sys.exit(f"SKILL.md has no '{label}' row in the budget table")
    return int(m.group(1))

def from_lint(name):
    m = re.search(rf'^{name}\s*=\s*(\d+)', lint, re.M)
    if not m: sys.exit(f"test/lint-page.py defines no {name}")
    return int(m.group(1))

pairs = [("Nodes", "MAX_NODES"), ("Edges", "MAX_EDGES"),
         ("Words per node label", "MAX_LABEL_WORDS"), ("Tree depth", "MAX_DEPTH")]
bad = [(l, n, from_table(l), from_lint(n)) for l, n in pairs if from_table(l) != from_lint(n)]
for l, n, a, b in bad:
    print(f"FAIL  budget  SKILL.md '{l}'={a} but lint-page.py {n}={b}", file=sys.stderr)
if bad: sys.exit(1)
print("PASS  budget  SKILL.md and test/lint-page.py agree")
PY
```

This requires `test/lint-page.py` to expose its limits as module-level constants
named `MAX_NODES`, `MAX_EDGES`, `MAX_LABEL_WORDS` and `MAX_DEPTH`. If plan 002
inlined them as literals, hoist them to constants now — that is a refactor of
plan 002's file, and it is the one exception to this plan's out-of-scope rule.
Change no behaviour while doing it.

Add `bash test/lint-budgets.sh` to `package.json`'s `lint` script.

**Verify**:

- `bash test/lint-budgets.sh` → `PASS budget ...`, exit 0
- Change `| Nodes | 9 |` to `| Nodes | 12 |` in a scratch copy → exit 1 with the FAIL line. Revert.
- `npm run lint` → exit 0

### Step 4: Rewrite the descriptions

Three descriptions currently promise mindmaps and artifacts. Make them match
what the plugin does after plans 001–005.

`SKILL.md` frontmatter `description:` — this is the text that decides whether
the skill fires at all, so it must keep its trigger vocabulary:

```
description: Answer plans, brainstorms, designs, option comparisons, roadmaps, and architecture discussions with a standalone Geist-styled HTML page holding a Mermaid diagram, opened in the browser, instead of paragraphs. Use whenever the user asks how to approach something, wants ideas or options, asks for a plan or breakdown, or the diagram-plans hook nudge appears in context.
```

That text is already correct — **leave it unchanged**. Only the two JSON
manifests are wrong. Set both `description` fields to:

```
Plans, brainstorms, and design discussions become a Geist-styled diagram page saved to a configurable directory and opened in your browser.
```

Bump both manifests to `0.5.0`.

**Verify**:

- `grep -ci 'mindmap' plugins/diagram-plans/.claude-plugin/plugin.json .claude-plugin/marketplace.json` → `0` for both
- `git diff --numstat -- .../SKILL.md | head -1` shows the frontmatter line was **not** modified
- `bash tools/check-version-sync.sh` → `version in sync: 0.5.0`

### Step 5: Check the cost

Measure how much this plan added to what gets loaded on every invocation:

```
wc -c plugins/diagram-plans/skills/diagram-plans/SKILL.md
git show HEAD~1:plugins/diagram-plans/skills/diagram-plans/SKILL.md | wc -c
```

Report both numbers. If the file grew by more than 2,000 bytes, cut prose until
it has not — the budget table and the anti-pattern list are the value; anything
restating them is overhead paid on every diagram.

## Test plan

No new fixtures. The tests are:

- `bash test/lint-budgets.sh` — proves the two copies of the budget agree, and
  fails when they do not (verified by the scratch edit in step 3).
- `npm run lint` — proves the new lint is wired in.
- A manual read-through: the `## Budget` table's numbers must be identical to
  the ones `test/lint-page.py` enforces. Print both side by side in your report.

Deliberately not tested: whether the model actually _follows_ the budget. That
is what plan 007's `diagram-check` gate is for — this plan writes the rule, 007
enforces it at generation time.

## Done criteria

ALL must hold:

- [ ] `npm run lint` exits 0 and includes `PASS budget`
- [ ] `bash test/lint-budgets.sh` exits 0
- [ ] Editing any budget number in `SKILL.md` alone makes `test/lint-budgets.sh` exit 1 (verified, then reverted)
- [ ] `grep -c '## Budget' .../SKILL.md` and `grep -c '## Anti-patterns' .../SKILL.md` each return `1`
- [ ] `grep -c 'Google Fonts' .../SKILL.md` returns `0`
- [ ] `grep -ci mindmap` returns `0` for both JSON manifests
- [ ] `SKILL.md` frontmatter `description:` is byte-identical to before this plan
- [ ] `SKILL.md` grew by less than 2,000 bytes, and both byte counts are in your report
- [ ] `bash tools/check-version-sync.sh` prints `version in sync: 0.5.0`
- [ ] `git status --porcelain` lists no file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `test/lint-page.py` does not exist or has no node/edge/label limits — plan 002
  has not landed.
- Hoisting the limits to named constants in `test/lint-page.py` would change any
  rule's behaviour. Report it instead; a silent behaviour change inside a
  "refactor" is the worst outcome here.
- `SKILL.md` grows past 2,000 added bytes and you cannot cut it without losing
  the budget table or the anti-patterns.
- You conclude a budget number is wrong (e.g. 9 nodes is too tight for the plans
  this tool actually produces). Say so with an example — the numbers are
  inherited from another project's taste, not measured against this one, and
  that is worth challenging with evidence.

## Maintenance notes

- The budget is duplicated on purpose: the model needs it as prose, the linter
  needs it as numbers. `test/lint-budgets.sh` is the only thing keeping the two
  honest — never delete it as "redundant".
- These numbers came from `cathrynlavery/diagram-design`, tuned for editorial
  architecture diagrams. Plans and brainstorms may want a slightly looser node
  cap. Revisit after real use; change both copies together.
- Everything added here is loaded on every skill invocation. Any future addition
  should displace something rather than accumulate.
- Reviewer should scrutinize: that the `description` in `SKILL.md` frontmatter
  was genuinely left alone (changing it changes when the skill fires), and that
  the budget numbers match the linter's.
- Deferred: per-diagram-type budgets (sequence lifelines, quadrant items), which
  `diagram-design` has and this does not. Add them only if a real diagram hits
  the limit.
