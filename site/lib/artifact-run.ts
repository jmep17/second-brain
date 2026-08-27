import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { feedbackDir } from "@/lib/artifacts";
import { repoRoot } from "@/lib/config-files";

/** .scratch/artifact-feedback/runs — headless run logs (gitignored). */
export const runsDir = path.join(path.dirname(feedbackDir), "runs");
const lockFile = path.join(path.dirname(feedbackDir), ".run-lock");

const ISSUE_FILENAME = /^\d+-[A-Za-z0-9][A-Za-z0-9._-]*\.md$/;

/** Two-stage pipeline: a low-cost executor, then a stronger reviewer. */
const EXECUTOR_MODEL = "sonnet";
const REVIEWER_MODEL = "opus";

export function validIssueFilename(name: string): boolean {
  return ISSUE_FILENAME.test(name);
}

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

export type DispatchResult =
  { started: true; log: string } | { started: false; error: string };

/**
 * Spawn one detached two-stage headless run: a low-cost executor claims and
 * executes the queued batch per docs/agents/issue-tracker.md, then a
 * stronger reviewer verifies the work against the requested changes and
 * amends it if necessary. Single-flight: a live lock refuses a second run
 * (the check-then-spawn window is an accepted race at this scale — single
 * owner, localhost, same as issue numbering). The wrapper shell owns the
 * lock across both stages and removes it when the run exits.
 */
export function dispatchRun(issueFilename: string): DispatchResult {
  if (!validIssueFilename(issueFilename)) {
    return { started: false, error: "invalid issue filename" };
  }
  if (lockedPid() !== null) {
    return { started: false, error: "a run is already active" };
  }
  fs.mkdirSync(runsDir, { recursive: true });
  const issueRel = path.posix.join(
    ".scratch",
    "artifact-feedback",
    "issues",
    issueFilename
  );
  const log = path.join(runsDir, issueFilename.replace(/\.md$/, ".log"));
  const prompt =
    `Claim and execute the artifact feedback batch at ${issueRel} per ` +
    `docs/agents/issue-tracker.md. It was explicitly queued via the review ` +
    `tray's approve action (ready-for-agent + queued), which authorizes this ` +
    `autonomous run. Record resolved or blocked, with the changed files and ` +
    `verification, under its ## Comments before finishing.`;
  const reviewPrompt =
    `A lower-cost model just executed the artifact feedback batch at ` +
    `${issueRel}; its resolution is under ## Comments. Review that work per ` +
    `docs/agents/issue-tracker.md: verify each requested change against the ` +
    `actual files, fix anything wrong or incomplete, and append your own ` +
    `note under ## Comments — "review: approved" or "review: amended" plus ` +
    `what you changed. If the work is fundamentally wrong, set ` +
    `Execution: blocked with the reason. Do not expand scope beyond the batch.`;
  try {
    const child = spawn(
      "bash",
      [
        "-c",
        // $$ is the wrapper's pid; it holds the lock across both stages.
        'echo $$ > "$LOCK"; trap \'rm -f "$LOCK"\' EXIT; ' +
          'echo "=== executor ($EXECUTOR_MODEL) ===" >> "$LOG"; ' +
          'claude -p "$RUN_PROMPT" --permission-mode acceptEdits --model "$EXECUTOR_MODEL" >> "$LOG" 2>&1; ' +
          'echo "=== reviewer ($REVIEWER_MODEL) ===" >> "$LOG"; ' +
          'claude -p "$REVIEW_PROMPT" --permission-mode acceptEdits --model "$REVIEWER_MODEL" >> "$LOG" 2>&1',
      ],
      {
        cwd: repoRoot,
        detached: true,
        stdio: "ignore",
        env: {
          ...process.env,
          LOCK: lockFile,
          LOG: log,
          RUN_PROMPT: prompt,
          REVIEW_PROMPT: reviewPrompt,
          EXECUTOR_MODEL,
          REVIEWER_MODEL,
        },
      }
    );
    child.unref();
  } catch (error) {
    return { started: false, error: String(error) };
  }
  return { started: true, log: path.relative(repoRoot, log) };
}

/** Current Execution: state of one issue file, or null when unreadable. */
export function readExecution(issueFilename: string): string | null {
  if (!validIssueFilename(issueFilename)) return null;
  try {
    const text = fs.readFileSync(path.join(feedbackDir, issueFilename), "utf8");
    const match = /^Execution: ([a-z-]+)$/m.exec(text);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
