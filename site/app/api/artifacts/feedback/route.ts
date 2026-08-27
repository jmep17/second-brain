import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveArtifact, feedbackDir, nextIssueNumber } from "@/lib/artifacts";
import {
  feedbackSlug,
  parseFeedbackPayload,
  renderFeedbackIssue,
} from "@/lib/artifact-feedback";
import { dispatchRun } from "@/lib/artifact-run";
import { isLocalRequest } from "@/lib/request-origin";

/**
 * POST /api/artifacts/feedback — file a needs-triage issue into the local
 * tracker (.scratch/artifact-feedback/issues/) from an artifact page's
 * feedback widget. Concurrent-write collisions on the issue number are
 * acceptable at this scale (single owner, localhost) — no locking.
 */
export async function POST(req: NextRequest) {
  if (!isLocalRequest(req)) {
    return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed JSON body" }, { status: 400 });
  }

  const parsed = parseFeedbackPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const payload = parsed.value;

  // The widget's data-artifact carries the page's repo-relative path
  // ("artifacts/diagrams/x.html"); tests and other tools may send the
  // artifacts-relative shape ("diagrams/x.html") that resolveArtifact()
  // expects. Accept both by stripping a leading "artifacts/" once.
  const relArtifact = payload.artifact.replace(/^artifacts\//, "");

  let abs: string;
  try {
    abs = resolveArtifact(relArtifact);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 403 });
  }

  const exists = await fs
    .access(abs)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    return NextResponse.json({ error: "artifact not found" }, { status: 404 });
  }

  await fs.mkdir(feedbackDir, { recursive: true });
  const nn = await nextIssueNumber();
  const slug = feedbackSlug(payload.title);
  const filename = `${nn}-${slug}.md`;
  const relOut = path.join(".scratch", "artifact-feedback", "issues", filename);
  const date = new Date().toISOString().slice(0, 10);

  const content = renderFeedbackIssue(payload, relArtifact, date);

  await fs.writeFile(path.join(feedbackDir, filename), content, "utf8");

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
}
