---
title: Index
updated: 2026-08-26
---

# Index

Catalog of every wiki page. Updated on every ingest.

## Syntheses

- [[context-reducer-design]] — temporary design memory, interview record, and documentation procedure for a local cross-client context reducer.

## Concepts

- [[dotfiles-management]] — techniques for version-controlling dotfiles across machines; bare-repo method, secrets handling, comparison vs Stow/chezmoi.

## Entities

- [[claude-diagrams-plugin]] — the local `diagram-plans` Claude Code plugin (skill + prompt hook) that turns plans/brainstorms into Mermaid diagrams in Geist-styled HTML pages saved to a configurable dir and opened in the browser; design decisions, layout, config, install.

## Source summaries

- [[dotfiles-bare-git-repo]] — Atlassian tutorial on tracking dotfiles via a bare git repo + `config` alias, no symlinks.

## Answers

- [[open-source-local-context-reducers]] — 25-project comparison of local context reduction for Claude Code and Codex; shortlist spans llmtrim/Headroom, Codanna/CostWise/Code Context Engine, and targeted MCP or file-output virtualisation.
- [[tmux-pane-keybindings]] — tmux pane bindings from the man page: split/resize/navigate, and which select-layout preset equalizes horizontal vs vertical splits, with a config snippet.
- [[mattpocock-skills-workflow]] — full skill list, invocation model (user- vs model-invoked), and the ordering/branching flow for the mattpocock-skills Claude Code plugin.
- [[mattpocock-wayfinder-skill]] — how the `/wayfinder` skill works: destination, map, fog, frontier, four ticket types, chart vs work modes, local/GitHub storage, hand-off to to-spec, gotchas, and the config-system map as a walkthrough.
- [[claude-code-memory-plan-locations]] — how to relocate Claude Code's auto-memory and plan-mode files; `autoMemoryDirectory` vs `plansDirectory`, the project-root constraint, and the worktree caveat.
- [[claude-auto-memory]] — the four layers that make Claude write memories without being asked (auto memory, extraction subagent, auto-dream, hooks); which are deterministic, which are undocumented, and how to force writes.
- [[qwen38-claude-code-m4]] — fast/efficient ways to run Qwen3.8-27B as a local Claude Code backend on a 48 GB M4 Pro MacBook Pro: Ollama vs LM Studio vs MTP-aware MLX servers, speed numbers, and the settings that actually matter.
- [[qwen38-mtp-server-setup]] — copy-paste oMLX and MTPLX configurations for Qwen3.8-27B + Claude Code on the M4 Pro: install, quant choice, MTP settings, `omlx launch claude`, and the manual env block for MTPLX.
- [[qwen38-local-claude-code-codex]] — primary-source setup for running the 18 GB Qwen3.8-27B MLX quant on the 48 GB M4 Pro through Ollama, with 64k speed tuning and launch/configuration paths for both Claude Code and Codex.
