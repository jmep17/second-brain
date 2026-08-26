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

## [2026-08-26] answer | Open-source, local-only context reducers for Claude Code and Codex

- Researched primary sources only: official repositories, READMEs, configuration, and release documentation for RTK, Context Mode, Serena, Contextception, isthmos, Rolling Context, Repomix, and Aider.
- Filed wiki/open-source-local-context-reducers.md; updated wiki/index.md.
- Recommendation: begin with RTK for deterministic shell-output reduction across both clients, then add Serena or Contextception for selective repository context. Context Mode is the broadest cross-client option but is Elastic-2.0 source-available, not OSI open source; Rolling Context is local-only only when explicitly configured with a local summarizer.
## [2026-08-26] answer | Run Qwen3.8 locally with Claude Code and Codex

- Question: how to run Qwen3.8 quickly on the 48 GB M4 Pro laptop and use the same local model from Claude Code and Codex.
- Researched primary sources only: official Qwen model cards/config, Ollama model/API/integration documentation, Anthropic Claude Code model-routing documentation, and OpenAI Codex configuration docs/source. No raw source saved; web sources are cited directly.
- Filed wiki/qwen38-local-claude-code-codex.md; updated wiki/index.md.
- Findings: the viable local variant is the dense Qwen3.8-27B, specifically Ollama's 18 GB `qwen3.8:27b-mlx`; the 2.4T/95B-active Max-class checkpoint is not a laptop model. Use 64k context, `ollama launch claude`, and `codex --oss -m qwen3.8:27b-mlx`, with a named Codex profile only after the one-shot path works.

## [2026-08-26] answer | Local context reducers — broader correction and expansion

- Human reported that RTK was not very effective. Expanded research from 8 projects to 20 primary-source candidates across proxy/history compaction, MCP output virtualisation, repository retrieval, hooks, and caching.
- Corrected wiki/open-source-local-context-reducers.md: RTK is a narrow stdout formatter, not the overall default. Revised shortlist: llmtrim or Headroom; Codanna or CostWise; mcp-trunc-proxy for targeted payload virtualisation.
- Added explicit OSI/source-available and local-by-default/local-with-configuration distinctions. Context Mode is Elastic-2.0 and Caveman BSL-1.1; Rolling Context needs a local summarizer; Claude Context needs local Ollama and Milvus.
- No raw source was saved and no commit was created.

## [2026-08-26] answer | Local context reducers — focused five-project addendum

- Added primary-source checks for lossless-claude LCM, lossless-code, tokz/compress, Code Context Engine, and Code-RAG; candidate matrix now covers 25 projects.
- Shortlist changed again: tokz/compress is a strong automatic Claude-specific file/MCP reducer, and Code Context Engine joins the repository-retrieval trial set. Both DAG history projects preserve raw lineage, but default to Claude/cloud summarization unless configured for local/extractive operation; their Codex integration is not equivalent to Claude's automatic compaction.
- Corrected the earlier Code-RAG exclusion: a licence file now exists. GitHub detects BSD-2-Clause while the README states Apache-2.0; both are OSI-approved, but the metadata conflict is documented and should be resolved before redistribution.
- No raw source was saved and no commit was created.

## [2026-08-26] maintenance | Context reducer design session started

- Filed provisional design assumptions in wiki/context-reducer-design.md and updated wiki/index.md.
- Kept the context reducer out of the Second Brain's root CONTEXT.md: it is a possible standalone product being explored here, not part of this repository's domain model.
- No ADR was created because the recommendations remain subject to prototype validation.

## [2026-08-26] maintenance | Context reducer design memory expanded

- Expanded wiki/context-reducer-design.md into the temporary complete handoff while the product-documentation location is undecided.
- Recorded accepted and provisionally accepted answers, unanswered questions 9–14, research context, working vocabulary, the design-session procedure, and the documents the eventual product repository will need.
- Reaffirmed that reducer vocabulary and ADRs do not belong in the Second Brain's root domain docs; no product ADR was created.

## [2026-08-26] maintenance | Documented the claude-diagrams plugin

- Filed wiki/claude-diagrams-plugin.md (entity) for the `diagram-plans` Claude Code plugin built today at ~/src/claude-diagrams: skill + UserPromptSubmit hook, Geist-styled standalone HTML with Mermaid, `DIAGRAM_PLANS_DIR` / `DIAGRAM_PLANS_OPEN` config, browser opener. Recorded the Artifact→standalone-file pivot and the output-style deprecation rationale. Updated wiki/index.md (first Entities entry).

## [2026-08-26] answer | Terminal emulators for Ubuntu on WSL2 (agent coding)

- Filed wiki/wsl-terminal-emulators.md; updated wiki/index.md.
- Primary-source survey of 13 terminals plus tmux/zellij, framed around the ConPTY vs WSLg split. Recommendation: Windows Terminal + tmux; runner-up WezTerm nightly; kitty/Ghostty under WSLg if inline images and desktop notifications matter more.
- Notable findings: Windows Terminal has no desktop notifications by maintainer decision (PR #14425 closed unmerged 2025-04-25), so Claude Code toasts do not work there; WezTerm has had no tagged release since 2024-02-03; GNOME Terminal silently ignores OSC 52; zellij 0.45 renders kitty-protocol images while tmux does not; tmux `allow-passthrough` defaults to `off` and the man page does not say so.
- Konsole was verified separately against invent.kde.org master (ad4528a0, 2026-08-25, 26.11.70) and folded in: all three image protocols, OSC 133 documented, OSC 8 off by default, OSC 52 writes gated by nothing at all, and no GPU rendering path. Its handbook is ~2 years stale and contradicts the source on splits and on Wayland; flagged on the page.
- Contradiction flagged: WezTerm's features page and its escape-sequence reference disagree on sixel and kitty-graphics support.
- No neutral throughput benchmark exists; every performance number on the page is labelled vendor-published.
- No raw source was saved and no commit was created.

## [2026-08-26] answer | Alternatives to Windows Terminal and WSL for Ubuntu development

- Researched primary sources from Canonical, Microsoft, Broadcom, Oracle, Docker, the Dev Container specification, GitHub, VS Code, Cygwin, and MSYS2.
- Filed wiki/ubuntu-development-environment-alternatives.md; updated wiki/index.md; cross-linked wiki/wsl-terminal-emulators.md.
- Recommendation: when Windows must remain the host but WSL is excluded, use a full Ubuntu VM via Hyper-V Quick Create and keep repositories on the guest filesystem. Prefer native Ubuntu for kernel, GPU, and I/O fidelity; Multipass for disposable Ubuntu shells; remote Ubuntu for constrained local hardware; dev containers for project-level reproducibility.
- Clarified that an Ubuntu container supplies Ubuntu userspace but shares its backend Linux kernel, while Cygwin, MSYS2, and Git Bash are Windows POSIX/toolchain layers rather than Ubuntu.
- No raw source was saved and no commit was created.

## [2026-08-26] maintenance | claude-diagrams v0.2.0 — document/canvas page, ELK, and the version-cache fix

- Updated wiki/claude-diagrams-plugin.md and wiki/index.md for the day's second session on ~/src/claude-diagrams.
- **Distribution bug found and fixed**: Claude Code keys its plugin cache on the version in `.claude-plugin/marketplace.json`, which had stayed `0.1.0` across all three commits — so the install was pinned to the *first* commit (`cc5b0de`), had no `scripts/` directory, and still ran the pre-Geist Artifact template. The plugin in use was not the plugin in the repo. Both manifests bumped to 0.2.0; `tools/check-version-sync.sh` added to guard the pair; opener moved `scripts/open-url.sh` → `bin/diagram-open` (on the Bash tool's PATH). Verified end to end: install now reports 0.2.0 at sha `de20c32` with the binary present.
- **Page rebuilt as document + canvas** from a throwaway UI prototype (4 variants of the same content on one file). B (themed document) and C (canvas) both won, on different diagram sizes, and shipped as one page with a toggle rather than an authoring-time choice. Prototype preserved on branch `prototype/diagram-page-variants` as a primary source; `main` keeps only the decision.
- Prototype surfaced two defects invisible on paper: the canvas fit hardcoded a 340 px rail gutter, giving a 375 px phone a 20 px canvas (a geometry bug, not a CSS one); and dragging the canvas sweep-selected the diagram labels.
- **Contradictions with this page's first draft, recorded on the page rather than overwritten**: `#f5a623` as the warning colour was not merely dated but *wrong* — 2.03:1 on white, failing WCAG AA; `mindmap` has been dropped entirely (ignores `themeVariables`, cannot use ELK, self-collides past ~12 nodes); and the earlier "template not yet visually verified in a browser" is now resolved — that first look produced most of v0.2.0.
- **Flagged as unverified**: nothing has ever measured a real rendered diagram. The geometry was checked against simulated CSS boxes only. The repo's plan 002 (render harness + CI) was skipped to get here and is now the next piece of work. Fonts are still fetched from Google Fonts rather than inlined, so plan 004 is partial.
- The prompt hook still fires on non-planning prompts — confirmed live when it fired on a bug report during this session. Repo plan 008 is still outstanding.
- Work sits unmerged on `advisor/001-and-diagram-treatment`; nothing pushed.

## [2026-08-26] maintenance | Plans 006 and 008 — sidebar on every page; config editor on theme tokens

- Executed plans 006 and 008 via one dispatched executor in an isolated worktree; merged to `main` as `worktree-agent-a462e31b70a14ab53` (006 = `f1c9983`, 008 = `9a6de51`, stacked). Updated plans/README.md status rows to DONE.
- **006**: every route now renders inside `DocsLayout` — home, `/docs/**`, `/config/[tool]` and all three 404 boundaries — sharing one `docsLayoutProps()` helper in `site/lib/layout.shared.tsx`. A `Config` folder is injected into the page tree from `TOOLS`, so the config editor is reachable from the sidebar; adding a tool adds a sidebar entry with no other change. Ten files under `site/`.
- **008**: the config editor drops every raw Tailwind palette class for Fumadocs theme tokens across three files. Its five alert banners now reuse `ObsidianCallout` — literally the same component the wiki's callouts use — and its buttons use `buttonVariants`. No logic changed: verified by diff that no added or removed line touches state, effects or fetching.
- **Both plans ran in the same worktree deliberately.** 008's Step 0 refuses to run until 006 has landed, and a fresh executor would have been branched from `main` without 006 — blocked again. Resuming the same executor is what let 008 stack. Recorded in plans/README.md as the lesson for future dependent-plan runs.
- **Two defects found in plan 006's own text**, not in execution: `site/app/page.tsx` is named in the Scope list and required by a done criterion but has no numbered step; and the done criterion miscounts its own Scope list ("nine under `site/`" where the list names ten). The executor caught both and resolved them correctly. Fix before any re-run.
- **A stale server produced a false pass.** The executor's first 006 baseline probe reported `fd-sidebar=7` on `/config/tmux` *before any edit existed* — an unrelated `next-server` left listening on port 3100 from an earlier session. Caught via a clean `git status`, killed, re-run. Anyone re-running these plans should confirm the probe port is actually free; a stale server silently certifies a no-op.
- Every done criterion was re-run independently on review rather than taken from the executor's report: typecheck, clean builds (42 doc paths throughout), `prettier --check`, the four-URL probe, both segment-404 flight payloads, all grep gates, and 008's Step 8 CSS/bundle checks (nine utilities, six bundle strings, all present).
- **Contradiction with plan 008's contrast table, recorded not overwritten**: the plan forbids `text-fd-{success,warning,error,info}` on measured WCAG grounds (1.96–3.50:1 in light mode). That constraint held through execution — zero occurrences in all three files — and is now a standing review rule in the plan's maintenance notes.
- **Flagged as unverified**: the manual browser pass in 008's test plan was skipped at the owner's direction. Light/dark rendering of the drifted, stale-save and chezmoi-error states has never been eyeballed; those states need a real drifted chezmoi setup. On this machine the tmux file reports `not-applied` (no `~/.config/tmux/tmux.conf`), so only that badge state was seen live. 008 also changes the alert banners from full-bleed strips to inset cards — intended, still un-eyeballed.
- Deferred and recorded as follow-ups, not lost: syntax highlighting in the config editor (a behaviour change, out of scope for a presentational plan) and `CommitBox` polling `/api/config/git` every 5 s regardless of visibility.

## [2026-08-26] answer | Caveman: local install & token-cost reduction

- Filed wiki/caveman-local-install.md; updated wiki/index.md

## [2026-08-26] maintenance | Installed caveman's local proxy for Claude Code and Codex

- Acted on wiki/caveman-local-install.md's recommendation: installed `@caveman-ai/cli` globally (npm), `caveman setup --install` (all six local binaries, checksums verified), `caveman telemetry off`, `caveman claude` and `caveman codex` (both natively hooked to the local proxy at `127.0.0.1:8787`).
- Added `export CAVEMAN_OFFLINE=1` to `~/.zshrc` so the proxy never makes entitlement/sync calls.
- Recovery MCP registered for Claude Code; Codex's `~/.codex/config.toml` already had a `[mcp_servers.caveman]` block pointing at the right binary but not caveman-journaled, so the installer refused to touch it — left as-is (cosmetic gap, only affects streaming/Pro-Max session recovery).
- `caveman status` confirms: compress on, telemetry off, both `claude` and `codex` show `provider_proxy` among installed native integrations.
