# Plan 008: Stop the prompt hook crashing on long prompts and firing on prompts that are not plans

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat cd109ef..HEAD -- plugins/diagram-plans/hooks/`
> If either hook file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (independent of 001–007; can run in parallel)
- **Category**: bug
- **Planned at**: commit `cd109ef`, 2026-08-26

## Why this matters

The `UserPromptSubmit` hook runs on **every prompt the user types**, before
anything else. Two defects, both reproduced against the current script:

**It crashes on long prompts.** With a ~300 KB prompt the script exits **141**
(SIGPIPE). Reproduced:

```
$ python3 -c "import json;print(json.dumps({'prompt':'plan '+('a'*300000)}))" \
    | bash plugins/diagram-plans/hooks/nudge.sh; echo "exit=$?"
exit=141
```

`sed`'s output is piped into `head -c 4000`; once the payload exceeds the 64 KB
pipe buffer, `head` exits after its 4000 bytes, `sed` takes SIGPIPE,
`set -o pipefail` propagates 141, and `set -e` aborts before anything is
printed. A user who pastes a long log or file into a planning prompt gets a
failing hook on the request most likely to need the skill. (Below ~64 KB the
whole payload fits in the pipe buffer and the bug does not appear — which is
why it has gone unnoticed.)

**It fires on prompts that are not plans.** The pattern matches a trigger word
anywhere in the prompt with no regard for context. All ten of these fire today:

| Prompt                                              | Fires |
| --------------------------------------------------- | ----- |
| "the design of this class is confusing, explain it" | yes   |
| "what options does this CLI accept"                 | yes   |
| "compare these two test outputs"                    | yes   |
| "outline the docstring for this function"           | yes   |
| "this function takes a plan argument, add a type"   | yes   |
| "what approach did the previous author take here"   | yes   |
| "add a --design flag to the parser"                 | yes   |
| "roadmap.md has a typo, fix it"                     | yes   |
| "diagram the output of this command"                | yes   |
| "break down why this test fails"                    | yes   |

Each false positive injects a line telling the model to answer with a diagram
instead of doing the work. The skill's own opt-out ("write it up") does not help,
because the user does not know the hook fired. A nudge that fires on everything
is noise, and noise gets ignored — including on the prompts where it is right.

## Current state

`plugins/diagram-plans/hooks/nudge.sh`, in full:

```bash
#!/usr/bin/env bash
# UserPromptSubmit hook: when the prompt reads like planning or brainstorming,
# add a one-line reminder so the diagram-plans skill fires deterministically.
# Stdout from this hook is appended to the model's context.

set -euo pipefail

prompt="$(cat | sed -n 's/.*"prompt"[[:space:]]*:[[:space:]]*"\(\([^"\\]\|\\.\)*\)".*/\1/p' | head -c 4000)"

pattern='\b(plan|planning|brainstorm|ideate|ideas? for|options?|approach(es)?|architect(ure)?|design|trade-?offs?|roadmap|strategy|compare|pros and cons|how (should|would|could) (we|i)|what are the ways|outline|break(down| down)|mind ?map|diagram)\b'

if printf '%s' "$prompt" | grep -qiE "$pattern"; then
  dir="${DIAGRAM_PLANS_DIR:-.claude/diagrams}"
  echo "diagram-plans: this prompt is a plan/brainstorm/design request. Answer with a diagram artifact, not paragraphs — invoke the diagram-plans skill. Save dir: ${dir}."
fi
exit 0
```

`plugins/diagram-plans/hooks/hooks.json` invokes it and needs no change.

Two claims worth **not** acting on, because they were tested and did not hold:

- The greedy `.*"prompt"` was suspected of matching a nested `"prompt"` key from
  elsewhere in the payload. It does not: nested JSON arrives backslash-escaped
  (`\"prompt\"`), which the pattern's literal quotes do not match. Verified with
  a payload carrying a nested prompt after the real one. Rewriting the parse in
  Python below is for robustness and readability, **not** to fix a live bug —
  do not claim otherwise in the commit message.
- Prompts containing none of the trigger words already stay quiet ("rename this
  variable", "fix the failing test", "why is the build slow" — all silent). The
  problem is precision, not recall.

`python3` is available and already used elsewhere in the repo (plan 001's
`check-version-sync.sh`, plan 004's build script). Repo convention for shell
scripts: `#!/usr/bin/env bash`, `set -euo pipefail`, a short `#` header saying
purpose and usage.

## Commands you will need

| Purpose          | Command                                       | Expected on success |
| ---------------- | --------------------------------------------- | ------------------- |
| Hook corpus test | `bash test/test-nudge.sh` (created in step 3) | exit 0              |
| Shell lint       | `bash test/lint-shell.sh`                     | exit 0              |
| Everything       | `npm test`                                    | exit 0              |

Plans 002's harness provides `test/lint-shell.sh` and `npm test`. If they do not
exist yet this plan still works — run `bash -n` directly and say so.

## Scope

**In scope**:

- `plugins/diagram-plans/hooks/nudge.sh`
- `test/test-nudge.sh` (create)
- `test/fixtures/nudge-cases.tsv` (create)
- `package.json` — add the hook test to the `test` script
- Both manifests — version bump
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- `plugins/diagram-plans/hooks/hooks.json` — the wiring is correct.
- `SKILL.md` — plans 004–007 own it. In particular, do not change the skill's
  `description`; it is the other half of how the skill gets selected and
  changing both at once makes a regression impossible to attribute.
- Making the hook block or modify the prompt. A `UserPromptSubmit` hook that
  exits non-zero can surface errors to the user; this one must always exit 0.
- Replacing the hook with an LLM call or anything that adds latency to every
  keystroke-to-response path.

## Git workflow

- Branch: `advisor/008-hook-precision`
- Message style `diagram-plans: <imperative>`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Parse the payload without a pipeline that can SIGPIPE

Replace the `prompt="$(...)"` line with a Python read that consumes stdin
completely and truncates in memory:

```bash
prompt="$(python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    p = json.loads(raw).get("prompt", "")
except Exception:
    p = ""
sys.stdout.write(p[:4000])
' || true)"
```

Three properties this has and the old line did not: stdin is fully consumed so
nothing can SIGPIPE; truncation happens after parsing rather than mid-pipe; and
a malformed payload yields an empty prompt instead of a stray regex match. The
`|| true` guarantees the hook survives even if `python3` is missing — in that
case `prompt` is empty and the hook simply stays quiet, which is the right
failure mode for something on every prompt's critical path.

**Verify**:

- `python3 -c "import json;print(json.dumps({'prompt':'plan '+('a'*300000)}))" | bash plugins/diagram-plans/hooks/nudge.sh; echo "exit=$?"` → exit **0**, and the nudge is printed
- `echo 'not json' | bash plugins/diagram-plans/hooks/nudge.sh; echo "exit=$?"` → exit 0, no output
- `printf '' | bash plugins/diagram-plans/hooks/nudge.sh; echo "exit=$?"` → exit 0, no output

### Step 2: Make the pattern demand an actual request

Replace the single flat pattern with a two-part test: the prompt must look like
a _request for_ a plan, not merely contain a planning word.

```bash
# A strong trigger is a request shape: an imperative or question that asks for a
# plan, options, or an approach. A bare noun ("the design", "--design flag",
# "roadmap.md") is not.
strong='(^|[[:space:][:punct:]])((how (should|would|could|do) (we|i))|(what( are|'"'"'s)? the (ways|options|trade-?offs|approaches))|(pros and cons)|(brainstorm)|(mind ?map))([[:space:][:punct:]]|$)'

# A weak trigger needs a planning verb nearby to count.
verb='(plan|design|map|outline|sketch|compare|weigh|explore|propose|break down|lay out|think through|walk (me )?through)'
noun='(plan|roadmap|strategy|architecture|approach(es)?|options?|trade-?offs?|ideas?|breakdown|milestones?|phases?)'
weak="(^|[[:space:][:punct:]])${verb}[[:space:]]+([a-z]+[[:space:]]+){0,3}${noun}([[:space:][:punct:]]|$)"

# Explicit opt-outs always win, whatever else matched.
optout='(in (paragraphs|prose)|as a doc(ument)?|write it up|no diagram|just (tell|explain|answer))'
```

Then:

```bash
if printf '%s' "$prompt" | grep -qiE "$optout"; then
  exit 0
fi
if printf '%s' "$prompt" | grep -qiE "$strong" || printf '%s' "$prompt" | grep -qiE "$weak"; then
  dir="${DIAGRAM_PLANS_DIR:-.claude/diagrams}"
  echo "diagram-plans: this prompt is a plan/brainstorm/design request. Answer with a diagram, not paragraphs — invoke the diagram-plans skill. Save dir: ${dir}."
fi
exit 0
```

Also drop the word "artifact" from the message — plan 003 onward the output is a
standalone HTML file, not an artifact.

Honouring the opt-out here matters: the skill already stands down on "write it
up", but the hook was still injecting a contrary instruction alongside it.

**Verify**: run step 3's corpus. Tuning the pattern by hand against individual
examples without the corpus will make one case pass and three regress.

### Step 3: Build a corpus test

`test/fixtures/nudge-cases.tsv` — two tab-separated columns, `fire` or `quiet`,
then the prompt. Seed it with **at least** these, which are the cases this plan
is accountable for:

```
fire	how should we structure the auth service
fire	what are the options for caching here
fire	brainstorm names for this package
fire	give me a plan for migrating off redis
fire	compare the two approaches and their trade-offs
fire	lay out a roadmap for the next quarter
fire	walk me through the architecture
fire	pros and cons of moving to postgres
quiet	the design of this class is confusing, explain it
quiet	what options does this CLI accept
quiet	compare these two test outputs
quiet	outline the docstring for this function
quiet	this function takes a plan argument, add a type
quiet	what approach did the previous author take here
quiet	add a --design flag to the parser
quiet	roadmap.md has a typo, fix it
quiet	diagram the output of this command
quiet	break down why this test fails
quiet	rename this variable
quiet	fix the failing test
quiet	why is the build slow
quiet	plan.ts fails to compile
quiet	give me a plan for migrating off redis, in paragraphs
quiet	how should we structure the auth service — just explain it
```

`test/test-nudge.sh` reads the file, feeds each prompt through the hook as a
real JSON payload, and compares output-present against the expected column.
Print one line per case; on any mismatch print both the expectation and what
happened, and exit 1. Also assert every case exits 0.

Add the three payload edge cases from step 1 (300 KB prompt, malformed JSON,
empty stdin) as explicit assertions in the same script.

**Verify**:

- `bash test/test-nudge.sh` → exit 0, every case matching
- All 10 previously-firing false positives now report `quiet`
- All 8 `fire` cases still fire

Iterate on step 2's patterns until the corpus passes. If a case cannot be
classified correctly without breaking another, **leave it failing and say so** —
mark it in the TSV with a leading `#known-fail` and report it. A hand-tuned
regex that passes its own corpus by contorting is worse than an honest gap.

### Step 4: Wire it in and bump

Add `bash test/test-nudge.sh` to `package.json`'s `test` script. Bump both
manifests by one patch level from whatever they are at when you run (this plan
is independent of 001–007, so the version depends on merge order — read the
current value, do not assume).

**Verify**:

- `npm test` → exit 0
- `bash tools/check-version-sync.sh` → exit 0
- `bash test/lint-shell.sh` → exit 0, including `nudge.sh`

### Step 5: Report the precision change

Report a before/after table: for every case in the corpus, what the old hook did
and what the new one does. Run the old version from git
(`git show HEAD~1:plugins/diagram-plans/hooks/nudge.sh > /tmp/old-nudge.sh`) to
produce the "before" column rather than reconstructing it from memory.

## Test plan

- `test/test-nudge.sh` is the deliverable's test: 24+ cases, plus three payload
  edge cases.
- Confirm the corpus detects regressions: revert step 2's pattern to the
  original single flat pattern in a scratch copy, run the corpus, confirm it
  reports 10 failures, and restore. A corpus that passes against both the old
  and new pattern is not testing anything.
- Do not add a case to the corpus to make a failing case pass. Add cases that
  reflect prompts a user would actually type.

## Done criteria

ALL must hold:

- [ ] `bash test/test-nudge.sh` exits 0
- [ ] A 300 KB prompt exits 0 and prints the nudge (previously exit 141)
- [ ] Malformed JSON and empty stdin each exit 0 with no output
- [ ] All 10 documented false positives report `quiet`
- [ ] All 8 `fire` cases still fire
- [ ] The two opt-out cases ("in paragraphs", "just explain it") report `quiet`
- [ ] The old pattern, run against the corpus, produces 10 failures (verified, then restored)
- [ ] `bash test/lint-shell.sh` exits 0
- [ ] `npm test` exits 0
- [ ] `git status --porcelain` lists no file outside the in-scope list
- [ ] The before/after precision table is in your report
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- More than two corpus cases cannot be classified correctly without breaking
  another. That means regex is the wrong tool and the decision belongs to the
  operator — possible answers are a much narrower pattern that only fires on
  explicit question shapes, or dropping the hook and relying on the skill's
  `description` alone.
- The hook ever exits non-zero for any input. This is on every prompt's path;
  a non-zero exit is worse than any false positive.
- `python3` turns out not to be reliably present in the hook's environment.
  Report it; the `|| true` keeps it safe, but the hook would then be silently
  dead and that is worth knowing.
- You find yourself editing `SKILL.md`'s `description` to compensate. That is
  out of scope and confounds the measurement.

## Maintenance notes

- The corpus is the contract. Any future pattern change must run against it, and
  new false positives should be added as cases rather than fixed ad hoc.
- Precision was chosen over recall deliberately: a missed nudge costs a prose
  answer the user can redirect in one word; a false nudge costs a wrong-shaped
  answer to a question that was never about diagrams. If users report the skill
  not firing when it should, loosen `weak`, not `strong`.
- The hook and the skill's `description` are two independent selection
  mechanisms. Change one at a time, or you cannot attribute a regression.
- Reviewer should scrutinize: that the hook still exits 0 on every path, and
  that the opt-out check runs _before_ the trigger check.
- Deferred: making the nudge context-aware (e.g. quieter when the last turn
  already produced a diagram), which needs state the hook does not have.
