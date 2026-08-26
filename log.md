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

## [2026-08-25] maintenance | wayfinder config-system: resolved 02 work exclusions

- Resolved .scratch/config-system/issues/02-work-exclusions.md; research filed at .scratch/config-system/research/02-work-exclusions.md
- Created CONTEXT.md glossary and docs/adr/0001-personal-wiki-is-a-nested-repo.md; updated map Decisions-so-far and fog

## [2026-08-25] answer | Wayfinder skill

- Question: how Matt Pocock's `/wayfinder` skill works and how to use it.
- Read primary sources: installed wayfinder SKILL.md + agents/openai.yaml, docs/engineering/wayfinder.md, engineering README, CHANGELOG, ask-matt, setup-matt-pocock-skills tracker docs, research/grilling/domain-modeling/to-tickets/implement SKILL.md; diffed installed 1.2.3 against upstream main; used .scratch/config-system as a worked example. No raw source saved (plugin cited by path, upstream by URL).
- Filed wiki/mattpocock-wayfinder-skill.md; updated wiki/index.md.
- Finding: upstream main differs from installed 1.2.3 only in wording plus two edits (Skill-tool invocation spelled out; "tell the user to run /setup-matt-pocock-skills").

## [2026-08-25] answer | Qwen3.8 in Claude Code on an M4 48 GB MacBook Pro

- Question: fast and efficient ways to use Qwen3.8 as a local Claude Code backend on a MacBook Pro M4 with 48 GB.
- Web research only (session's egress proxy blocked direct page fetches; findings assembled from search results). No raw source saved; all claims cited by URL.
- Filed wiki/qwen38-claude-code-m4.md; updated wiki/index.md.
- Findings: Qwen3.8-27B (dense 28B, Apache 2.0, Aug 2026) at 4-bit MLX is the fit for 48 GB; Ollama >=0.14 and LM Studio >=0.4.1 both speak the Anthropic Messages API natively so no proxy is needed; measured ~24 tok/s gen / ~125 tok/s prefill on M4 Pro 48 GB, 2-3x more via the model's native MTP head (oMLX/MTPLX); biggest wins are 64k context, KV-cache quantization, and disabling Claude Code's attribution header to stop per-turn prompt-cache invalidation.

## [2026-08-25] maintenance | qwen38-claude-code-m4: machine confirmed as M4 Pro

- Human confirmed the MacBook Pro is an M4 Pro (not Max); removed the Pro/Max ambiguity from wiki/qwen38-claude-code-m4.md and sharpened the recommendation: on 273 GB/s bandwidth, MTP speculative decoding is what makes the dense 27B comfortable (~24 tok/s with MTP vs mid-teens without).

## [2026-08-25] answer | oMLX and MTPLX configurations for Qwen3.8-27B + Claude Code

- Question: best oMLX or MTPLX configurations for the M4 Pro setup, documented as copyable steps.
- Read primary sources: shallow clones of jundot/omlx and youssofal/MTPLX (README, docs/, cli.py, integrations/claude.py, model_settings.py, engine_pool.py); web search for the HF quant cards. No raw source saved (repos cited by path, cards by URL).
- Filed wiki/qwen38-mtp-server-setup.md; updated wiki/index.md, wiki/qwen38-claude-code-m4.md (cross-link).
- Findings: oMLX ships an `omlx launch claude` command that sets every Claude Code env var (tier maps, attribution-header fix, auto-compact window, LSP tool exclusion) — recommended path; its quant is Jundot/Qwen3.8-27B-oQ4e-mtp (~16 GB, MTP head preserved, qwen3_8 in the MTP gate). MTPLX path: pull Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed, `mtplx tune --retune` (per-machine depth saved in mtplx_runtime.json), Turbo profile auto-selected, manual env block with base URL WITHOUT /v1. oMLX's Lightning-MTP kernels are credited to MTPLX.

## [2026-08-26] maintenance | qwen38-mtp-server-setup: nonexistent model repo corrected

- Human reported the recommended download `Jundot/Qwen3.8-27B-oQ4e-mtp` does not exist (404). Root cause: the repo name came from a web-search summary; search results still list such pages, but oMLX's own source at HEAD only references Qwen 3.6 oQ quants, corroborating the human.
- Rewrote A.2 with verifiable routes only: search-and-verify on HF, or build the quant locally with oMLX's oQ quantizer (preserve_mtp option confirmed in omlx/admin/oq_manager.py; streaming path fits 48 GB). Flipped the top recommendation to MTPLX as the verified turnkey path — its quant `Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed` is the DEFAULT_HF_MODEL_ID in MTPLX's source (mtplx/profiles.py:155), so that download cannot dangle.
- Correction noted on the page per the contradiction rule. Lesson: treat search-result repo names as unverified until the page is opened; source-code references are ground truth.

## [2026-08-26] maintenance | config-system ticket 07: config editor prototype

- Built the throwaway config editor prototype on branch `claude/config-editor-prototype-vecru1`: `/config/tmux` page (raw editor, drift badge, adopt/overwrite, Docs section from `tool:` frontmatter, separate commit box) plus `/api/config/{file,drift,git}` routes in `site/`; seeded `dotfiles/dot_config/tmux/tmux.conf`; dropped `output: "export"` per ticket 03. Every ADR 0003 flow exercised in the browser against chezmoi v2.72.0: save+apply, stale save 409, apply-failure-keeps-save, drift adopt/overwrite, one-commit-for-dirty-dotfiles.
- Verified the two open chezmoi facts: `.chezmoiignore` leaves applied targets in place; `.chezmoiremove` deletes directories — but not when the path is also ignored (silent no-op) or still managed ("inconsistent state"). The 06 skill-toggle mechanism is therefore broken as written; verified replacement is ignore + `run_after` prune script. ADR 0003 addendum added.
- Also for the spec: applies need `--no-tty --force --parent-dirs`; save-while-drifted force-overwrites late `$HOME` drift; `dynamicSource()` on Next 16.3 confirmed.
- Filed answer in .scratch/config-system/issues/07-ui-prototype.md; updated map.md; added `tool: tmux` frontmatter to wiki/tmux-pane-keybindings.md.

## [2026-08-26] maintenance | config-system ticket 07: review fixes, merged to main

- Review pass over the prototype branch found ten issues; all fixed: chezmoi/git exit codes now checked (new "chezmoi error" state instead of a false "in sync"), save refused with 409 when the target drifted after load (closes the force-overwrite race), adopt refused for template sources, drift resolution confirms before discarding unsaved editor text, robust JSON/error handling in all client handlers and API routes, `git status -z` parsing for renames/quoted paths, `Object.hasOwn` tool lookup (/config/toString 500 → 404), dead `serve` dependency removed, docs links reuse the loader's `slugify`.
- Re-verified end to end: regression suite plus new cases (save-while-drifted 409 keeps editor text and source untouched; template adopt 400; malformed body 400; /config/toString 404); typecheck and production build green.
- Updated ticket 07 answer and map with the hardening notes; merged branch `claude/config-editor-prototype-vecru1` to main.

## [2026-08-26] maintenance | ADHD summarization skill

- Researched how to summarize documents for readers with ADHD (working memory, BLUF, chunking, layered depth; sources cited in the skill's references/research.md)
- Created project skill .claude/skills/adhd-summarize/ (SKILL.md + references/research.md), discoverable in Claude Code's skills configuration UI
- Sanity-tested on raw/How to Store Dotfiles - A Bare Git Repository.md; refined length-budget, action-item, and emoji-register rules based on the run
