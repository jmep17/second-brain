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

- [[claude-diagrams-plugin]] — the `diagrams` Claude Code plugin (formerly claude-diagrams), now vendored at `plugins/diagrams` with second-brain as its marketplace; writes Mermaid/Geist HTML pages to `artifacts/diagrams/`; v0.3.0.

## Source summaries

- [[dotfiles-bare-git-repo]] — Atlassian tutorial on tracking dotfiles via a bare git repo + `config` alias, no symlinks.

## Answers

- [[ubuntu-development-environment-alternatives]] — primary-source comparison of native/dual-boot Ubuntu, Hyper-V, Multipass, VMware, VirtualBox, dev containers, remote Ubuntu, Codespaces, and Windows POSIX layers; recommends a full Hyper-V Ubuntu VM as the default non-WSL local setup.
- [[open-source-local-context-reducers]] — 25-project comparison of local context reduction for Claude Code and Codex; shortlist spans llmtrim/Headroom, Codanna/CostWise/Code Context Engine, and targeted MCP or file-output virtualisation.
- [[tmux-pane-keybindings]] — tmux pane bindings from the man page: split/resize/navigate, and which select-layout preset equalizes horizontal vs vertical splits, with a config snippet.
- [[mattpocock-skills-workflow]] — full skill list, invocation model (user- vs model-invoked), and the ordering/branching flow for the mattpocock-skills Claude Code plugin.
- [[mattpocock-wayfinder-skill]] — how the `/wayfinder` skill works: destination, map, fog, frontier, four ticket types, chart vs work modes, local/GitHub storage, hand-off to to-spec, gotchas, and the config-system map as a walkthrough.
- [[claude-code-memory-plan-locations]] — how to relocate Claude Code's auto-memory and plan-mode files; `autoMemoryDirectory` vs `plansDirectory`, the project-root constraint, and the worktree caveat.
- [[claude-auto-memory]] — the four layers that make Claude write memories without being asked (auto memory, extraction subagent, auto-dream, hooks); which are deterministic, which are undocumented, and how to force writes.
- [[qwen38-claude-code-m4]] — fast/efficient ways to run Qwen3.8-27B as a local Claude Code backend on a 48 GB M4 Pro MacBook Pro: Ollama vs LM Studio vs MTP-aware MLX servers, speed numbers, and the settings that actually matter.
- [[qwen38-mtp-server-setup]] — copy-paste oMLX and MTPLX configurations for Qwen3.8-27B + Claude Code on the M4 Pro: install, quant choice, MTP settings, `omlx launch claude`, and the manual env block for MTPLX.
- [[qwen38-local-claude-code-codex]] — primary-source setup for running the 18 GB Qwen3.8-27B MLX quant on the 48 GB M4 Pro through Ollama, with 64k speed tuning and launch/configuration paths for both Claude Code and Codex.
- [[wsl-terminal-emulators]] — primary-source survey of 13 terminals for Ubuntu on WSL2 with agent coding in mind: ConPTY vs WSLg, sixel/kitty-graphics/OSC 8/52/133 matrix, tmux vs zellij passthrough traps, and a copy-pasteable setup.
- [[caveman-local-install]] — which caveman install/run methods stay 100% local (Local Proxy Mode + telemetry/offline flags vs. Managed Gateway Mode) and which cut LLM token/cost most (Local Engine's 33.2% input compression vs. the Skill's net-negative-on-short-turns overhead).
