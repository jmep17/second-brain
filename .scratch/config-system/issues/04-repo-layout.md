# Monorepo layout

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

Given the dotfiles tool and the exclusion classes, decide the directory layout of the expanded repo: where config sources live (e.g. `config/<tool>/`), where the wiki stays, where the site lives, and how the dotfiles tool maps repo paths to `$HOME`. Also: does the repo keep the name `second-brain` or get a new name? Record as an ADR if it meets the bar.

## Comments

### 2026-08-25 grilling round 1–2

- Q1 nesting mechanism: submodule (versioned gitlink; deploy key blocks init on work). User accepted after explanation.
- Q2 one personal repo at root `personal/` holding `wiki/`, `raw/`, `memory/`, `log.md` (option b). Requires updating ADR 0001 + CONTEXT.md paths from `wiki/personal/` to `personal/wiki/`.
- Q3 `dotfiles/` at repo root = chezmoi source dir, mirroring `$HOME` in chezmoi naming. Accepted.
- Q4 Claude Code layer inside `dotfiles/dot_claude/`, copied to `~/.claude` by `chezmoi apply`. Accepted; two-way drift (edits made in `~/.claude`) goes to ticket 06.
- Q5 personal Mac auto-memory → `personal/memory/`. Work memory must also be tracked — split into ticket 09.
- Q6 two logs: main `log.md` shared only, `personal/log.md` for personal ops. Accepted.
- Q7 keep name `second-brain`. Accepted.

Pending: Q8 work-only content class (moved into 09), then resolve.

## Answer

Repo keeps the name `second-brain`. Layout:

```
second-brain/
  personal/          # git submodule -> private repo (personal GitHub), initialised on the personal Mac only
    wiki/            # personal pages + personal/wiki/index.md
    raw/             # personal sources
    memory/          # Claude auto-memory on the personal Mac (autoMemoryDirectory)
    log.md           # log of personal ingests
  wiki/              # shared wiki (unchanged)
  raw/               # shared sources (unchanged)
  dotfiles/          # chezmoi source dir, mirrors $HOME in chezmoi naming
    dot_zshrc.tmpl
    dot_config/fish/…  dot_config/tmux/…  dot_config/nvim/…  dot_config/ghostty/…
    dot_gitconfig.tmpl  dot_config/gh/…
    dot_claude/      # settings.json.tmpl, CLAUDE.md, skills/, hooks/
  site/              # unchanged
  docs/  plans/  .scratch/  log.md  CLAUDE.md  CONTEXT.md   # shared, unchanged
```

Decisions:

- **Nesting mechanism: git submodule** at `personal/`. The gitlink is versioned in main; the work Mac's read-only deploy key cannot fetch the personal repo even if `git submodule update --init` is run (research 02 §C). Pointer bumps after personal commits are optional; the UI may automate them (ticket 06).
- **One personal repo**, not two. Paths move from `wiki/personal/`, `raw/personal/` to `personal/wiki/`, `personal/raw/`. ADR 0001 and CONTEXT.md updated accordingly.
- **chezmoi**: `sourceDir = ~/second-brain/dotfiles`, `workingTree = ~/second-brain` (research 01). `chezmoi apply` copies files into `$HOME`; UI save = write source file then apply. Edits made directly in `$HOME` are a two-way problem for ticket 06.
- **Claude Code layer** lives in `dotfiles/dot_claude/` and reaches `~/.claude/` like any other tool. Only listed files are managed; `~/.claude` machine state (history, sessions, cache) is untouched.
- **Auto-memory**: personal Mac sets `autoMemoryDirectory` to `~/second-brain/personal/memory/` via the templated settings.json. Work Mac: ticket 09.
- **Two logs**: root `log.md` records shared operations only; `personal/log.md` records personal ones, so page titles never leak to work.

Consequences for other tickets:

- Site `include` globs must cover `personal/wiki/**` and `personal/raw/**` and tolerate the directory being empty (ticket 06/07).
- Bootstrap must `git submodule update --init` on the personal Mac only.
- Existing files under `wiki/` that are personal-sensitive must be moved into the submodule during migration (task, not yet ticketed).
