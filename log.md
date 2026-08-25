# Log

Append-only record of wiki operations. Newest entries at the bottom.
`grep "^## \[" log.md | tail -5` shows the last 5 entries.

## [2026-08-25] maintenance | Vault created

- Initialized structure per Karpathy's LLM Wiki pattern: raw/, wiki/, CLAUDE.md, index.md, log.md

## [2026-08-25] ingest | How to Store Dotfiles - A Bare Git Repository

- Filed wiki/dotfiles-bare-git-repo.md; created wiki/dotfiles-management.md; updated wiki/index.md

## [2026-08-25] query | Dotfiles open questions: secrets + alternatives

- Researched web sources: chezmoi design FAQ, eshlox bare-git-repo secrets note. Saved raw/chezmoi-design-faq.md, raw/eshlox-dotfiles-bare-git-repo-secrets.md
- Answer: bare-git-repo secrets handling is manual discipline only (never `config add` a secret file, no automated ignore). chezmoi offers built-in password-manager + encryption support as alternative if stronger guarantees wanted.
- Updated wiki/dotfiles-management.md (resolved both open questions, added tool comparison table); updated wiki/dotfiles-bare-git-repo.md gaps section; updated wiki/index.md

## [2026-08-25] query | tmux pane keybindings

- Researched `man tmux` (local 3.7b) + `tmux list-keys`; no raw source saved (man page is on-machine). Filed wiki/tmux-pane-keybindings.md; updated wiki/index.md
