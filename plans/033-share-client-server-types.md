# Plan 033: Share client/server response types and the JSON-parse helper

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- site/components/config-editor.tsx site/components/commit-box.tsx site/components/artifact-reviewer.tsx site/lib/config-files.ts site/lib/artifact-feedback.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## At a glance

- **What**: Single-source the client/server response types and one JSON-parse helper instead of three hand-declared, `as unknown as`-cast copies.
- **Why**: A field added or renamed on the server compiles clean on the client today and silently drifts or breaks at runtime instead of at build.
- **Next action**: Step 1 — Create the shared `parseJson` helper

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/024-verification-baseline.md` (needs the `bun test` runner so the typecheck-and-test gate is meaningful)
- **Category**: tech-debt
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

The server already owns the shapes it returns, but three client components
re-declare those shapes by hand and then cast untyped JSON into them with
`as unknown as`. Adding a field to `FileStatus` compiles clean while the
editor silently ignores it; renaming one breaks at runtime, not at build.
The four `as unknown as FileStatus` casts in `config-editor.tsx` are exactly
the places the compiler was overruled on the client/server boundary, and the
same "parse JSON, fall back to `${status} ${statusText}`" helper is written
three times under three names. Single-sourcing the types and the helper turns
these silent-drift points back into compile errors.

## Current state

- `site/lib/config-files.ts:85-99` — **already exports** the canonical types:

  ```ts
  export type FileState =
    "in-sync" | "drifted" | "not-applied" | "meta" | "error";

  export interface FileStatus {
    path: string;
    content: string;
    hash: string;
    target: string | null;
    state: FileState;
    diff: string | null;
    isTemplate: boolean;
    error: string | null;
  }
  ```

- `site/components/config-editor.tsx:7-17` — re-declares `FileState` and
  `FileStatus` **as local duplicates** instead of importing them:

  ```ts
  type FileState = "in-sync" | "drifted" | "not-applied" | "meta" | "error";

  interface FileStatus {
    path: string;
    content: string;
    hash: string;
    target: string | null;
    state: FileState;
    diff: string | null;
    isTemplate: boolean;
    error: string | null;
  }
  ```

  and casts into it at `:68`, `:69`, `:96`, `:107`, `:142`, `:143`:
  `setStatus(data as unknown as FileStatus)` /
  `setText((data as unknown as FileStatus).content)`.

- `site/components/config-editor.tsx:31-38` — the `parseJson` helper:

  ```ts
  async function parseJson(res: Response): Promise<Record<string, unknown>> {
    try {
      return await res.json();
    } catch {
      return { error: `${res.status} ${res.statusText}` };
    }
  }
  ```

- `site/components/artifact-reviewer.tsx:306-314` — the identical helper under
  the name `responseJson`.
- `site/components/commit-box.tsx:52-56` — the same logic inline, with a local
  `data: { error?: string; output?: string }` annotation.
- `site/components/artifact-reviewer.tsx:829-844` — the feedback POST response
  is read as loose `unknown` with `String(data.error)`,
  `typeof data.issue === "string"`, and
  `(data.run ?? null) as { started?: boolean; error?: string } | null`, though
  `site/lib/artifact-feedback.ts` is the module that owns that surface.

**Load-bearing constraint — `import type`, not a value import.**
`site/lib/config-files.ts:1-5` imports server-only modules at the top
(`node:crypto`, `node:child_process`, `node:fs/promises`, `node:path`). A
plain `import { FileStatus }` from a client component would pull that
server code into the client bundle. Type-only imports are erased at compile
time and are safe:

```ts
import type { FileStatus, FileState } from "@/lib/config-files";
```

`site/lib/artifact-feedback.ts` is pure (no `node:` imports — it begins with
`export const FEEDBACK_KINDS = ...`), and `artifact-reviewer.tsx:4-8` already
does a **value** import from it (`RUN_MODELS`, types). So a `FeedbackResponse`
type added there can be imported normally.

Repo conventions to match: two-space indent, double quotes, path alias `@/`
(see `site/tsconfig.json`), and `import type` is already used in the codebase
(`site/app/page.tsx:3` `import type { Metadata }`). Prettier runs on commit.

## Commands you will need

| Purpose   | Command                        | Expected on success |
|-----------|--------------------------------|---------------------|
| Typecheck | `cd site && bun run typecheck` | exit 0, no errors   |
| Tests     | `cd site && bun test`          | all pass            |
| Format    | `cd site && bunx prettier --check lib/http.ts components/config-editor.tsx components/commit-box.tsx components/artifact-reviewer.tsx` | no diff (or run `--write`) |

`bun run typecheck` runs `next typegen && tsc --noEmit`; `next typegen` writes
into `.next/` and `tsconfig.tsbuildinfo` — that is the repo's only typecheck,
accept the write.

## Scope

**In scope** (the only files you should modify):
- `site/lib/http.ts` (create — the single `parseJson` helper)
- `site/lib/artifact-feedback.ts` (add a `FeedbackResponse` type only)
- `site/components/config-editor.tsx`
- `site/components/commit-box.tsx`
- `site/components/artifact-reviewer.tsx`
- `site/lib/http.test.ts` (create — see Test plan)

**Out of scope** (do NOT touch, even though they look related):
- `site/lib/config-files.ts` beyond confirming its exports — the server types
  are already correct; do not change their shape.
- The actual request/response *behaviour* of any API route. This plan moves
  types and one helper only; it changes no runtime logic.
- `site/lib/artifact-feedback.ts` payload/parse/render logic — add the new
  `FeedbackResponse` type and nothing else.

## Git workflow

- Branch: `advisor/033-share-types`
- One commit is fine; message style matches `git log` (lowercase prefix), e.g.
  `refactor: share client/server response types and json helper`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the shared `parseJson` helper

Create `site/lib/http.ts`:

```ts
/** Parse a JSON body; error responses may be non-JSON (e.g. a bare 500). */
export async function parseJson(
  res: Response
): Promise<Record<string, unknown>> {
  try {
    return await res.json();
  } catch {
    return { error: `${res.status} ${res.statusText}` };
  }
}
```

**Verify**: `cd site && bun run typecheck` → exit 0.

### Step 2: Point all three components at the shared helper

- `config-editor.tsx`: delete the local `parseJson` (`:31-38`) and add
  `import { parseJson } from "@/lib/http";`.
- `artifact-reviewer.tsx`: delete the local `responseJson` (`:306-314`), add
  `import { parseJson } from "@/lib/http";`, and rename its call sites from
  `responseJson(` to `parseJson(`.
- `commit-box.tsx`: replace the inline try/catch (`:52-56`) with
  `const data = await parseJson(res);` and add the import. Keep the existing
  downstream reads working — `data.error` / `data.output` are now accessed off
  `Record<string, unknown>`, so read them as
  `typeof data.output === "string" ? data.output : ...` or narrow as the file
  already does elsewhere; do not reintroduce a hand-written type here.

**Verify**: `cd site && bun run typecheck` → exit 0.

### Step 3: Share `FileStatus`/`FileState` into the config editor

In `config-editor.tsx`:
- Delete the local `type FileState` (`:7`) and `interface FileStatus`
  (`:9-17`).
- Add `import type { FileStatus, FileState } from "@/lib/config-files";`
  (**`import type`** — see the load-bearing constraint above).
- Replace every `data as unknown as FileStatus` (5 sites: `:68`, `:69`,
  `:96`, `:107`, `:142`, `:143`) with a single narrowing helper rather than a
  double cast. Add a local type guard:

  ```ts
  function isFileStatus(v: Record<string, unknown>): v is FileStatus & Record<string, unknown> {
    return typeof v.path === "string" && typeof v.state === "string";
  }
  ```

  and at each call site use `if (isFileStatus(data)) setStatus(data)` (falling
  through to the existing error handling when it is not). Keep the existing
  `BADGE` `Record<FileState, ...>` — it now references the imported `FileState`.

**Verify**: `cd site && bun run typecheck` → exit 0, and
`grep -n "as unknown as" site/components/config-editor.tsx` → no matches.

### Step 4: Add and use a `FeedbackResponse` type

In `site/lib/artifact-feedback.ts`, add (near the other exported types):

```ts
/** Shape returned by POST /api/artifacts/feedback. */
export interface FeedbackResponse {
  filed?: string;
  issue?: string;
  run?: { started?: boolean; error?: string; log?: string } | null;
  error?: string;
}
```

In `artifact-reviewer.tsx:829-844`, keep the runtime guards (the body is still
untrusted) but type the parsed object as `FeedbackResponse` so the field reads
(`data.error`, `data.issue`, `data.run`, `data.filed`) are checked. Do not
remove the `typeof`/`String()` guards — a malformed body must still be handled.

**Verify**: `cd site && bun run typecheck` → exit 0.

## Test plan

- New file `site/lib/http.test.ts` (model its structure after
  `site/lib/artifact-feedback.test.ts` — `import { describe, expect, test } from "bun:test"`):
  - `parseJson` returns the parsed object for a valid JSON `Response`
    (construct with `new Response(JSON.stringify({ a: 1 }))`).
  - `parseJson` returns `{ error: "<status> <statusText>" }` for a body that is
    not JSON (construct `new Response("<html>", { status: 500, statusText: "Internal Server Error" })`).
- No new test is needed for the type moves — the compiler is the test; Step 3's
  `grep` is the done-check.
- Verification: `cd site && bun test` → all pass, including the 2 new
  `http.test.ts` cases.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd site && bun run typecheck` exits 0
- [ ] `cd site && bun test` exits 0; `site/lib/http.test.ts` exists and passes
- [ ] `grep -rn "as unknown as" site/components/config-editor.tsx` returns no matches
- [ ] `grep -c "async function parseJson\|async function responseJson" site/components/*.tsx` returns 0 (helper no longer defined in components)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift since
  `c0ee11c`).
- Importing `FeedbackResponse` from `artifact-feedback.ts` into the reviewer
  pulls a server-only dependency into the client (typecheck/build complains
  about a `node:` module in a client component) — this should not happen given
  the file is pure, but if it does, extract the shared types into a new
  `site/lib/config-types.ts` / keep `FeedbackResponse` in a types-only module
  and report.
- A `bun test` run fails twice after a reasonable fix attempt.
- The change appears to require touching an out-of-scope file.

## Maintenance notes

- **Plan 026** (separate filing from dispatch) adds a new dispatch endpoint
  whose response is `FeedbackResponse`-shaped, and **plan 030** (run lifecycle)
  changes the status-poll response shape. Whoever lands those should import and
  extend the types added here rather than re-declaring them — that is the whole
  point of this plan. Call it out in their review.
- A reviewer should scrutinize that the config-editor still imports the types
  with `import type` (a value import would bloat/break the client bundle) and
  that no runtime guard was dropped from the feedback-response handling.
- Deferred: this plan does not add full schema validation (e.g. zod) at the
  fetch boundary; the guards stay hand-written. Revisit only if a third
  consumer of these responses appears.
