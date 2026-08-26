import { NextRequest, NextResponse } from "next/server";
import { git } from "@/lib/config-files";

/** GET /api/config/git — dirty files under dotfiles/**. */
export async function GET() {
  const status = await git(
    "status",
    "--porcelain",
    "--untracked-files=all",
    "--",
    "dotfiles"
  );
  const dirty = status.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2).trim(), path: line.slice(3) }));
  return NextResponse.json({ dirty });
}

/**
 * POST /api/config/git — commit all dirty dotfiles/** files: {message}.
 * One commit for everything dirty; push is out of scope for the prototype.
 */
export async function POST(req: NextRequest) {
  const { message } = await req.json();
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
