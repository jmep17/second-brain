import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
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
 * Rejected with 409 when the source file changed since load (stale) or the
 * target drifted since load (saving would --force over the $HOME edit).
 * Once written, the save is kept even when the apply fails (ADR 0003).
 */
export async function PUT(req: NextRequest) {
  let body: { path?: unknown; content?: unknown; baseHash?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed JSON body" }, { status: 400 });
  }
  const { path: rel, content, baseHash } = body;
  if (typeof rel !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  let abs: string;
  try {
    abs = resolveSource(rel);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 403 });
  }

  const sourceExists = await fs
    .access(abs)
    .then(() => true)
    .catch(() => false);

  if (sourceExists) {
    const current = await fileStatus(rel);
    if (current.hash !== baseHash) {
      return NextResponse.json(
        {
          stale: true,
          currentContent: current.content,
          currentHash: current.hash,
        },
        { status: 409 }
      );
    }
    // The load-time drift badge can be outdated: re-check at save time so a
    // $HOME edit made after the page loaded is not --force-overwritten
    // unseen. The user resolves the drift (adopt/overwrite), then saves.
    if (current.state === "drifted") {
      return NextResponse.json(
        { targetDrifted: true, ...current },
        { status: 409 }
      );
    }
  } else if (baseHash !== "" && baseHash != null) {
    // Listed-but-absent source file (fresh machine): creatable only from an
    // editor that loaded it as new, not over a deleted file's stale hash.
    return NextResponse.json(
      { stale: true, currentContent: null, currentHash: null },
      { status: 409 }
    );
  }

  await fs.mkdir(path.dirname(abs), { recursive: true });
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
