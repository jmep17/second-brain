# Second Brain

A personal knowledge base plus the owner's tool configuration, kept in one repo and deployed to a personal Mac and a work Mac.

## Language

### Machines

**Personal Mac**:
The owner's own machine. Source of truth; the only machine that pushes to the main repo.
_Avoid_: home machine, main machine

**Work Mac**:
The employer-issued machine. Pulls from the main repo, never pushes to it.
_Avoid_: work laptop, work PC

### Content

**Content class**:
A group of files with one in/out rule per machine. The unit at which exclusion is decided.

**Shared wiki**:
Wiki pages and raw sources that may exist on both machines.
_Avoid_: public wiki

**Personal wiki**:
Wiki pages and raw sources that must never reach the work Mac's disk. Identified by path (`personal/wiki/`, `personal/raw/`), never by a flag in the page.
_Avoid_: private wiki, sensitive notes

**Claude Code layer**:
Settings, CLAUDE.md, skills and hooks that configure Claude Code. Shared; auto-memory is not part of it.

**Dotfiles**:
Configuration for zsh, fish, nvim, tmux, ghostty, git and gh. Source lives in `dotfiles/` (the chezmoi source dir, mirroring `$HOME`); `chezmoi apply` copies it into `$HOME`.

**Dotfiles source dir**:
`dotfiles/` at the repo root. What chezmoi reads; not what tools read.
_Avoid_: config dir

**Secret**:
A credential or token. Never stored in git on any machine; lives in macOS Keychain and is read by chezmoi `keyring` templates at apply time (ADR 0002).

**Drift**:
A managed file in `$HOME` that differs from what its dotfiles source would produce. Detected with `chezmoi diff`; resolved by adopt (`chezmoi re-add`) or overwrite (`chezmoi apply`).

**Save**:
The UI action that writes one dotfiles source file and applies it. Never commits.

**Commit**:
The separate UI action that commits all dirty `dotfiles/**` files and pushes to the machine's remote.

### Repos

**Main repo**:
`second-brain` on the owner's personal GitHub. Holds everything except the personal wiki.

**Personal repo**:
The git submodule at `personal/` that holds the personal wiki, personal raw sources, the personal Mac's Claude auto-memory and `personal/log.md`. Initialised only on the personal Mac.
_Avoid_: submodule (a mechanism, not the concept)

**Work repo**:
A repo under the owner's work GitHub account where the work Mac pushes its own config edits. Never receives personal content.
