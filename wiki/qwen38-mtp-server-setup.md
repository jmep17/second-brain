---
title: oMLX and MTPLX configurations for Qwen3.8-27B + Claude Code (M4 Pro, 48 GB)
type: answer
created: 2026-08-25
updated: 2026-08-25
sources: []
---

# oMLX and MTPLX configurations for Qwen3.8-27B + Claude Code (M4 Pro, 48 GB)

Follow-up to [[qwen38-claude-code-m4]]. Researched 2026-08-25 by reading both projects' source and docs directly ([jundot/omlx](https://github.com/jundot/omlx), [youssofal/MTPLX](https://github.com/youssofal/MTPLX), shallow clones at that day's HEAD); claims about flags and behavior cite file paths in those repos.

Both servers run Qwen3.8-27B's **native MTP head** for exact speculative decoding (2–3× decode on an M4 Pro), and both expose an **Anthropic-compatible `/v1/messages`**, so Claude Code connects without a proxy. Both are Apache-2.0.

**Recommendation: start with oMLX** — its `omlx launch claude` command wires every Claude Code env var correctly (including fixes you'd otherwise have to discover the hard way), and its SSD-tiered KV cache survives restarts, which suits Claude Code's giant recurring prompts. MTPLX is the reference MTP implementation with per-machine auto-tuning and the official quant catalog; keep it as the speed benchmark.

## Configuration A — oMLX (recommended)

### 1. Install and start

```bash
brew tap jundot/omlx https://github.com/jundot/omlx
brew install jundot/omlx/omlx
omlx start          # background server on http://localhost:8000, auto-restarts
```

Or download the signed DMG from [Releases](https://github.com/jundot/omlx/releases) — the app adds a menu-bar controller and installs the same `omlx` CLI shim. Requires macOS 15+, Apple Silicon. (The "custom kernel" build warning in the README concerns GLM/MiniMax/Qwen3.5 families, not dense Qwen3.8 — brew/DMG installs are fine here.)

### 2. Get the MTP-preserving quant

The quant made for this exact setup is **`Jundot/Qwen3.8-27B-oQ4e-mtp`** (~16 GB, ~4.9 bpw effective oQ4e with the MTP head bit-protected — from the oMLX author; [HF card](https://huggingface.co/Jundot/Qwen3.8-27B-oQ4e-mtp)). Easiest: open `http://localhost:8000/admin` → Downloader → search `Qwen3.8-27B-oQ4e-mtp` → download. Or by hand:

```bash
pip install -U "huggingface_hub[cli]"
hf download Jundot/Qwen3.8-27B-oQ4e-mtp \
  --local-dir ~/.omlx/models/Jundot/Qwen3.8-27B-oQ4e-mtp
```

### 3. Configure the model (admin panel → model → settings)

In `http://localhost:8000/admin`, on the model's per-model settings (persisted to `~/.omlx/settings.json`; changes apply without restart — `omlx/model_settings.py`):

- **`mtp_enabled: true`** — Lightning MTP draft+verify; `qwen3_8` is in the supported gate (`omlx/engine_pool.py:109`). Leave `mtp_num_draft_tokens` unset — an adaptive controller picks depth 1–3 from rolling acceptance ([model card](https://huggingface.co/Jundot/Qwen3.8-27B-oQ4e-mtp) reports 81% draft acceptance at depth 3).
- **`max_context_window: 65536`** — Claude Code needs ≥ 48k or the launcher refuses to start (`CLAUDE_CODE_MIN_CONTEXT_WINDOW`, `omlx/integrations/claude.py:12`); 64k is the comfort floor and the 4-bit weights leave room for it in 48 GB.
- **Pin the model** (`is_pinned`) so LRU eviction never unloads it mid-session.

Optional but worthwhile for Claude Code's restart-heavy usage — persistent KV cache on SSD:

```bash
omlx serve --model-dir ~/.omlx/models --paged-ssd-cache-dir ~/.omlx/cache
```

(Hot RAM tier + cold SSD tier with prefix sharing; cached prefixes survive server restarts — README "Tiered KV Cache".)

### 4. Launch Claude Code

```bash
omlx launch claude --model Qwen3.8-27B-oQ4e-mtp
```

That one command does all of this for you (`omlx/integrations/claude.py`):

- `ANTHROPIC_BASE_URL` → the oMLX server, `ANTHROPIC_AUTH_TOKEN` → its API key
- maps **all three tiers** (`ANTHROPIC_DEFAULT_OPUS/SONNET/HAIKU_MODEL`) plus `CLAUDE_CODE_SUBAGENT_MODEL`
- `CLAUDE_CODE_ATTRIBUTION_HEADER=0` — the prompt-cache-invalidation fix from [[qwen38-claude-code-m4]]
- `CLAUDE_CODE_MAX_CONTEXT_TOKENS` and `CLAUDE_CODE_AUTO_COMPACT_WINDOW` set to the model's real context so auto-compact fires at the right time (works because the model ID doesn't look like `claude-*` — don't alias it to one)
- `API_TIMEOUT_MS=3000000` for slow local prefills, telemetry off
- `--disallowedTools LSP` — an LSP connecting mid-session injects its tool schema into the system region and re-prefills the entire conversation on a prefix-caching server (omlx issue #2349)

To route background/subagent traffic to a faster small model, drop any small MLX model (e.g. a Qwen3.5-9B 4-bit) into the model dir and add:

```bash
omlx launch claude --model Qwen3.8-27B-oQ4e-mtp --haiku Qwen3.5-9B-4bit
```

### Expected performance

M4 Pro (20-core GPU, 48 GB), this quant, MTP on: **~125 tok/s prefill, ~24 tok/s decode** ([oMLX benchmark](https://omlx.ai/benchmarks/performance/yd0ekfoi)); the model card's ~54 tok/s figure is a higher-bandwidth chip. Watch live cache hits and speed at `/admin`.

## Configuration B — MTPLX

### 1. Install

```bash
brew install youssofal/mtplx/mtplx     # or: python3 -m pip install -U mtplx
mtplx doctor --summary
```

Requires macOS 14+, Apple Silicon, Python 3.11+. The Mac app DMG at [mtplx.com](https://mtplx.com/download) does hardware-matched model selection automatically.

### 2. Pull the recommended quant and auto-tune

```bash
mtplx pull Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed
mtplx inspect Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed
mtplx tune --model Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed --retune
```

**Optimized Speed** (4-bit dynamic) is the author's coding recommendation for ≥ 32 GB Macs (README "Get it"). Siblings: `Bare-Speed` (fastest bursts, weaker on long coding tasks) and `Optimized-Quality` (8-bit, ~29 GB — fits in 48 GB but slower, little KV headroom; skip it for Claude Code). `tune` measures plain autoregressive vs MTP depths 1–3 **on your machine** and saves the winner — depth ships in the model's `mtplx_runtime.json`, no flags needed.

### 3. Serve

```bash
mtplx serve --port 8000
```

The Turbo profile (NAX verify kernels + compiled verify) is auto-selected for the quantized 27B flagships (`docs/profiles.md`) — no `--profile` flag needed. A warm-prefix session bank keeps multi-turn chats fast, and the SSD session cache (on by default) restores sessions across restarts (README "The server"). Keep `presence_penalty`/`frequency_penalty` at 0 — that's an exact no-op that preserves MTP exactness, and Qwen's own guidance for coding.

For long sustained sessions, optional fan control: `mtplx max --install`, then `mtplx serve --max`.

### 4. Point Claude Code at it

MTPLX has no launcher, so set the environment yourself. Two gotchas from its docs: the Anthropic base URL is the **bare server root, no `/v1`** (the SDK appends `/v1/messages`; a `/v1` base requests `/v1/v1/messages` — `docs/server.md`), and the tier vars must name the served model ID — check with `curl -s http://127.0.0.1:8000/v1/models`.

```bash
MODEL="Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed"   # use the id /v1/models returns
export ANTHROPIC_BASE_URL=http://127.0.0.1:8000        # no /v1 suffix
export ANTHROPIC_AUTH_TOKEN=mtplx
export ANTHROPIC_API_KEY=""
export ANTHROPIC_DEFAULT_OPUS_MODEL="$MODEL"
export ANTHROPIC_DEFAULT_SONNET_MODEL="$MODEL"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="$MODEL"
export CLAUDE_CODE_SUBAGENT_MODEL="$MODEL"
export CLAUDE_CODE_ATTRIBUTION_HEADER=0
export API_TIMEOUT_MS=3000000
claude --disallowedTools LSP
```

(The last two lines and the LSP exclusion replicate what oMLX's launcher does automatically; same rationale.)

## Which one, when

| | oMLX | MTPLX |
|---|---|---|
| Claude Code wiring | `omlx launch claude` sets everything | manual env vars |
| KV/prompt cache | tiered RAM+SSD, survives restarts, prefix sharing | warm-prefix session bank + SSD session cache |
| MTP tuning | adaptive depth 1–3 at runtime | measured per-machine `tune`, saved depth |
| Extras | menu-bar app, admin panel, multi-model (embeddings/rerankers for RAG), VLM | honest benchmarking tools, Forge (build your own MTP quants), fan control |
| Best quant here | `Jundot/Qwen3.8-27B-oQ4e-mtp` (~16 GB) | `Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed` (4-bit) |

They coexist fine on different ports if you want to A/B them. Interesting footnote: oMLX's Lightning-MTP verify kernels are credited to MTPLX (omlx README acknowledgments), so the speed core is shared lineage.

Related: [[qwen38-claude-code-m4]] (the wider comparison: Ollama, LM Studio, speed math, model background).
