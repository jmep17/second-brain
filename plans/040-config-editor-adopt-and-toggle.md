# Plan 040: Design the config-editor's "adopt a file" and "skill toggle" verbs

> **Executor instructions**: This is a **design/spike plan**. Your deliverable
> is a written design (request/response shapes, the answered picker question)
> plus **one working prototype** of the `chezmoi add` flow — not a shipped
> feature. You may add prototype code under `site/` **only** if you also gate
> it clearly and do not wire it into the production UI; prefer writing the
> design doc and a throwaway prototype script. Do not create git remotes and do
> not modify `$HOME` outside a disposable prototype path you clean up. Follow
> the steps; if a STOP condition occurs, stop and report. Update this plan's row
> in `plans/README.md` when done.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- site/lib/config-files.ts site/app/config site/app/api/config docs/adr`
> If any changed, compare the "Current state" excerpts against the live code
> before proceeding; on a mismatch treat it as a STOP condition.

## At a glance

- **What**: Design the config editor's "adopt a `$HOME` file into `dotfiles/`" verb and the per-machine skill toggle, and prototype the `chezmoi add` flow.
- **Why**: The editor can edit only one file today and is missing the two verbs the ADRs already specified, so migrating the eight in-scope tools stays a manual chore.
- **Next action**: Step 1 — Settle the open question — free-form picker vs curated list

## Status

- **Priority**: P2
- **Effort**: M (design + one prototype)
- **Risk**: MED — `chezmoi add` writes new source files into `dotfiles/` and an
  over-broad file picker could pull a credential file into git. The design must
  respect ADR 0002 (tool-owned auth files stay unmanaged) and never render
  templates to the browser.
- **Depends on**: `plans/039-config-system-spec.md` (the spec frames these two
  verbs). Coordinate with `plans/029-containment-hardening.md` (it changes
  `resolveSource`'s write rules — the adopt route must respect them) and
  `plans/025`/`plans/026` (origin guard + dispatch-token model — the new
  mutating route must adopt the same protections).
- **Category**: direction
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

The config editor is the product surface the whole config system builds toward,
and today it can edit exactly one file (tmux). It is **missing the two verbs the
ADRs already specified**: "adopt a `$HOME` file into `dotfiles/`" and the
per-machine skill toggle. Without an adopt verb the editor cannot grow past the
files a human hand-copies into `dotfiles/`, so migrating the eight in-scope
tools is a manual chore instead of a UI flow — the adopt button is the cheapest
unlock for finishing the config system (plan 039/D1). The skill toggle is the
one feature that is genuinely two-Mac-specific and has no CLI equivalent the
owner already knows. Both have their plumbing half-built: `resolveSource()`
allow-lists `dotfiles/**` and `isChezmoiMeta()` already special-cases
`.chezmoidata`/`.chezmoiignore`/`run_*` to trigger a full apply — code written
for a `skills.toml` that was never created. This plan designs both verbs and
proves the `chezmoi add` flow with a prototype, so the build plan that follows
has settled shapes.

## Current state

- `site/lib/config-files.ts:13-15` — the tool registry, one entry:
  ```ts
  export const TOOLS: Record<string, { label: string; files: string[] }> = {
    tmux: { label: "tmux", files: ["dot_config/tmux/tmux.conf"] },
  };
  ```
- `site/lib/config-files.ts:22-28` — `resolveSource(rel)` confines paths to
  `dotfiles/**` by lexical containment only (plan 029 tightens this to reject
  `run_*`/script writes and add symlink-safe realpath checks — the adopt route
  must call the tightened resolver, not a copy).
- `site/lib/config-files.ts:38-47` — `isChezmoiMeta(rel)` already returns true
  for `.chezmoidata` paths and `run_*` files, routing those saves to a full
  apply. Built for the skill toggle that does not exist yet.
- `site/lib/config-files.ts:77-79` — `chezmoi(...args)` runs
  `chezmoi --source dotfilesDir ...`; `git(...)` at `:81-83`. Reuse these.
- **API surface today** (`site/app/api/config/`): `file/` (GET read + drift
  state; PUT save → write + `chezmoi apply`), `drift/` (POST adopt/overwrite),
  `git/` (POST commit). Verified with `ls site/app/api/config` → `drift file
git`. **There is no create/add route** — nothing can bring a `$HOME` file
  under management.
- `site/app/config/` — only `[tool]/page.tsx`, `layout.tsx`, `not-found.tsx`
  (verified). No skill-toggle page.
- `site/app/api/config/file/route.ts:31-60` — the PUT save path: parses
  `{path, content, baseHash}`, calls the shared `resolveSource`, rejects stale
  saves by content hash (409). The adopt/toggle routes should mirror this
  structure (shared resolver, exit-code checks, no template rendering).
- `docs/adr/0003` addendum (2026-08-26, chezmoi v2.72.0) — the **verified**
  skill-toggle mechanism is `.chezmoiignore.tmpl` (not-installing) **plus** a
  `run_after_*.sh.tmpl` prune script generated from `.chezmoidata/skills.toml`;
  ignore+remove does **not** work (ignore suppresses remove). Server-driven
  applies need `--no-tty --force --parent-dirs`.
- `docs/adr/0002` — "Only env-var style keys are managed; tools that own their
  credential files (gh, Claude Code) re-login per machine … `~/.config/gh/
hosts.yml` and Claude Code auth stay unmanaged." The adopt picker must not
  pull these in.

## Commands you will need

| Purpose                      | Command                                                                                                  | Expected                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Drift check                  | `git diff --stat c0ee11c..HEAD -- site/lib/config-files.ts site/app/config site/app/api/config docs/adr` | empty / expected                               |
| Typecheck                    | `cd site && bun run typecheck`                                                                           | exit 0 (writes `.next`/tsbuildinfo — expected) |
| Prototype adopt (disposable) | `chezmoi --source /tmp/proto-dotfiles add <a-safe-$HOME-file>`                                           | creates a source entry under the temp dir      |
| Confirm no prod route yet    | `ls site/app/api/config`                                                                                 | `drift file git` (before you design)           |

## Scope

**In scope**:

- `plans/040-...` design content (this file already holds the plan; the design
  _output_ goes into the config-system spec or a short design note — see Step
  4). You may create `site/app/api/config/manage/route.ts` and a skill-toggle
  page **as a prototype only** if you keep them behind a clear
  `// PROTOTYPE — not wired into the UI` marker and do not link them from
  `site/app/config/` navigation.
- A throwaway prototype script or route proving `chezmoi add` works against a
  **temp source dir** (`/tmp/...`), cleaned up after.
- `plans/README.md` status row.

**Out of scope**:

- Shipping the feature into the production config UI (that is the build plan
  this spike unblocks).
- Creating any git remote, the `personal/` submodule, or modifying real
  `dotfiles/` source files under version control.
- `resolveSource` hardening — that is plan 029; here you only _consume_ the
  tightened resolver. If 029 has not landed, design against its stated new
  contract and note the dependency.
- Rendering or sending template (`*.tmpl`) contents to the browser (ADR 0002).

## Git workflow

- Branch: `advisor/040-config-editor-adopt-and-toggle`
- Commit style: lowercase prefix, e.g. `spike: prototype chezmoi add adopt flow`.
- Do NOT push or open a PR.

## Steps

### Step 1: Settle the open question — free-form picker vs curated list

The load-bearing decision: does the "adopt a file" picker let the owner pick
**any** `$HOME` path, or only paths from a **curated per-tool allow-list**?

- Free-form is more useful but risks pulling a credential file into git
  (violates ADR 0002).
- Curated (extend `TOOLS` with candidate `$HOME` paths per tool) is safe but
  limits growth to what's pre-listed.

Recommended answer to adopt unless the spec (plan 039) says otherwise:
**curated per-tool candidates, with an explicit deny-list** (`~/.config/gh/
hosts.yml`, `~/.claude/` auth files, anything matching a secret-file pattern)
enforced server-side, so a future free-form mode can be layered on later. Write
the decision and its rationale into the design output (Step 4). If you cannot
choose confidently from the spec + ADRs, record both options with trade-offs
and escalate — do **not** prototype a free-form picker that can reach a
credential file.

**Verify**: the design output states the chosen picker model and the
server-side deny-list.

### Step 2: Design `POST /api/config/manage` (the adopt verb)

Specify, in the design output:

- **Request**: `{ homePath: string }` (or `{ tool: string, homePath: string }`
  under the curated model) — the `$HOME`-relative path to adopt.
- **Server behaviour**: validate `homePath` against the deny-list and the
  curated allow-list; run `chezmoi --source dotfilesDir add <abs>`; on success,
  the new source file appears under `dotfiles/`; append the tool/file to
  `TOOLS` (or switch `TOOLS` to derive from `chezmoi managed` — note the
  trade-off: a static list is explicit; `chezmoi managed` is self-updating but
  couples the sidebar to chezmoi state). Always check the chezmoi exit code
  (reuse `chezmoi()` from `config-files.ts`, which returns `{code, stdout,
stderr}`).
- **Response**: `{ adopted: string /* new dotfiles-relative path */ }` or
  `{ error }` with the chezmoi stderr; 403 on a denied path.
- **Protections**: the route is state-changing, so it must call the origin
  guard from plan 025 and — if it can promote anything runnable — respect the
  dispatch-token model from plan 026. Never send template contents back.

**Verify**: the design names the request/response shapes, the validation order
(deny-list before allow-list before `chezmoi add`), and the `TOOLS` update
strategy with its trade-off.

### Step 3: Design the skill-toggle page + data flow

Specify:

- A structured page under `site/app/config/` (e.g. `skills/page.tsx`) listing
  skills with a per-machine on/off control.
- Writing `.chezmoidata/skills.toml` (a chezmoi meta file — `isChezmoiMeta`
  already routes it to a full apply) and **regenerating the
  `run_after_*.sh.tmpl` prune script** per the ADR 0003 addendum. The toggle
  does **not** use `.chezmoiremove` (verified broken). chezmoi does the
  deleting, not the UI.
- The save path reuses the existing write→apply flow with
  `--no-tty --force --parent-dirs`.

**Verify**: the design cites the ADR 0003 addendum mechanism explicitly and
states that ignore+remove is rejected.

### Step 4: Write the design output and prototype `chezmoi add`

- Put the two route designs + the picker decision into a design note. Prefer
  appending a "## Config-editor verbs (adopt + toggle)" section to
  `.scratch/config-system/spec.md` if plan 039 has landed; otherwise create
  `.scratch/config-system/design-config-editor-verbs.md`.
- **Prototype**: prove `chezmoi add` works end to end against a **temp source
  dir**, not the repo's `dotfiles/`:
  ```
  mkdir -p /tmp/proto-dotfiles
  printf 'test = 1\n' > /tmp/proto-home-file
  chezmoi --source /tmp/proto-dotfiles add /tmp/proto-home-file
  ls /tmp/proto-dotfiles      # a source entry should appear
  rm -rf /tmp/proto-dotfiles /tmp/proto-home-file
  ```
  Record the observed source filename chezmoi produced (it mangles names, e.g.
  `dot_`, `private_`) — the adopt route's `TOOLS` update must use chezmoi's
  produced name, not the input path. If you build a prototype route instead,
  keep it behind the `// PROTOTYPE` marker and unlinked.

**Verify**: the prototype ran and you recorded the produced source name; the
design output exists (`test -f` on the chosen path).

### Step 5: Confirm no production wiring leaked in

**Verify**:

- `ls site/app/api/config` still shows only `drift file git` **unless** you
  intentionally added a marked prototype route; if you added one,
  `grep -rn "PROTOTYPE" site/app/api/config` finds it and no
  `site/app/config/**` page links to it.
- `cd site && bun run typecheck` exits 0 (if you added any TS).
- `git status` shows only in-scope files.

## Test plan

This is a spike; the test is that the prototype ran and the design is complete.
If you added any prototype TS, it must typecheck. Do **not** add production
tests here — the build plan writes those. Confirm no `*.tmpl` content is read
into any response in the designed routes (grep your design for "template" and
check the rule is stated).

## Done criteria

ALL must hold:

- [ ] The picker question is answered (curated + deny-list recommended) or
      escalated with both options.
- [ ] `POST /api/config/manage` designed: request/response, validation order,
      `TOOLS` update strategy, origin/token protections, no-template rule.
- [ ] Skill-toggle page + `.chezmoidata/skills.toml` + `run_after` prune script
      designed, citing the ADR 0003 addendum; ignore+remove explicitly rejected.
- [ ] `chezmoi add` prototyped against a temp source dir; the produced source
      filename recorded.
- [ ] Design output written (spec section or design note).
- [ ] No production route/page wired into the config UI; `bun run typecheck`
      exits 0 for any added TS; `git status` clean of out-of-scope files.
- [ ] `plans/README.md` row updated.

## STOP conditions

Stop and report if:

- Settling the picker requires a product call you can't ground in the spec/ADRs
  (report both options rather than shipping a free-form picker that can reach a
  credential file).
- The `chezmoi add` prototype behaves differently from the ADR 0003 addendum's
  documented flags/behaviour on the installed chezmoi version — report the
  version and the difference; do not paper over it.
- Plan 029 has changed `resolveSource`'s contract in a way that conflicts with
  the adopt route's needs — reconcile in the design, don't fork a second
  resolver.
- You need a real git remote or a real `dotfiles/` write to finish — that's the
  build plan, not this spike.

## Maintenance notes

- The build plan that follows this spike is where the credential-leak risk
  becomes real: the deny-list must be enforced server-side and tested with an
  attempted adopt of `~/.config/gh/hosts.yml` and a `~/.claude` auth file.
- If `TOOLS` switches to deriving from `chezmoi managed`, the sidebar injection
  in `site/lib/source.tsx` (which reads `TOOLS`) and the docs-for-tool page
  (plan 036 consolidates its vault reads) both depend on that shape — update
  them together.
- Reviewer should scrutinise that the new mutating route carries plan 025's
  origin guard and, if applicable, plan 026's token — a config-write route is
  exactly the surface those plans exist to protect.
