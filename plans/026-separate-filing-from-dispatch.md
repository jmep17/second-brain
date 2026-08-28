# Plan 026: Stop the request body from self-authorizing an autonomous agent run

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0ee11c..HEAD -- site/app/api/artifacts site/lib/artifact-feedback.ts site/lib/artifact-run.ts site/components/artifact-reviewer.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## At a glance

- **What**: Split issue filing from agent dispatch so the public feedback POST always writes `needs-triage`, and gate what can authorize an autonomous agent run separately.
- **Why**: Today a single forged POST can become attacker-authored "owner instructions" executed by an `acceptEdits` agent, because the untrusted request body alone grants dispatch authority.
- **Next action**: Step 1 — The public POST files `needs-triage` only

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (changes the "approve · run now" UX to a two-call flow)
- **Depends on**: plans/025-cross-origin-request-guard.md (the token round-trip
  relies on 025's origin guard); plans/024-verification-baseline.md (test runner)
- **Category**: security
- **Planned at**: commit `c0ee11c`, 2026-08-27
- **Amended**: 2026-08-28, against `2905c9c`. The first draft specified only two
  authorization paths (public POST → `needs-triage`; dispatch → promote **and**
  run), which left the tray's third mode — **Queue for agent**, i.e. promote to
  `ready-for-agent` + `Execution: queued` *without* starting a run — with no
  server-side path. That workflow is documented in `docs/agents/issue-tracker.md`
  and asserted by `site/scripts/test-artifact-review.mjs:477-497`. An executor
  correctly stopped at Step 4 on this. Fix (owner-approved): the dispatch
  endpoint takes a `run: boolean`; it always promotes under the token gate and
  dispatches only when `run` is true. Steps 3 and 4 are rewritten accordingly.

## Why this matters

This is the audit's highest-severity finding. The web tier holds the **sole
authority to start an autonomous editing agent in the repo**, and today that
authority is granted by fields in the untrusted request body. `POST
/api/artifacts/feedback` reads `readyForAgent` and `run` straight off the body,
writes `Status: ready-for-agent` + `Execution: queued` into the issue file
purely from `readyForAgent`, and when `run` is true calls `dispatchRun`, which
spawns a detached `claude -p "<body-derived prompt>" --permission-mode
acceptEdits` **twice** with `cwd` = repo root and the full `process.env`
inherited. `docs/agents/issue-tracker.md` states that `ready-for-agent` +
`Execution: queued` "authorizes autonomous work" and that the batch body is
"the owner's instructions", and `plugins/diagrams/hooks/ready-feedback-nudge.sh`
advertises those queued batches into every later agent session. So a single
forged POST (reachable cross-origin before plan 025, and from any script inside
a served artifact page before plan 027) becomes attacker-authored "owner
instructions" executed by an `acceptEdits` agent in the user's checkout and
environment. This plan removes the request body's power to authorize a run:
filing an issue and dispatching an agent become two separate, separately-gated
actions, and the file the public POST writes is always `needs-triage`.

## Current state

Files and their role:

- `site/lib/artifact-feedback.ts` — parses the POST body (`parseFeedbackPayload`)
  and renders the issue markdown (`renderFeedbackIssue`).
- `site/app/api/artifacts/feedback/route.ts` — the POST handler; files the
  issue and, when `payload.run`, calls `dispatchRun` inline.
- `site/lib/artifact-run.ts` — `dispatchRun` spawns the two-stage headless
  `claude` run; `readExecution` reads an issue's `Execution:` line;
  `runActive` reports the single-flight lock.
- `site/app/api/artifacts/feedback/status/route.ts` — read-only `GET` the
  review tray polls for run status.
- `site/components/artifact-reviewer.tsx` — the review tray; its submit path
  POSTs the batch and (in run mode) watches the issue's `Execution:` state.

The body drives authorization — parse (`artifact-feedback.ts:148-156`):

```ts
  if (typeof value.readyForAgent !== "boolean") {
    return { ok: false, error: "readyForAgent must be a boolean" };
  }
  const run = value.run === undefined ? false : value.run;
  if (typeof run !== "boolean") {
    return { ok: false, error: "run must be a boolean" };
  }
  if (run && !value.readyForAgent) {
    return { ok: false, error: "run requires readyForAgent" };   // satisfied by sending both true
  }
```

Render stamps the authorizing markers from `readyForAgent`
(`artifact-feedback.ts:225-226`):

```ts
  const status = payload.readyForAgent ? "ready-for-agent" : "needs-triage";
  const execution = payload.readyForAgent ? "Execution: queued\n" : "";
```

Route dispatches inline (`feedback/route.ts:64-74`):

```ts
  if ("run" in payload && payload.run) {
    return NextResponse.json({
      filed: relOut,
      issue: filename,
      run: dispatchRun(filename, {
        executor: payload.executorModel,
        reviewer: payload.reviewerModel,
      }),
    });
  }
  return NextResponse.json({ filed: relOut, issue: filename });
```

`dispatchRun` runs `acceptEdits` twice (`artifact-run.ts:89-98`):

```ts
    const child = spawn(
      "bash",
      [
        "-c",
        'echo $$ > "$LOCK"; trap \'rm -f "$LOCK"\' EXIT; ' +
          'echo "=== executor ($EXECUTOR_MODEL) ===" >> "$LOG"; ' +
          'claude -p "$RUN_PROMPT" --permission-mode acceptEdits --model "$EXECUTOR_MODEL" >> "$LOG" 2>&1; ' +
          'echo "=== reviewer ($REVIEWER_MODEL) ===" >> "$LOG"; ' +
          'claude -p "$REVIEW_PROMPT" --permission-mode acceptEdits --model "$REVIEWER_MODEL" >> "$LOG" 2>&1',
      ],
```

Reviewer submit sends the authorization from client state
(`artifact-reviewer.tsx:806-819`):

```ts
      const response = await fetch("/api/artifacts/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifact, kind, title, body,
          readyForAgent: mode !== "triage",
          run: mode === "run",
          executorModel, reviewerModel,
          targets: /* ... */,
        }),
      });
```

Run models are constrained already (`artifact-feedback.ts:6`):
`export const RUN_MODELS = ["haiku", "sonnet", "opus"] as const;`

Conventions / constraints:

- `docs/agents/issue-tracker.md` "Artifact feedback queue": a batch authorizes
  autonomous work only with **both** `Status: ready-for-agent` and
  `Execution: queued`; before editing, an agent changes `queued` → `claimed`.
  The design intent is that a human approves before an agent runs — this plan
  restores that intent at the server boundary.
- Tests use `bun:test`; pattern file `site/lib/artifact-feedback.test.ts`. It
  asserts the rendered issue **byte-for-byte** (see its `renderFeedbackIssue`
  expectations) — changing the default status to `needs-triage` will require
  updating those expectations.
- Single-user localhost; a server-side in-memory token store (a `Map`) is
  acceptable — it need not survive a restart, and a lost token just means the
  owner clicks approve again.

## Commands you will need

| Purpose   | Command                                        | Expected on success |
|-----------|------------------------------------------------|---------------------|
| Typecheck | `cd site && bun run typecheck`                 | exit 0, no errors   |
| Unit test | `cd site && bun test lib/artifact-feedback`    | all pass            |
| Full verify | `bun run verify` (root, added by plan 024)   | exit 0              |
| E2E (manual) | `ARTIFACT_REVIEW_BASE_URL=http://127.0.0.1:3000 bun run test:artifact-review` (with a server up) | passes |

## Scope

**In scope** (the only files you should modify):

- `site/lib/artifact-feedback.ts` — remove the body's authority to stamp
  `ready-for-agent`/`queued`.
- `site/app/api/artifacts/feedback/route.ts` — file `needs-triage` only; drop
  inline dispatch.
- `site/app/api/artifacts/feedback/dispatch/route.ts` (create) — token-gated
  promotion, plus dispatch when `run: true`. Serves both "Queue for agent"
  (`run: false`) and "Approve · run now" (`run: true`).
- `site/lib/dispatch-token.ts` (create) — issue/verify single-use tokens.
- `site/app/api/artifacts/feedback/dispatch-token/route.ts` (create) — `GET`
  that issues a token (guarded by plan 025's `isLocalRequest`).
- `site/components/artifact-reviewer.tsx` — submit path: file, then (run mode)
  GET a token and POST dispatch.
- `site/lib/artifact-feedback.test.ts` — update byte-exact expectations.
- `site/lib/dispatch-token.test.ts` (create) — token single-use tests.

**Out of scope** (do NOT touch):

- `dispatchRun`'s internal spawn/prompt/lock mechanics in `artifact-run.ts` —
  this plan changes *who may call it*, not how it runs. (Its error handling and
  lock robustness are plans 030's job.)
- The `isLocalRequest` guard from plan 025 — reuse it, don't reimplement.
- `docs/agents/issue-tracker.md` prose — the two-marker contract stays; you are
  making the server enforce who may write the markers, which the doc already
  describes as the human-approval boundary.

## Git workflow

- Branch: `advisor/026-separate-filing-from-dispatch`
- Commit per logical unit: (1) feedback files needs-triage only + tests,
  (2) token module + endpoint, (3) dispatch endpoint, (4) reviewer two-call
  flow. Conventional lowercase prefixes (e.g.
  `security: split feedback filing from agent dispatch`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: The public POST files `needs-triage` only

In `site/lib/artifact-feedback.ts`:

- Keep accepting `readyForAgent`/`run` in the type for now if it simplifies the
  client, but **`renderFeedbackIssue` must always emit `Status: needs-triage`
  and no `Execution:` line.** Simplest correct change: hardcode
  `const status = "needs-triage";` and `const execution = "";` at lines
  225-226, and delete the `run`-based branch's authority.

In `site/app/api/artifacts/feedback/route.ts`:

- Delete the `if ("run" in payload && payload.run) { ... dispatchRun ... }`
  block (lines ~64-73). The route always returns `{ filed, issue }`.
- Remove the now-unused `import { dispatchRun } from "@/lib/artifact-run";`.

Update `site/lib/artifact-feedback.test.ts` byte-exact expectations so the
rendered issue shows `Status: needs-triage` and no `Execution: queued` line.

**Verify**: `cd site && bun test lib/artifact-feedback` → all pass.
`grep -n "ready-for-agent\|Execution: queued" site/lib/artifact-feedback.ts`
→ no matches (the API can no longer emit either marker).
`grep -n "dispatchRun" site/app/api/artifacts/feedback/route.ts` → no matches.

### Step 2: Single-use dispatch tokens

Create `site/lib/dispatch-token.ts` with a module-level `Map<string, {issue:
string; expires: number}>`:

```ts
import { randomUUID } from "node:crypto";

const TTL_MS = 5 * 60_000;
const tokens = new Map<string, { issue: string; expires: number }>();

/** Issue a single-use token bound to one issue filename. */
export function issueDispatchToken(issue: string): string {
  const token = randomUUID();
  tokens.set(token, { issue, expires: Date.now() + TTL_MS });
  return token;
}

/** Consume a token; returns true iff it was valid, unexpired, and for `issue`.
 *  Single-use: a valid token is deleted on consumption. */
export function consumeDispatchToken(token: string, issue: string): boolean {
  const entry = tokens.get(token);
  if (!entry) return false;
  tokens.delete(token); // single-use regardless of outcome
  return entry.issue === issue && entry.expires > Date.now();
}
```

> NOTE: workflow scripts forbid `Date.now()`, but this is application source,
> not a workflow script — `Date.now()` is correct here.

Create `site/lib/dispatch-token.test.ts` (bun:test): a fresh token consumes
once → true; second consume → false; wrong-issue → false; expired → false
(inject or monkeypatch time, or set TTL via an internal param — keep it simple:
test the wrong-issue and double-use cases, which don't need a clock).

Create `site/app/api/artifacts/feedback/dispatch-token/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { isLocalRequest } from "@/lib/request-origin";
import { validIssueFilename } from "@/lib/artifact-run";
import { issueDispatchToken } from "@/lib/dispatch-token";

/** GET /api/artifacts/feedback/dispatch-token?issue=<NN-slug.md> — a
 *  single-use token authorizing one dispatch of that issue. */
export function GET(req: NextRequest) {
  if (!isLocalRequest(req)) {
    return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  }
  const issue = req.nextUrl.searchParams.get("issue") ?? "";
  if (!validIssueFilename(issue)) {
    return NextResponse.json({ error: "invalid issue" }, { status: 400 });
  }
  return NextResponse.json({ token: issueDispatchToken(issue) });
}
```

**Verify**: `cd site && bun test lib/dispatch-token` → all pass;
`cd site && bun run typecheck` → exit 0.

### Step 3: The token-gated dispatch endpoint

> **AMENDED 2026-08-28** — this step now carries a `run` flag. See the
> "Amendment" note in Status. If you already created this route without the
> flag, add it; everything else in the route stays as-is.

Create `site/app/api/artifacts/feedback/dispatch/route.ts`. It: guards with
`isLocalRequest`; reads `{issue, token, run, executorModel?, reviewerModel?}`;
`consumeDispatchToken(token, issue)` or 403; **stamps the authorizing markers
itself** — rewrite the issue file's `Status: needs-triage` → `Status:
ready-for-agent` and insert `Execution: queued` (only if not already present);
then, **only when `run === true`**, call `dispatchRun(issue, {executor,
reviewer})`.

Why one endpoint and not two: a batch sitting on disk as `ready-for-agent` +
`Execution: queued` *is* autonomous execution, just deferred — a later agent
session picks it up via `plugins/diagrams/hooks/ready-feedback-nudge.sh`. So
promoting-without-running crosses the same authority boundary as promoting-and-
running and needs the same origin + single-use-token gate. One endpoint, one
gate, one flag; no duplicated gating logic to keep in sync.

Target shape:

```ts
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { isLocalRequest } from "@/lib/request-origin";
import { feedbackDir } from "@/lib/artifacts";
import { dispatchRun, validIssueFilename } from "@/lib/artifact-run";
import { consumeDispatchToken } from "@/lib/dispatch-token";
import { RUN_MODELS, type RunModel } from "@/lib/artifact-feedback";

function isRunModel(value: unknown): value is RunModel {
  return (
    typeof value === "string" && (RUN_MODELS as readonly string[]).includes(value)
  );
}

export async function POST(req: NextRequest) {
  if (!isLocalRequest(req)) {
    return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "malformed JSON body" }, { status: 400 });
  }
  const issue = String(body.issue ?? "");
  const token = String(body.token ?? "");
  const run = body.run === true;   // default false: promote only
  if (!validIssueFilename(issue)) {
    return NextResponse.json({ error: "invalid issue" }, { status: 400 });
  }
  if (!consumeDispatchToken(token, issue)) {
    return NextResponse.json({ error: "invalid or expired token" }, { status: 403 });
  }
  // Promote the on-disk issue from needs-triage to the authorized markers.
  const file = path.join(feedbackDir, issue);
  let text: string;
  try { text = await fs.readFile(file, "utf8"); } catch {
    return NextResponse.json({ error: "issue not found" }, { status: 404 });
  }
  let next = text.replace(/^Status: needs-triage$/m, "Status: ready-for-agent");
  if (!/^Execution: /m.test(next)) {
    next = next.replace(/^(Status: ready-for-agent)$/m, "$1\nExecution: queued");
  }
  await fs.writeFile(file, next, "utf8");

  if (!run) {
    return NextResponse.json({ queued: true });
  }
  const executor = isRunModel(body.executorModel) ? body.executorModel : undefined;
  const reviewer = isRunModel(body.reviewerModel) ? body.reviewerModel : undefined;
  return NextResponse.json({ run: dispatchRun(issue, { executor, reviewer }) });
}
```

Note `run` defaults to **false** (`body.run === true`): a body that omits or
mistypes the field promotes but does not start a run — the safe default.

**Verify**: `cd site && bun run typecheck` → exit 0.
`grep -rn "dispatchRun" site/app/api` → matches only in
`feedback/dispatch/route.ts` (import + the single guarded call site).

### Step 4: Reviewer flow — file, then promote

> **AMENDED 2026-08-28** — covers all three tray modes, not just run mode.

The tray has **three** submit modes (`site/components/artifact-reviewer.tsx:799`,
`submit(mode: "triage" | "queue" | "run")`), wired to three buttons
(~:1139-1164). All three now file first; two of them then promote:

| Tray mode | Button | After filing |
|---|---|---|
| `triage` | Save for triage | nothing — the filed issue stays `needs-triage` |
| `queue`  | Queue for agent | GET a token, POST dispatch with `run: false` |
| `run`    | Approve · run now | GET a token, POST dispatch with `run: true` |

Changes to the submit path (~:799-857):

- Always POST `/api/artifacts/feedback` **without** `run`/`readyForAgent`
  authority (send `readyForAgent: false` or drop the fields — the server
  ignores them now). Capture the returned `issue` filename.
- If `mode !== "triage"`: after a successful file,
  `GET /api/artifacts/feedback/dispatch-token?issue=<issue>` (same-origin, so
  it passes plan 025's guard), then `POST /api/artifacts/feedback/dispatch`
  with `{issue, token, run: mode === "run", executorModel, reviewerModel}`.
- For `mode === "run"`: use the returned `run` result exactly as today to set
  `watchIssue` and status text. Keep the existing `responseJson` helper and
  status-poll effect unchanged.
- For `mode === "queue"`: the response is `{queued: true}` — keep today's
  "Filed <path>" status text; do **not** set `watchIssue` (there is no run to
  poll).

If a token GET or the dispatch POST fails, surface the error in the tray's
existing status area — the issue *was* filed, so say so rather than implying
nothing happened.

**Verify**: `cd site && bun run typecheck` → exit 0. Manual (server up):
"Save for triage" writes an issue whose `Status:` is `needs-triage` with no
`Execution:` line; "Queue for agent" writes one that ends up
`Status: ready-for-agent` + `Execution: queued` with **no** new log in
`.scratch/artifact-feedback/runs/`; "Approve · run now" produces both the
markers and a new run log.


### Step 5: Full gate

**Verify**: `bun run verify` (root) → exit 0. With a server up,
`ARTIFACT_REVIEW_BASE_URL=http://127.0.0.1:3000 bun run test:artifact-review`
→ passes (update its assertions if it asserted `ready-for-agent`/`queued` on
the filed issue — after this plan the filed issue is `needs-triage` until
dispatched).

## Test plan

- `site/lib/dispatch-token.test.ts` (new): single-use (consume twice), wrong
  issue, happy path. Pattern: `site/lib/artifact-feedback.test.ts`.
- `site/lib/artifact-feedback.test.ts` (update): rendered issue is
  `needs-triage` with no `Execution:` line — the byte-exact expectation
  changes.
- Manual E2E via `test:artifact-review` covers the file→token→dispatch chain
  end to end. Its "Queue for agent" assertions (`test-artifact-review.mjs:477-497`)
  expect the filed issue to reach `Status: ready-for-agent` + `Execution: queued`
  — under the amended design that still holds, reached via the `run: false`
  dispatch call rather than from the POST body. If the assertion races the
  second call, await the promote before reading the file; do **not** weaken the
  assertion.
- Verification: `cd site && bun test` → all pass, including the new token
  tests.

## Done criteria

- [ ] `cd site && bun run typecheck` exits 0
- [ ] `cd site && bun test` passes; new `dispatch-token` tests exist and pass
- [ ] `grep -rn "dispatchRun" site/app/api` shows dispatch **only** from
      `feedback/dispatch/route.ts` (not from `feedback/route.ts`)
- [ ] A dispatch POST with `run: false` (or with `run` omitted) promotes the
      issue markers and starts **no** run — no new log appears in
      `.scratch/artifact-feedback/runs/`
- [ ] All three tray modes work: triage files `needs-triage`; queue reaches
      `ready-for-agent` + `queued` with no run; approve-run-now does both
- [ ] `grep -n "ready-for-agent" site/lib/artifact-feedback.ts` → no matches
      (the render path can no longer emit the authorizing status)
- [ ] A feedback POST with `readyForAgent:true, run:true` produces an on-disk
      issue whose first `Status:` line is `needs-triage` (manual check)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" no longer match the live code (drift).
- Plan 025 has **not** landed (no `site/lib/request-origin.ts` /
  `isLocalRequest`): the token endpoints depend on its origin guard — report
  rather than shipping unguarded token endpoints.
- The token round-trip cannot be made same-origin without a persistent server
  session store (e.g. because the reviewer runs on a different origin than the
  API) — report the options (in-memory Map vs. signed cookie vs. deferring)
  rather than inventing an insecure token scheme.
- Making the filed issue `needs-triage` breaks a consumer **beyond** the
  "Queue for agent" coupling already handled by the 2026-08-28 amendment —
  report the coupling rather than working around it. (The known consumers are
  `plugins/diagrams/hooks/ready-feedback-nudge.sh`, which counts ready+queued
  batches, and `test-artifact-review.mjs`; both are satisfied by the `run:
  false` promote path.)

## Maintenance notes

- After this plan, the **only** code path that can write `ready-for-agent` +
  `Execution: queued` is `feedback/dispatch/route.ts`, and reaching it requires
  a same-origin token GET. Any future feature that needs to queue a run must go
  through that endpoint, not by writing the markers directly.
- The token store is in-memory and single-process; if the site is ever moved
  behind multiple workers, tokens must move to a shared store.
- A reviewer should scrutinize: that the public POST truly cannot emit the
  authorizing markers (Step 1), that the dispatch endpoint consumes the token
  before any side effect, and that `consumeDispatchToken` deletes on every
  path (no replay).
- Deferred out of scope: `dispatchRun`'s own robustness (report-as-started,
  never-terminating poll, PID-reuse lock) — those are plan 030. Fencing
  untrusted body text inside the issue markdown so it cannot forge structural
  markers is plan 028; this plan and 028 are complementary (028 stops the body
  from *impersonating* markers a reader trusts; this plan stops the API from
  *writing* the authorizing markers on the body's say-so).
