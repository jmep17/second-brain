---
title: Dotfiles Management
type: concept
created: 2026-08-25
updated: 2026-08-25
sources: [raw/How to Store Dotfiles - A Bare Git Repository.md]
---

Techniques for version-controlling personal config files (shell rc files, editor configs, etc.) across machines.

## Bare git repo technique

Track `$HOME` directly with a bare git repo and a shell alias, avoiding symlinks entirely. Detailed in [[dotfiles-bare-git-repo]].

- `git init --bare $HOME/.cfg` + `alias config='git --git-dir=$HOME/.cfg/ --work-tree=$HOME'`
- Must set `status.showUntrackedFiles no` locally on every clone or `config status` is unusable.
- Migrating to a new machine requires backing up pre-existing stock dotfiles before `config checkout` succeeds.

## Open questions

- How to keep secrets (SSH keys, API tokens in rc files) out of a repo that tracks all of `$HOME`? Not addressed in the source ingested so far — flag for future research if adopting this.
- Alternative approaches (GNU Stow, chezmoi, symlink farms) not yet researched here.

## Sources

- [[dotfiles-bare-git-repo]]
