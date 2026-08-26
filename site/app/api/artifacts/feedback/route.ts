import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveArtifact, feedbackDir, nextIssueNumber } from "@/lib/artifacts";

const KINDS = ["feedback", "rfc"] as const;
type Kind = (typeof KINDS)[number];

function isKind(v: unknown): v is Kind {
  return typeof v === "string" && (KINDS as readonly string[]).includes(v);
}

/** Title -> kebab slug, max 60 chars. */
function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, 60).replace(/-+$/, "") || "untitled";
}

/**
 * POST /api/artifacts/feedback — file a needs-triage issue into the local
 * tracker (.scratch/artifact-feedback/issues/) from an artifact page's
 * feedback widget. Concurrent-write collisions on the issue number are
 * acceptable at this scale (single owner, localhost) — no locking.
 */
export async function POST(req: NextRequest) {
  let body: {
    artifact?: unknown;
    kind?: unknown;
    title?: unknown;
    body?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed JSON body" }, { status: 400 });
  }

  const { artifact, kind, title, body: text } = body;
  if (
    typeof artifact !== "string" ||
    !isKind(kind) ||
    typeof title !== "string" ||
    title.trim() === "" ||
    typeof text !== "string" ||
    text.trim() === ""
  ) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  let abs: string;
  try {
    abs = resolveArtifact(artifact);
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
  const slug = slugify(title);
  const filename = `${nn}-${slug}.md`;
  const relOut = path.join(".scratch", "artifact-feedback", "issues", filename);
  const date = new Date().toISOString().slice(0, 10);

  const content = `# ${title}

Status: needs-triage
Kind: ${kind}
Artifact: artifacts/${artifact}
Date: ${date}

${text}

## Comments
`;

  await fs.writeFile(path.join(feedbackDir, filename), content, "utf8");

  return NextResponse.json({ filed: relOut });
}
