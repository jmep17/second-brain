---
title: "How to Store Dotfiles - A Bare Git Repository"
type: source-summary
created: 2026-08-25
updated: 2026-08-25
sources: [raw/How to Store Dotfiles - A Bare Git Repository.md]
---

Atlassian tutorial (attributed to a technique by HN user `StreakyCobra`) on tracking dotfiles with a bare git repo instead of symlink managers. ([source](../raw/How to Store Dotfiles - A Bare Git Repository.md))

## Key claims

- No extra tooling, no symlinks needed. Files stay in place in `$HOME` and are tracked directly.
- Setup:
  ```
  git init --bare $HOME/.cfg
  alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
  config config --local status.showUntrackedFiles no
  ```
  The `config` alias replaces `git` for all dotfile operations, keeping it separate from any other repo in `$HOME` subdirectories.
- `showUntrackedFiles no` is required — otherwise `config status` lists every untracked file in `$HOME`.
- New-machine install: `git clone --bare <repo-url> $HOME/.cfg`, define the alias, then `config checkout`.
- Checkout commonly fails on a fresh machine because stock dotfiles (e.g. `.bashrc`) already exist and would be overwritten. Fix: back them up first, then re-run checkout.
  ```
  mkdir -p .config-backup && \
  config checkout 2>&1 | egrep "\s+\." | awk {'print $1'} | \
  xargs -I{} mv {} .config-backup/{}
  ```
- Author packaged both flows (init and install) as one-line curl-to-bash scripts hosted as Bitbucket snippets.

## Gaps / not covered by source

- No mention of secret handling (e.g. accidentally committing `.ssh/config`, API keys in shell rc files). Researched separately — see [[dotfiles-management]] (bare-git-repo secret handling is discipline-only, no automated exclusion).
- No mention of multi-machine branching workflow in practice (source claims it's possible, doesn't demonstrate it).
- `showUntrackedFiles no` is a local (per-clone) git config flag — must be re-set on every new machine, not carried by the repo itself.

## Related

- [[dotfiles-management]]
