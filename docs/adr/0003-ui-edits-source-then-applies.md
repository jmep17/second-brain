---
status: accepted
---

# The web UI edits chezmoi source files, never `$HOME`; save applies, commit is separate

The UI must let the owner change tool configuration and have it take effect, while git stays the source of truth and secrets never reach the browser (ADR 0002). So every UI write goes to `dotfiles/**` (the dotfiles source dir) and is followed by `chezmoi apply` for that file; `$HOME` is only ever written by chezmoi. Editing `$HOME` directly and re-adding was rejected because templates and Keychain references would be lost on re-add; editing both was rejected because two writers guarantee drift. Drift that happens anyway (Claude Code rewriting `settings.json`, hand edits in nvim) is surfaced on file open with `chezmoi diff` and resolved by an explicit adopt (`chezmoi re-add`) or overwrite (`chezmoi apply`). Commit is a separate action so several saves batch into one commit. Stale saves are rejected by content hash rather than merged (config-system ticket 06, 2026-08-25).

## Consequences

- Writes are allow-listed to `dotfiles/**`; the wiki stays LLM-owned and read-only in the UI.
- Diffs are shown only for non-template files; template files get a status badge only.
- Per-machine skill toggles are chezmoi data (`.chezmoidata/skills.toml`) plus `.chezmoiignore.tmpl` / `.chezmoiremove.tmpl`; the UI never deletes files in `$HOME`.
- Any future structured editor (tmux keybindings, Claude permissions) must serialise back to the same source file and go through the same save path.
- The server binds `127.0.0.1` only; it runs unauthenticated as the user.

Evidence: `.scratch/config-system/issues/06-ui-edit-model.md`.
