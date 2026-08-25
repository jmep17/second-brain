---
source_url: https://www.chezmoi.io/user-guide/frequently-asked-questions/design/
fetched: 2026-08-25
---

# Design FAQ (chezmoi)

## Symlink approach vs chezmoi

GNU Stow and similar tools rely on symlinks as indirection — dotfiles live in a central directory, symlinks point to them from actual locations.

Chezmoi generates the dotfile as a regular file in its final location from the contents of the centralized directory. Enables features impossible with symlinks: encryption, executable permissions, template processing, private file handling.

Symlink managers' one advantage: changes to source files are immediately visible. Chezmoi offers `--watch` flag as workaround.

## Symlink mode limitations in chezmoi

Chezmoi supports symlinks but with constraints:
- Encrypted files cannot use symlinks (source contains ciphertext, not plaintext)
- Executable files cannot use symlinks (permission bits not preserved in version control)
- Private files cannot use symlinks (git doesn't retain group/world permissions)
- Templates cannot use symlinks (source contains template syntax, not rendered output)

## Secrets and encryption

Chezmoi integrates with password managers so "secrets never need to be stored in a repo." Supports 1Password, Bitwarden, LastPass, Vault, and others. Provides encryption options (age, GPG, rage) for files that must remain encrypted in the repo.
