import { NextRequest, NextResponse } from "next/server";
import {
  chezmoi,
  fileStatus,
  isTemplate,
  resolveSource,
} from "@/lib/config-files";

/**
 * POST /api/config/drift — resolve drift on one file: {path, action}.
 * action "adopt" = the $HOME version wins (`chezmoi re-add`); action
 * "overwrite" = the source wins (`chezmoi apply`). ADR 0003.
 */
export async function POST(req: NextRequest) {
  let body: { path?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed JSON body" }, { status: 400 });
  }
  const { path: rel, action } = body;
  if (
    typeof rel !== "string" ||
    (action !== "adopt" && action !== "overwrite")
  ) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  let abs: string;
  try {
    abs = resolveSource(rel);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 403 });
  }

  // `chezmoi re-add` skips (or worse, flattens) template sources; adopting a
  // rendered target would lose the template logic and secret references.
  if (action === "adopt" && isTemplate(rel)) {
    return NextResponse.json(
      { error: "adopt is not available for template files" },
      { status: 400 }
    );
  }

  const before = await fileStatus(rel);
  if (!before.target) {
    return NextResponse.json({ error: "file has no target" }, { status: 400 });
  }

  const res =
    action === "adopt"
      ? await chezmoi("re-add", before.target)
      : await chezmoi(
          "apply",
          "--source-path",
          abs,
          "--no-tty",
          "--force",
          "--parent-dirs"
        );
  if (res.code !== 0) {
    return NextResponse.json({ error: res.stderr.trim() }, { status: 500 });
  }

  return NextResponse.json(await fileStatus(rel));
}
