# Plan 002: Establish a verification baseline — lints, a render check, and CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat cd109ef..HEAD -- plugins/ .claude-plugin/ README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: `plans/001-fix-distribution-and-versioning.md`
- **Category**: tests
- **Planned at**: commit `cd109ef`, 2026-08-26

## Why this matters

This repo has no tests, no CI, no linter, and no `package.json`. Nothing checks
that a generated diagram page actually renders — which is the entire product.
A Mermaid syntax error, a broken CDN import, or text scaled down to 6px all ship
silently to the user's browser, and the only detector is the user squinting at
it. Plans 003–007 all change the rendering template; without a gate that opens
a real page and measures it, each of those plans is unfalsifiable.

The gate this plan builds is what makes "the diagram is readable" a
machine-checkable claim rather than an opinion.

## Current state

The repo root contains only `README.md`, `.gitignore`, `.claude-plugin/`, and
`plugins/`. Verified absent: `package.json`, `.github/`, any `*.test.*`, any
`docs/`.

Available on this machine (verified with `command -v`): `node`, `npx`,
`python3`, `bash`. **Not** available: `shellcheck`. Treat `shellcheck` as
optional everywhere — detect and skip, never require.

The shell scripts to lint today (after plan 001):

- `plugins/diagram-plans/bin/diagram-open`
- `plugins/diagram-plans/hooks/nudge.sh`
- `tools/check-version-sync.sh`

The two JSON manifests to validate:

- `plugins/diagram-plans/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`

Repo conventions: shell scripts start `#!/usr/bin/env bash` + `set -euo pipefail`

- a two-line `#` comment stating purpose and usage — match that in every new
  script. There is no existing JS/Python in the repo, so you are setting the
  convention: 2-space indent, ES modules (`.mjs`) for Node, no transpiler, no
  runtime dependencies outside `devDependencies`.

## Commands you will need

| Purpose       | Command                                   | Expected on success                     |
| ------------- | ----------------------------------------- | --------------------------------------- |
| All lints     | `npm run lint`                            | exit 0                                  |
| Render check  | `npm run test:render`                     | exit 0, prints per-assertion PASS lines |
| Everything    | `npm test`                                | exit 0                                  |
| Shell syntax  | `bash -n <script>`                        | exit 0                                  |
| JSON validity | `python3 -m json.tool <file> > /dev/null` | exit 0                                  |

## Scope

**In scope** (create unless noted):

- `package.json`
- `test/run.sh`
- `test/lint-shell.sh`
- `test/lint-json.sh`
- `test/lint-page.py`
- `test/render-check.mjs`
- `test/fixtures/sample-plan.html`
- `.github/workflows/ci.yml`
- `.gitignore` (modify — add `node_modules/`)
- `README.md` (modify — add a `### Development` section)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- Everything under `plugins/diagram-plans/skills/` — plans 003–007 own those
  files. This plan only _tests_ them; it must not edit them.
- `plugins/diagram-plans/hooks/nudge.sh` — plan 008.
- Adding any runtime dependency. `puppeteer` is a `devDependency` and the render
  check must degrade to a skip when it is absent.

## Git workflow

- Branch: `advisor/002-verification-baseline`
- Message style `diagram-plans: <imperative>` (see `git log --oneline`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add `package.json` and ignore `node_modules`

```json
{
  "name": "claude-diagrams",
  "version": "0.0.0",
  "private": true,
  "description": "Checks for the claude-diagrams plugin marketplace. Not a published package.",
  "type": "module",
  "scripts": {
    "lint": "bash test/lint-shell.sh && bash test/lint-json.sh && python3 test/lint-page.py test/fixtures/sample-plan.html",
    "test:render": "node test/render-check.mjs test/fixtures/sample-plan.html",
    "test": "npm run lint && npm run test:render"
  },
  "devDependencies": {
    "puppeteer": "^24.0.0"
  }
}
```

Append `node_modules/` to `.gitignore` (which currently holds
`.claude/diagrams/` and `.DS_Store`).

**Verify**:

- `python3 -m json.tool package.json > /dev/null` → exit 0
- `grep -c 'node_modules' .gitignore` → `1`

### Step 2: Shell and JSON lints

`test/lint-shell.sh`:

```bash
#!/usr/bin/env bash
# Syntax-check every shell script in the repo; run shellcheck too when installed.
# Usage: bash test/lint-shell.sh
set -euo pipefail

mapfile -t scripts < <(git ls-files '*.sh' 'plugins/diagram-plans/bin/*')
status=0

for s in "${scripts[@]}"; do
  if bash -n "$s"; then
    echo "PASS  syntax  $s"
  else
    echo "FAIL  syntax  $s" >&2
    status=1
  fi
done

if command -v shellcheck >/dev/null 2>&1; then
  for s in "${scripts[@]}"; do
    if shellcheck -S warning "$s"; then
      echo "PASS  shellcheck  $s"
    else
      echo "FAIL  shellcheck  $s" >&2
      status=1
    fi
  done
else
  echo "SKIP  shellcheck not installed"
fi

exit "$status"
```

`test/lint-json.sh`:

```bash
#!/usr/bin/env bash
# Validate the plugin manifests and confirm their versions agree.
# Usage: bash test/lint-json.sh
set -euo pipefail

for f in plugins/diagram-plans/.claude-plugin/plugin.json .claude-plugin/marketplace.json; do
  python3 -m json.tool "$f" > /dev/null
  echo "PASS  json  $f"
done

bash tools/check-version-sync.sh
```

`chmod +x` both.

**Verify**:

- `bash test/lint-shell.sh` → exit 0, one `PASS syntax` line per script, and either shellcheck PASS lines or the SKIP line
- `bash test/lint-json.sh` → exit 0, two `PASS json` lines and `version in sync: 0.2.0`

### Step 3: The page linter — structural rules a parser cannot catch

`test/lint-page.py` takes one or more generated HTML paths and enforces the
rules the diagram pages must satisfy. Written in pure Python 3 stdlib — no pip
installs, because plan 007 makes the skill call this on every diagram it writes,
on the user's machine, with no setup.

Implement these checks. Each prints `PASS  <rule>  <path>` or
`FAIL  <rule>  <path>: <detail>`; exit 1 if any failed.

1. `doctype` — file starts with `<!doctype html>` (case-insensitive).
2. `title` — a non-empty `<title>` exists.
3. `mermaid-block` — at least one `<pre class="mermaid">`, and at most two.
4. `mermaid-nonempty` — every such block has non-whitespace content.
5. `diagram-type` — each block's first non-blank line starts with one of:
   `flowchart`, `sequenceDiagram`, `stateDiagram-v2`, `quadrantChart`,
   `timeline`, `gantt`, `erDiagram`, `journey`, `---` (a config front-matter
   fence).
6. `no-mindmap` — no block begins with `mindmap`. Plan 005 removes it; this
   rule is what keeps it removed.
7. `balanced-brackets` — within each block, `[` `]`, `(` `)`, `{` `}` and `"`
   counts balance. Catches the single most common Mermaid syntax error.
8. `label-length` — no bracketed node label exceeds 6 whitespace-separated
   words. Extract with `re.findall(r'[\[\(\{"]([^\[\]\(\)\{\}"]{2,})[\]\)\}"]', block)`.
9. `node-budget` — at most 9 distinct node ids per block. Count with
   `re.findall(r'(?m)^\s*([A-Za-z_][\w-]*)\s*[\[\(\{]', block)` deduped.
10. `edge-budget` — at most 12 edge operators per block
    (`-->`, `---`, `-.->`, `==>`, `--`).
11. `accessibility` — each block contains an `accTitle:` and an `accDescr`
    line.
12. `geist-tokens` — the stylesheet defines `--ds-gray-1000` and
    `--ds-background-100`.
13. `no-legacy-tokens` — the file contains none of `--accents-`,
    `--geist-success`, `#f5a623`, `#0070f3`, `#ee0000`. These are the legacy
    2020 Vercel palette that plan 004 removes.
14. `font-inlined` — the file contains `data:font/woff2;base64,` at least twice
    (Geist and Geist Mono, per plan 004).
15. `no-external-css` — no `<link rel="stylesheet"` remains. After plan 004 the
    fonts are inlined and nothing else is external except the Mermaid module.
16. `error-container` — an element with `id="diagram-error"` exists (plan 003's
    failure surface).
17. `noscript` — a `<noscript>` block exists.

Rules 5–11 apply per Mermaid block; the rest apply per file. Skip rules 12–17
when the path is passed with `--syntax-only` (plan 007 uses that mode to check
a raw Mermaid snippet before the page is assembled).

**Verify** once step 4's fixture exists:
`python3 test/lint-page.py test/fixtures/sample-plan.html` → exit 0, all PASS.

Also verify it actually fails: create a scratch copy with `mindmap` as the
first line of the block and confirm `python3 test/lint-page.py <copy>` exits 1
with `FAIL no-mindmap`. Delete the scratch copy afterwards.

### Step 4: The fixture

`test/fixtures/sample-plan.html` is a generated page produced by the template
that plans 003–005 land. **You cannot write it correctly before those plans
exist.** Therefore:

- If `plugins/diagram-plans/skills/diagram-plans/MERMAID.md` still contains the
  `<!doctype html>` template with `--accents-1` in it (i.e. plans 003–005 have
  not landed), generate the fixture from **that** template, and mark rules
  12–17 as expected-fail by running the linter with
  `--allow-fail=geist-tokens,no-legacy-tokens,font-inlined,no-external-css,error-container,noscript`.
  Wire that same flag into `package.json`'s `lint` script, with a `# TODO(005)`
  comment above it.
- Otherwise generate it from the current template with no allowances.

Either way the fixture's diagram is a small, realistic flowchart:

```
flowchart LR
  accTitle: Sample release plan
  accDescr: Four steps from draft through review and staging to release, with one risk branch.
  A["Draft the change"] --> B["Review"]
  B --> C["Stage"]
  C --> D["Release"]
  B -.-> R["Risk: reviewer unavailable"]
```

**Verify**: `python3 test/lint-page.py test/fixtures/sample-plan.html` exits 0
(with the allowances, if applicable).

### Step 5: The render check — the actual readability gate

`test/render-check.mjs` opens the fixture in headless Chrome and measures it.
This is the assertion that finding #2 and #3 are really fixed.

Behavior:

- Resolve a browser: `import('puppeteer')`; if that throws, and
  `PUPPETEER_EXECUTABLE_PATH` is unset, print
  `SKIP  render-check (puppeteer not installed; run: npm i)` and **exit 0**.
  Never fail a developer's checkout for a missing optional dependency.
- Load the fixture as a `file://` URL. This matters: the real product is opened
  from disk, so the test must exercise the same origin (`null`) and the same
  CORS path for the Mermaid CDN import.
- `await page.waitForSelector('.mermaid svg', { timeout: 30000 })`.

Then assert, failing with a clear message naming the rule:

1. `no-error` — `#diagram-error` is absent or has `offsetParent === null`.
2. `svg-rendered` — the SVG's `getBoundingClientRect().width > 100`.
3. `has-text` — the SVG contains at least 4 elements matching
   `text, foreignObject div`.
4. `font-applied` — `getComputedStyle` of a label reports a `fontFamily`
   containing `Geist`.
5. `effective-font-size` — for every label, `fontSize` in px multiplied by the
   cumulative scale from `getBoundingClientRect().width / offsetWidth` on the
   SVG is `>= 11`. This is the direct test for the `useMaxWidth` downscaling
   bug: a diagram squeezed into the container fails here.
6. `no-overflow` — no label's bounding box extends beyond its node's bounding
   box by more than 2px. This is the direct test for the font-metrics bug: if
   Mermaid measured with a fallback font and Geist swapped in wider, labels
   spill and this fails.
7. `console-clean` — no `pageerror` and no `console` message of type `error`
   was emitted during load.

Print `PASS  <rule>` per assertion; exit 1 on the first failure with the
offending element's outerHTML truncated to 200 characters.

**Verify**:

- `npm i` then `npm run test:render` → exit 0 with 7 PASS lines.
- Temporarily break it: add `flowchart:{useMaxWidth:true}` back into the
  fixture's config and confirm `effective-font-size` FAILs. Revert.

If the fixture is still the pre-003 template, assertions 4–6 are expected to
fail. In that case make the script honor `RENDER_CHECK_ALLOW_FAIL` (comma
separated rule names) and set it in `package.json` with the same `# TODO(005)`
marker as step 4. **Say so explicitly in your report** — a gate that is green
because it was told to ignore the failures is worse than no gate if nobody knows.

### Step 6: CI

`.github/workflows/ci.yml`, two jobs on `push` and `pull_request`:

- **lint** — `ubuntu-latest`; checkout; `sudo apt-get install -y shellcheck`;
  `actions/setup-node@v4` with node 22; `npm ci || npm i`; `npm run lint`.
  Required.
- **render** — `ubuntu-latest`; checkout; setup-node; `npm i`;
  `npm run test:render`. GitHub's ubuntu runners ship Chrome, and puppeteer
  downloads its own; if the install is flaky, set
  `continue-on-error: false` anyway — a flaky render gate that is allowed to
  fail is not a gate.

**Verify**: `python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/ci.yml'))"`
→ exit 0. If PyYAML is not installed, use
`node -e "require('fs').readFileSync('.github/workflows/ci.yml','utf8')"` and
visually confirm indentation instead; do not install PyYAML.

### Step 7: Document it

Add a `### Development` section to `README.md` after `### Layout`:

```markdown
### Development
```

npm i # optional; only needed for the render check
npm run lint # shell + JSON + generated-page structure. No dependencies.
npm test # lint plus a headless-Chrome render of test/fixtures/

```

`npm run lint` runs on stdlib Python and bash alone, so it works in a fresh
checkout. `npm run test:render` opens a fixture page in headless Chrome as a
`file://` URL — the same way the plugin opens real diagrams — and asserts the
diagram rendered, used Geist, and kept every label at an effective size of at
least 11px. It skips cleanly when puppeteer is not installed.
```

**Verify**: `grep -c '### Development' README.md` → `1`.

## Test plan

The deliverable _is_ the test suite, so the test plan is proving the suite
detects real breakage. Confirm each of these produces a failure, then revert:

| Injected fault                                     | Must fail rule                 |
| -------------------------------------------------- | ------------------------------ |
| `mindmap` as the first line of the fixture's block | `no-mindmap`                   |
| Delete a `]` from a node label                     | `balanced-brackets`            |
| A 9-word node label                                | `label-length`                 |
| 11 nodes in one block                              | `node-budget`                  |
| Remove the `accTitle:` line                        | `accessibility`                |
| Add `--accents-1: #fafafa` to the fixture's CSS    | `no-legacy-tokens`             |
| Set `flowchart: { useMaxWidth: true }`             | `effective-font-size`          |
| Point the Mermaid import at a 404 URL              | `no-error` and `console-clean` |

Record the results in your report as a table. A rule that cannot be made to
fail is not testing anything — say so rather than quietly leaving it in.

## Done criteria

ALL must hold:

- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0 (or exits 0 with a printed SKIP for the render check when puppeteer is absent)
- [ ] `python3 test/lint-page.py test/fixtures/sample-plan.html` exits 0
- [ ] All eight injected faults in the test plan produced the expected failure, and all were reverted (`git status --porcelain test/fixtures/` is clean)
- [ ] `bash test/lint-shell.sh` covers every file returned by `git ls-files '*.sh' 'plugins/diagram-plans/bin/*'`
- [ ] `.github/workflows/ci.yml` exists with a `lint` job and a `render` job
- [ ] `git status --porcelain` lists no file outside the in-scope list
- [ ] Any `--allow-fail` / `RENDER_CHECK_ALLOW_FAIL` allowance is marked `# TODO(005)` and named explicitly in your report
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 001 has not landed — `plugins/diagram-plans/bin/diagram-open` does not
  exist, or `tools/check-version-sync.sh` is missing. `test/lint-json.sh`
  calls that script directly.
- `npm i` fails to install puppeteer. Do not switch to a different browser
  automation library on your own; report it and leave the render check in its
  skip path.
- The fixture renders but `console-clean` fails because of a CORS error on the
  Mermaid CDN import. That would contradict a load-bearing assumption in
  `plans/000-research-diagram-engines.md` (that cross-origin ESM imports work
  from `file://`) and changes the engine decision. Report the exact console
  message.
- More than three of the eight injected faults fail to trigger their rule.

## Maintenance notes

- `test/lint-page.py` is deliberately dependency-free because plan 007 wires it
  into the skill, where it runs on the user's machine with no install step.
  Keep it stdlib-only forever; if you need a dependency, the check belongs in
  `render-check.mjs` instead.
- The node/edge budgets in rules 9 and 10 duplicate the numbers plan 006 writes
  into `SKILL.md`. If either moves, both must move. Consider extracting them to
  a shared JSON later — deliberately not done now, since two constants in two
  files is cheaper than the indirection.
- Reviewer should scrutinize: that `effective-font-size` really accounts for
  SVG scaling (it is the assertion the whole plan exists for), and that no
  `--allow-fail` allowance outlives plan 005.
- Deferred: linting the generated pages a user has already produced under
  `.claude/diagrams/`, and any visual-regression/screenshot diffing.
