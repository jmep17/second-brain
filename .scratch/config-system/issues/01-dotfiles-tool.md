# Dotfiles tool for two Macs with per-machine differences and exclusions

Type: research
Status: open
Blocked by: —

## Question

Which dotfiles mechanism best fits: two macOS machines, per-machine differences (work git identity, proxies), the need to _exclude_ some repo content entirely from the work machine, secrets kept out of git, and a web UI that edits files in the repo and expects the change to land in `$HOME`?

Compare at least: bare git repo, GNU Stow, chezmoi, and Nix/home-manager. `wiki/dotfiles-management.md` already covers the first three at a high level — extend, don't repeat. Focus on: templating/per-machine conditionals, ignore/exclude mechanisms, secrets integration, and how edits flow from repo to `$HOME` (symlink vs apply step, `--watch`-style options).

Deliver a recommendation with the tradeoffs.
