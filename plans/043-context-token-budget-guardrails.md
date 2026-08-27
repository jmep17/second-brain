# Plan 043: The Claude Code layer's per-session token overhead is measured, budgeted, and enforced in pre-commit

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 094fc01..HEAD -- CLAUDE.md AGENTS.md .claude .claude-plugin plugins/*/hooks plugins/*/skills tools .husky/pre-commit docs/agents wiki/index.md`
> If any in-scope or measured file changed since this plan was written,
> re-run the Step 1 measurements and use the fresh numbers; a structural
> mismatch (files missing, hooks renamed, budgets already present) is a
> STOP. `tools/check-context-budget.sh` and `docs/agents/context-budget.md`
> must NOT already exist — if either does, STOP.

## At a glance

- **What**: Record the measured context-token baseline, set byte budgets with headroom, and make the pre-commit hook fail when a commit would blow them.
- **Why**: Every session pays a fixed context tax today that nothing measures or stops from regressing, and one bloated hook or skill description is paid again on every prompt, on every machine the layer is installed on.
- **Next action**: Step 1 — Re-measure the baseline

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (new read-only checker + one doc + one pre-commit line)
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `094fc01`, 2026-08-27

## Why this matters

Every Claude Code session in this repo — and every subagent it spawns —
pays a fixed context tax before the first user word: CLAUDE.md, the
descriptions of all 24 project-level skills, command frontmatter, and
whatever the plugin hooks print. Today that tax is ~13.6 KB (~3.4k tokens)
and the hooks are silent on non-matching prompts — but nothing measures it
and nothing stops it regressing. The failure mode is silent and compounding:
one chatty hook or one bloated skill description is paid again on *every*
prompt or session, on every machine the layer is installed on (plan 021).
This plan records the measured baseline, sets byte budgets with headroom,
and makes the pre-commit hook fail when a commit would blow them.

## Current state

All numbers measured on 2026-08-27 at commit `094fc01`.

### What is injected at session start (the recurring cost)

| Source                                             | Bytes  | ~Tokens |
| -------------------------------------------------- | ------ | ------- |
| `CLAUDE.md` (loaded every session)                 | 5,186  | ~1,300  |
| Skill descriptions, 24 skills (see below)          | 7,665  | ~1,900  |
| `.claude/commands/ingest.md` + `lint.md`           | 821    | ~200    |
| Plugin hooks, quiet path (verified: 0 bytes)       | 0      | 0       |
| **Total steady state**                             | ~13.7K | ~3,400  |

- Skill descriptions are the `description:` frontmatter of every
  `.claude/skills/*/SKILL.md` (21 dirs; 20 vendored and hash-pinned in
  `skills-lock.json`) plus `plugins/*/skills/*/SKILL.md` (3). Largest
  today: `cavecrew` 570 B, `adhd-summarize` 518 B, `caveman-learn` 452 B.
  The three plugin skills total 865 B.
- `AGENTS.md` is a **byte-identical copy** of `CLAUDE.md` (verified with
  `cmp`) for Codex; Claude Code loads only `CLAUDE.md`, so the copy costs
  no tokens — but silent divergence would split the instruction set.
- Hook quiet path verified:
  `printf '{"prompt":"what time is it"}' | bash plugins/diagrams/hooks/nudge.sh | wc -c` → `0`,
  same for `ready-feedback-nudge.sh`. On a match each prints 1–3 lines.
  `ready-feedback-nudge.sh` is legitimately **state-dependent**: it lists
  queued feedback batches when `.scratch/artifact-feedback/issues/` has any,
  so it may print on any prompt while a batch is queued.
- Hooks are registered in `plugins/diagrams/hooks/hooks.json`:
  `UserPromptSubmit` → `nudge.sh`, `ready-feedback-nudge.sh`;
  `PostToolUse` (matcher `Write`) → `plan-artifact-nudge.sh`.

### What is read per operation (not budgeted, but reported)

- `wiki/index.md` — 3,597 B, 39 lines; read at the start of every query op
  per CLAUDE.md. Grows one line per wiki page **by design** (ground rule:
  "every wiki page appears in it exactly once").
- `log.md` — 28,422 B, but append-only and **grep-accessed** (CLAUDE.md:
  `grep "^## \[" log.md | tail -5`); never loaded whole. Not a problem.
- `plans/README.md` — 50,774 B and growing ~1–2 KB of narrative per plan;
  read whole by advisor/reconcile sessions.
- Artifact templates, read + rewritten verbatim on every artifact turn:
  `plugins/plans/skills/plan-pages/TEMPLATE.md` 13,467 B,
  `plugins/decisions/skills/decision-pages/TEMPLATE.md` 15,832 B,
  `plugins/diagrams/skills/diagram-plans/MERMAID.md` 24,138 B. Each
  plan/decision artifact costs roughly a 3.4k-token read plus a
  3.5k-token write of mostly invariant Geist chrome.

### Constraints from intent docs and prior decisions

- Vendored skills are pinned by `computedHash` in `skills-lock.json`
  (commit `5d9ea51` "vendor caveman skill packs"). **Do not edit their
  descriptions locally** — trims happen upstream or by re-vendoring. The
  budget therefore covers the *sum*, with headroom, rather than forcing
  per-skill edits.
- `log.md` is append-only (CLAUDE.md ground rules) — no rotation/trimming.
- caveman's own measurement tooling lives in the user's `~/.claude` and a
  local gateway — machine-specific, so it cannot be the repo's guardrail.

### Repo conventions to match

- Checker style — `tools/check-plugins.sh`: `set -euo pipefail`,
  `repo_root` via `git rev-parse --show-toplevel`,
  `note() { printf '%-42s %s\n' "$1" "$2"; }`, a `fail` flag, final
  `all checks passed` / `checks FAILED` (stderr), `exit "$fail"`.
  Bash-3.2-safe (macOS): no `mapfile`, no associative arrays; process
  substitution is fine.
- `.husky/pre-commit` is currently exactly two lines:

  ```
  bunx lint-staged
  bash tools/check-plugins.sh
  ```

- Formatting: `bunx prettier --write <file>` (`.lintstagedrc` formats
  everything staged, `--ignore-unknown`).
- Docs for agents live in `docs/agents/` (`domain.md`, `issue-tracker.md`,
  `triage-labels.md`) — short, task-oriented markdown.
- Log entries: `## [YYYY-MM-DD] maintenance | Title` + bullets.

## Commands you will need

| Purpose            | Command                                        | Expected on success       |
| ------------------ | ---------------------------------------------- | ------------------------- |
| Shell syntax check | `bash -n tools/check-context-budget.sh`        | exit 0, no output         |
| New checker        | `bash tools/check-context-budget.sh`           | ends `all checks passed`  |
| Existing checker   | `bash tools/check-plugins.sh`                  | ends `all checks passed`  |
| Format             | `bunx prettier --write docs/agents/context-budget.md` | exit 0            |

## Scope

**In scope** (the only files you create or modify):

- `tools/check-context-budget.sh` (create, mode 755)
- `docs/agents/context-budget.md` (create)
- `.husky/pre-commit` (append one line)
- `plans/README.md` (status row for this plan only)
- `log.md` (append one entry)

**Out of scope** (do NOT touch):

- `CLAUDE.md` / `AGENTS.md`, anything under `.claude/` (vendored skills are
  hash-pinned), `plugins/**` (hooks, skills, templates), `wiki/**`,
  `site/**`, `skills-lock.json`
- No trimming of any description, hook, or template — this plan measures
  and enforces; content changes are follow-ups the owner approves.
- Nothing outside the repo.

## Git workflow

- Branch: `advisor/043-context-token-budget`
- One commit: `tools: context-token budget checker in pre-commit + baseline doc`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Re-measure the baseline

```
wc -c CLAUDE.md wiki/index.md .claude/commands/*.md
cmp -s CLAUDE.md AGENTS.md && echo identical
printf '{"prompt":"what time is it"}' | bash plugins/diagrams/hooks/nudge.sh | wc -c
python3 - <<'PY'
import glob, re
total = 0
for p in glob.glob('.claude/skills/*/SKILL.md') + glob.glob('plugins/*/skills/*/SKILL.md'):
    txt = open(p, encoding='utf-8', errors='replace').read()
    if txt.startswith('---'):
        fm = txt.split('---', 2)[1]
        m = re.search(r'(?ms)^description:(.*?)(?=^\w[\w-]*:|\Z)', fm)
        if m: total += len(m.group(1).strip())
print(total)
PY
```

**Verify**: `CLAUDE.md` ≈ 5,186 B, identical to `AGENTS.md`; nudge quiet
path prints `0`; description total ≈ 7,665 B. Small drifts are fine — use
the measured values when sanity-checking Step 4. A missing file or a
non-zero quiet path is a STOP.

### Step 2: Write `tools/check-context-budget.sh`

Create with exactly this content, then `chmod +x`:

```bash
#!/usr/bin/env bash
# Guard the per-session context tax of the Claude Code layer.
# Budgets are bytes; override any CTX_BUDGET_* env var to test. Read-only.
# Baseline and policy: docs/agents/context-budget.md
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

fail=0
note() { printf '%-42s %s\n' "$1" "$2"; }
size() { wc -c <"$1" | tr -d '[:space:]'; }

# --- budgets (bytes) --------------------------------------------------------
# Baseline 2026-08-27 (commit 094fc01): CLAUDE.md 5186, skill descriptions
# 7665 across 24 skills, commands 385+436. Budgets = baseline + ~20% headroom.
b_claude="${CTX_BUDGET_CLAUDE_MD:-6200}"
b_descs="${CTX_BUDGET_SKILL_DESCS:-9200}"
b_command="${CTX_BUDGET_COMMAND:-1000}"
w_index="${CTX_BUDGET_WIKI_INDEX:-8000}" # warn only

check_budget() { # label actual budget
  if [ "$2" -le "$3" ]; then
    note "$1" "$2 B (budget $3)"
  else
    note "$1" "OVER BUDGET: $2 B > $3 B"
    fail=1
  fi
}

# 1. Session-start files
check_budget "CLAUDE.md" "$(size CLAUDE.md)" "$b_claude"
for f in .claude/commands/*.md; do
  check_budget "command: $f" "$(size "$f")" "$b_command"
done
if cmp -s CLAUDE.md AGENTS.md; then
  note "AGENTS.md" "byte-identical to CLAUDE.md"
else
  note "AGENTS.md" "DIVERGED from CLAUDE.md (keep them identical)"
  fail=1
fi

# 2. Skill descriptions (frontmatter injected into every session)
descs="$(python3 - <<'PY'
import glob, re
total = 0
for p in glob.glob('.claude/skills/*/SKILL.md') + glob.glob('plugins/*/skills/*/SKILL.md'):
    txt = open(p, encoding='utf-8', errors='replace').read()
    if txt.startswith('---'):
        fm = txt.split('---', 2)[1]
        m = re.search(r'(?ms)^description:(.*?)(?=^\w[\w-]*:|\Z)', fm)
        if m: total += len(m.group(1).strip())
print(total)
PY
)"
check_budget "skill descriptions (sum)" "$descs" "$b_descs"

# 3. Hooks: prompt-pattern hooks must stay silent on non-matching prompts.
# Classified lists — a new UserPromptSubmit hook must be added to one of
# them, or this check fails. State-dependent hooks are exempt from the
# quiet assertion (their output depends on repo state, e.g. a queued
# feedback batch), but still listed so they are conscious choices.
quiet_hooks="nudge.sh"
state_hooks="ready-feedback-nudge.sh"

while IFS= read -r pair; do
  plugin_dir="${pair%%|*}"
  script="${pair##*|}"
  base="$(basename "$script")"
  case " $quiet_hooks " in
    *" $base "*)
      out="$(printf '{"prompt":"what time is it"}' \
        | CLAUDE_PLUGIN_ROOT="$plugin_dir" bash "$plugin_dir/hooks/$base" || true)"
      if [ -z "$out" ]; then
        note "hook quiet path: $base" "silent"
      else
        note "hook quiet path: $base" "PRINTS ${#out} B on a non-matching prompt"
        fail=1
      fi
      ;;
    *)
      case " $state_hooks " in
        *" $base "*) note "hook (state-dependent): $base" "exempt from quiet check" ;;
        *)
          note "hook UNCLASSIFIED: $base" "add to quiet_hooks or state_hooks in this script"
          fail=1
          ;;
      esac
      ;;
  esac
done < <(python3 - <<'PY'
import glob, json, os
for hj in glob.glob('plugins/*/hooks/hooks.json'):
    plugin = os.path.dirname(os.path.dirname(hj))
    data = json.load(open(hj))
    for entry in data.get('hooks', {}).get('UserPromptSubmit', []):
        for h in entry.get('hooks', []):
            cmd = h.get('command', '')
            for tok in cmd.split():
                if tok.endswith('.sh"') or tok.endswith('.sh'):
                    print(plugin + '|' + os.path.basename(tok.rstrip('"')))
PY
)

# 4. Report-only sizes (growth visibility, no budget)
idx="$(size wiki/index.md)"
if [ "$idx" -le "$w_index" ]; then
  note "wiki/index.md (per-query read)" "$idx B"
else
  note "wiki/index.md (per-query read)" "warn: $idx B > $w_index B (still passes)"
fi
note "plans/README.md (advisor read)" "$(size plans/README.md) B"
note "log.md (grep-only, append-only)" "$(size log.md) B"
for t in plugins/*/skills/*/TEMPLATE.md plugins/diagrams/skills/diagram-plans/MERMAID.md; do
  [ -f "$t" ] && note "template: $t" "$(size "$t") B"
done

if [ "$fail" -eq 0 ]; then
  echo "all checks passed"
else
  echo "checks FAILED" >&2
fi
exit "$fail"
```

**Verify**: `bash -n tools/check-context-budget.sh` → exit 0;
`test -x tools/check-context-budget.sh && echo ok` → `ok`.

### Step 3: Positive and negative runs

```
bash tools/check-context-budget.sh
CTX_BUDGET_CLAUDE_MD=100 bash tools/check-context-budget.sh; echo "exit=$?"
```

**Verify**: run 1 ends `all checks passed`, exit 0 — every `note` line
shows within-budget values, `nudge.sh` reports `silent`,
`ready-feedback-nudge.sh` reports `exempt`. Run 2 shows
`CLAUDE.md ... OVER BUDGET`, ends `checks FAILED`, `exit=1`.
If run 1 fails on the quiet-path check while
`.scratch/artifact-feedback/issues/` contains a queued batch, the
classification lists in the script are wrong — fix the script, not the
hook.

### Step 4: Write `docs/agents/context-budget.md`

Content (fill the table from Step 1's measured values; keep ≤ 60 lines):

- **Title**: `# Context-token budget` and one-line purpose: the Claude Code
  layer's per-session overhead is budgeted; `tools/check-context-budget.sh`
  enforces it in pre-commit.
- **What loads when** — three bullets: session-start (CLAUDE.md, all skill
  descriptions, command frontmatter, hook output — paid every session and
  subagent), per-operation (`wiki/index.md` on queries; `log.md` is
  grep-only), per-artifact-turn (template read + full HTML write, ~7k
  tokens round trip).
- **Baseline table** — the Step 1 numbers with date and commit.
- **Budgets and how to change one** — budgets live at the top of
  `tools/check-context-budget.sh`; raising one is a deliberate commit that
  edits the number and says why in the commit message. Never raise a budget
  just to get a commit through.
- **Levers, in order of leverage** — (1) keep prompt hooks silent on the
  quiet path; (2) skill descriptions: trim upstream / re-vendor (local
  edits break `skills-lock.json` pins), and question every newly vendored
  skill's description size; (3) keep `wiki/index.md` at one line per page;
  (4) plan narratives belong in `plans/NNN-*.md` files, not the index;
  (5) template chrome duplication is a known cost — see the deferred
  generator idea in `plans/043-context-token-budget-guardrails.md`.

**Verify**: `bunx prettier --write docs/agents/context-budget.md &&
bunx prettier --check docs/agents/context-budget.md` → passes;
`grep -c 'check-context-budget.sh' docs/agents/context-budget.md` ≥ 1.

### Step 5: Wire into pre-commit

Append to `.husky/pre-commit` so it reads exactly:

```
bunx lint-staged
bash tools/check-plugins.sh
bash tools/check-context-budget.sh
```

**Verify**: `bash .husky/pre-commit` → lint-staged output, then both
checkers end `all checks passed`, exit 0.

### Step 6: Log entry, index row, commit

Append to `log.md`:

```markdown
## [<today>] maintenance | Plan 043 — context-token budget guardrails

- Added tools/check-context-budget.sh (session-start byte budgets, hook quiet-path probe, AGENTS.md sync check) to pre-commit; baseline and levers in docs/agents/context-budget.md
- Baseline at 094fc01: ~13.7 KB (~3.4k tokens) injected per session — CLAUDE.md 5186 B, 24 skill descriptions 7665 B, hooks silent
```

Update this plan's row in `plans/README.md` to `DONE`. Commit on the
branch from "Git workflow".

**Verify**: `git status --porcelain` shows only the five in-scope files;
`bash tools/check-plugins.sh` and `bash tools/check-context-budget.sh`
both end `all checks passed`.

## Test plan

Steps 3 and 5 are the tests: positive run, env-overridden budget breach
(exit 1), and the wired pre-commit chain. The quiet-path probe inside the
script is itself a regression test for hook chattiness. No JS/unit
framework applies; `tools/check-plugins.sh` is the structural pattern.

## Done criteria

ALL must hold:

- [ ] `bash tools/check-context-budget.sh` ends `all checks passed`, exit 0
- [ ] `CTX_BUDGET_CLAUDE_MD=100 bash tools/check-context-budget.sh` exits 1
- [ ] `.husky/pre-commit` is the exact three-line file from Step 5
- [ ] `docs/agents/context-budget.md` exists, passes prettier check
- [ ] `bash tools/check-plugins.sh` still ends `all checks passed`
- [ ] `git status --porcelain` shows only the five in-scope files
- [ ] `log.md` entry appended; `plans/README.md` row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `tools/check-context-budget.sh` or `docs/agents/context-budget.md`
  already exists.
- Step 1 shows a non-zero quiet path for `nudge.sh`, or `CLAUDE.md` and
  `AGENTS.md` already differ — the repo has an unbudgeted regression this
  plan's excerpts don't describe; report the measurement instead of
  choosing a budget that hides it.
- `plugins/diagrams/hooks/hooks.json` no longer lists exactly
  `nudge.sh` + `ready-feedback-nudge.sh` under `UserPromptSubmit`.
- The positive run still fails after two script-fix attempts.
- The work requires editing any out-of-scope file (including any hook,
  skill, or template — even if a trim looks easy).

## Maintenance notes

- **Budgets are a ratchet, not a ceiling to grow into**: when a real need
  raises one, the commit that edits the number must say what grew and why.
- **Vendored-skill trims** (7,665 B is the largest line item): happen
  upstream in `JuliusBrussee/caveman` or by re-vendoring with updated
  `skills-lock.json` hashes — a separate, owner-approved task.
- **Deferred, highest single lever**: a template-stamping generator — a
  `bin/` script per artifact plugin that writes the invariant Geist chrome
  so the model emits only title/steps/notes content. Saves roughly 7k
  tokens per artifact turn (template read + chrome re-write) across three
  plugins; touches all three skills' instructions, so it deserves its own
  plan if the owner wants it.
- **New hooks**: any new `UserPromptSubmit` hook must be classified in the
  script (`quiet_hooks` / `state_hooks`) — the UNCLASSIFIED failure is the
  reminder. `PostToolUse` hooks are currently unprobed; extend the script
  if one starts printing on every write.
- **Plan 021 interaction**: `docs/install.md` (plan 021) documents machine
  setup; this checker is repo-side and runs the same everywhere — no
  install-doc change needed.
