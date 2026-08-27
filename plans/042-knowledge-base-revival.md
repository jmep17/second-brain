# Plan 042: Revive the knowledge-base half — first lint pass + a narrow repo-internal ingest rule

> **Executor instructions**: This plan has two deliverables: (1) run the wiki's
> first `/lint` pass and fix the orphans/cross-links it surfaces, and (2)
> decide and record ONE narrow rule for ingesting repo-internal decisions into
> the wiki. You edit `wiki/**`, `CLAUDE.md`, and `log.md` only. The wiki is
> LLM-owned; `CLAUDE.md` forbids deleting a wiki page without asking — do not
> delete any page. Follow the steps; on a STOP condition, stop and report.
> Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- wiki/ CLAUDE.md log.md`
> If any changed since this plan was written, re-read them and compare against
> "Current state" before proceeding.

## At a glance

- **What**: Run the first `/lint` pass on the wiki and log it, and install one narrow rule so repo-internal decisions start flowing into wiki pages.
- **Why**: `/lint` has never run despite its trigger conditions being present, and decision-shaped content produced daily never reaches `wiki/`, so every future tooling decision re-derives facts the repo already established.
- **Next action**: Step 1 — Run the first `/lint` pass and log it

## Status

- **Priority**: P3
- **Effort**: M (a lint pass is hours; the ingest-rule decision + demonstration
  is the rest of a day)
- **Risk**: LOW — additive wiki edits and one CLAUDE.md convention line; the
  only real risk is over-broad ingest bloating `wiki/` with tooling churn,
  which the narrow rule exists to prevent.
- **Depends on**: none. **Shares** the stale-plugin-page refresh with
  `plans/038-docs-truth-up.md` — see Step 2 (038 owns the version bump; this
  plan owns the cross-linking). If 038 has already refreshed
  `wiki/claude-diagrams-plugin.md`, skip the version edit and only add links.
- **Category**: direction
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

The repo's name and `CLAUDE.md`'s first paragraph say _knowledge base_, but its
git history says _web app_: the wiki half has stopped compounding while the
tooling half accelerates. The `/lint` operation defined in `CLAUDE.md` and
shipped as `.claude/commands/lint.md` has **never run** (`grep -c lint log.md`
= 0), though its conditions are present — 7 of 16 wiki pages have zero inbound
wikilinks, and `wiki/claude-diagrams-plugin.md` carries a superseded version
claim. Meanwhile durable, decision-shaped content is produced daily (3 ADRs, a
dozen artifact pages, 9 resolved config tickets, 20+ plans) and **none of it
reaches `wiki/`** — e.g. the chezmoi v2.72.0 facts verified in the ADR 0003
addendum live only in a `.scratch` ticket, while `wiki/dotfiles-management.md`
(the page the config map tells every ticket to read first) never learned them.
Without a compounding wiki, every future tooling decision re-derives facts the
repo already established. This plan runs the first lint pass and installs one
narrow rule so repo-internal decisions start flowing into the wiki.

## Current state

- `.claude/commands/lint.md` — the `/lint` skill exists and is wired
  (`CLAUDE.md` "Lint (`/lint`)": "contradictions between pages, stale claims …
  orphan pages with no inbound links, concepts mentioned often but lacking
  their own page, missing cross-references … Report findings, propose fixes,
  apply the ones the human approves. Log the pass.").
- `log.md` — `grep -c lint log.md` = 0; the operation has never been logged.
  The last entry is dated 2026-08-26 (see plan 038/F21 — the log itself is a
  day behind; that backfill is 038's job, not this plan's).
- **Orphan pages (0 inbound wikilinks, verified** with
  `for p in wiki pages: grep -l "[[$p" wiki/*.md | grep -v self | grep -v index`):
  `caveman-local-install`, `claude-diagrams-plugin`, `context-reducer-design`,
  `mattpocock-wayfinder-skill`, `qwen38-local-claude-code-codex`,
  `tmux-pane-keybindings`, `ubuntu-development-environment-alternatives`. (Note:
  `wiki/index.md` lists every page by design — "orphan" here means no inbound
  link from another _content_ page, which is what `/lint` looks for.)
- **Page-type distribution** (16 pages): ~12 `answer`, 1 `concept`
  (`dotfiles-management`), 1 `entity` (`claude-diagrams-plugin`), 1
  `source-summary`, 1 `synthesis` (`context-reducer-design`, which calls itself
  "temporary design memory"). The wiki reads as a transcript of one-off queries,
  not the cross-referenced structure `CLAUDE.md` defines.
- `wiki/claude-diagrams-plugin.md` — frontmatter `updated: 2026-08-26`, body
  header "## Moved into second-brain (2026-08-26, **v0.3.0**)"; the plugin ships
  at a much newer version in `.claude-plugin/marketplace.json` (see plan 038).
- `wiki/dotfiles-management.md` — `type: concept`, the page the config map
  designates as required prior reading; it documents the bare-git-repo and
  chezmoi techniques but not the v2.72.0 facts verified in the ADR 0003
  addendum.
- `CLAUDE.md` "### Ingest (`/ingest <path-or-url>`)" — steps 1–7 assume an
  external source path or URL saved into `raw/`. There is **no** notion of
  ingesting a repo-internal decision (an ADR, a resolved ticket) into the wiki.
  That is the gap Step 3 fills.

## Commands you will need

| Purpose                | Command                                                   | Expected                    |
| ---------------------- | --------------------------------------------------------- | --------------------------- |
| Drift check            | `git diff --stat c0ee11c..HEAD -- wiki/ CLAUDE.md log.md` | empty / expected            |
| List orphans           | the orphan-count script below                             | 7 pages at count 0          |
| Confirm lint never ran | `grep -c lint log.md`                                     | `0` (before this plan)      |
| Format check           | `bunx prettier --check wiki/ CLAUDE.md`                   | no error (or run `--write`) |

Orphan-count script (run from the repo root — counts inbound content-page
wikilinks per page, excluding the page itself and `index.md`):

```bash
for p in $(ls wiki | sed 's/\.md$//' | grep -v '^index$'); do
  n=$(grep -l "\[\[$p" wiki/*.md 2>/dev/null \
    | grep -v "wiki/$p.md" | grep -v 'wiki/index.md' | wc -l)
  echo "$n  $p"
done | sort -n
```

## Suggested executor toolkit

- Invoke the `/lint` skill (`.claude/commands/lint.md`) for Step 1 rather than
  hand-rolling the health-check — it encodes the checks `CLAUDE.md` expects and
  the log format.
- The `domain-modeling` skill can help decide the ingest rule's boundary in
  Step 3.

## Scope

**In scope**:

- `wiki/**` — add cross-links, fix stale claims (but see 038 coordination for
  the plugin version), optionally add a missing cross-reference. **No page
  deletions.**
- `CLAUDE.md` — add one narrow repo-internal-ingest rule to the Ingest section.
- `log.md` — one `lint` entry and, if you demonstrate the ingest rule, one
  entry for that.
- `plans/README.md` — status row.

**Out of scope**:

- Deleting or merging away any wiki page (CLAUDE.md ground rule: "Never delete a
  wiki page without asking; prefer merging and leaving a redirect note").
- Rewriting `wiki/index.md`'s structure — it already lists every page exactly
  once (verified by the docs audit); only touch it if a genuinely new page is
  created.
- Backfilling `log.md`'s missing 2026-08-27 entries — that is plan 038/F21.
- The plugin **version** bump in `wiki/claude-diagrams-plugin.md` — that is plan
  038's edit; this plan only adds inbound links to that page. If 038 has not
  landed and the stale version is actively misleading, you may fix it, but note
  the overlap so the two plans don't collide.

## Git workflow

- Branch: `advisor/042-knowledge-base-revival`
- Commits: lowercase prefix, e.g. `lint: first wiki lint pass; cross-link orphans`
  and `wiki: narrow repo-internal ingest rule`.
- Do NOT push or open a PR.

## Steps

### Step 1: Run the first `/lint` pass and log it

Run the `/lint` operation over `wiki/`. It should surface: the 7 orphans, the
stale plugin-version claim, the `answer`-heavy type distribution, and any
contradictions or missing cross-references. Produce the findings list.

**Verify**: you have a concrete findings list naming the 7 orphan pages and the
stale claim. Append a `## [2026-08-27] lint | first wiki health-check` entry to
`log.md` following the existing entry format (`grep "^## \[" log.md | tail -3`
to see the shape), listing what was found and what you fixed.

**Verify**: `grep -c lint log.md` ≥ 1.

### Step 2: Fix orphans by adding real inbound cross-links

For each of the 7 orphan pages, add a genuine `[[page-name]]` wikilink from a
topically-related page where the link actually belongs — do **not** manufacture
a "Related pages" dumping ground just to raise the count. Examples of real
relationships to look for (verify before linking):

- `tmux-pane-keybindings` ↔ a tmux/dotfiles page (`dotfiles-management` or a
  tmux config page).
- `claude-diagrams-plugin` ↔ pages about the Claude Code layer / plugins.
- `qwen38-local-claude-code-codex` ↔ the other `qwen38-*` pages (they already
  cross-link each other; this one was left out).
- `context-reducer-design` ↔ `open-source-local-context-reducers` /
  `caveman-*`.
- `caveman-local-install` ↔ the context-reducer pages.
- `mattpocock-wayfinder-skill` ↔ `mattpocock-skills-workflow`.
- `ubuntu-development-environment-alternatives` ↔ `wsl-terminal-emulators` /
  the qwen/dev-env pages.

If a page genuinely has no honest home, leave it and note in the log why (a
better fix may be a synthesis page — record that as a follow-up, don't force
it).

**Verify**: re-run the orphan-list command; the count-0 set is smaller (ideally
empty). `bunx prettier --check wiki/` passes.

### Step 3: Decide and record ONE narrow repo-internal ingest rule

Add to `CLAUDE.md`'s Ingest section a single, narrow rule for pulling
repo-internal decisions into the wiki. Recommended wording (adjust to fit the
existing prose):

> **Repo-internal ingest**: when an ADR is accepted or a research/design ticket
> under `.scratch/**` is resolved, update the relevant `concept`/`synthesis`
> wiki page with the durable facts it established (not the process, not
> plan-execution churn), add the cross-links, and append a `log.md` entry. Only
> decisions and verified facts qualify — not routine plan status.

The rule must be narrow enough to **exclude** plan-execution noise (commit-by-
commit churn, status flips) — the failure mode is bloating `wiki/` with tooling
transcripts. State that boundary explicitly in the rule.

**Verify**: `grep -ci 'repo-internal\|internal ingest' CLAUDE.md` ≥ 1; the rule
names both what qualifies (accepted ADR / resolved research ticket) and what
does not (plan-execution noise).

### Step 4: Demonstrate the rule on one real example

Apply the new rule once, to prove it works: fold the chezmoi v2.72.0 facts from
the ADR 0003 addendum into `wiki/dotfiles-management.md` (the page the config
map designates as required reading). Add a short section — e.g. "## chezmoi
mechanics (verified v2.72.0)" — capturing the durable facts (ignore suppresses
remove; the `.chezmoiignore.tmpl` + `run_after` prune mechanism; applies need
`--no-tty --force --parent-dirs`), citing the ADR:
`([ADR 0003](../docs/adr/0003-ui-edits-source-then-applies.md))`. Update the
page's `updated:` frontmatter date. Add a `log.md` entry for the ingest.

**Verify**: `grep -ci 'chezmoi\|v2.72' wiki/dotfiles-management.md` shows the
new content; `grep -c 'adr/0003' wiki/dotfiles-management.md` ≥ 1;
`grep "^## \[" log.md | tail -2` shows the ingest entry.

### Step 5: Keep `wiki/index.md` accurate

If Step 4 or Step 2 created any **new** page, add it to `wiki/index.md` under
the right category (CLAUDE.md: every wiki page appears in index.md exactly
once). If you only edited existing pages, index.md needs no change — do not
churn it.

**Verify**: every `wiki/*.md` (except `index.md`) appears exactly once in
`wiki/index.md`:
`for p in $(ls wiki | grep -v '^index.md$' | sed 's/\.md$//'); do c=$(grep -c "\[\[$p\]\]\|($p)" wiki/index.md); echo "$c $p"; done | grep -v '^1 ' || echo "all pages listed once"`.

## Test plan

No code. Verification is the greps in each step:

- `grep -c lint log.md` ≥ 1 (the pass is logged).
- The orphan-count command shows fewer (ideally zero) count-0 pages.
- `CLAUDE.md` has the narrow ingest rule with its exclusion boundary.
- `wiki/dotfiles-management.md` carries the chezmoi addendum facts with an ADR
  citation.
- `bunx prettier --check wiki/ CLAUDE.md` passes.

## Done criteria

ALL must hold:

- [ ] A `## [YYYY-MM-DD] lint | …` entry exists in `log.md` (`grep -c lint
log.md` ≥ 1) listing the findings and fixes.
- [ ] The 7 orphan pages have real inbound cross-links (or the log explains why
      one honestly can't yet).
- [ ] `CLAUDE.md` Ingest section has one narrow repo-internal-ingest rule that
      names both what qualifies and what is excluded.
- [ ] `wiki/dotfiles-management.md` demonstrates the rule with the ADR 0003
      chezmoi facts + citation, and its `updated:` date is bumped; a log entry
      records it.
- [ ] No wiki page deleted; `wiki/index.md` lists every page exactly once.
- [ ] `bunx prettier --check wiki/ CLAUDE.md` passes.
- [ ] No file outside the in-scope list modified; `plans/README.md` row updated.

## STOP conditions

Stop and report (do not improvise) if:

- The `/lint` pass surfaces a **contradiction between pages** that needs an
  owner's call to resolve (CLAUDE.md: note the contradiction, don't silently
  overwrite) — record it and stop rather than guessing which page is right.
- Fixing an orphan would require **deleting or merging** a page — that needs the
  owner's approval (CLAUDE.md ground rule); propose it in the log and stop.
- Plan 038 has already edited `wiki/claude-diagrams-plugin.md` and your change
  would conflict — coordinate (038 owns the version; you own the links) rather
  than reverting its work.
- The ingest-rule boundary can't be drawn narrowly enough to exclude plan noise
  without also excluding real decisions — report the tension; an over-broad rule
  is worse than none.

## Maintenance notes

- The ingest rule is the durable change here; the lint pass is a one-time
  catch-up. Whoever accepts the next ADR or resolves the next research ticket
  should now update the wiki per the rule — watch that this actually happens in
  the next few decisions, or the wiki will drift again.
- A recurring lint (e.g. a periodic `/lint` run) would prevent the orphan
  backlog from re-forming; consider it a follow-up, out of scope here.
- If the `answer`-heavy type distribution persists, a few `synthesis` pages
  (pulling related `answer` pages together) would do more for compounding than
  more cross-links — a natural next step once the ingest rule is feeding the
  wiki.
