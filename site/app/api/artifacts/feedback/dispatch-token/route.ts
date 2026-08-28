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
