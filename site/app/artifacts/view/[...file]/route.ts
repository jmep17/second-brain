import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { resolveArtifact } from "@/lib/artifacts";

/**
 * GET /artifacts/view/<type>/<file>.html — serves an artifact page verbatim.
 * The artifact page keeps its own chrome; this is not wrapped in DocsLayout.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string[] }> }
) {
  const { file } = await params;
  const rel = file.join("/");

  let abs: string;
  try {
    abs = resolveArtifact(rel);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let html: string;
  try {
    html = await fs.readFile(abs, "utf8");
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
