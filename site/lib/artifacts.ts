import fs from "node:fs/promises";
import path from "node:path";
import { repoRoot } from "@/lib/config-files";

export const artifactsDir = path.join(repoRoot, "artifacts");
export const feedbackDir = path.join(
  repoRoot,
  ".scratch",
  "artifact-feedback",
  "issues"
);

/**
 * Resolve an artifacts/-relative path ("diagrams/2026-08-26-x.html") to an
 * absolute path, rejecting anything that escapes artifacts/ or does not
 * name an .html file (same guard shape as config-files.ts resolveSource).
 */
export function resolveArtifact(rel: string): string {
  const abs = path.resolve(artifactsDir, rel);
  if (abs !== artifactsDir && !abs.startsWith(artifactsDir + path.sep)) {
    throw new Error(`path escapes artifacts/: ${rel}`);
  }
  if (!abs.endsWith(".html")) {
    throw new Error(`not an artifact file: ${rel}`);
  }
  return abs;
}

/** "2026-08-26-artifact-platform" -> "Artifact platform" */
function nameFromFilename(file: string): string {
  const base = file.replace(/\.html$/, "");
  const kebab = base.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const spaced = kebab.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * One directory level under artifacts/<type>/*.html, newest first (the
 * YYYY-MM-DD- filename prefix sorts lexically, so a reverse string sort is
 * a date sort).
 */
export async function listArtifacts(): Promise<
  Record<string, { file: string; name: string }[]>
> {
  const result: Record<string, { file: string; name: string }[]> = {};
  let types: string[];
  try {
    const entries = await fs.readdir(artifactsDir, { withFileTypes: true });
    types = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return result;
  }
  for (const type of types) {
    const dir = path.join(artifactsDir, type);
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".html"));
    files.sort().reverse();
    result[type] = files.map((file) => ({
      file,
      name: nameFromFilename(file),
    }));
  }
  return result;
}

/**
 * Next feedback issue number under .scratch/artifact-feedback/issues, e.g.
 * "01" when empty/absent, else zero-padded max+1. Concurrent-write
 * collisions on this number are acceptable at this scale (single owner,
 * localhost) — no locking.
 */
export async function nextIssueNumber(): Promise<string> {
  let files: string[];
  try {
    files = await fs.readdir(feedbackDir);
  } catch {
    return "01";
  }
  let max = 0;
  for (const f of files) {
    const m = /^(\d+)-/.exec(f);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return String(max + 1).padStart(2, "0");
}
