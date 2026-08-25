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

## [2026-08-25] answer | mattpocock-skills plugin: skill list and workflow order

- Researched primary sources in the installed plugin at `/Users/jorden/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/` (plugin.json, top-level README.md, CONTEXT.md, .agents/invocation.md, all category READMEs, all 25 registered SKILL.md files). No raw source saved (files are on-machine, cited by path). Filed wiki/mattpocock-skills-workflow.md; updated wiki/index.md

## [2026-08-25] answer | Claude Code memory and plan file locations

- Question: how to point Claude Code's memories and plans at second-brain.
- Filed wiki/claude-code-memory-plan-locations.md; updated wiki/index.md.
- Findings: `autoMemoryDirectory` (any settings scope, absolute or `~/`) relocates auto memory; `plansDirectory` is resolved relative to the project root and rejected if outside it, falling back to `~/.claude/plans/`.
- Contradiction flagged: the v2.1.245 bundle's schema description says `autoMemoryDirectory` is "Ignored if set in projectSettings", while the docs and the bundle's own resolver honor project settings in a trusted workspace. Page recommends user or local scope to sidestep it.

## [2026-08-25] answer | Making Claude write memories automatically

- Question: what makes Claude record durable facts to memory files without being asked each time.
- Researched primary sources: code.claude.com docs (memory, settings-reference, commands, hooks, sub-agents, scheduled-tasks), the platform memory-tool page, and the installed Claude Code bundle at `/Users/jorden/.local/share/claude/versions/2.1.245`. No raw source saved (docs cited by URL, bundle by path).
- Filed wiki/claude-auto-memory.md; updated wiki/index.md.
- Findings: four layers — auto memory (in-turn, model-judged), an undocumented memory-extraction subagent that forks after turns, an undocumented auto-dream consolidation pass, and hooks (the only deterministic writer). Extraction hard-skips when there is no new user prose since the last run, so tool-only turns produce nothing.
- Contradictions flagged: `autoDreamEnabled` exists in the bundle settings schema and `/memory` UI but is absent from settings-reference.md; the extraction subagent and the `#` memory-input prefix are both undocumented; `/remember` is referenced in bundle strings but registers no command in v2.1.245.
- Open: both background layers are gated on server-side feature flags (`tengu_passport_quail`, `tengu_onyx_plover`) that default off in code; active state not determinable from disk.
