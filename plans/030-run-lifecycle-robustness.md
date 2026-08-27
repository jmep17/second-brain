# Plan 030: A dispatched run reports failure honestly and the run lock survives PID reuse

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0ee11c..HEAD -- site/lib/artifact-run.ts site/components/artifact-reviewer.tsx`
> If either in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## At a glance

- **What**: Attach an error listener to the detached dispatch child, make the tray's status poll always terminate, and judge the run lock by identity and recency instead of a bare PID.
- **Why**: Today a missing `claude` binary reports as a successful start, a dead run leaves the poll spinning forever, and a recycled or foreign-owned PID can wrongly block or double-start a run.
- **Next action**: Step 1 — Attach an `'error'` listener to the detached child

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/024-verification-baseline.md (needs `bun test` wired up)
- **Category**: bug
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

The site can dispatch a detached two-stage headless agent run (`claude -p …
--permission-mode acceptEdits`) to execute an approved feedback batch. Today
every failure mode of that run is invisible: a missing or failing `claude`
binary is reported to the UI as a **successful** start, and an `'error'` event
on the detached child has **no listener**, so Node re-throws it as an uncaught
exception that can take down the dev server. Meanwhile the tray's status poll
only ever stops on `resolved`/`blocked`; a run that dies after claiming the
batch leaves the poll spinning every 3 seconds forever with the message "Agent
claimed…", and its `catch {}` swallows every poll error silently. Separately,
the single-flight run lock trusts a bare PID: a recycled PID reads as "a run is
already active" (permanently disabling dispatch), and a foreign-owned PID
(`EPERM`) reads as "free" (letting a second run start on top of a live one).
After this plan, a failed run surfaces a terminal error with its log path, the
poll always terminates, and the lock is judged by identity + recency, not a
bare PID.

## Current state

Files in scope, with their roles:

- `site/lib/artifact-run.ts` — spawns the detached run, owns the lock helpers
  (`lockedPid`, `runActive`, `dispatchRun`, `readExecution`).
- `site/components/artifact-reviewer.tsx` — the review tray; the run-status
  poll lives in a `useEffect` keyed on `watchIssue`.

### `dispatchRun` returns success the instant `spawn` returns (`artifact-run.ts`)

The spawn is wrapped in a `try/catch`, but `catch` only fires for **synchronous**
spawn errors. For a `detached` child, a missing binary or exec failure is
delivered **asynchronously** as an `'error'` event, which this code never
listens for. Current tail of `dispatchRun` (around lines 88–119):

```ts
  try {
    const child = spawn(
      "bash",
      [ "-c", /* … wrapper that writes the lock, runs executor then reviewer … */ ],
      {
        cwd: repoRoot,
        detached: true,
        stdio: "ignore",
        env: { ...process.env, LOCK: lockFile, LOG: log, /* …prompts, models… */ },
      }
    );
    child.unref();
  } catch (error) {
    return { started: false, error: String(error) };
  }
  return { started: true, log: path.relative(repoRoot, log) };
```

`DispatchResult` is `{ started: true; log: string } | { started: false; error: string }`.

The wrapper shell (inside the `spawn` args) is:

```
echo $$ > "$LOCK"; trap 'rm -f "$LOCK"' EXIT; …executor…; …reviewer…
```

so the lock is written with the wrapper's PID and removed on **any** exit path
(the `trap … EXIT`). That means after a crash `runActive()` correctly returns
false while the issue file's `Execution:` line was never advanced past
`claimed` — the exact state the UI cannot represent.

### `lockedPid()` collapses PID-reuse and EPERM (`artifact-run.ts`, around lines 22–37)

```ts
/** Pid holding the run lock, or null when free/stale. */
function lockedPid(): number | null {
  try {
    const pid = parseInt(fs.readFileSync(lockFile, "utf8").trim(), 10);
    if (!Number.isInteger(pid)) return null;
    process.kill(pid, 0); // throws when the process is gone
    return pid;
  } catch {
    return null;
  }
}

/** Whether a dispatched run (either stage) currently holds the lock. */
export function runActive(): boolean {
  return lockedPid() !== null;
}
```

`process.kill(pid, 0)` throws `ESRCH` when the process is gone (→ correctly
"free") but throws `EPERM` when the PID belongs to a **different user's** live
process (→ wrongly "free"), and returns normally for **any** recycled PID (→
wrongly "locked"). `dispatchRun` refuses a second run with
`{ started: false, error: "a run is already active" }` whenever `lockedPid()`
is truthy (around lines 63–65). The lock path
`.scratch/artifact-feedback/.run-lock` is gitignored (last line of
`.gitignore`), so a stale lock survives every git operation and can only be
cleared by hand today.

### The poll never terminates on a dead run (`artifact-reviewer.tsx`, the `watchIssue` effect)

```ts
  useEffect(() => {
    if (!watchIssue) return;
    let cancelled = false;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/artifacts/feedback/status?issue=${encodeURIComponent(watchIssue)}`
          );
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as {
            execution?: string;
            running?: boolean;
          };
          if (cancelled || !data.execution) return;
          const terminal =
            data.execution === "resolved" || data.execution === "blocked";
          if (terminal && !data.running) {
            setStatus(`Run ${data.execution}: ${watchIssue} — reload the artifact to see the result.`);
            setWatchIssue(null);
          } else if (terminal) {
            setStatus(`Executor ${data.execution}: ${watchIssue} — reviewer checking…`);
          } else {
            setStatus(`Agent ${data.execution}: ${watchIssue}…`);
          }
        } catch {
          // transient poll failures are fine; keep watching
        }
      })();
    }, 3_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [watchIssue]);
```

If the run dies after writing `Execution: claimed` (or without writing any
terminal state), `data.execution` stays `claimed` and `data.running` becomes
false once the lock's `trap` removes it — so the code falls into the final
`else` and repeats "Agent claimed…" every 3 s indefinitely. There is no
attempt cap, no elapsed-time deadline, and the `catch {}` makes a persistently
failing poll silent.

The status endpoint it polls is `site/app/api/artifacts/feedback/status/route.ts`;
read it to confirm the response shape includes `execution` and `running`
(`running` comes from `runActive()`). Do **not** change that route's contract
in this plan unless a step here explicitly says to.

### Convention to match

`DispatchResult` is a discriminated union returned (never thrown) — keep that
pattern; callers switch on `started`. Error handling in this file returns
`{ started: false, error }` rather than throwing. Match it.

## Commands you will need

| Purpose   | Command                              | Expected on success   |
|-----------|--------------------------------------|-----------------------|
| Typecheck | `cd site && bun run typecheck`       | exit 0, no errors     |
| Unit test | `cd site && bun test`                | all pass (incl. new)  |
| Plugin/JSON gate | `bash tools/check-plugins.sh` | `all checks passed`   |

`bun run typecheck` runs `next typegen && tsc --noEmit`; `next typegen` writes
into `.next/` — that write is expected, not a failure.

## Suggested executor toolkit

- If a `surgical-patch` skill is available, use it — this is a targeted bug fix,
  not a refactor. Do not restructure the file.

## Scope

**In scope** (the only files you should modify):
- `site/lib/artifact-run.ts`
- `site/lib/artifact-run.test.ts` (create — new `bun:test` file)
- `site/components/artifact-reviewer.tsx` (only the `watchIssue` poll effect)

**Out of scope** (do NOT touch, even though they look related):
- `site/app/api/artifacts/feedback/route.ts` and `.../feedback/status/route.ts`
  — the dispatch/status routes; their contracts are changed by plan 026, not
  here. You may **read** the status route to confirm the response shape.
- The wrapper shell command string inside `spawn` (the executor/reviewer
  `claude -p …` invocation) — leave the two-stage pipeline exactly as is.
- The `.run-lock` gitignore entry.
- The rest of `artifact-reviewer.tsx` (selection engine, JSX, other effects) —
  plans 032 and 037 own that file's other regions.

## Git workflow

- Branch: `advisor/030-run-lifecycle-robustness`
- Commit per logical unit; lowercase prefix, e.g. `fix: report failed run dispatch honestly`
  (matches `git log`, e.g. `feedback: copyable new-session prompt for filed issues`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Attach an `'error'` listener to the detached child

In `dispatchRun` (`artifact-run.ts`), before `child.unref()`, attach a listener
so an async spawn failure is captured instead of re-thrown as an uncaught
exception. Because the function returns synchronously and the error arrives
later, append the failure to the run log (the wrapper may not have run) so the
UI's terminal-failure branch (Step 3) has something to surface:

```ts
    child.on("error", (err) => {
      try {
        fs.appendFileSync(log, `\n=== dispatch error ===\n${String(err)}\n`);
      } catch {
        // best-effort; the child is already detached
      }
    });
    child.unref();
```

Keep the existing synchronous `try/catch` (it still catches immediate spawn
throws). Do not change the return values.

**Verify**: `cd site && bun run typecheck` → exit 0.

### Step 2: Judge the lock by identity + recency, not a bare PID

Change the lock to store JSON `{ pid, startedAt, issue }` instead of a bare PID,
and make `lockedPid()` (rename to reflect it now returns lock info, or keep the
name and return the pid) treat the lock as held only when the PID is alive
**and** `startedAt` is recent. Distinguish `EPERM` (process alive but
foreign-owned → treat as held) from `ESRCH` (gone → free):

- The wrapper shell writes the lock as `echo $$ > "$LOCK"`. Update it to write
  JSON. Keep it a single shell-safe line; for example write the three fields
  with the wrapper's own `$$` and the issue name passed via an env var:
  `printf '{"pid":%s,"startedAt":%s,"issue":"%s"}' "$$" "$(date +%s)" "$ISSUE_NAME" > "$LOCK"`.
  Add `ISSUE_NAME: issueFilename` to the `spawn` `env` block. **Do not** change
  the `trap 'rm -f "$LOCK"' EXIT` or the executor/reviewer commands.
- Rewrite the reader to parse JSON, then:

```ts
function readLock(): { pid: number; startedAt: number; issue: string } | null {
  try {
    const raw = fs.readFileSync(lockFile, "utf8").trim();
    const parsed = JSON.parse(raw);
    if (typeof parsed?.pid !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

const LOCK_MAX_AGE_MS = 60 * 60 * 1000; // 1h — longer than any real two-stage run

function lockHeld(): boolean {
  const lock = readLock();
  if (!lock) return false;
  if (Date.now() - lock.startedAt * 1000 > LOCK_MAX_AGE_MS) return false; // stale
  try {
    process.kill(lock.pid, 0);
    return true; // alive and ours-or-recent
  } catch (err) {
    // ESRCH → gone → not held; EPERM → alive but foreign → treat as held
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}
```

Update `runActive()` to `return lockHeld();` and update the `dispatchRun`
refusal check to use `lockHeld()`. Preserve backward compatibility: a lock file
containing a bare integer (old format) should parse as not-held (`JSON.parse`
of `"12345"` yields a number, not an object, so `parsed?.pid` is undefined →
returns null → not held); that is acceptable because such a lock is only ever
left by a crashed old-format run.

**Verify**: `cd site && bun run typecheck` → exit 0.

### Step 3: Make the poll terminate on a dead run

In the `watchIssue` effect in `artifact-reviewer.tsx`, add a terminal-**failure**
branch and a deadline. A run is dead-but-non-terminal when the lock is gone
(`!data.running`) yet `data.execution` is neither `resolved` nor `blocked`:

```ts
          const terminal =
            data.execution === "resolved" || data.execution === "blocked";
          if (terminal && !data.running) {
            setStatus(`Run ${data.execution}: ${watchIssue} — reload the artifact to see the result.`);
            setWatchIssue(null);
          } else if (!data.running) {
            // lock released but execution never reached a terminal state → the run died
            setStatus(`Run failed: ${watchIssue} did not finish — check .scratch/artifact-feedback/runs/${watchIssue.replace(/\.md$/, ".log")}.`);
            setWatchIssue(null);
          } else if (terminal) {
            setStatus(`Executor ${data.execution}: ${watchIssue} — reviewer checking…`);
          } else {
            setStatus(`Agent ${data.execution}: ${watchIssue}…`);
          }
```

Add an elapsed-time deadline so even a wedged lock cannot poll forever. Capture
a start time when the effect runs and clear the interval past the deadline:

```ts
    const startedAt = Date.now();
    const DEADLINE_MS = 20 * 60 * 1000; // 20 min
    const timer = setInterval(() => {
      if (Date.now() - startedAt > DEADLINE_MS) {
        setStatus(`Run status timed out for ${watchIssue}; check the run log.`);
        setWatchIssue(null);
        return;
      }
      // …existing fetch body…
    }, 3_000);
```

Do not remove the `catch` around the fetch, but keep it scoped to transient
network errors only (leave the comment).

**Verify**: `cd site && bun run typecheck` → exit 0.

### Step 4: Unit-test the lock logic

Create `site/lib/artifact-run.test.ts` (a `bun:test` file — see the existing
`site/lib/artifact-feedback.test.ts` for the import/describe/test shape). The
lock helpers read a fixed `lockFile` path, so test the **pure** parsing/decision
logic. If `readLock`/`lockHeld` are not exported, export them (or extract the
decision into a pure `isLockHeld(lock, now, pidAlive)` helper you can test
directly — preferred, since it avoids touching the real filesystem). Cover:

- a fresh lock with a live PID → held,
- a lock older than `LOCK_MAX_AGE_MS` → not held (stale),
- a lock whose PID is gone (`ESRCH`) → not held,
- a lock whose PID check throws `EPERM` → held,
- a legacy bare-integer lock file → not held,
- malformed JSON → not held.

Model the file after `site/lib/artifact-feedback.test.ts` (same `bun:test`
imports, table-driven `test(...)` calls).

**Verify**: `cd site && bun test` → all pass, including the new file.

## Test plan

- New file `site/lib/artifact-run.test.ts` covering the six lock cases above,
  plus at least one assertion that `validIssueFilename` still rejects a path
  with `/` or `..` (guard against regressions to the filename gate you rely on).
- Structural pattern: `site/lib/artifact-feedback.test.ts`.
- The `'error'`-listener and poll changes are not unit-tested here (they need a
  spawned process / DOM); they are covered by manual verification and by the
  Playwright smoke test in plan 024/026's harness. Note in your PR summary that
  these two changes are typecheck-verified only.
- Verification: `cd site && bun test` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd site && bun run typecheck` exits 0
- [ ] `cd site && bun test` exits 0; `site/lib/artifact-run.test.ts` exists and passes
- [ ] `grep -n "child.on(\"error\"" site/lib/artifact-run.ts` returns a match
- [ ] `grep -n "startedAt" site/lib/artifact-run.ts` returns a match (lock now carries a timestamp)
- [ ] `grep -n "Run failed" site/components/artifact-reviewer.tsx` returns a match (terminal-failure branch)
- [ ] `bash tools/check-plugins.sh` prints `all checks passed`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `dispatchRun` tail, the wrapper shell string, or `lockedPid()` don't match
  the "Current state" excerpts (the file drifted — plan 026 may have already
  reworked dispatch; if so, your changes may conflict and need re-basing on its
  shape).
- Plan 024 has not landed and `cd site && bun test` errors with "no test runner"
  / missing `bun:test` types — this plan depends on 024's test harness. Report
  and stop rather than adding the harness yourself.
- Making the poll terminal-failure branch work would require changing the
  `/api/artifacts/feedback/status` response shape — that is plan 026's
  territory; report the coupling instead of editing the route.
- The lock-format change would break an in-flight run you can see holding the
  lock (`cat .scratch/artifact-feedback/.run-lock`) — wait or report.

## Maintenance notes

- The poll's status shape (`{ execution, running }`) is shared with plan 026
  (filing/dispatch split) and plan 041 (surfacing `needs-triage` batches). If
  026 adds a distinct "failed" execution state to the status route, the Step 3
  `!data.running` heuristic should be replaced by reading that explicit state.
- `LOCK_MAX_AGE_MS` (1h) must stay longer than the slowest realistic two-stage
  run; if runs start taking longer, raise it or the lock will be judged stale
  mid-run.
- Reviewer should scrutinize: that the `'error'` listener cannot itself throw
  (it is best-effort), and that the legacy bare-integer lock file truly parses
  as not-held (a bare number is a valid JSON value, so `JSON.parse("123")`
  succeeds and returns `123`, whose `.pid` is undefined).
- Deferred: automatic reclamation/removal of a stale lock file from the UI
  (an operator still clears it by hand today); out of scope here.
