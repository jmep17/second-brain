# Dotfiles tool for two Macs with per-machine differences and exclusions

Type: research
Status: resolved
Blocked by: —

## Question

Which dotfiles mechanism best fits: two macOS machines, per-machine differences (work git identity, proxies), the need to _exclude_ some repo content entirely from the work machine, secrets kept out of git, and a web UI that edits files in the repo and expects the change to land in `$HOME`?

Compare at least: bare git repo, GNU Stow, chezmoi, and Nix/home-manager. `wiki/dotfiles-management.md` already covers the first three at a high level — extend, don't repeat. Focus on: templating/per-machine conditionals, ignore/exclude mechanisms, secrets integration, and how edits flow from repo to `$HOME` (symlink vs apply step, `--watch`-style options).

Deliver a recommendation with the tradeoffs.

## Answer

**Use chezmoi.** Full findings with citations: [research/01-dotfiles-tool.md](../research/01-dotfiles-tool.md).

Why:

- Only candidate with built-in per-machine conditionals (`.chezmoi.hostname`, prompted `[data]` values) plus a per-machine exclude file (`.chezmoiignore` is itself a template).
- Secrets stay out of git via password-manager/Keychain template functions or `encrypted_` files.
- Web UI "save" = write source file, then `chezmoi apply --source-path <file>`. `--watch` exists but only inside `chezmoi edit`; do not build on it.
- Fits the monorepo: `sourceDir = <repo>/dotfiles`, `workingTree = <repo>`.

Tradeoffs:

- Apply step instead of symlinks (Stow gives instant edits but no templating, no secrets, no permissions).
- Repo filenames are `dot_zshrc.tmpl` style; the UI must map source to target names.
- home-manager is more powerful but needs Nix on both Macs, a slow `switch` per edit, and its manual has no secrets support.
- **No tool excludes content from the work disk.** `.chezmoiignore` and `git sparse-checkout` only affect `$HOME` / working tree; the full history is still cloned. Real exclusion needs a second private repo (pulled via a templated `.chezmoiexternal` only on the personal Mac) or encryption with the key kept off work.
