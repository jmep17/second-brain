import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

export const repoRoot = path.resolve(process.cwd(), "..");
export const dotfilesDir = path.join(repoRoot, "dotfiles");

/** Tools the editor knows about, with their source files under dotfiles/. */
export const TOOLS: Record<string, { label: string; files: string[] }> = {
  tmux: { label: "tmux", files: ["dot_config/tmux/tmux.conf"] },
};

/**
 * Resolve a repo-relative dotfiles source path ("dot_config/tmux/tmux.conf")
 * to an absolute path, rejecting anything that escapes dotfiles/. Writes are
 * confined to dotfiles/** (ADR 0003).
 */
export function resolveSource(rel: string): string {
  const abs = path.resolve(dotfilesDir, rel);
  if (abs !== dotfilesDir && !abs.startsWith(dotfilesDir + path.sep)) {
    throw new Error(`path escapes dotfiles/: ${rel}`);
  }
  return abs;
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Saving a chezmoi meta file triggers a full apply instead of a single-file
 * one (ADR 0003).
 */
export function isChezmoiMeta(rel: string): boolean {
  const base = path.basename(rel);
  return (
    base.startsWith(".chezmoiignore") ||
    base.startsWith(".chezmoiremove") ||
    base === ".chezmoi.toml.tmpl" ||
    rel.split(path.sep).includes(".chezmoidata") ||
    base.startsWith("run_")
  );
}

export function isTemplate(rel: string): boolean {
  return rel.endsWith(".tmpl");
}

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function run(cmd: string, args: string[]): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd: repoRoot,
      maxBuffer: 4 * 1024 * 1024,
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof e.code === "number" ? e.code : 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? String(error),
    };
  }
}

/** All chezmoi calls read the repo's dotfiles/ as the source dir. */
export function chezmoi(...args: string[]): Promise<ExecResult> {
  return run("chezmoi", ["--source", dotfilesDir, ...args]);
}

export function git(...args: string[]): Promise<ExecResult> {
  return run("git", ["-C", repoRoot, ...args]);
}

export type FileState =
  "in-sync" | "drifted" | "not-applied" | "meta" | "error";

export interface FileStatus {
  path: string;
  content: string;
  hash: string;
  target: string | null;
  state: FileState;
  /** chezmoi diff output; withheld for templates (would render secrets). */
  diff: string | null;
  isTemplate: boolean;
  /** Set when state is "error": what chezmoi said. */
  error: string | null;
}

/**
 * Read one source file plus its drift state — run on every open and after
 * every save/adopt/overwrite (ADR 0003: drift check on file open). A chezmoi
 * failure is reported as state "error", never as a guessed state: a swallowed
 * `diff` failure would show "in sync" and invite a --force save over real
 * drift.
 */
export async function fileStatus(rel: string): Promise<FileStatus> {
  const abs = resolveSource(rel);
  const content = await fs.readFile(abs, "utf8");
  const base = {
    path: rel,
    content,
    hash: hashContent(content),
    isTemplate: isTemplate(rel),
    error: null,
  };

  if (isChezmoiMeta(rel)) {
    return { ...base, target: null, state: "meta", diff: null };
  }

  const targetRes = await chezmoi("target-path", abs);
  if (targetRes.code !== 0) {
    return {
      ...base,
      target: null,
      state: "error",
      diff: null,
      error: `chezmoi target-path failed: ${targetRes.stderr.trim()}`,
    };
  }
  const target = targetRes.stdout.trim();

  const exists = await fs
    .access(target)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    return { ...base, target, state: "not-applied", diff: null };
  }

  // chezmoi diff exits 0 with or without differences; non-zero is a real
  // failure (verified against v2.72.0).
  const diffRes = await chezmoi("diff", target);
  if (diffRes.code !== 0) {
    return {
      ...base,
      target,
      state: "error",
      diff: null,
      error: `chezmoi diff failed: ${diffRes.stderr.trim()}`,
    };
  }
  const drifted = diffRes.stdout.trim().length > 0;
  return {
    ...base,
    target,
    state: drifted ? "drifted" : "in-sync",
    diff: drifted && !base.isTemplate ? diffRes.stdout : null,
  };
}
