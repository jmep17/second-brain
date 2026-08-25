# Monorepo layout

Type: grilling
Status: open
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
