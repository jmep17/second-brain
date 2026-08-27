# Plan 039: Write the config-system spec (close ticket 08)

> **Executor instructions**: Follow this plan step by step. This is a
> **spec/design plan**, not a build plan — you are producing one written
> document (`.scratch/config-system/spec.md`) plus small status edits, and you
> must **not** touch `dotfiles/`, `site/`, `$HOME`, git remotes, or any
> machine state. If anything in "STOP conditions" occurs, stop and report — do
> not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer told you they own the index.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- .scratch/config-system/ docs/adr/ CONTEXT.md`
> If any of those changed since this plan was written, re-read them and compare
> against the "Current state" excerpts below before proceeding; on a real
> mismatch, treat it as a STOP condition.

## At a glance

- **What**: Assemble the config system's resolved tickets and accepted ADRs into one implementable spec, closing ticket 08.
- **Why**: The design is fully decided but roughly 0% built, and without a single spec to execute from, its verified facts keep aging with no build to consume them.
- **Next action**: Step 1 — Read every input in full

## Status

- **Priority**: P2
- **Effort**: L overall (the spec-writing step itself is S–M; the build it
  unblocks is the multi-day part and is out of scope here)
- **Risk**: MED — the _eventual build_ touches `$HOME` on a real machine and
  creates a private remote holding personal content; a wrong `.chezmoiignore`
  is a data leak. Writing the spec carries no such risk, but the spec's job is
  to make those steps safe, so get them right.
- **Depends on**: none (all inputs already exist)
- **Category**: direction
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

The config system — one monorepo holding the wiki _and_ the owner's tool
configuration, deployed to a personal Mac and a work Mac — is **fully decided
and roughly 0% built**. Seven design tickets are resolved and three ADRs are
accepted, but on disk there is no `.gitmodules`, no `personal/`, no
`.chezmoidata/`, and `dotfiles/` contains a single file. Every commit dated
2026-08-27 went to the site/artifacts/plugins half instead. The map's stated
destination (`.scratch/config-system/map.md`, "Destination") is _a written
spec_, and ticket 08 is the ticket that produces it. Until 08 is written, the
verified facts in these tickets (e.g. the chezmoi v2.72.0 behaviour in the ADR
0003 addendum) keep aging and the build has no single source to execute from.
This plan closes that gap by assembling the decisions into one implementable
spec.

## Current state

The decision record is complete; the assembly is missing.

- `.scratch/config-system/map.md` — the wayfinder map. Its "Decisions so far"
  section has one line per resolved ticket; its "Not yet specified" section
  lists the concrete items that must land in the spec; "Out of scope" states
  "Building the system itself … the destination is the spec."
- `.scratch/config-system/issues/01`–`07` — all `Status: resolved`. Verified:
  ```
  01-dotfiles-tool.md: Status: resolved      05-secrets.md: Status: resolved
  02-work-exclusions.md: Status: resolved     06-ui-edit-model.md: Status: resolved
  03-ui-runtime.md: Status: resolved          07-ui-prototype.md: Status: resolved
  04-repo-layout.md: Status: resolved
  ```
- `.scratch/config-system/issues/08-spec.md` — `Status: open`, `Blocked by: 04,
05, 07`. Its body: "Assemble all decisions into
  `.scratch/config-system/spec.md`: architecture, repo layout, dotfiles tool,
  secrets, exclusion rules, UI runtime and edit model, per-tool notes. This
  ticket closing means the map is done." All three blockers are now resolved.
- `.scratch/config-system/issues/09-work-memory.md` — `Status: open`,
  `Blocked by: 04`. Decides where the work Mac's Claude auto-memory lives and
  how it is versioned; offers options (a) `work/memory/` plain dir, (b)
  symmetric `personal/`+`work/` submodules, (c) separate work-account repo.
  **This is a genuine open decision** — see Step 4.
- `docs/adr/0001-personal-wiki-is-a-nested-repo.md` — `personal/` is a git
  submodule (private repo) left uninitialised on the work Mac; site must render
  with it empty.
- `docs/adr/0002-secrets-in-keychain.md` — secrets live in macOS Keychain,
  read by chezmoi `{{ keyring }}` templates at apply time; env-var-style keys
  only; tool-owned auth files (gh, Claude Code) stay unmanaged; personal-only
  secrets hostname-gated.
- `docs/adr/0003-ui-edits-source-then-applies.md` — the web UI writes
  `dotfiles/**` then runs `chezmoi apply`; commit is separate; server binds
  `127.0.0.1` unauthenticated. **Read its "Addendum (2026-08-26, prototype
  ticket 07)"** — it supersedes the naive skill-toggle mechanism: a path in
  both `.chezmoiignore` and `.chezmoiremove` is silently _not_ removed (ignore
  wins), so the verified mechanism is `.chezmoiignore.tmpl` (for
  not-installing) **plus** a `run_after_*.sh.tmpl` prune script generated from
  `.chezmoidata/skills.toml`. Server-driven applies need `--no-tty --force`
  (apply prompts on modified targets) and `--parent-dirs` (single-file apply
  fails when the target dir doesn't exist yet).
- `CONTEXT.md` — the shared vocabulary. Names the eight tools in scope (zsh,
  fish, nvim, tmux, ghostty, git, gh, plus the Claude Code layer), and the
  Personal repo / Work repo / Secret / Drift / Save / Commit terms the spec
  must use verbatim.

**Vocabulary to honor** (from `CONTEXT.md` — the spec must use these exact
terms, not synonyms): **Personal Mac** (source of truth, only pusher),
**Work Mac** (pull-only), **Content class**, **Personal wiki** (path-identified
`personal/wiki/`, `personal/raw/` — never a frontmatter flag), **Claude Code
layer**, **Dotfiles source dir** (`dotfiles/`), **Secret**, **Drift**,
**Save**, **Commit**, **Main repo**, **Personal repo**, **Work repo**.

## Commands you will need

| Purpose                  | Command                                                                         | Expected on success                                                   |
| ------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Drift check              | `git diff --stat c0ee11c..HEAD -- .scratch/config-system/ docs/adr/ CONTEXT.md` | empty or only expected changes                                        |
| Read a ticket            | `cat .scratch/config-system/issues/NN-*.md`                                     | ticket text                                                           |
| Confirm nothing is built | `ls .gitmodules personal .chezmoidata dotfiles 2>&1`                            | `.gitmodules`, `personal`, `.chezmoidata` absent; `dotfiles/` present |
| Verify markdown lints    | `bunx prettier --check .scratch/config-system/spec.md`                          | (after write) no error, or run `--write`                              |

There is no test suite for prose. Verification is structural (Step 5).

## Suggested executor toolkit

- The repo ships a `grilling` skill and a `domain-modeling` skill (see
  `.scratch/config-system/map.md` "Skills to consult"). Ticket 08 is a
  `grilling` ticket. If those skills are available, use `domain-modeling` to
  keep the spec's terms aligned with `CONTEXT.md`. They are optional — the spec
  can be written from the tickets directly.

## Scope

**In scope** (the only files you may create or modify):

- `.scratch/config-system/spec.md` (create)
- `.scratch/config-system/issues/08-spec.md` (status edit + resolution note)
- `.scratch/config-system/map.md` (mark ticket 08 done in "Decisions so far")
- `plans/README.md` (your status row)

**Out of scope** (do NOT touch, even though the spec describes them):

- `dotfiles/**`, `site/**`, `CONTEXT.md`, `docs/adr/**` — the spec _references_
  these; it does not edit them. Any CONTEXT.md/ADR change the spec implies is a
  follow-up, not part of writing the spec.
- `$HOME`, git remotes, `chezmoi` — run **no** command that mutates a machine.
  Do not run `chezmoi add`, `chezmoi apply`, `git submodule add`, or create any
  remote. This plan writes a document about doing those things later.
- Ticket 09 (work-memory) — you may _reference_ its open question in the spec
  and recommend an option, but do not mark it resolved; it is a separate
  decision (see Step 4).

## Git workflow

- Branch: `advisor/039-config-system-spec`
- One commit is fine; message style lowercase-prefixed like the repo's log
  (e.g. `spec: assemble config-system spec, close ticket 08`).
- Do NOT push or open a PR.

## Steps

### Step 1: Read every input in full

Read all seven resolved tickets, the three ADRs (including the 0003 addendum),
`map.md`, and `CONTEXT.md`. Also read `wiki/dotfiles-management.md` and
`wiki/claude-code-memory-plan-locations.md` (the map says "read before any
ticket — prior research already lives there").

**Verify**: you can state, in one sentence each, the decision made in tickets
01–07. If you cannot, re-read before writing.

### Step 2: Write `.scratch/config-system/spec.md`

Assemble the decisions into one spec with these sections (the ticket names the
required contents: "architecture, repo layout, dotfiles tool, secrets,
exclusion rules, UI runtime and edit model, per-tool notes"):

1. **Architecture overview** — one monorepo (`second-brain`) holding the wiki
   and the tool config, deployed to Personal Mac (source of truth) and Work Mac
   (pull-only). Cite ADR 0001/0002/0003.
2. **Repo layout** (from ticket 04): `personal/` submodule holding
   `wiki/ raw/ memory/ log.md`; `dotfiles/` chezmoi source dir mirroring
   `$HOME` with the Claude Code layer at `dotfiles/dot_claude/`; two logs.
3. **Dotfiles tool** (ticket 01): chezmoi; templated per-host; UI saves then
   `chezmoi apply`.
4. **Secrets** (ticket 05 / ADR 0002): Keychain via `{{ keyring }}`; env-var
   keys only; tool-owned auth files unmanaged; personal-only secrets
   hostname-gated. **List the required Keychain secrets per host by credential
   TYPE and service name only — never a secret value** (map.md: "Bootstrap doc
   must list required Keychain secrets per host, entered before first apply").
5. **Exclusion rules** (ticket 02 / ADR 0001): only the personal-wiki content
   class is excluded, by path, via the nested private repo; Work Mac uses a
   read-only deploy key and pushes its own edits to the Work repo.
6. **UI runtime + edit model** (tickets 03/06 / ADR 0003): localhost Next.js
   server with a file API + dynamic Fumadocs source; write `dotfiles/**` then
   `chezmoi apply`; separate commit; drift via `chezmoi diff` + re-add/apply;
   **skill toggle via `.chezmoiignore.tmpl` + `run_after` prune script (NOT
   ignore+remove — cite the ADR 0003 addendum)**; applies run
   `--no-tty --force --parent-dirs`; saves refused while the target is drifted
   (re-checked server-side at save time); adopt refused for templates; chezmoi
   and git exit codes always checked.
7. **Per-tool notes** — one line per tool in scope (zsh, fish, nvim, tmux,
   ghostty, git, gh, Claude Code layer). Flag nvim's open question from map.md
   ("config dir is empty — is nvim actually used?").
8. **The `tool:` frontmatter convention** — map.md defers to ticket 08 the
   decision to add a `tool:` field on wiki pages linking docs to a tool in the
   UI, and to document it in `CLAUDE.md`. Record the convention in the spec
   (the CLAUDE.md edit itself is a follow-up build task).

Every claim traces to a ticket or ADR — cite them inline
(`(ticket 04)`, `(ADR 0003 addendum)`).

**Verify**: `test -f .scratch/config-system/spec.md && wc -l .scratch/config-system/spec.md`
→ file exists, non-trivial length. Each of the 8 sections is present
(`grep -c '^## ' .scratch/config-system/spec.md` ≥ 8).

### Step 3: Propose the build-plan sequence (list only, do not write them)

At the end of the spec, add a "## Build sequence" section listing the
per-map-task build plans that should follow, in dependency order, drawn from
map.md "Not yet specified":

1. Create `dotfiles/` from `$HOME` via `chezmoi add` for the eight tools
   (turns `dotfiles/` from a one-file stub into the real source).
2. Create the `personal/` submodule remote + move personal-sensitive pages into
   it; create the Work-account repo and the Work Mac's read-only deploy key;
   confirm the Work Mac can clone main but not the nested repo.
3. Bootstrap doc / install script (fresh machine → configured), listing the
   per-host Keychain secrets to enter before first apply.
4. The Claude Code layer slice — **note that `plans/021` already covers this**;
   reference it rather than duplicating.

Do **not** write these build plans in this task — only list them with a
one-line scope and their dependencies.

**Verify**: `grep -c '^## Build sequence' .scratch/config-system/spec.md` = 1.

### Step 4: Handle the work-memory open question (ticket 09)

Ticket 09 is a real unresolved decision (where the Work Mac's auto-memory lives:
option a/b/c in its body). Do **not** resolve it. In the spec's exclusion-rules
or per-tool section, add a short "Open: work memory (ticket 09)" note
summarising the three options and **recommending one** with a one-sentence
rationale (option (a) `work/memory/` is the lightest — a plain dir committed
only to the Work repo — unless the symmetry of (b) is wanted). Leave the actual
decision to the owner.

**Verify**: `grep -ci 'ticket 09\|work memory' .scratch/config-system/spec.md` ≥ 1.

### Step 5: Mark ticket 08 resolved and update the map

- In `.scratch/config-system/issues/08-spec.md`, change `Status: open` to
  `Status: resolved` and append a one-line note under the question pointing to
  `.scratch/config-system/spec.md`.
- In `.scratch/config-system/map.md`, add a "Decisions so far" bullet for
  ticket 08 (gist + link), matching the existing one-line-per-ticket format.

**Verify**:
`grep -m1 'Status:' .scratch/config-system/issues/08-spec.md` → `Status: resolved`;
`grep -c '08-spec' .scratch/config-system/map.md` ≥ 1.

## Test plan

No code, so no unit tests. Structural verification:

- `bunx prettier --check .scratch/config-system/spec.md` passes (or run
  `--write` and commit the formatted file — the repo's lint-staged formats on
  commit anyway).
- The spec has all 8 content sections + a Build sequence section (the greps in
  Steps 2–3).
- No secret value appears in the spec:
  `grep -nE '(sk-|ghp_|AKIA|-----BEGIN|password\s*=)' .scratch/config-system/spec.md`
  returns nothing.

## Done criteria

ALL must hold:

- [ ] `.scratch/config-system/spec.md` exists with the 8 content sections + a
      Build sequence section.
- [ ] Every section's claims cite a ticket or ADR; the skill-toggle mechanism
      cites the ADR 0003 addendum (ignore + `run_after`, not ignore+remove).
- [ ] Secrets are named by type/service only; the secret-scan grep is empty.
- [ ] `.scratch/config-system/issues/08-spec.md` is `Status: resolved` with a
      pointer to the spec.
- [ ] `map.md` has a ticket-08 "Decisions so far" line.
- [ ] Ticket 09 is referenced with a recommendation but left unresolved.
- [ ] No file outside the in-scope list is modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report (do not improvise) if:

- A ticket's resolution **contradicts** an ADR (e.g. a ticket says push-on-save
  but ADR 0003 says commit is separate). Report the drift; the doc or the code
  is wrong and the owner must decide — do not silently pick one.
- You find yourself needing to run `chezmoi`, create a remote, or write under
  `dotfiles/`/`$HOME` to complete the spec. The spec is a document; if it can't
  be written without mutating a machine, the plan is mis-scoped — report.
- Ticket 09's decision turns out to block the spec (it should not — the spec
  can carry it as an open item).

## Maintenance notes

- The eventual build plans (Step 3 list) are where the MED risk lives: the
  `chezmoi add` migration and the `personal/` submodule creation touch `$HOME`
  and create a private remote with personal content. Whoever writes those plans
  must make the destructive steps explicit and separately authorized, and must
  verify the Work Mac cannot fetch the personal repo _before_ any personal page
  moves into it.
- If `CONTEXT.md`'s "Commit" term still says commit "pushes to the machine's
  remote" while `site/app/api/config/git/route.ts` scopes push out (it does —
  see plan 038/F20), the spec should note that contradiction so the build
  reconciles it rather than inheriting it.
- This spec is the input to plans 040 (config-editor adopt/toggle) and 021
  (Claude Code layer install runbook); keep it the single source those cite.
