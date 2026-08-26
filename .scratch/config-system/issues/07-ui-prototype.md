# Prototype: view + edit one tool's config

Type: prototype
Status: resolved
Blocked by: 06 (resolved)

## Question

Build a throwaway prototype of the UI for one tool (tmux is simplest: single file, wiki already documents its keybindings) using the runtime shape from 03 and the edit model from 06. Does it feel right? What does it reveal about the spec?

## Answer

Built on branch `claude/config-editor-prototype-vecru1` (2026-08-26, chezmoi v2.72.0, Next 16.3.2). `bun run dev` in `site/`, then http://127.0.0.1:3000/config/tmux. Every flow from ADR 0003 was exercised end to end, through the browser and against real chezmoi + tmux (the applied config parses in tmux 3.x and `list-keys` shows the bindings).

### What was built

- `dotfiles/dot_config/tmux/tmux.conf` — seed source file (implements what `wiki/tmux-pane-keybindings.md` documents; the wiki page got its `tool: tmux` frontmatter).
- `site/app/config/[tool]/page.tsx` — tool page: Docs section (wiki pages with `tool:` frontmatter), one raw editor per source file, commit box.
- `site/app/api/config/{file,drift,git}/route.ts` + `site/lib/config-files.ts` — GET file+drift state, PUT save (hash-guarded, then apply), adopt/overwrite, git status/commit. Writes allow-listed to `dotfiles/**`.
- `site/next.config.mjs` — `output: "export"` dropped (per 03); docs pages still prerender under `next build`, config routes are dynamic.

### Does it feel right?

Yes. The loop open → see badge (in sync / drifted / not applied) → edit → Save → applied is tight; latency of write + single-file apply is imperceptible. The drift banner with inline diff and two buttons (adopt / overwrite) makes the two-writers problem legible instead of scary. Separate Commit with the dirty-file list reads exactly like the mental model. A plain textarea is fine at these file sizes; syntax highlighting is a nice-to-have, not a need. Verified behaviors: stale save rejected with 409 + reload prompt; failed apply keeps the save and shows chezmoi stderr inline ("not applied" badge); adopt rewrites the source from `$HOME`; overwrite restores `$HOME` from source.

### Chezmoi facts checked (from 06)

- `.chezmoiignore` **does** leave an already-applied target in place — safe for "stop managing without deleting".
- `.chezmoiremove` **does** delete directories recursively — but only when the path is neither ignored nor still managed. The 06 mechanism (same path in ignore _and_ remove) silently removes nothing, and remove + still-managed errors "inconsistent state". **Revised skill-toggle mechanism, verified:** `.chezmoiignore.tmpl` + a `run_after_*.sh.tmpl` prune script generated from `.chezmoidata/skills.toml`. ADR 0003 has an addendum; 08 must spec it this way.
- Fumadocs `dynamicSource()` + dev watcher works on Next 16.3/Turbopack (in use since plan 004; confirmed serving the editor session live).

### What it reveals for the spec (08)

- Server-driven chezmoi needs `--no-tty --force` on every apply (apply prompts interactively when the target was modified) and `--parent-dirs` on single-file applies (fails when the target dir doesn't exist — hit on first apply of a new file). `apply --source-path` and `target-path` (source→target mapping for diff/re-add) work as ADR 0003 assumed.
- The stale-save hash guards the _source_ file only. Save-while-drifted force-overwrites `$HOME` drift that arrived after the page loaded. Spec: re-check target drift server-side at save time and warn/refuse, or accept the race and say so.
- Commit-box `git status` needs `--untracked-files=all` (porcelain collapses untracked dirs to `dotfiles/`).
- The Fumadocs loader doesn't expose custom frontmatter; the Docs tab reads `tool:` by scanning `wiki/*.md` directly (cheap, fine to keep).
- Dropping `output: "export"` was as cheap as 03 predicted; `start` becomes `next start` (the `serve out` flow is gone). Next 16 writes its own `site/AGENTS.md`/`CLAUDE.md` unless `agentRules: false` is set — it is now.
- Prototype omissions the spec still owes: push from the UI, template (`*.tmpl`) editing, meta-file full-apply exercise, skill-toggle UI, work-Mac read-only wiki mode.
