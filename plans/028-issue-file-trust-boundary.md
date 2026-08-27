# Plan 028: Make the filed issue markdown a trustworthy record

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0ee11c..HEAD -- site/lib/artifacts.ts site/lib/artifact-feedback.ts site/lib/artifact-feedback.test.ts site/app/api/artifacts/feedback/route.ts site/lib/artifact-run.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## At a glance

- **What**: Make issue-number collisions fail loudly and fence untrusted body/comment text so no free-text line can masquerade as a structural marker.
- **Why**: A transient directory-read error can silently clobber an existing issue, and a forged `Execution:`/`## Comments` line in free text can spoof the status downstream readers and agents trust.
- **Next action**: Step 1 — Narrow the swallowed errors in `artifacts.ts`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW/MED
- **Depends on**: plans/024-verification-baseline.md (needs the `bun test` runner)
- **Category**: security
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

A filed issue under `.scratch/artifact-feedback/issues/` is the record an
autonomous `claude` agent later executes (per `docs/agents/issue-tracker.md`,
its body and each "Requested change" are treated as owner instructions). Two
weaknesses undermine that record:

1. **Silent overwrite (F8)**: `nextIssueNumber()` returns `"01"` on *any*
   directory-read error, and the writer has no exclusive-create flag, so a
   transient error hands back a colliding number and clobbers an existing
   issue — destroying the only copy of a review batch.
2. **Forgeable structure (F9)**: the free-text `body`/`comment` fields are
   interpolated verbatim into the markdown, and the legacy payload path has
   no length or newline limits. A body line reading `Execution: resolved` or
   `## Comments` is indistinguishable to downstream readers from a real
   structural marker. `readExecution()` takes the *first* `Execution:` match,
   so a body line can spoof the status the UI polls.

This plan makes collisions fail loudly and fences untrusted text so no body
line can masquerade as a structural marker.

## Current state

### F8 — silent overwrite

`site/lib/artifacts.ts:71-83`:
```ts
export async function nextIssueNumber(): Promise<string> {
  let files: string[];
  try {
    files = await fs.readdir(feedbackDir);
  } catch {
    return "01";               // ANY error → "01", not just ENOENT
  }
  let max = 0;
  for (const f of files) {
    const m = /^(\d+)-/.exec(f);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return String(max + 1).padStart(2, "0");
}
```

`site/app/api/artifacts/feedback/route.ts:62` — writes with no `wx` flag, so a
duplicate number silently overwrites:
```ts
await fs.writeFile(path.join(feedbackDir, filename), content, "utf8");
```

`site/lib/artifacts.ts:46-58` — `listArtifacts()` has two contradictory failure
modes in one function: the outer `readdir(artifactsDir)` bare-catches to `{}`,
while the inner per-type `readdir(dir)` at line 55 is unguarded and throws:
```ts
  try {
    const entries = await fs.readdir(artifactsDir, { withFileTypes: true });
    types = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return result;             // swallow
  }
  for (const type of types) {
    const dir = path.join(artifactsDir, type);
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".html")); // throws
```

### F9 — forgeable structure

`site/lib/artifact-feedback.ts:206-262` — `renderFeedbackIssue` interpolates
`payload.body` and each `target.comment` verbatim. Only `label`/`kind`
(`inlineEvidence`, :190), `excerpt` (`quoteEvidence`, :194) and `selector`
(`codeEvidence`, :201) are escaped. The status/execution lines are emitted
just above the body:
```ts
  const status = payload.readyForAgent ? "ready-for-agent" : "needs-triage";
  const execution = payload.readyForAgent ? "Execution: queued\n" : "";
  ...
  return `# ${payload.title}

Status: ${status}
${execution}Kind: ${payload.kind}
Artifact: artifacts/${relArtifact}
Date: ${date}

${payload.body}

## Requested changes

${requested}

## Comments
`;
```

`site/lib/artifact-feedback.ts:119-138` — the length/newline limits apply only
to the batch path. `isBatch` is `"targets" in value || "readyForAgent" in
value`; the legacy path passes `undefined` for `max` and never checks title
newlines:
```ts
  const isBatch = "targets" in value || "readyForAgent" in value;
  const title = requiredString(value.title, "title", isBatch ? 120 : undefined);
  ...
  if (isBatch && /[\r\n]/.test(title)) {
    return { ok: false, error: "title must be one line" };
  }
  const body = requiredString(value.body, "body", isBatch ? 10_000 : undefined);
```

`site/lib/artifact-run.ts:124-131` — `readExecution` trusts the first match:
```ts
export function readExecution(issueFilename: string): string | null {
  if (!validIssueFilename(issueFilename)) return null;
  try {
    const text = fs.readFileSync(path.join(feedbackDir, issueFilename), "utf8");
    const match = /^Execution: ([a-z-]+)$/m.exec(text);   // FIRST match anywhere
    return match ? match[1] : null;
  } catch { return null; }
}
```

Downstream consumers that trust the file as owner instructions: the executor
and reviewer prompts built in `site/lib/artifact-run.ts:67-88`, and the "Copy
prompt for a new session" flow in `site/components/artifact-reviewer.tsx:1176`.
`plugins/diagrams/hooks/ready-feedback-nudge.sh` already carries a
positional-metadata check specifically because this output is known-spoofable
— evidence the producing side is expected to emit un-fenced text.

### Test coupling

`site/lib/artifact-feedback.test.ts:30-50` asserts the legacy renderer output
**byte-for-byte** (the exact `# Legacy title … ## Comments` block). Any change
to the rendered shape must update these assertions in the same commit, or
`bun test` fails.

Conventions: `bun:test`, escaping helpers already live in
`artifact-feedback.ts` (`inlineEvidence`/`quoteEvidence`/`codeEvidence`) — add
the body-fencing helper alongside them and match their style.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `cd site && bun run typecheck` | exit 0 |
| Unit tests | `cd site && bun test` | all pass |
| Full gate | `bun run verify` (repo root) | exit 0 |
| Inspect a rendered issue | `cd site && bun test artifact-feedback` | renderer cases pass |

## Scope

**In scope**:
- `site/lib/artifacts.ts` — narrow the two catches, guard the inner readdir
- `site/app/api/artifacts/feedback/route.ts` — exclusive-create write + collision handling
- `site/lib/artifact-feedback.ts` — legacy-path limits, body/comment fencing
- `site/lib/artifact-feedback.test.ts` — update byte-for-byte assertions; add cases
- `site/lib/artifacts.test.ts` — extend (created in plan 024)

**Out of scope**:
- `site/lib/artifact-run.ts` — do NOT change how a run is authorized or dispatched (plan 026 owns that). You MAY make `readExecution` read only the first `Execution:` line within the header block (before the first blank line) if it is a one-line change; if it is not trivial, leave it and note it for plan 026.
- `docs/agents/issue-tracker.md` — the documented format is owner-facing; if your fencing changes the on-disk shape, note the doc update needed but don't rewrite the workflow doc.
- The `.run-lock` / dispatch lifecycle — plan 030.

## Git workflow

- Branch: `advisor/028-issue-file-trust-boundary`
- Commit style: `fix: fail loudly on issue-number collision`, `fix: fence untrusted feedback body`.
- Do NOT push or open a PR.

## Steps

### Step 1: Narrow the swallowed errors in `artifacts.ts`

In `nextIssueNumber`, only treat a missing directory as empty; rethrow
anything else:
```ts
  try {
    files = await fs.readdir(feedbackDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "01";
    throw error;
  }
```
Apply the same `ENOENT`-only pattern to `listArtifacts`'s outer catch, and
wrap the inner per-type `readdir(dir)` (line 55) so a directory that vanishes
between the two reads yields an empty list for that type instead of 500-ing
the whole index (catch ENOENT → skip that type; rethrow otherwise).

**Verify**: `cd site && bun test artifacts` → pass. `cd site && bun run typecheck` → exit 0.

### Step 2: Exclusive-create the issue file

In `site/app/api/artifacts/feedback/route.ts`, change the write to fail on
collision and handle it:
```ts
  try {
    await fs.writeFile(path.join(feedbackDir, filename), content, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return NextResponse.json(
        { error: "issue number collision — retry" },
        { status: 409 }
      );
    }
    throw error;
  }
```
Keep the existing `run` dispatch block after a successful write (do not move
or alter it — plan 026 owns dispatch).

**Verify**: `cd site && bun run typecheck` → exit 0. Manual: filing two issues does not overwrite (covered indirectly; no automated route test in scope).

### Step 3: Apply the batch limits to the legacy path

In `parseFeedbackPayload`, give the legacy path the same guards the batch path
has: cap `title` at 120 chars and reject newlines in it, cap `body` at 10_000
chars — for BOTH paths. Simplest change: drop the `isBatch ? … : undefined`
conditionals so the limits always apply, and move the title-newline check out
of the `if (isBatch)` guard:
```ts
  const title = requiredString(value.title, "title", 120);
  if (typeof title !== "string") return { ok: false, error: title.error };
  if (/[\r\n]/.test(title)) {
    return { ok: false, error: "title must be one line" };
  }
  const body = requiredString(value.body, "body", 10_000);
```

**Verify**: `cd site && bun test artifact-feedback` → the existing legacy case still passes (its title/body are short); add a case asserting a 200-char legacy title is rejected.

### Step 4: Fence body and comment so they can't forge markers

Add a helper next to the other evidence helpers in `artifact-feedback.ts` that
renders untrusted multi-line text so no line can be read as a structural
marker. Use a fenced block with a language tag the renderer controls, and
neutralize any line that would otherwise start a marker. Minimum viable
approach: prefix any body/comment line matching
`/^(#{1,6}\s|Status:|Execution:|Kind:|Artifact:|Date:|##\s|###\s|- \[)/` with a
zero-width-safe escape — recommended concrete rule: indent every body/comment
line by a `> ` blockquote prefix, so the whole block is quoted markdown and
`readExecution`'s `/^Execution: …$/m` (anchored at line start) can never match
inside it. Wrap it with clear delimiters:
```
Requested change:

> <comment line 1>
> <comment line 2>
```
Apply the same blockquoting to `payload.body` in the header area. Keep
`inlineEvidence`/`quoteEvidence`/`codeEvidence` as-is for the already-escaped
fields.

If you change `readExecution` (allowed per Scope, only if trivial): make its
regex read within the header block by splitting on the first blank line and
matching only there.

**Verify**: `cd site && bun test artifact-feedback` → all pass (you will have updated the byte-for-byte assertions in step 5).

### Step 5: Update the byte-for-byte assertions and add spoofing cases

Update `site/lib/artifact-feedback.test.ts:30-50` (and the other render
assertions) to the new fenced shape. Add cases:
- A legacy body containing a line `Execution: resolved` renders such that `/^Execution: ([a-z-]+)$/m` does NOT match inside the body region (assert the blockquote prefix is present).
- A comment containing `## Comments` does not produce a second `## Comments` heading at column 0.
- A 200-char legacy title is rejected by `parseFeedbackPayload`.

**Verify**: `bun run verify` (repo root) → exit 0.

## Test plan

- Extend `site/lib/artifact-feedback.test.ts` with the three spoofing cases above and updated render snapshots.
- Extend `site/lib/artifacts.test.ts` (from plan 024) if `nextIssueNumber`'s error path is now reachable in a test without touching the live dir; otherwise leave a `test.todo`.
- Pattern: existing cases in `artifact-feedback.test.ts`.
- Verification: `cd site && bun test` → all pass including new cases.

## Done criteria

ALL must hold:

- [ ] `grep -n "return \"01\"" site/lib/artifacts.ts` shows it guarded by an `ENOENT` check, not a bare catch
- [ ] `grep -n "flag: \"wx\"\|flag: 'wx'" site/app/api/artifacts/feedback/route.ts` → 1 match
- [ ] The legacy path in `parseFeedbackPayload` enforces the 120/10_000/one-line limits (a 200-char legacy title is rejected — test asserts it)
- [ ] A rendered issue's body/comment cannot contain a line matching `/^Execution: /m` or `/^## /m` at column 0 (test asserts it)
- [ ] `cd site && bun test` exits 0 with the updated snapshots and new cases
- [ ] `bun run verify` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Making `readExecution` header-scoped turns out to require changes in `artifact-run.ts`'s dispatch flow — leave `readExecution` as-is and defer to plan 026.
- The blockquote fencing breaks a consumer that parses `## Requested changes` or `### N.` headings positionally (check `plugins/diagrams/hooks/ready-feedback-nudge.sh` and `artifact-reviewer.tsx:1176` before finalizing the delimiter choice) — report the conflict.
- Updating the byte-for-byte test reveals other tests asserting the old shape that you did not expect.
- The code at "Current state" locations doesn't match the excerpts.

## Maintenance notes

- The on-disk issue format changes shape (body/comment become blockquoted). If `docs/agents/issue-tracker.md` shows a literal example, update it to match — flag this for the owner.
- Plan 026 (separate filing from dispatch) will further harden the trust model; this plan is the record-integrity half. Keep the fencing when 026 lands.
- A reviewer should check that no downstream parser (the nudge hook, the copy-prompt flow) reads a marker positionally in a way the fencing broke.
- Deferred: rate-limiting or authenticating the feedback POST is plan 025/026, not here.
