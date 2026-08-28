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

/**
 * POST /api/artifacts/feedback/dispatch — the only path that may promote a
 * filed issue to ready-for-agent/Execution: queued and start an autonomous
 * run. Requires a same-origin request and a single-use token minted by
 * GET /api/artifacts/feedback/dispatch-token for this exact issue.
 */
export async function POST(req: NextRequest) {
  if (!isLocalRequest(req)) {
    return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed JSON body" }, { status: 400 });
  }

  const issue = String(body.issue ?? "");
  const token = String(body.token ?? "");
  if (!validIssueFilename(issue)) {
    return NextResponse.json({ error: "invalid issue" }, { status: 400 });
  }
  if (!consumeDispatchToken(token, issue)) {
    return NextResponse.json(
      { error: "invalid or expired token" },
      { status: 403 }
    );
  }

  // Promote the on-disk issue from needs-triage to the authorized markers.
  const file = path.join(feedbackDir, issue);
  let text: string;
  try {
    text = await fs.readFile(file, "utf8");
  } catch {
    return NextResponse.json({ error: "issue not found" }, { status: 404 });
  }
  let next = text.replace(/^Status: needs-triage$/m, "Status: ready-for-agent");
  if (!/^Execution: /m.test(next)) {
    next = next.replace(/^(Status: ready-for-agent)$/m, "$1\nExecution: queued");
  }
  await fs.writeFile(file, next, "utf8");

  const executor = isRunModel(body.executorModel) ? body.executorModel : undefined;
  const reviewer = isRunModel(body.reviewerModel) ? body.reviewerModel : undefined;
  return NextResponse.json({ run: dispatchRun(issue, { executor, reviewer }) });
}
