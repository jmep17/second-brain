# Plan 029: Harden the two path guards — no executable-script writes, no symlink escapes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0ee11c..HEAD -- site/lib/config-files.ts site/lib/artifacts.ts site/app/api/config/file/route.ts site/app/api/config/drift/route.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## At a glance

- **What**: Add a shared realpath-based containment helper for dotfiles and artifact path resolution, and restrict dotfiles writes away from executable chezmoi `run_*` scripts.
- **Why**: Both guards do lexical-only containment today, so a symlink under either root turns the routes into arbitrary-file read/write, and a config save can create and execute a `run_*` script.
- **Next action**: Step 1 — Shared realpath-based containment helper

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/024-verification-baseline.md (needs the `bun test` runner)
- **Category**: security
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

Two path guards protect the config editor and artifact routes, and both rest
on *lexical* containment only:

1. **Over-broad dotfiles writes (F10)**: `resolveSource` accepts any path
   under `dotfiles/`, including a chezmoi `run_*` script. The save handler
   runs `chezmoi apply` immediately after writing, and chezmoi *executes*
   `run_*` scripts on apply (documented in ADR 0003's addendum). So one save
   through the config API can create and execute a script.
2. **Symlink escape (F11)**: both `resolveSource` and `resolveArtifact` use
   `path.resolve` + `startsWith`, which normalizes `..` but does not follow
   symlinks; the subsequent `fs.readFile`/`fs.writeFile` do. A symlink
   introduced under either root (by an agent, a merge, or a chezmoi
   convention) silently turns these routes into arbitrary-file read/write.
   `find dotfiles artifacts -type l` is currently empty — this is latent, not
   live, so the fix is preventive.

ADR 0003 allow-lists `dotfiles/**` for *tool configuration*; it did not
contemplate that a subset of that namespace is an executable-script directory.
This plan narrows within that decision and closes the symlink gap for both
roots.

## Current state

`site/lib/config-files.ts:22-28` — `resolveSource`, containment only:
```ts
export function resolveSource(rel: string): string {
  const abs = path.resolve(dotfilesDir, rel);
  if (abs !== dotfilesDir && !abs.startsWith(dotfilesDir + path.sep)) {
    throw new Error(`path escapes dotfiles/: ${rel}`);
  }
  return abs;
}
```

`site/lib/config-files.ts:13-15` — a `TOOLS` allow-list exists but no handler
consults it for writes:
```ts
export const TOOLS: Record<string, { label: string; files: string[] }> = {
  tmux: { label: "tmux", files: ["dot_config/tmux/tmux.conf"] },
};
```

`site/lib/config-files.ts:38-47` — `isChezmoiMeta` returns true for
`run_*`, routing those saves to a full `apply`:
```ts
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
```

`site/app/api/config/file/route.ts:84-95` — write then apply; `run_*` gets the
full `apply` (which executes it):
```ts
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf8");
  const applyArgs = isChezmoiMeta(rel)
    ? ["apply", "--no-tty", "--force"]
    : ["apply", "--source-path", abs, "--no-tty", "--force", "--parent-dirs"];
  const apply = await chezmoi(...applyArgs);
```

`site/lib/artifacts.ts:18-27` — `resolveArtifact`, same lexical shape:
```ts
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
```

`docs/adr/0003-ui-edits-source-then-applies.md` — "Writes are allow-listed to
`dotfiles/**`; the wiki stays LLM-owned and read-only in the UI." The addendum
(2026-08-26) verifies that a `run_after_*.sh.tmpl` script runs on apply — i.e.
the executable-on-apply behavior is a known property.

The only currently-editable file is `dot_config/tmux/tmux.conf`
(`TOOLS.tmux`), so narrowing the write surface has no user-visible cost today.

Conventions: guard functions live in `site/lib/`; tests are `bun:test` (plans
024 created `config-files.test.ts` and `artifacts.test.ts` — extend them).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `cd site && bun run typecheck` | exit 0 |
| Unit tests | `cd site && bun test` | all pass |
| Full gate | `bun run verify` (repo root) | exit 0 |
| Confirm no symlinks today | `find dotfiles artifacts -type l` | no output |

## Scope

**In scope**:
- `site/lib/config-files.ts` — write-intent + script-deny in `resolveSource`; shared realpath helper
- `site/lib/artifacts.ts` — use the shared realpath helper in `resolveArtifact`
- `site/app/api/config/file/route.ts` — pass write intent; confirm meta-save path
- `site/lib/config-files.test.ts`, `site/lib/artifacts.test.ts` — extend
- Optionally `site/app/api/config/drift/route.ts` — only if it calls `resolveSource` for a write and needs the intent threaded (check; it may not)

**Out of scope**:
- Do NOT change what `isChezmoiMeta` classifies or the apply flags — the full-apply behavior for real meta files (`.chezmoiignore` etc.) is correct per ADR 0003. You are *denying the write of* `run_*` sources, not changing how meta files apply.
- Do NOT add the `TOOLS`-membership restriction as a hard block if it would break the drift/adopt flow — see step 2's note. Denying `run_*` and `.chezmoiscripts/**` is the required change; `TOOLS`-membership is a recommended-but-optional tightening.
- The cross-origin guard (plan 025) and the run dispatch (plan 026) are separate.

## Git workflow

- Branch: `advisor/029-containment-hardening`
- Commit style: `fix: deny executable chezmoi sources from the config editor`, `fix: resolve symlinks before containment check`.
- Do NOT push or open a PR.

## Steps

### Step 1: Shared realpath-based containment helper

Add to `site/lib/config-files.ts` a helper both resolvers can use. It must
handle the not-yet-created-file case (a `PUT` may create a new source), so it
realpaths the deepest **existing** ancestor and re-checks the prefix:
```ts
import fsSync from "node:fs";

/**
 * Resolve `rel` under `root`, following symlinks on the deepest existing
 * ancestor, and confirm the result is still contained in `root`. Prevents a
 * symlink inside `root` from redirecting a read/write to an outside target.
 */
export function containedRealPath(root: string, rel: string): string {
  const abs = path.resolve(root, rel);
  const rootReal = fsSync.realpathSync(root);
  // Walk up to the nearest existing ancestor and realpath it.
  let ancestor = abs;
  while (!fsSync.existsSync(ancestor) && ancestor !== path.dirname(ancestor)) {
    ancestor = path.dirname(ancestor);
  }
  const ancestorReal = fsSync.realpathSync(ancestor);
  const tail = path.relative(ancestor, abs); // "" when abs already exists
  const finalReal = tail ? path.join(ancestorReal, tail) : ancestorReal;
  if (finalReal !== rootReal && !finalReal.startsWith(rootReal + path.sep)) {
    throw new Error(`path escapes ${path.basename(root)}/: ${rel}`);
  }
  return abs; // return the lexical abs for callers that write/create
}
```
(Returning the lexical `abs` preserves current write behavior — the guard is
the containment *check*, not a path rewrite.)

**Verify**: `cd site && bun run typecheck` → exit 0.

### Step 2: Add write-intent and script-deny to `resolveSource`

Change `resolveSource` to take an intent and, on writes, reject executable
chezmoi sources and use the realpath check:
```ts
export function resolveSource(rel: string, intent: "read" | "write" = "read"): string {
  const abs = containedRealPath(dotfilesDir, rel);
  if (intent === "write") {
    const base = path.basename(rel);
    const segments = rel.split(path.sep);
    if (base.startsWith("run_") || segments.includes(".chezmoiscripts")) {
      throw new Error(`refusing to write executable chezmoi source: ${rel}`);
    }
  }
  return abs;
}
```
Recommended-but-optional tightening (only if it does not break drift/adopt):
also reject writes whose `rel` is not listed in any `TOOLS[*].files` — but
first confirm the drift and file-create flows don't legitimately write paths
outside `TOOLS` (a brand-new tool's first file would be outside it). If in
doubt, ship only the `run_`/`.chezmoiscripts` deny and note the `TOOLS`
tightening as follow-up.

In `site/app/api/config/file/route.ts`, pass `"write"` at the `PUT` call site
(`resolveSource(rel)` → `resolveSource(rel, "write")`). Leave the `GET`
handler's implicit read intent as default.

**Verify**: `cd site && bun test config-files` → pass, including a new case asserting `resolveSource("run_once_x.sh", "write")` throws and `resolveSource("run_once_x.sh", "read")` does not.

### Step 3: Use the realpath check in `resolveArtifact`

Replace the lexical check in `resolveArtifact` with `containedRealPath`,
keeping the `.html` suffix requirement:
```ts
export function resolveArtifact(rel: string): string {
  const abs = containedRealPath(artifactsDir, rel);
  if (!abs.endsWith(".html")) {
    throw new Error(`not an artifact file: ${rel}`);
  }
  return abs;
}
```
(Import `containedRealPath` from `@/lib/config-files`, where `repoRoot` is
already imported from.)

**Verify**: `cd site && bun test artifacts` → pass, existing escape cases still throw.

### Step 4: Symlink regression test

Add a test that creates a temp symlink escaping each root and asserts the
guard throws. Use `bun:test` with a temp dir you create and clean up in the
test; do NOT create symlinks under the real `dotfiles/` or `artifacts/`.
Structure: make a temp root, a target file outside it, a symlink inside the
temp root pointing out, and assert `containedRealPath(tempRoot, "link/escape")`
throws. If wiring a temp root through `resolveSource`/`resolveArtifact`
(which hardcode `dotfilesDir`/`artifactsDir`) is awkward, test
`containedRealPath` directly — it takes `root` as a parameter.

**Verify**: `cd site && bun test` → all pass including the symlink case.

## Test plan

- `site/lib/config-files.test.ts`: `resolveSource` write-intent denies `run_*` and `.chezmoiscripts/**`; read-intent allows them; `containedRealPath` throws on a symlink escape and accepts a normal nested path and a not-yet-existing new file.
- `site/lib/artifacts.test.ts`: `resolveArtifact` still rejects `..` and non-`.html`, and now also rejects a symlink escape (via `containedRealPath`).
- Pattern: existing cases from plan 024.
- Verification: `cd site && bun test` → all pass.

## Done criteria

ALL must hold:

- [ ] `resolveSource("run_once_setup.sh", "write")` throws; `resolveSource(".chezmoiscripts/x.sh", "write")` throws; both are allowed with `"read"` (tests assert)
- [ ] `site/app/api/config/file/route.ts` calls `resolveSource(rel, "write")` in the `PUT` handler (`grep -n 'resolveSource' site/app/api/config/file/route.ts`)
- [ ] `resolveArtifact` and `resolveSource` both route through `containedRealPath` (`grep -n containedRealPath site/lib/*.ts` → ≥3 matches)
- [ ] A symlink-escape test passes for both roots
- [ ] `find dotfiles artifacts -type l` → still no output (you introduced none)
- [ ] `cd site && bun test` exits 0; `bun run verify` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Threading write-intent reveals that the drift route (`config/drift/route.ts`) or a create flow legitimately needs to write a `run_*` path or a path outside `TOOLS` — report which flow, and ship only the symlink hardening if the script-deny would break it.
- `realpathSync` throws `ENOENT` on a path you expected to resolve — the deepest-existing-ancestor walk may need adjustment for your filesystem; report the failing input.
- Adding the optional `TOOLS`-membership block breaks the existing tmux edit flow or any test — drop that optional part.
- The code at "Current state" locations doesn't match the excerpts.

## Maintenance notes

- When plan 040 adds an "adopt a `$HOME` file into dotfiles" flow, it must go through `resolveSource(rel, "write")` and will need to either register the new file in `TOOLS` or explicitly justify writing outside it — the `TOOLS`-membership tightening (step 2, optional) becomes relevant there.
- The `run_*` write-deny is defense-in-depth, not the only control: chezmoi still executes any `run_*` script committed to `dotfiles/` by other means. A reviewer should confirm no route other than `PUT /api/config/file` writes into `dotfiles/`.
- `containedRealPath` returns the lexical path by design (so creates still work); if a future caller needs the *resolved* path for reading, add a separate accessor rather than changing this one.
