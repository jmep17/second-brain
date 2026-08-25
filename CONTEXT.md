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
Wiki pages and raw sources that must never reach the work Mac's disk. Identified by path (`wiki/personal/`, `raw/personal/`), never by a flag in the page.
_Avoid_: private wiki, sensitive notes

**Claude Code layer**:
Settings, CLAUDE.md, skills and hooks that configure Claude Code. Shared; auto-memory is not part of it.

**Dotfiles**:
Configuration for zsh, fish, nvim, tmux, ghostty, git and gh.

**Secret**:
A credential or token. Never stored in git on any machine.

### Repos

**Main repo**:
`second-brain` on the owner's personal GitHub. Holds everything except the personal wiki.

**Personal repo**:
The nested repo under `wiki/personal/` that holds the personal wiki. Cloned only on the personal Mac.
_Avoid_: submodule (a mechanism, not the concept)

**Work repo**:
A repo under the owner's work GitHub account where the work Mac pushes its own config edits. Never receives personal content.
