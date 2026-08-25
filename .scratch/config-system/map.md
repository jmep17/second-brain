# Map: config-system

Label: wayfinder:map
Created: 2026-08-25

## Destination

An architecture decision and written spec describing one system that holds the second-brain wiki _and_ the user's tool configuration (Claude Code, zsh, fish, nvim, tmux, ghostty, git, gh) in a single monorepo, deployed to two Macs (personal + work, with some content excluded on work), with one web UI that can both browse and edit those configurations. Build happens after this map, from the spec.

## Notes

- Domain: personal dotfiles + LLM wiki. Read `wiki/dotfiles-management.md` and `wiki/claude-code-memory-plan-locations.md` before any ticket — prior research already lives there.
- Existing site is a Fumadocs/Next.js static export (`site/`), reads `../wiki` and `../raw`.
- Facts gathered while charting (2026-08-25): no dotfiles repo exists yet; `~/.config/nvim` is empty; both `~/.zshrc` and `~/.config/fish` exist; login shell is `/bin/zsh`; `~/.claude` holds settings.json, CLAUDE.md, skills/, hooks/.
- Settled during charting: destination is a spec, not a build; one web UI (extend the site) with read + edit; all listed tools in scope; monorepo (expand second-brain); two machines; work machine must exclude some content.
- Skills to consult: `grilling` + `domain-modeling` for grilling tickets; `research` for research tickets; `prototype` for prototype tickets. Write ADRs under `docs/adr/` when a ticket meets the ADR bar.

## Decisions so far

<!-- one line per resolved ticket: gist + link -->
- [Runtime for an editing web UI](issues/03-ui-runtime.md) — drop `output: export`, run `site/` as a localhost Next.js server with a file API + dynamic Fumadocs source; Hono/Tauri rejected as extra process/Rust for no gain.

## Not yet specified

- Bootstrap: how a fresh machine goes from zero to fully configured (install script, tool installs via brew?). Depends on the dotfiles tool decision.
- nvim: config dir is empty — is nvim actually used, and does an nvim config need authoring before it can be "managed"?
- Per-tool documentation in the wiki (keybinding pages like `tmux-pane-keybindings`) — does the UI surface those next to each config? Depends on the UI edit model.
- Migrating the existing second-brain git history and directory layout into the monorepo shape. Depends on repo layout.
- Claude Code specifics: which of settings.json / CLAUDE.md / skills / hooks / memory / plans live in the repo, and how they get to `~/.claude`. Depends on repo layout + dotfiles tool.
- Task: create the private GitHub remote and confirm the work laptop can clone it. Depends on the exclusion decision.

## Out of scope

- Building the system itself (site changes, dotfiles migration) — the destination is the spec.
- Machines beyond the two Macs (Linux, servers).
