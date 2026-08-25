# UI edit model

Type: grilling
Status: resolved
Blocked by: 03

## Question

"Manage via the UI" concretely: raw text editor per file, structured forms per tool (e.g. tmux keybindings as a table), or both? On save: write to repo only, or also apply to `$HOME` and git commit? How are edit conflicts with the editor/git handled? Which tools get structured editing first?

## Comments

### 2026-08-25 grilling rounds 1–3

- Facts: current configs are small (`.zshrc` 6 lines, `config.fish` 79, `tmux.conf` 106, ghostty 85, `.gitconfig` 3, `settings.json` 142, `CLAUDE.md` 23); `~/.config/nvim` empty; 4 skills, 3 hooks; wiki already has `tmux-pane-keybindings.md`.
- Round 1 (Q1–Q8): raw editor first, structured later; save = write + apply; apply failure keeps the save; drift shown via `chezmoi diff` with adopt/overwrite; stale-save rejected by hash; writes confined to `dotfiles/**`; skill toggle via chezmoi data + ignore; diff shown only for non-template files. All recommendations accepted.
- Round 2 (Q1–Q7): structured candidates tmux keybindings + Claude permissions (deferred); wiki pages link to tools via frontmatter `tool:`; one commit for all dirty dotfiles; no submodule bump from UI; drift check on file open; full apply on chezmoi meta files; skill removal — recommendation revised after fact check: use `.chezmoiremove.tmpl` instead of UI deleting dirs. Accepted.
- Round 3 (Q1–Q4): toggle data in `dotfiles/.chezmoidata/skills.toml`; work Mac renders shared wiki read-only; server binds `127.0.0.1`, started manually; ADR 0003 written. Accepted.

## Answer

The UI edits **chezmoi source files only**, never `$HOME`. ADR: `docs/adr/0003-ui-edits-source-then-applies.md`.

### Editor

- Raw text editor per file, all tools, day one. Structured forms deferred; first candidates when they come: tmux keybindings table, Claude Code permission allow/deny lists.
- Templates (`*.tmpl`) are shown and edited as-is; the UI never renders a template or sends a rendered `$HOME` file to the browser (ADR 0002).
- Each tool has a "Docs" tab listing wiki pages whose frontmatter has `tool: <name>` (e.g. `tool: tmux` on `tmux-pane-keybindings.md`). Ingest adds the field; no site-side mapping.

### Save

1. Reject if the file on disk changed since load (compare content hash taken at load). Show diff, user reloads. No merge.
2. Write source file under `dotfiles/**`.
3. Apply: `chezmoi apply --source-path <file>` for ordinary files; full `chezmoi apply` when the saved file is chezmoi meta (`.chezmoiignore*`, `.chezmoiremove*`, `.chezmoidata/*`, `.chezmoi.toml.tmpl`).
4. If apply fails, the save stands; show chezmoi stderr inline and mark the file "not applied".

### Commit

- Separate "Commit" action with a message field: `git add dotfiles && git commit`. One commit for all dirty `dotfiles/**` files.
- Personal Mac then pushes to origin. Work Mac pushes to the work repo remote only (ticket 02). UI never bumps the `personal/` submodule pointer.

### Drift (edits made directly in `$HOME`, e.g. Claude Code rewriting `settings.json`)

- On opening a file the UI runs `chezmoi diff --source-path <file>` and shows a badge: in sync / drifted / not applied.
- For drifted non-template files: show the diff with two actions — **adopt** (`chezmoi re-add <target>`, then the source is what `$HOME` has) or **overwrite** (`chezmoi apply`).
- For drifted template files: no diff shown (it would contain rendered secrets); only the badge and the two actions.

### File API scope

- Writes: `dotfiles/**` only. `wiki/` is LLM-owned (CLAUDE.md); no human writes from the UI.
- Reads: `dotfiles/**`, `wiki/**`, `raw/**`, `personal/**` when present. Site renders with `personal/` absent.
- Server binds `127.0.0.1` on a fixed port; started manually with `bun run dev` for now (launchd is a bootstrap follow-up, ticket 08).

### Per-machine skill toggle

- State in `dotfiles/.chezmoidata/skills.toml` (committed): `[skills.<hostname>] enabled = ["caveman", ...]`. Work host list starts empty.
- `dotfiles/.chezmoiignore.tmpl` ignores `.claude/skills/<name>` for every skill not in the host's list; `dotfiles/.chezmoiremove.tmpl` lists the same paths so `chezmoi apply` deletes them from `$HOME` ([docs](https://www.chezmoi.io/reference/special-files/chezmoiremove/)). The UI never deletes files itself.
- Toggle = edit `skills.toml` + full apply.
- Unverified, check in ticket 07: that `.chezmoiignore` alone leaves an already-applied target in place (docs do not say), and that `.chezmoiremove` deletes directories.

### Work Mac

Same UI. Edits dotfiles; renders the shared wiki read-only; `personal/` absent.

Feeds: 07 (prototype tmux with this model; verify the two chezmoi facts above and `dynamicSource()` on Next 16), 08 (localhost binding, launchd, `tool:` frontmatter convention into CLAUDE.md).
