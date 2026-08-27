# Plan 045: Artifact pages open with a TL;DR and next action — ADHD rules mapped onto the three Geist templates

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 094fc01..HEAD -- plugins/DESIGN.md plugins/plans/skills/plan-pages/TEMPLATE.md plugins/decisions/skills/decision-pages/TEMPLATE.md plugins/diagrams/skills/diagram-plans/MERMAID.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live files before proceeding;
> on a mismatch, treat it as a STOP condition. (Plans 022, 023, and 027
> deliberately edit these files — see STOP conditions for how each case
> resolves.)

## At a glance

- **What**: add a TL;DR-with-next-action card, a progress count, and a
  folded-depth pattern to the three artifact HTML templates, and make those
  rules normative in `plugins/DESIGN.md` §10.
- **Why**: artifact pages are the owner's primary reading surface; today
  they start with a title and dive straight into detail — no conclusion
  first, no visible next action, no progress signal (the ADHD rules in
  `docs/agents/adhd-writing.md`, filed by plan 044).
- **Next action**: Step 1 — add §10 to `plugins/DESIGN.md`.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/044 (creates `docs/agents/adhd-writing.md`).
  Sequencing: run after 022 (DESIGN.md reformat) and 027 (MERMAID.md CDN
  removal) if those are in flight; run before 023 (token rename). See STOP
  conditions — none of these hard-block execution today.
- **Category**: dx | direction
- **Planned at**: commit `094fc01`, 2026-08-27

## Why this matters

Every plan, decision, and diagram the agent produces is delivered as a
Geist-styled HTML page (`plugins/DESIGN.md` §7: "the artifact IS the
response"). The templates already do several ADHD-friendly things —
consistent shape, card chunks, status chips, sparse semantic color, dark
mode, no animation — but they violate the three highest-leverage rules
from `docs/agents/adhd-writing.md`:

1. **No BLUF**: the header is kicker + title + one `.sub` sentence; the
   reader must scan the whole page to learn the conclusion and what is
   being asked of them.
2. **No visible next action**: a plan page shows steps but never "start
   here"; a decision page puts the recommendation *below* the options grid.
3. **No progress signal**: status chips exist per step, but nothing says
   "2/6 done" where the eye lands first.

This plan closes those three gaps in the templates so every *future*
artifact page inherits them, and writes the mapping into `DESIGN.md` so
future artifact types (plan 014) must carry it too.

## Current state

### Files in play

- `plugins/DESIGN.md` — 231 lines, normative design contract. Sections
  §1–§9; §9 "Conforming instance" names
  `plugins/diagrams/skills/diagram-plans/MERMAID.md` as the reference
  implementation. Plan 022 will reformat this file; plan 023 renames the
  `--accents-*` tokens it documents.
- `plugins/plans/skills/plan-pages/TEMPLATE.md` — 449 lines. Header markup:

  ```html
  <header>
    <div class="kicker">Plan · YYYY-MM-DD · ordered steps</div>
    <h1>TOPIC</h1>
    <p class="sub">One sentence defining the outcome and boundary.</p>
  </header>

  <section class="steps" aria-label="Plan steps">
  ```

  Steps are `article.step` cards (stepno / title+one-liner / status chip);
  status chips are `todo`, `doing`, `done`, `blocked`.
- `plugins/decisions/skills/decision-pages/TEMPLATE.md` — 515 lines.
  Header at lines ~248–254 (`.kicker` with `.decision-status`, `h1`,
  `p.sub` "One sentence naming the decision boundary."), then
  `section.context`, then the `section.options` grid, then
  `section.recommendation` ("**First option.** One line explaining why…"),
  then `section.notes`.
- `plugins/diagrams/skills/diagram-plans/MERMAID.md` — 491 lines; the HTML
  template lives in the fenced block under `## HTML template (Geist)`
  (line ~39). Header is kicker/h1/`.sub`; the diagram sits in a `figure`
  with `.figbar`, `.stage`, `figcaption`; document mode and a canvas mode
  (canvas hides `header` and `figcaption`). Plan 027 will replace its
  jsDelivr Mermaid import with a vendored copy — a different region of the
  same file.
- Version manifests: `plugins/{plans,decisions,diagrams}/.claude-plugin/plugin.json`
  and `.claude-plugin/marketplace.json` — versions must match
  (`tools/check-plugins.sh`).
- All three templates embed the feedback widget between
  `<!-- feedback-widget:start -->` and `<!-- feedback-widget:end -->`;
  DESIGN.md §8 requires it preserved verbatim.

### Design constraints that bind this work (inlined from DESIGN.md)

- Tokens only, no new colors: grays `--accents-1/2/3/5`, semantic text
  tones `--text-warning`/`--text-info` (AA in both themes); tints via
  `color-mix(in srgb, var(--text-info) 40%, var(--accents-2))` for borders
  only — never semantic tone as low-contrast text.
- Mono, uppercase micro-labels 10.5–11px, letter-spacing ≥ .06em for tags.
- Radii: 10px cards (`--radius`); 1px borders; two background levels.
- Every page: light+dark via `prefers-color-scheme`, standalone file,
  network only for Google Fonts (+ Mermaid CDN until 027 lands).

## Commands you will need

| Purpose       | Command                        | Expected on success |
| ------------- | ------------------------------ | ------------------- |
| Plugin checks | `bash tools/check-plugins.sh`  | exit 0              |
| Widget intact | see Done criteria grep         | 2 markers per file  |

## Scope

**In scope** (the only files you should modify):

- `plugins/DESIGN.md`
- `plugins/plans/skills/plan-pages/TEMPLATE.md`
- `plugins/decisions/skills/decision-pages/TEMPLATE.md`
- `plugins/diagrams/skills/diagram-plans/MERMAID.md`
- the three `plugin.json` files + `.claude-plugin/marketplace.json`
  (version bumps)
- `plans/README.md` (status row), `log.md` (append entry)

**Out of scope** (do NOT touch):

- Existing rendered pages under `artifacts/` — no retrofit; skills re-render
  a topic to the same path when it next changes.
- The feedback widget block in any template (byte-preserve it).
- `site/` (including `artifact-reviewer.tsx` — plans 017/032/037 own it).
- The Mermaid import lines in MERMAID.md (plan 027 owns them).
- Skill `SKILL.md` files' step lists (the templates carry the change).

## Git workflow

- Work on `main`; do NOT push.
- One commit: `plugins: ADHD-friendly TL;DR/next-action/progress in artifact templates (plan 045)`.

## Steps

### Step 1: Make the rules normative — `plugins/DESIGN.md` §10

Append after §9:

```markdown
## 10. ADHD-friendly reading contract

Maps `docs/agents/adhd-writing.md` onto artifact pages. Every page:

- Opens `<main>` content (directly after `header`) with a **TL;DR card**
  (`.tldr`): mono tag `TL;DR`, ≤3 plain sentences stating the conclusion,
  then one **next-action line** (`.next`, info tone, mono) naming exactly
  one action for the reader. A decision page's TL;DR states the
  recommendation; a plan page's states outcome + first open step; a
  diagram page's states what the diagram shows and the one takeaway.
- Shows **progress in the kicker** when the page has stateful units
  (plan steps): `· N/M done`, updated on every re-render.
- **Folds depth**: content beyond the skim layer goes inside
  `<details class="depth">` with a one-line `<summary>` that states the
  point of what it hides. Never fold the TL;DR, next action, steps list,
  or Notes.
- **Chunk budget**: ≤7 step/option cards per section; a card's visible
  copy is one line, overflow goes into its `details`. Headings state the
  point, never tease it.
- Emphasis stays on budget (§2 color rules apply): the next-action line is
  the only info-tone text added by this contract.
```

**Verify**: `grep -c "^## 10\." plugins/DESIGN.md` → `1`.

### Step 2: Plan template — TL;DR card, progress kicker, depth pattern

In `plugins/plans/skills/plan-pages/TEMPLATE.md`:

2a. Change the kicker line to
`<div class="kicker">Plan · YYYY-MM-DD · ordered steps · 1/3 done</div>`
(placeholder count; the skill fills real N/M).

2b. Insert after `</header>`:

```html
<section class="tldr" aria-label="TL;DR">
  <span class="tag">TL;DR</span>
  <p>Two or three sentences: the outcome, the state of play, the risk that
  matters. Written so a 10-second read suffices.</p>
  <p class="next">Next → the single action the reader should take.</p>
</section>
```

2c. Add CSS (token-conformant, after the `.sub` rule):

```css
.tldr {
  border: 1px solid color-mix(in srgb, var(--text-info) 40%, var(--accents-2));
  border-radius: var(--radius);
  background: var(--accents-1);
  padding: 14px 16px;
  margin-bottom: 20px;
}
.tldr .tag { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--text-info); display: block; margin-bottom: 6px; }
.tldr p { margin: 0; }
.tldr .next { font-family: var(--font-mono); font-size: 12.5px; color: var(--text-info); margin-top: 8px; }
details.depth { margin-top: 8px; }
details.depth summary { cursor: pointer; font-size: 13px; color: var(--accents-5); }
```

2d. In one step card, demonstrate folded depth inside the step's `<div>`:

```html
<details class="depth">
  <summary>Why this step is safe to run first</summary>
  <p>Longer rationale lives here, out of the skim path.</p>
</details>
```

2e. In the template's intro line ("Copy this complete document…"), add:
"Fill the TL;DR and its Next → line, keep the kicker's N/M done count
true, cap steps at 7 (fold overflow into `details.depth`), and give steps
stated-point titles."

**Verify**: `grep -c "class=\"tldr\"" plugins/plans/skills/plan-pages/TEMPLATE.md` → `1`;
`grep -c "details.depth" plugins/plans/skills/plan-pages/TEMPLATE.md` → ≥2.

### Step 3: Decision template — recommendation up front

In `plugins/decisions/skills/decision-pages/TEMPLATE.md`, insert the same
`.tldr` markup + CSS (Step 2b/2c) after `</header>`, with decision copy:

```html
<section class="tldr" aria-label="TL;DR">
  <span class="tag">TL;DR</span>
  <p>Recommendation: <strong>First option</strong> — one clause on why.
  The options grid below carries the evidence.</p>
  <p class="next">Next → accept the recommendation, or open the option
  that contradicts it.</p>
</section>
```

Keep `section.recommendation` where it is (it remains the reasoned
version; the TL;DR is the 10-second layer). Add the same intro-line
guidance sentence as 2e, adapted ("state the recommendation in the TL;DR
even though it repeats below").

**Verify**: `grep -c "class=\"tldr\"" plugins/decisions/skills/decision-pages/TEMPLATE.md` → `1`.

### Step 4: Diagram template — the takeaway before the diagram

In `plugins/diagrams/skills/diagram-plans/MERMAID.md`'s HTML template,
insert the `.tldr` markup + CSS after `</header>` (document mode only —
canvas mode already hides `header`; hide `.tldr` there too by adding
`body[data-mode="canvas"] .tldr { display: none; }` next to the existing
`body[data-mode="canvas"] header … { display: none; }` rule). Copy shape:

```html
<section class="tldr" aria-label="TL;DR">
  <span class="tag">TL;DR</span>
  <p>What the diagram shows and the single takeaway a skimmer should keep.</p>
  <p class="next">Next → the branch or node to look at first.</p>
</section>
```

Also update the "Replace `TOPIC`, the diagram, and the notes; leave the
rest." instruction line to include the TL;DR among the replaceables.

**Verify**: `grep -c "class=\"tldr\"" plugins/diagrams/skills/diagram-plans/MERMAID.md` → `1`;
`grep -c 'data-mode="canvas"\] \.tldr' plugins/diagrams/skills/diagram-plans/MERMAID.md` → `1`.

### Step 5: Version bumps + checks

Patch-bump `plans`, `decisions`, and `diagrams` in their
`.claude-plugin/plugin.json` AND `.claude-plugin/marketplace.json`.

**Verify**: `bash tools/check-plugins.sh` → exit 0.

### Step 6: Log, index, commit

- Append `## [<today>] maintenance | Plan 045 — ADHD contract in artifact templates` to `log.md`.
- Set plan 045's `plans/README.md` row to DONE.
- Commit as specified in Git workflow.

**Verify**: `git status --short` → clean apart from committed in-scope files.

## Test plan

No automated render test exists for templates (plan 024 may add one; if a
`bun test`/`verify` gate exists when you run, run it and require exit 0).
Manual gate: open one template's HTML in a browser by extracting the fenced
block to `/tmp/tpl-check.html`
(`awk '/^```html/{f=1;next}/^```/{f=0}f' <TEMPLATE file> > /tmp/tpl-check.html`),
load it, and confirm: TL;DR card renders above content in light and dark
(`prefers-color-scheme`), the Next → line is legible in both themes, and
`details.depth` opens/closes.

## Done criteria

ALL must hold:

- [ ] `plugins/DESIGN.md` has §10 with the four bullets (TL;DR, progress,
      folded depth, chunk budget)
- [ ] all three templates contain exactly one `class="tldr"` section and
      its CSS
- [ ] `grep -c "feedback-widget:start" <each template>` → `1` and
      `grep -c "feedback-widget:end" <each template>` → `1` (widget intact)
- [ ] canvas mode hides `.tldr` in MERMAID.md
- [ ] `bash tools/check-plugins.sh` exits 0
- [ ] no `#`-hex colors added beyond the existing token block
      (`git diff` shows no new hex literals)
- [ ] `plans/README.md` row updated; `log.md` entry appended

## STOP conditions

Stop and report back (do not improvise) if:

- `docs/agents/adhd-writing.md` does not exist (plan 044 has not run —
  hard dependency).
- Plan 022 or 027 is `IN PROGRESS` per `plans/README.md` (both edit
  in-scope files; wait or coordinate). If they are DONE, expect the drift
  check to flag DESIGN.md/MERMAID.md — re-locate the insert anchors by
  section heading, and STOP only if the header/notes structure itself
  changed.
- Plan 023 is DONE (tokens renamed `--accents-*` → `--ds-gray-*`): the CSS
  snippets above use the old names — translate them per 023's mapping
  before inserting, and say so in your report; STOP if no mapping is
  recorded in 023.
- The feedback-widget markers are missing from any template.
- `tools/check-plugins.sh` fails for a reason unrelated to your bump.

## Maintenance notes

- Plan 014 (artifact types for all skill outputs) must include §10's
  TL;DR/next-action/progress in every new template — reviewers check §10
  compliance, not just §1–§9.
- Plan 023's rename must sweep the new `.tldr` CSS too if 045 lands first
  (it renames by token name, so it will — just noting the interaction).
- Plan 034's template invariants: if it adds a token-block sync check,
  the new CSS lives outside the token block and is unaffected; if it adds
  widget-verbatim checks, this plan already preserves the widget.
- The skills' SKILL.md "Steps" sections say "write from TEMPLATE.md
  verbatim; change only its placeholders" — the TL;DR card is a
  placeholder like any other, so no SKILL.md edit is needed; revisit only
  if agents in practice skip filling it.
