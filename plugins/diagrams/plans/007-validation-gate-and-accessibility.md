# Plan 007: Never ship a broken diagram — add a check gate to the skill, and make every SVG accessible

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat cd109ef..HEAD -- plugins/diagram-plans/ test/`
> If any in-scope file changed beyond what plans 001–006 did, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/006-editorial-discipline.md`
- **Category**: tests
- **Planned at**: commit `cd109ef`, 2026-08-26

## Why this matters

Nothing between the model writing a diagram and the user's browser opening it
checks that the diagram is valid. The skill's completion criterion is that the
file exists and the opener printed `opened` — a Mermaid syntax error passes
both. And a syntax error is the _likeliest_ failure mode: the skill mandates
labels like `⚠ risk: …` and `? open: …`, which contain Mermaid-significant
characters, and the model is writing this syntax freehand every time.

A broken diagram is the most unreadable diagram there is. Plan 003 made the
failure visible in the browser instead of a blank card; this plan stops it
reaching the browser at all.

The second half is the accessibility contract. Mermaid emits an SVG with no
accessible name unless told otherwise, so the diagram is invisible to a screen
reader and unlabelled in any tool that indexes the page. Mermaid supports
`accTitle:` and `accDescr:` directives that become the SVG's `<title>` and
`<desc>`; plans 003 and 005 already seeded them into the template and fixtures,
but nothing requires them. This plan makes them mandatory and enforced.

## Current state

`plugins/diagram-plans/skills/diagram-plans/SKILL.md:25` — the completion
criterion that lets broken diagrams through:

```
Done when: the file exists at the configured path, the opener script reported `opened` (or was disabled), and the chat reply is under five lines.
```

`SKILL.md` steps 3 and 4, after plans 004 and 005, run `diagram-build` then
`diagram-open`. There is no check between them.

Plan 002 created `test/lint-page.py`, a stdlib-only structural linter with rules
covering brackets, budgets, `accTitle`/`accDescr`, Geist tokens, and the
`no-mindmap` ban. Plan 006 hoisted its limits to the constants `MAX_NODES`,
`MAX_EDGES`, `MAX_LABEL_WORDS`, `MAX_DEPTH`.

**The problem this plan must solve first**: `test/lint-page.py` lives in the
repo, not in the plugin. The installed plugin ships only
`plugins/diagram-plans/**`, so the skill cannot call it. Verified: the install
directory contains `.claude-plugin/`, `hooks/`, `skills/` and (after plan 001)
`bin/` — nothing from the repo root. The linter has to move inside the plugin
and the repo's test must call the moved copy, not the other way round.

Repo conventions: `bin/` executables are `#!/usr/bin/env bash` with
`set -euo pipefail` and a usage comment (see `bin/diagram-open`,
`bin/diagram-build`). Python is stdlib-only, no dependencies — this is
load-bearing, because the gate runs on the user's machine with no install step.

## Commands you will need

| Purpose                   | Command                              | Expected on success       |
| ------------------------- | ------------------------------------ | ------------------------- |
| Check one page            | `diagram-check <file.html>`          | exit 0, `PASS` lines only |
| Check Mermaid source only | `diagram-check --syntax-only <file>` | exit 0                    |
| Everything                | `npm test`                           | exit 0                    |
| Version sync              | `bash tools/check-version-sync.sh`   | exit 0                    |

## Scope

**In scope**:

- `plugins/diagram-plans/lib/lint_page.py` (create — moved from `test/lint-page.py`)
- `plugins/diagram-plans/bin/diagram-check` (create)
- `test/lint-page.py` (rewrite as a thin shim)
- `plugins/diagram-plans/skills/diagram-plans/SKILL.md` — step 3's bullet list,
  a new step between 3 and 4, and the `Done when:` line
- `plugins/diagram-plans/skills/diagram-plans/MERMAID.md` — the accessibility
  paragraph in the template section only
- `test/lint-budgets.sh` — update the path it reads
- `package.json` — update the lint path
- `.github/workflows/ci.yml` — no change expected; verify it still passes
- Both manifests — version bump
- `README.md` — document `diagram-check`
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- The rule _logic_ inside the linter. You are moving the file and adding two
  rules, not rewriting the ones plans 002–006 established.
- Any colour, token, or `themeVariables` value — plans 004 and 005.
- The budget numbers — plan 006 owns them; `test/lint-budgets.sh` must keep
  passing unchanged apart from its file path.
- Installing anything. The gate is stdlib Python and bash. If you find yourself
  wanting `npm i` in the skill's path, stop.

## Git workflow

- Branch: `advisor/007-validation-gate`
- Message style `diagram-plans: <imperative>`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Move the linter into the plugin

`git mv test/lint-page.py plugins/diagram-plans/lib/lint_page.py` (create `lib/`
first if needed). Change nothing inside it except the module docstring, which
should now say it ships with the plugin and runs on the user's machine, so it
must stay stdlib-only.

Replace `test/lint-page.py` with a shim so the repo's tooling keeps working and
there is exactly one implementation:

```python
#!/usr/bin/env python3
"""Repo-side entry point. The implementation ships inside the plugin so the
skill can run it on a user's machine; this only re-exports it."""
import pathlib, runpy, sys

target = pathlib.Path(__file__).resolve().parent.parent / "plugins" / "diagram-plans" / "lib" / "lint_page.py"
sys.argv[0] = str(target)
runpy.run_path(str(target), run_name="__main__")
```

Update `test/lint-budgets.sh` to read
`plugins/diagram-plans/lib/lint_page.py` instead of `test/lint-page.py`.

**Verify**:

- `python3 test/lint-page.py test/fixtures/sample-plan.html` → exit 0, same output as before the move
- `bash test/lint-budgets.sh` → `PASS budget`, exit 0
- `npm run lint` → exit 0
- `git ls-files plugins/diagram-plans/lib/lint_page.py` → the path is tracked

### Step 2: Add the two accessibility rules

In `plugins/diagram-plans/lib/lint_page.py`, tighten the existing
`accessibility` rule and add one more:

- `accessibility` (tighten) — every Mermaid block must contain both an
  `accTitle:` line whose value is 1–60 characters and an `accDescr` whose value
  is at least 20 characters and contains a space. This rejects the template's
  placeholder text surviving into a real diagram.
- `acc-not-placeholder` (new) — fail if an `accTitle:` value is `TOPIC`, or an
  `accDescr` value starts with `One sentence saying what`. Those are the
  template's literal placeholders from plan 003.

Add a third rule while you are here:

- `no-build-marker` (new) — fail if `<!--GEIST_FONTS-->` is still present. Plan
  004 notes that a page which skipped `diagram-build` renders with the fallback
  font stack and reintroduces the measurement drift plan 003 fixed. This is the
  check that catches it.

**Verify**: on a scratch copy of the fixture,

- setting `accTitle: TOPIC` → exit 1, `FAIL acc-not-placeholder`
- deleting the `accDescr` line → exit 1, `FAIL accessibility`
- reinserting `<!--GEIST_FONTS-->` → exit 1, `FAIL no-build-marker`

Delete the scratch copies.

### Step 3: Add `diagram-check`

Create `plugins/diagram-plans/bin/diagram-check` (`chmod +x`):

```bash
#!/usr/bin/env bash
# Validate a generated diagram page before it is opened. Structural checks
# always run (stdlib Python, no install). Set DIAGRAM_PLANS_RENDER_CHECK=1 to
# additionally render it headlessly via mermaid-cli, which needs network + npx.
# On PATH as `diagram-check` while the diagram-plans plugin is enabled.
# Usage: diagram-check [--syntax-only] <file.html>
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python3 "$here/lib/lint_page.py" "$@"

if [ "${DIAGRAM_PLANS_RENDER_CHECK:-0}" = "1" ] && [ "${1:-}" != "--syntax-only" ]; then
  file="${!#}"
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  python3 - "$file" "$tmp/d.mmd" <<'PY'
import re, sys, html
page, out = sys.argv[1], sys.argv[2]
blocks = re.findall(r'<pre class="mermaid">(.*?)</pre>', open(page, encoding="utf-8").read(), re.S)
if not blocks:
    sys.exit("no mermaid block found")
open(out, "w", encoding="utf-8").write(html.unescape(blocks[0]).strip() + "\n")
PY
  if npx -y @mermaid-js/mermaid-cli -i "$tmp/d.mmd" -o "$tmp/d.svg" >/dev/null 2>&1; then
    echo "PASS  render  $file"
  else
    echo "FAIL  render  $file: mermaid-cli could not render the diagram" >&2
    exit 1
  fi
fi
```

The render pass is **opt-in**, not default: `npx -y @mermaid-js/mermaid-cli`
downloads Puppeteer and a Chromium build on first use, which is not an
acceptable cost on every diagram. The structural checks catch the common
failures — unbalanced brackets, budget overruns, placeholder text, a missed
build step — with no install and no network.

**Verify**:

- `bash -n plugins/diagram-plans/bin/diagram-check` → exit 0
- `./plugins/diagram-plans/bin/diagram-check test/fixtures/sample-plan.html` → exit 0, PASS lines only
- `./plugins/diagram-plans/bin/diagram-check --syntax-only test/fixtures/sample-plan.html` → exit 0
- On a scratch fixture with a deleted `]`: exit 1, `FAIL balanced-brackets`

### Step 4: Wire the gate into the skill

In `SKILL.md`, add a new step between the current steps 3 and 4, renumbering the
opener to step 5 and the reply to step 6:

```
4. **Check it before opening it**: run `diagram-check <absolute-file-path>` (fall back to `bash "${CLAUDE_PLUGIN_ROOT}/bin/diagram-check" <path>` if the command is not on `PATH`). Every line must be `PASS`. On any `FAIL`, fix the diagram source and re-run — do not open a page that failed, and do not report it as done. If the same check fails three times, stop and tell the user what the checker said.
```

And replace the `Done when:` line with:

```
Done when: `diagram-check` reported `PASS` on every line, the file exists at the configured path, the opener reported `opened` (or was disabled), and the chat reply is under five lines.
```

Also add one bullet to step 3's list, right after the filename bullet:

```
   - Every diagram carries `accTitle:` (≤ 60 characters, the diagram's name) and `accDescr:` (one sentence saying what it shows, in terms a reader who cannot see it would need). These become the SVG's accessible name and description. The template's placeholders are rejected by `diagram-check`.
```

The three-strikes escape hatch is deliberate: without it, a model facing a rule
it cannot satisfy will loop, and a loop is worse than a reported failure.

**Verify**:

- `grep -c 'diagram-check' .../SKILL.md` → `3`
- `grep -c 'accDescr' .../SKILL.md` → `1`
- `grep -c 'Done when: `diagram-check` reported' .../SKILL.md` → `1`
- The steps are numbered 1–6 with no repeats: `grep -oE '^[0-9]+\.' .../SKILL.md` → `1. 2. 3. 4. 5. 6.`

### Step 5: Document the accessibility contract in the template

In `MERMAID.md`, add one paragraph to the template section explaining the
directives — this is the file the model reads when writing the diagram body:

```markdown
Every diagram begins with two accessibility directives, indented inside the
diagram body:
```

flowchart LR
accTitle: Release plan
accDescr: Four steps from draft through review and staging to release, with one risk branch.

```

They become the SVG's `<title>` and `<desc>`. Describe what the diagram *shows*,
not its geometry — "four steps from draft to release", never "a box at the left
with three boxes to its right". `diagram-check` rejects a page whose directives
are missing or still hold the template's placeholder text.
```

**Verify**: `grep -c 'accessibility directives' .../MERMAID.md` → `1`

### Step 6: Document, bump, and confirm CI

Add `diagram-check` to `README.md`'s environment-variable table and a short
paragraph:

| Variable                     | Default | Meaning                                                                                                                                                                               |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIAGRAM_PLANS_RENDER_CHECK` | `0`     | When `1`, `diagram-check` also renders the diagram headlessly with `npx @mermaid-js/mermaid-cli`. Slower and needs network on first run; catches syntax the structural checks cannot. |

Bump both manifests to `0.6.0`.

**Verify**:

- `grep -c 'DIAGRAM_PLANS_RENDER_CHECK' README.md` → `1`
- `bash tools/check-version-sync.sh` → `version in sync: 0.6.0`
- `npm test` → exit 0

### Step 7: End-to-end rehearsal

Write a deliberately broken page by hand — an unbalanced bracket, an 11-node
flowchart, and `accTitle: TOPIC` — and walk the skill's own sequence against it:

```
diagram-build /tmp/broken.html && diagram-check /tmp/broken.html
```

Confirm `diagram-check` exits 1 and names all three problems in one run. A
checker that reports only the first failure makes the model fix-and-rerun three
times; it should report every failure it can see. If it does not, make it
accumulate failures before exiting — that is in scope.

**Verify**: the single run prints `FAIL balanced-brackets`, `FAIL node-budget`
and `FAIL acc-not-placeholder`, then exits 1. Delete `/tmp/broken.html`.

## Test plan

- `npm run lint` and `npm test` must pass unchanged after the move — the shim
  proves the relocation was transparent.
- Add `test/fixtures/broken-plan.html`, a permanently-broken page, plus a check
  in `test/run.sh` asserting `diagram-check` exits **1** on it. A gate with no
  test that it fails is not a gate.
- Confirm each new rule fires:

| Injected fault               | Must fail rule        |
| ---------------------------- | --------------------- |
| `accTitle: TOPIC`            | `acc-not-placeholder` |
| `accDescr` deleted           | `accessibility`       |
| `accDescr: ok` (too short)   | `accessibility`       |
| `<!--GEIST_FONTS-->` left in | `no-build-marker`     |
| 10 nodes                     | `node-budget`         |
| Unbalanced `[`               | `balanced-brackets`   |

- Do **not** enable `DIAGRAM_PLANS_RENDER_CHECK=1` in CI. Verify it works once
  by hand and record the result in your report.

## Done criteria

ALL must hold:

- [ ] `npm test` exits 0
- [ ] `test -x plugins/diagram-plans/bin/diagram-check` exits 0
- [ ] `plugins/diagram-plans/lib/lint_page.py` is tracked, and `test/lint-page.py` is the shim
- [ ] `python3 test/lint-page.py test/fixtures/sample-plan.html` exits 0 with output identical to before step 1
- [ ] `diagram-check test/fixtures/broken-plan.html` exits 1
- [ ] The step-7 rehearsal reports all three failures in a single run
- [ ] `grep -c 'diagram-check' .../SKILL.md` returns `3` and the steps number 1–6 with no repeats
- [ ] `bash test/lint-budgets.sh` exits 0 against the moved file
- [ ] `plugins/diagram-plans/lib/lint_page.py` imports only stdlib (`grep -E '^(import|from)' | grep -vE '\b(re|sys|os|html|pathlib|argparse|json|typing)\b'` returns nothing)
- [ ] `bash tools/check-version-sync.sh` prints `version in sync: 0.6.0`
- [ ] `git status --porcelain` lists no file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `test/lint-page.py` does not exist, or plan 006's constants are missing — the
  dependency chain is broken.
- The moved linter needs a non-stdlib import to work. It must not; report what
  you hit rather than adding a dependency the user would have to install.
- `diagram-check` cannot be made to report multiple failures in one run without
  restructuring the rule logic. Report it; the single-failure behaviour is
  tolerable, the restructuring is not worth doing blind.
- Adding the gate makes the skill's step sequence exceed six steps. The skill is
  read on every invocation; a seventh step means something else should merge or
  go, and that is a decision to surface, not to make alone.
- `npx -y @mermaid-js/mermaid-cli` fails on this machine. Note it and leave the
  opt-in path in place — it is documented as opt-in precisely because it is
  fragile.

## Maintenance notes

- The linter now has two entry points (`bin/diagram-check` for users,
  `test/lint-page.py` for CI) over one implementation. Keep it that way; two
  copies would drift within a month.
- Stdlib-only is a hard constraint, not a preference. The gate runs on a user's
  machine at diagram time with no install step; a dependency would make the
  common path fail for anyone who has not run `npm i`.
- `DIAGRAM_PLANS_RENDER_CHECK` is the escape valve for syntax the structural
  rules cannot see. If broken diagrams still reach users, turning it on by
  default is the next move — measure before doing it, since it adds a Chromium
  download.
- Reviewer should scrutinize: that the skill genuinely refuses to open a failed
  page (the whole point), and that the three-strikes limit is present so a
  failing check cannot loop.
- Deferred: checking the _rendered geometry_ (overlapping nodes, edge crossings)
  the way `diagram-design`'s `verify-geometry.py` does. That needs a real
  renderer and belongs with `DIAGRAM_PLANS_RENDER_CHECK`, not the default path.
