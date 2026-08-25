---
title: Dotfiles Management
type: concept
created: 2026-08-25
updated: 2026-08-25
sources:
  [
    raw/How to Store Dotfiles - A Bare Git Repository.md,
    raw/eshlox-dotfiles-bare-git-repo-secrets.md,
    raw/chezmoi-design-faq.md,
  ]
---

Techniques for version-controlling personal config files (shell rc files, editor configs, etc.) across machines.

## Bare git repo technique

Track `$HOME` directly with a bare git repo and a shell alias, avoiding symlinks entirely. Detailed in [[dotfiles-bare-git-repo]].

- `git init --bare $HOME/.cfg` + `alias config='git --git-dir=$HOME/.cfg/ --work-tree=$HOME'`
- Must set `status.showUntrackedFiles no` locally on every clone or `config status` is unusable.
- Migrating to a new machine requires backing up pre-existing stock dotfiles before `config checkout` succeeds.
- Secret handling: no automated exclusion. Discipline-only — never `config add` a file containing secrets (SSH keys, API tokens, `.env`). Repo tracks explicitly-added files only, so untracked secrets stay untracked by default; risk is accidental `config add .` or `config add -A`. ([source](../raw/eshlox-dotfiles-bare-git-repo-secrets.md))

## Alternative approaches (researched)

| Tool                  | Mechanism                                                                                | Secrets/templates                                                                                                                                                                                                   | Notes                                                   |
| --------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Bare git repo         | tracks files in place, no indirection                                                    | none built in (manual discipline)                                                                                                                                                                                   | simplest, no extra tooling ([[dotfiles-bare-git-repo]]) |
| GNU Stow              | symlink farm manager — central dir, symlinks into `$HOME`                                | none built in                                                                                                                                                                                                       | minimal deps (Perl script), easiest to learn            |
| chezmoi               | generates real files in place from a source dir (not symlinks, except where unavoidable) | built-in: password-manager integration (1Password, Bitwarden, LastPass, Vault, etc.) so secrets never live in the repo; also supports file encryption (age, GPG, rage), templates, executable/private file handling | most powerful, steepest learning curve                  |
| Symlink farm (manual) | hand-rolled symlinks, no manager                                                         | none                                                                                                                                                                                                                | baseline manual version of Stow's approach              |

Key tradeoff: symlink-based tools (Stow, manual farms) show source-file edits immediately but can't do encryption, templating, or permission-sensitive files, because a symlink can't diverge from its source and git doesn't preserve those properties. chezmoi trades that immediacy for those features by generating real files at apply-time (`--watch` flag mitigates the immediacy loss). ([source](../raw/chezmoi-design-faq.md))

## Open questions — resolved

- ~~How to keep secrets out of a repo that tracks all of `$HOME`?~~ Bare-git-repo technique: no automated mechanism, manual discipline only (see above). chezmoi: built-in password-manager/encryption support if stronger guarantees are wanted.
- ~~Alternative approaches (GNU Stow, chezmoi, symlink farms)~~ — see comparison table above.

## Sources

- [[dotfiles-bare-git-repo]]
- [chezmoi design FAQ](../raw/chezmoi-design-faq.md)
- [eshlox: bare git repo secrets](../raw/eshlox-dotfiles-bare-git-repo-secrets.md)
