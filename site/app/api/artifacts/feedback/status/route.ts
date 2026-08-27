import { NextRequest, NextResponse } from "next/server";
import {
  readExecution,
  runActive,
  validIssueFilename,
} from "@/lib/artifact-run";

/**
 * GET /api/artifacts/feedback/status?issue=<NN-slug.md> — the batch's
 * current Execution state, so the review tray can watch a dispatched run.
 */
export function GET(req: NextRequest) {
  const issue = req.nextUrl.searchParams.get("issue") ?? "";
  if (!validIssueFilename(issue)) {
    return NextResponse.json({ error: "invalid issue" }, { status: 400 });
  }
  const execution = readExecution(issue);
  if (execution === null) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ execution, running: runActive() });
}
