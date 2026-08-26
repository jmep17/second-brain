import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import {
  chezmoi,
  fileStatus,
  hashContent,
  isChezmoiMeta,
  resolveSource,
} from "@/lib/config-files";

/** GET /api/config/file?path=<dotfiles-relative> — content + hash + drift state. */
export async function GET(req: NextRequest) {
  const rel = req.nextUrl.searchParams.get("path");
  if (!rel) {
    return NextResponse.json({ error: "missing ?path" }, { status: 400 });
  }
  try {
    return NextResponse.json(await fileStatus(rel));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 404 });
  }
}

/**
 * PUT /api/config/file — save: {path, content, baseHash}.
 * Stale saves (file changed since load) are rejected with 409; the save is
 * kept even when the apply fails (ADR 0003).
 */
export async function PUT(req: NextRequest) {
  const { path: rel, content, baseHash } = await req.json();
  if (typeof rel !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  let abs: string;
  try {
    abs = resolveSource(rel);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 403 });
  }

  const onDisk = await fs.readFile(abs, "utf8");
  if (hashContent(onDisk) !== baseHash) {
    return NextResponse.json(
      {
        stale: true,
        currentContent: onDisk,
        currentHash: hashContent(onDisk),
      },
      { status: 409 }
    );
  }

  await fs.writeFile(abs, content, "utf8");

  // Meta files change what everything renders to: full apply. Ordinary files:
  // apply just this source file. --no-tty --force because there is no
  // terminal to answer chezmoi's overwrite prompt; --parent-dirs because a
  // single-file apply fails when the target's directory doesn't exist yet.
  const applyArgs = isChezmoiMeta(rel)
    ? ["apply", "--no-tty", "--force"]
    : ["apply", "--source-path", abs, "--no-tty", "--force", "--parent-dirs"];
  const apply = await chezmoi(...applyArgs);

  const status = await fileStatus(rel);
  return NextResponse.json({
    ...status,
    applied: apply.code === 0,
    applyError: apply.code === 0 ? null : apply.stderr.trim(),
  });
}
