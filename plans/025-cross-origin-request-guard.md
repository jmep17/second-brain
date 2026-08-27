# Plan 025: Reject cross-origin and DNS-rebinding requests on every state-changing localhost route

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c0ee11c..HEAD -- site/app/api site/lib site/next.config.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## At a glance

- **What**: Add a guard so mutating localhost routes are honored only when a request demonstrably originates from the owner's own localhost session.
- **Why**: An unauthenticated cross-origin POST or a DNS-rebinding attack can currently trigger dotfile commits, a forced `chezmoi apply`, and agent-authorizing issue filing.
- **Next action**: Step 1 — Add the `assertLocalRequest` helper

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/024-verification-baseline.md (needs the `bun test` runner it adds)
- **Category**: security
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

The site's write APIs run unauthenticated on `127.0.0.1` — by design (ADR
0003 says "the server binds `127.0.0.1` only; it runs unauthenticated as the
user"). That decision assumes **only the owner talks to it**. Two things break
that assumption without any auth bypass: (1) a web page the owner visits in the
same browser can send a cross-origin `POST` to `http://127.0.0.1:<port>/...`
— browsers permit "simple" cross-origin POSTs (e.g. `Content-Type: text/plain`)
with no preflight, and `Request.json()` parses the body regardless of
`Content-Type`, so the side effect runs even though the browser hides the
response from the attacker page; (2) DNS rebinding points an attacker hostname
at `127.0.0.1`, defeating the loopback bind entirely. These routes commit
dotfiles, run `chezmoi apply --force` against `$HOME`, and (until plan 026)
file agent-authorizing issues. This plan adds one guard so a request is
honored only when it demonstrably originates from the owner's own localhost
session. It is the delivery-vector fix that makes the plan-026 dispatch
split meaningful.

## Current state

Files and their role:

- `site/app/api/artifacts/feedback/route.ts` — `POST` files a feedback issue
  (and, today, may dispatch an agent run). No header check.
- `site/app/api/config/git/route.ts` — `POST` runs `git add` + `git commit`
  on `dotfiles/**`. No header check.
- `site/app/api/config/drift/route.ts` — `POST` runs `chezmoi re-add` or
  `chezmoi apply`. No header check.
- `site/app/api/config/file/route.ts` — `PUT` runs `fs.writeFile` + `chezmoi
  apply`. No header check. (Its `GET` is read-only — leave it alone.)
- `site/next.config.mjs` — no `allowedDevOrigins`.
- There is **no** `site/middleware.ts` (confirmed absent). Nothing gates
  these routes centrally.

Every handler starts the same way — read the body immediately, no header
inspection:

```ts
// site/app/api/artifacts/feedback/route.ts:18-24
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed JSON body" }, { status: 400 });
  }
```

```ts
// site/app/api/config/git/route.ts:35-38
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
```

```ts
// site/app/api/config/drift/route.ts:14-17
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
```

```ts
// site/app/api/config/file/route.ts:31-34
export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
```

Conventions to match:

- Handlers return `NextResponse.json({ error: "..." }, { status: N })` for
  failures. Use `403` for a rejected origin.
- `NextRequest` (from `next/server`) exposes headers via
  `req.headers.get("origin")`, `req.headers.get("referer")`,
  `req.headers.get("host")`. Server bind is `127.0.0.1` (see
  `site/package.json` `dev`/`start` scripts use `-H 127.0.0.1`).
- Tests in this repo use `bun:test`. There is exactly one existing example,
  `site/lib/artifact-feedback.test.ts` — model new tests on its
  `describe`/`test`/`expect` structure. Note it opens with
  `// @ts-nocheck` and `import { describe, expect, test } from "bun:test"`;
  plan 024 removes that `@ts-nocheck` and adds `@types/bun`, so write new
  tests **without** `@ts-nocheck`.

ADR constraint to honor (`docs/adr/0003-ui-edits-source-then-applies.md`):
"The server binds `127.0.0.1` only; it runs unauthenticated as the user."
This plan does not change that; it enforces the assumption the ADR already
relies on. Reference the ADR in a code comment on the new helper.

## Commands you will need

| Purpose   | Command                                   | Expected on success       |
|-----------|-------------------------------------------|---------------------------|
| Typecheck | `cd site && bun run typecheck`            | exit 0, no errors (writes `.next/`, `tsconfig.tsbuildinfo` — expected) |
| Unit test | `cd site && bun test lib/request-origin`  | all pass                  |
| Full verify | `bun run verify` (added by plan 024)    | exit 0                     |
| Plugin gate | `bash tools/check-plugins.sh`           | `all checks passed`       |

## Scope

**In scope** (the only files you should modify):

- `site/lib/request-origin.ts` (create)
- `site/lib/request-origin.test.ts` (create)
- `site/app/api/artifacts/feedback/route.ts`
- `site/app/api/config/git/route.ts`
- `site/app/api/config/drift/route.ts`
- `site/app/api/config/file/route.ts`

**Out of scope** (do NOT touch, even though they look related):

- The `GET` handlers in `config/file/route.ts` and `config/git/route.ts`,
  and the read-only `GET` in `artifacts/feedback/status/route.ts` and
  `artifacts/view/[...file]/route.ts` — reads are not state-changing; guarding
  them would break the artifact `<iframe>` and the review-tray poll.
- The request body parsing/validation logic itself — this plan only adds a
  header check *before* parsing.
- `site/lib/artifact-feedback.ts` and `dispatchRun` — the agent-run
  authorization split is plan 026's job; do not change dispatch behavior here.

## Git workflow

- Branch: `advisor/025-cross-origin-request-guard`
- Commit per logical unit (helper+test, then the four route wirings).
  Conventional lowercase prefixes, matching `git log` (e.g.
  `security: reject cross-origin requests on mutating routes`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the `assertLocalRequest` helper

Create `site/lib/request-origin.ts`:

```ts
import type { NextRequest } from "next/server";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

/** Hostname of a URL-ish header value, or null when unparseable/absent. */
function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

/** Bare host (strip :port) of a Host header, or null. */
function hostHeaderName(value: string | null): string | null {
  if (!value) return null;
  // Host may be "127.0.0.1:3000" or "[::1]:3000".
  const m = value.match(/^(\[[^\]]+\]|[^:]+)/);
  return m ? m[1] : null;
}

/**
 * True when the request demonstrably originates from the owner's own
 * localhost session. Enforces the ADR 0003 assumption that "only the owner
 * talks to it" against same-browser cross-origin POSTs and DNS rebinding.
 *
 * - If Origin (or, fallback, Referer) is present, its host must be loopback.
 *   A cross-origin browser request always carries a foreign Origin here.
 * - The Host header must be a loopback name (kills DNS rebinding, where the
 *   attacker hostname resolves to 127.0.0.1 but Host is the attacker domain).
 * - A missing Origin AND missing Referer is allowed (non-browser clients like
 *   curl and the Playwright harness send neither) — but the Host check still
 *   applies.
 */
export function isLocalRequest(req: NextRequest): boolean {
  const host = hostHeaderName(req.headers.get("host"));
  if (!host || !LOOPBACK_HOSTS.has(host)) return false;

  const originHost =
    hostOf(req.headers.get("origin")) ?? hostOf(req.headers.get("referer"));
  if (originHost !== null && !LOOPBACK_HOSTS.has(originHost)) return false;

  return true;
}
```

**Verify**: `cd site && bun run typecheck` → exit 0, no errors.

### Step 2: Guard the four mutating handlers

In each of the four handlers, as the **first** statement inside the function
(before `req.json()`), add:

```ts
import { isLocalRequest } from "@/lib/request-origin";
// ...
  if (!isLocalRequest(req)) {
    return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  }
```

Apply to: `feedback/route.ts` `POST`, `config/git/route.ts` `POST`,
`config/drift/route.ts` `POST`, `config/file/route.ts` `PUT`. Each already
imports `NextResponse` and receives `req: NextRequest` — confirm the import
line exists; `config/drift` and `config/file` receive `req` already.

**Verify**: `cd site && bun run typecheck` → exit 0. Then
`grep -rn "isLocalRequest" site/app/api` → exactly 4 call sites plus 4 imports.

### Step 3: Add unit tests for the helper

Create `site/lib/request-origin.test.ts`, modeled on
`site/lib/artifact-feedback.test.ts`'s structure. Construct requests with a
minimal `NextRequest`-shaped stub or the real `NextRequest` (whichever
typechecks — `new NextRequest("http://127.0.0.1:3000/x", { headers: {...} })`
works). Cover:

- **rejected foreign Origin**: Host `127.0.0.1:3000`, Origin
  `https://evil.example` → `false`.
- **accepted same-origin**: Host `127.0.0.1:3000`, Origin
  `http://127.0.0.1:3000` → `true`.
- **accepted localhost**: Host `localhost:3000`, Origin `http://localhost:3000`
  → `true`.
- **accepted null-Origin + loopback Host** (curl/Playwright): Host
  `127.0.0.1:3000`, no Origin, no Referer → `true`.
- **rejected foreign Host** (DNS rebinding): Host `attacker.example`, no
  Origin → `false`.
- **Referer fallback**: no Origin, Referer `https://evil.example/page`, Host
  loopback → `false`.

**Verify**: `cd site && bun test lib/request-origin` → all pass (6+ tests).

### Step 4: Full gate

**Verify**: `bun run verify` (from repo root) → exit 0, and
`bash tools/check-plugins.sh` → `all checks passed`.

## Test plan

- New file `site/lib/request-origin.test.ts` with the six cases in Step 3.
- Structural pattern: `site/lib/artifact-feedback.test.ts`.
- Verification: `cd site && bun test lib/request-origin` → all pass.
- Manual smoke (optional, not a gate): with `bun run dev` up,
  `curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:3000/api/config/git -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -d '{}'`
  → `403`; the same without `-H 'Origin: ...'` → not 403 (reaches body
  parsing). Confirm the Playwright harness `site/scripts/test-artifact-review.mjs`
  still passes (it drives the browser same-origin, so it should).

## Done criteria

- [ ] `cd site && bun run typecheck` exits 0
- [ ] `cd site && bun test lib/request-origin` passes with ≥6 tests
- [ ] `grep -rn "isLocalRequest" site/app/api` shows 4 guarded handlers
      (feedback POST, config/git POST, config/drift POST, config/file PUT)
- [ ] `bun run verify` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The four handlers no longer match the excerpts in "Current state" (drift).
- A `site/middleware.ts` now exists — the guard may belong there instead;
  report rather than adding a second enforcement point.
- The Playwright harness (`site/scripts/test-artifact-review.mjs`) starts
  failing with a 403 after Step 2 — it means the browser is sending a Host
  the check rejects; report the actual Host/Origin it sends rather than
  loosening the check blindly.
- Enforcing the Host check breaks legitimate local access via a hostname you
  discover the owner actually uses (e.g. a custom `/etc/hosts` alias) — report
  it so the loopback set can be widened deliberately.

## Maintenance notes

- If a future feature needs to be reachable from a non-loopback origin (e.g.
  a LAN device), this guard must be revisited deliberately, not loosened
  casually — it is the sole cross-origin defense.
- Plan 026 (separate filing from dispatch) builds its single-use-token flow on
  top of this guard; the token GET/POST endpoints must also pass
  `isLocalRequest`.
- Plan 027's CSP on served artifacts is defense-in-depth for the same threat
  (an artifact script trying to reach these APIs) — this guard and that CSP
  are complementary, not redundant.
- A reviewer should scrutinize: that no read-only GET was accidentally guarded
  (which would break the iframe or the poll), and that the null-Origin escape
  hatch is paired with the Host check (never allow null-Origin + foreign Host).
