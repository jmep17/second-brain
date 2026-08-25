---
source_url: https://eshlox.net/dotfiles-bare-git-repo
fetched: 2026-08-25
---

# Dotfiles backup with a bare Git repo (eshlox) — secrets excerpt

Quote: "Do not add files that contain secrets: SSH keys, API tokens, `.env` files. The repo is private, but secrets do not belong in Git."

Recommends: "If you need to back up secrets, use a password manager or encrypted storage."

No `.gitignore` or global-ignore mechanism described. Strategy is manual selection — since the bare-repo technique requires explicit `config add <file>` for each tracked file, secrets simply aren't added. Relies on discipline, not automated exclusion.
