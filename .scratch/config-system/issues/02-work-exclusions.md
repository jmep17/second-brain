# What content must stay off the work machine

Type: grilling
Status: resolved
Blocked by: —

## Question

Define the classes of content in the monorepo and which are excluded on the work laptop. Candidates: personal wiki pages (`wiki/`, `raw/`), secrets, personal Claude Code skills/memory, personal git identity. Is exclusion a _directory_ boundary (easy: sparse checkout / separate clone) or _per-file_ (harder: needs a tool with ignore rules)? Also: does the work machine push changes back (two-way) or only pull?

Output: a written list of content classes with an in/out flag per machine, and the granularity of exclusion.

## Comments

### 2026-08-25 grilling round 1 (in progress)

- Q1 wiki on work: off the work machine (user: "keep personal notes off the work PC"). Whether "off disk" includes `.git` objects — pending research.
- Q2 direction: work machine pulls only, never pushes to the main repo. User also wants the work machine to be its own repo that can still pull updates from the main one (fork-with-upstream shape).
- Q3 Claude Code layer: skills + hooks + CLAUDE.md in; auto-memory out; settings.json in minus secrets. Confirmed.
- Q4 git identity: per-machine email template. Confirmed.
- Q5 secrets: rule "no secret bytes in git, either machine." Confirmed; mechanism is ticket 05.
- Q7 web UI on work: yes, same UI, dotfiles only. Confirmed.
- Research spawned: research/02-work-exclusions.md (sparse/partial clone, deploy keys, chezmoi ignore, encryption).

### 2026-08-25 grilling round 2–3

- Q1 revised: shared wiki IS wanted at work; only personal-sensitive pages (health/ADHD/etc.) are excluded.
- Q8 work-side remote: private repo under the user's **work** GitHub account. Employer-visible; nothing personal may ever land there.
- Q9: work tracks everything except the personal class.
- Q10: all skills shared, but the UI gets a per-machine enable/disable toggle; work starts with all off. Requirement passed to ticket 06.
- Q11/Q12: personal pages live under one root `wiki/personal/<topic>/<title>.md` (+ `raw/personal/`), which is a nested private repo — research showed sparse/partial checkout leaves bytes in `.git`.

## Answer

### Content classes

| Class              | Examples                                                                      | Personal Mac                                                                 | Work Mac                                                                           |
| ------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Dotfiles           | zsh, fish, nvim, tmux, ghostty, git, gh                                       | in                                                                           | in                                                                                 |
| Claude Code layer  | settings.json (minus secrets), CLAUDE.md, skills, hooks                       | in                                                                           | in; skills all present, all **disabled** by default, toggled per machine in the UI |
| Site               | `site/`                                                                       | in                                                                           | in                                                                                 |
| Shared wiki        | `wiki/<topic>/…`, `raw/…`, `wiki/index.md`                                    | in                                                                           | in                                                                                 |
| Personal wiki      | `wiki/personal/<topic>/<title>.md`, `raw/personal/`, `wiki/personal/index.md` | in                                                                           | **out — bytes never on disk**                                                      |
| Claude auto-memory | `autoMemoryDirectory` target                                                  | in (redirect into `wiki/personal/memory/` or keep machine-local — ticket 04) | out                                                                                |
| Git identity       | `~/.gitconfig` user.email                                                     | personal email                                                               | work email (per-machine template)                                                  |
| Secrets            | tokens in settings.json, shell exports                                        | never in git                                                                 | never in git (mechanism: ticket 05)                                                |

### Granularity

Path boundary, one root per excluded class: `wiki/personal/` and `raw/personal/` (may be one nested repo containing both, layout decided in ticket 04). The path is the flag; no frontmatter visibility field. `wiki/index.md` lists shared pages only; `wiki/personal/index.md` indexes personal pages. Wikilinks from shared into personal pages dangle at work — accepted.

Why a nested repo and not sparse checkout: sparse and partial clone leave personal blobs in `.git` (partial clone fetches them silently on `git log -p`/`git grep`); an uninitialised submodule / hostname-gated chezmoi external leaves nothing. See [research](../research/02-work-exclusions.md).

### Sync topology

- Main repo `jmep17/second-brain` (personal GitHub, private): source of truth. Personal Mac pushes here.
- Personal nested repo (personal GitHub, private): pushed from personal Mac only; never referenced with credentials on work.
- Work Mac: clones main with a **read-only deploy key** (server-side) and `git remote set-url --push origin no_push` (client-side). Pull only. Its own edits commit locally and push to a private repo under the **work GitHub account** as a second remote. Write-back to main, if ever wanted: patches or a PR from that repo, applied on personal Mac.

### Handed to other tickets

- 04 repo layout: exact nested-repo mechanism (submodule vs chezmoi external), where auto-memory goes, whether `raw/personal` shares the nested repo.
- 05 secrets: mechanism for the "never in git" rule.
- 06 UI edit model: per-machine skill toggle; site must render with `wiki/personal/` absent.
