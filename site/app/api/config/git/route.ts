import { NextRequest, NextResponse } from "next/server";
import { git } from "@/lib/config-files";
import { isLocalRequest } from "@/lib/request-origin";

/** GET /api/config/git — dirty files under dotfiles/**. */
export async function GET() {
  // -z: NUL-separated, unquoted paths; renames come as "XY new\0old\0".
  const status = await git(
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
    "--",
    "dotfiles"
  );
  if (status.code !== 0) {
    return NextResponse.json(
      { error: `git status failed: ${status.stderr.trim()}` },
      { status: 500 }
    );
  }
  const entries = status.stdout.split("\0").filter(Boolean);
  const dirty: { status: string; path: string }[] = [];
  for (let i = 0; i < entries.length; i++) {
    const code = entries[i].slice(0, 2);
    dirty.push({ status: code.trim(), path: entries[i].slice(3) });
    if (code[0] === "R" || code[0] === "C") i++; // skip the origin path
  }
  return NextResponse.json({ dirty });
}

/**
 * POST /api/config/git — commit all dirty dotfiles/** files: {message}.
 * One commit for everything dirty; push is out of scope for the prototype.
 */
export async function POST(req: NextRequest) {
  if (!isLocalRequest(req)) {
    return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  }

  let body: { message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed JSON body" }, { status: 400 });
  }
  const { message } = body;
  if (typeof message !== "string" || message.trim() === "") {
    return NextResponse.json(
      { error: "empty commit message" },
      { status: 400 }
    );
  }

  const add = await git("add", "dotfiles");
  if (add.code !== 0) {
    return NextResponse.json({ error: add.stderr.trim() }, { status: 500 });
  }
  const commit = await git("commit", "-m", message.trim(), "--", "dotfiles");
  if (commit.code !== 0) {
    return NextResponse.json(
      { error: (commit.stdout + commit.stderr).trim() },
      { status: 500 }
    );
  }
  return NextResponse.json({ committed: true, output: commit.stdout.trim() });
}
