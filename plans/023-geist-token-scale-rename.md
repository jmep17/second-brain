# Plan 023: Rename `--accents-*` tokens onto published Geist `--ds-gray-*` scale names

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- plugins/DESIGN.md plugins/diagrams/skills/diagram-plans/MERMAID.md plugins/plans/skills/plan-pages/TEMPLATE.md plugins/decisions/skills/decision-pages/TEMPLATE.md site/components/artifact-reviewer.tsx plans/017-geist-review-chrome.md`
> Expected drift: 017 (site chrome onto tokens), 018 (artifact-meta tag in
> DESIGN.md + templates), 020 (open-question banner in DESIGN.md +
> templates), 022 (DESIGN.md reformat) may all have landed — fine; the
> renames below are global find/replace and apply regardless. STOP if any
> file uses an `--accents-*` step other than 1/2/3/5, or already defines
> any `--ds-gray-*` name with a mapping different from Step 1's table.

## At a glance

- **What**: Rename the templates' legacy geist-ui `--accents-*` tokens to Vercel's published `--ds-gray-*` scale names.
- **Why**: DESIGN.md currently bridges the two vocabularies only in prose, so templates don't speak the documented vocabulary directly; values and rendering are unchanged, so the cost of skipping this is vocabulary drift only.
- **Next action**: Step 1 — Rewrite DESIGN.md's "Conforming instance" section

## Status

- **Priority**: P3 (vocabulary alignment; zero behaviour or visual change)
- **Effort**: S
- **Risk**: LOW (pure rename, values unchanged; missed references are caught by a grep gate)
- **Depends on**: 022 (formats DESIGN.md first — keeps this diff clean). Run AFTER 017, 018, and 020 where possible: all three spec styles against the current `--accents-*` names (017 heavily). Step 5 has a variant for each state.
- **Category**: dx
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

Plan 011 deferred this: the templates' neutral tokens use legacy geist-ui
names (`--accents-1/2/3/5`) while Vercel's published Geist docs name the
scale `--ds-gray-100…1000` with fixed roles. DESIGN.md §"Conforming
instance" currently bridges the two vocabularies in prose; renaming the
tokens removes the bridge and lets every template speak the documented
vocabulary. **Honest framing**: the benefit is vocabulary alignment only —
values and rendering are unchanged, and the mapping is lossy at the text
end (Geist publishes two text steps, 900 secondary / 1000 primary; this
repo uses three text tones). Step 1 records the decided resolution; if the
owner prefers the status quo, REJECTED is a cheap and legitimate outcome
for this plan.

## Current state

All verified at commit `c0ee11c`, 2026-08-27.

- The token block (identical in all three templates and the DESIGN.md
  widget CSS; MERMAID.md lines 59–70):

  ```css
  --geist-bg: #ffffff;
  --geist-fg: #171717;
  --accents-1: #fafafa;
  --accents-2: #eaeaea;
  --accents-3: #999999;
  --accents-5: #666666;
  /* dark: */
  --geist-bg: #000000;
  --geist-fg: #ededed;
  --accents-1: #111111;
  --accents-2: #333333;
  --accents-3: #888888;
  --accents-5: #a1a1a1;
  ```

- Files containing `--accents-*` (grep-verified; `site/` has ZERO uses until
  plan 017 executes):
  - `plugins/DESIGN.md` — §2 scrollbar rule, §8 widget CSS + prose,
    §9 "Conforming instance" (maps `--accents-1/2/3/5` to
    "bg-100 / border-400 / text-secondary / text-primary-muted")
  - `plugins/diagrams/skills/diagram-plans/MERMAID.md` (in `.prettierignore` — no reflow on edit)
  - `plugins/plans/skills/plan-pages/TEMPLATE.md`
  - `plugins/decisions/skills/decision-pages/TEMPLATE.md`
  - `plugins/diagrams/test/fixtures/sample-plan.html` — GENERATED from
    MERMAID.md by `plugins/diagrams/test/make-fixture.mjs` (regenerate,
    don't hand-edit)
  - `plans/017-geist-review-chrome.md` — a TODO plan whose spec hardcodes
    the old names (token block + per-component style lists)
- vercel.com/geist/colors.md (fetched 2026-08-27) publishes **roles and
  variable names only, no hex values**: gray-100/200/300 component
  backgrounds, 400/500/600 borders, 700/800 high-contrast, 900 secondary
  text/icons, 1000 primary text/icons; `--ds-background-100/200` page
  backgrounds. So this rename maps names to roles; the repo's existing
  WCAG-AA-verified hex values stay.
- Plugin versions at `c0ee11c`: diagrams `0.13.0`, plans `0.4.0`,
  decisions `0.6.0` (read the live values before bumping — later plans bump
  them too).
- Existing generated pages under `artifacts/` keep the old names — they are
  standalone committed records; new renders pick up the new names.
- Conventions: Prettier on everything except `.prettierignore`;
  `bash tools/check-plugins.sh` must pass; version bump = plugin manifest +
  `marketplace.json` entry, verified by
  `plugins/diagrams/tools/check-version-sync.sh`.

## Commands you will need

| Purpose      | Command                                                   | Expected on success |
| ------------ | --------------------------------------------------------- | ------------------- |
| Plugin gate  | `bash tools/check-plugins.sh`                             | `all checks passed` |
| Version sync | `cd plugins/diagrams && bash tools/check-version-sync.sh` | versions in sync    |
| Fixture      | `cd plugins/diagrams && node test/make-fixture.mjs`       | `PASS  fixture …`   |
| Format       | `bunx prettier --write <files>`                           | exit 0              |

## Scope

**In scope** (the only files you may modify):

- `plugins/DESIGN.md`
- `plugins/diagrams/skills/diagram-plans/MERMAID.md`
- `plugins/plans/skills/plan-pages/TEMPLATE.md`
- `plugins/decisions/skills/decision-pages/TEMPLATE.md`
- `plugins/diagrams/test/fixtures/sample-plan.html` (via regeneration only)
- `site/components/artifact-reviewer.tsx` (Step 5 variant A only)
- `plans/017-geist-review-chrome.md` (Step 5 variant B only — mechanical rename)
- The three plugin manifests + `.claude-plugin/marketplace.json` (version bumps)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch): existing `artifacts/**/*.html` pages,
plans 001–016 and 018–022 text, `wiki/`, `log.md`, `raw/`, hook scripts,
token **values**.

## Git workflow

- Branch: `advisor/023-geist-token-rename`
- Message style: `plugins: <imperative>` (one commit for the rename is fine).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Rewrite DESIGN.md's "Conforming instance" section

The mapping (decided; do not re-derive):

| Old           | New              | Geist role (published)                |
| ------------- | ---------------- | ------------------------------------- |
| `--accents-1` | `--ds-gray-100`  | component/raised background           |
| `--accents-2` | `--ds-gray-400`  | default border                        |
| `--accents-3` | `--ds-gray-900`  | secondary text and icons              |
| `--accents-5` | `--ds-gray-1000` | muted primary text (see note)         |
| `--geist-bg`  | unchanged        | page background (background-100 role) |
| `--geist-fg`  | unchanged        | heading-strength primary text         |

In `plugins/DESIGN.md`, replace the body of the `## 9. Conforming instance`
section (heading number may differ after 018/020 — find it by name) with:

```markdown
`plugins/diagrams/skills/diagram-plans/MERMAID.md` is the reference
implementation. Its neutral tokens use the published Geist gray-scale
names — `--ds-gray-100` (component/raised background), `--ds-gray-400`
(border), `--ds-gray-900` (secondary text and icons), `--ds-gray-1000`
(muted primary text) — with this repo's own WCAG-AA-verified values, since
vercel.com/geist publishes scale roles and variable names but no color
values. `--geist-bg`/`--geist-fg` remain the page-level pair: Geist's
single primary-text step is deliberately split here into heading strength
(`--geist-fg`) and muted body (`--ds-gray-1000`). Its `--radius: 10px`
sits inside the 6–12px card band. New types copy the reference token block
verbatim unless this document says otherwise.
```

**Verify**: `grep -c 'ds-gray-100' plugins/DESIGN.md` → ≥ 1;
`grep -c 'accents-1/2/3/5' plugins/DESIGN.md` → `0`.

### Step 2: Global rename in the four source files

For `plugins/DESIGN.md`, `MERMAID.md`, and both `TEMPLATE.md` files:

```bash
sed -i 's/--accents-1/--ds-gray-100/g; s/--accents-2/--ds-gray-400/g; s/--accents-3/--ds-gray-900/g; s/--accents-5/--ds-gray-1000/g' \
  plugins/DESIGN.md \
  plugins/diagrams/skills/diagram-plans/MERMAID.md \
  plugins/plans/skills/plan-pages/TEMPLATE.md \
  plugins/decisions/skills/decision-pages/TEMPLATE.md
bunx prettier --write plugins/DESIGN.md plugins/plans/skills/plan-pages/TEMPLATE.md plugins/decisions/skills/decision-pages/TEMPLATE.md
```

(MERMAID.md is prettier-ignored by design — do not format it.)

**Verify**: `grep -rn -- '--accents' plugins/ | grep -v test/fixtures | wc -l` → `0`;
`bunx prettier --check plugins/DESIGN.md plugins/plans/skills/plan-pages/TEMPLATE.md plugins/decisions/skills/decision-pages/TEMPLATE.md` → exit 0.

### Step 3: Regenerate the fixture

```bash
cd plugins/diagrams && node test/make-fixture.mjs && cd ../..
```

**Verify**: output `PASS  fixture  test/fixtures/sample-plan.html (…)`;
`grep -c -- '--accents' plugins/diagrams/test/fixtures/sample-plan.html` → `0`.

### Step 4: Version bumps

Read the live versions, then bump the minor of all three plugins in their
`.claude-plugin/plugin.json` AND their `.claude-plugin/marketplace.json`
entries (e.g. diagrams `0.13.0 → 0.14.0` if unchanged since `c0ee11c`).

**Verify**: `cd plugins/diagrams && bash tools/check-version-sync.sh` →
all three plugins `in sync` at the new versions, `all checks passed`.

### Step 5: The site chrome / plan-017 variant

Check `plans/README.md`'s row for 017:

- **Variant A — 017 is DONE**: the review chrome now uses the old names.
  Run the same four-substitution sed on `site/components/artifact-reviewer.tsx`
  (and on any other `site/` file `grep -rln -- '--accents' site/` reports).
  Verify: `grep -rn -- '--accents' site/ | wc -l` → `0`, and the site
  typecheck/build gate 017's plan names still passes.
- **Variant B — 017 is TODO or IN PROGRESS**: leave `site/` untouched. Run
  the same sed on `plans/017-geist-review-chrome.md` so its spec matches
  the renamed tokens, and append one sentence to the 017 authorship
  paragraph in `plans/README.md`: "Plan 023 renamed the tokens onto
  `--ds-gray-*` on <date>; 017's excerpts were updated mechanically —
  executors should trust the names as they now stand in 017."
  Verify: `grep -c -- '--accents' plans/017-geist-review-chrome.md` → `0`.

### Step 6: Full gate

**Verify**: `bash tools/check-plugins.sh` → `all checks passed` (includes
plan 022's identity lint if landed);
`grep -rn -- '--accents' plugins/ site/ | wc -l` → `0`.

## Test plan

Pure rename: the gates are the greps above plus the regenerated fixture.
Optional smoke: open `plugins/diagrams/test/fixtures/sample-plan.html` in a
browser — page renders identically (values unchanged); any broken
`var(--…)` reference would show as unstyled black-on-white regions.

## Done criteria

ALL must hold:

- [ ] Zero `--accents` references under `plugins/` and `site/` (fixture included)
- [ ] DESIGN.md "Conforming instance" carries the new mapping text; no `unverified` markers added
- [ ] Fixture regenerated via `make-fixture.mjs` (never hand-edited)
- [ ] All three plugin versions bumped and in sync; `bash tools/check-plugins.sh` passes
- [ ] Step 5 variant applied and verified for the actual 017 state
- [ ] Prettier-clean on every touched non-ignored file
- [ ] `git status --porcelain` shows only in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any template or DESIGN.md uses an `--accents-*` step other than 1/2/3/5,
  or a `--ds-gray-*` name already exists with a different mapping (a later
  plan got there first — reconcile, don't overwrite).
- The rename would change any **value** (hex, radius, font) — this plan
  renames only.
- 017 is IN PROGRESS (mid-execution): coordinate via the operator instead
  of racing its executor.
- `make-fixture.mjs` fails its placeholder check after the sed (template
  markers changed).

## Maintenance notes

- Post-merge: refresh installed copies — `claude plugin marketplace update`
  - `claude plugin update` for each plugin, and re-snapshot Codex per the
    plan-010 pattern (see `plugins/diagrams/plans/README.md`).
- Plan 014's new templates must copy the renamed token block; if 014 lands
  first, its templates need the same rename (its drift check will flag it).
- Existing `artifacts/**/*.html` pages intentionally keep the old names;
  re-rendering a topic to the same path upgrades it naturally.
