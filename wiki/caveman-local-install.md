---
title: Caveman Local Install & Cost-Reduction Options
type: answer
created: 2026-08-26
updated: 2026-08-26
sources: [https://github.com/juliusbrussee/caveman]
---

# Caveman: which install/run methods are 100% local, and which cut LLM token cost most?

[Caveman](https://github.com/juliusbrussee/caveman) ("why use many token when few token do trick") is a **token-compression tool for AI coding agents** — it is not itself an LLM and does not ship a local model. It sits between the coding agent (Claude Code, Codex, Gemini CLI, Aider, opencode, etc.) and whatever LLM provider that agent is configured to call, and shrinks the payloads that flow between them. Its own product split is:

- **Caveman Skill** (MIT) — makes the agent write terser replies; adds a rules block to the agent's context.
- **Caveman Proxy / Local Engine** (BSL-1.1) — a local HTTP proxy (`caveman start`, default `127.0.0.1:8787`) that compresses provider traffic (requests/responses) before the agent reads it, using type-specific compressors.

## Install methods and their locality

| Method | Command | Runs 100% local? | Notes |
|---|---|---|---|
| Manual clone + rule files only | `git clone …` then `node bin/install.js --with-init --only <agent>` | **Yes** | Writes static rule files (`.cursor/rules/`, `.clinerules/`, etc.) into the repo; no hooks, no network at runtime (repo-local docs, "Installation Matrix"). |
| Manual clone + full install | `git clone …` then `node bin/install.js --all` | Install step needs network to `git clone`; `--dry-run` needs none. Runtime behavior depends on what's enabled (docs, "Installation Matrix"). |
| Unified installer script | `curl … install.sh \| bash` / `install.ps1` | Download step requires network (fetches from GitHub); after that, "scripts run locally" (docs, "Installation Matrix"). |
| Per-agent `npx skills add` | `npx skills add JuliusBrussee/caveman -a <agent>` | Requires npm registry + GitHub at install time (docs, "Installation Matrix"). |
| **Local Proxy Mode (runtime)** | `caveman start` (binds `127.0.0.1:8787`) | **Yes, at runtime** — "No Caveman account needed… sends only to selected provider, not Caveman services" (SECURITY.md, "Local Proxy + Engine"). | This is the mode that actually matters for "does caveman itself phone home while running." |
| Managed Gateway Mode | (requires Caveman account) | **No** — "requests and responses transit Caveman Cloud and the selected provider," including request content and provider credentials (SECURITY.md, "Managed Gateway Mode"). | Explicitly not local; avoid for a local-only setup. |
| Anonymous CLI telemetry | on by default | **No, unless disabled** — sends command + token-count events to `https://api.caveman.so/telemetry/cli` by default (SECURITY.md, "Telemetry"). Disable with `caveman telemetry off`, `CAVEMAN_TELEMETRY=0`, or `DO_NOT_TRACK=1`. | Excludes prompt/code/file-path content even when on, but is still an outbound call. |
| Full offline isolation | `DO_NOT_TRACK=1` + `CAVEMAN_OFFLINE=1` | **Yes** | `CAVEMAN_OFFLINE=1` disables entitlement refresh/sync; combined with telemetry-off, no Caveman-operated network calls remain (SECURITY.md, "Offline Mode"). |

**Caveat that applies to every method above:** Caveman does not eliminate the call to your actual LLM provider (Claude, OpenAI, Gemini, etc.) — "provider credentials pass through unchanged" (SECURITY.md, "Local Proxy + Engine"). The repo's docs make no mention of bundling or wrapping a local LLM (Ollama/llama.cpp/LM Studio) — it is orthogonal to that question. If the underlying agent is itself pointed at a local/self-hosted model endpoint, then the whole pipeline becomes 100% local with no cloud LLM calls at all; if the agent uses a cloud LLM, that outbound call still happens regardless of how caveman is installed.

## Most cost/token-reducing local configuration

The setup that both **stays fully local** (no Caveman-operated network calls) **and maximizes token/cost savings** is:

1. Install via the unified installer or manual clone (network only at install time).
2. Run in **Local Proxy Mode**: `caveman start` on loopback `127.0.0.1:8787`, no Caveman account — "Standalone Proxy authentication accepts every inbound request because loopback, single-operator isolation is the security boundary" (SECURITY.md, "Local Proxy Mode").
3. Set `DO_NOT_TRACK=1` (or `caveman telemetry off`) and `CAVEMAN_OFFLINE=1` to stop the anonymous telemetry ping and entitlement/sync calls (SECURITY.md, "Running Fully Offline/Local").
4. Enable the **Local Engine's** type-specific compression on provider traffic — the repo's pinned benchmark reports **33.2% input-payload reduction** overall, with per-type targets: JSON 70–90%, logs 85–95%, diffs 60–80%, search results 80–95%, code 40–70% (README, "Compression Engine").
5. Optionally add `caveman browse` for accessibility-tree queries — 129.8× smaller (121 vs 15,704 tokens) — and `/caveman-compress` for memory/context files (~46% average reduction) (README "Key Commands"; docs/HONEST-NUMBERS.md).

This combination (local proxy + local engine + telemetry/offline flags) is the most cost-reducing *local* option because it compresses the largest, most reliably-savable part of a session — tool/command output and provider responses read by the agent — before it's ever billed as input tokens on your next turn.

**Important honesty caveat from the repo itself** (docs/HONEST-NUMBERS.md): the **Caveman Skill** (which compresses the agent's own replies) adds a fixed **~1–1.5k input tokens per turn** from injected rules, and can be **net negative** for short/terse interactions or per-message billing (one cited Cursor A/B: 4.3M tokens with caveman vs 1M without, and 2x wall-clock time). The Skill is best for long, chatty, multi-turn sessions where output savings (~65% average, unaudited) accumulate faster than the per-turn overhead. The Proxy/Local Engine's input compression does not carry that same per-turn skill overhead and is the more consistently cost-reducing piece.

## Bottom line

- **Most local**: Local Proxy Mode + Local Engine with telemetry disabled (`DO_NOT_TRACK=1`) and `CAVEMAN_OFFLINE=1` — no Caveman-operated cloud calls; the only outbound traffic is to whatever LLM provider you've configured the agent to use.
- **Avoid for locality**: Managed Gateway Mode (routes your actual prompts/responses/credentials through Caveman Cloud) and default (opt-out) telemetry.
- **Most token/cost-reducing while staying local**: the Local Engine/Proxy's input compression (33.2% pinned benchmark, up to 95% on logs/search) is the more reliable saver; the Skill's output compression helps mainly in long sessions and can backfire on short ones due to its fixed per-turn overhead.
- **Caveman does not run a local LLM itself** — for zero cloud-LLM-API spend, the agent behind caveman must itself be pointed at a local/self-hosted model; caveman then reduces the context/tokens fed to that local model too, but the docs give no specific benchmark for that combination.

Primary source used throughout: [github.com/juliusbrussee/caveman](https://github.com/juliusbrussee/caveman) — README, `SECURITY.md`, `INSTALL.md`, and `docs/HONEST-NUMBERS.md` (all fetched directly from the repo/raw GitHub content on 2026-08-26).
