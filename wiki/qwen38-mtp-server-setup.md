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

**Recommendation: MTPLX is the verified turnkey path** — its recommended quant (`Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed`) is pinned as the default model ID inside MTPLX's own source, so the download cannot dangle. oMLX has the best Claude Code wiring (`omlx launch claude` sets every env var, including fixes you'd otherwise discover the hard way) and an SSD-tiered KV cache that survives restarts — but you must source or build its MTP-preserving quant yourself (see A.2).

> **Correction (2026-08-26):** this page originally told you to `hf download Jundot/Qwen3.8-27B-oQ4e-mtp`. That repo does not exist — the name came from a web-search summary; oMLX's source only ever references Qwen **3.6** oQ quants (`Jundot/Qwen3.6-27B-oQ4e-mtp`, `tests/integration/test_specprefill_static_prefix_real_model.py`), and the human confirmed the 3.8 download 404s. Section A.2 now gives verifiable routes only. Treat any specific community `…-oQ4e-mtp` repo name as unverified until you have opened its page.

## Configuration A — oMLX (best Claude Code wiring; bring your own quant)

### 1. Install and start

```bash
brew tap jundot/omlx https://github.com/jundot/omlx
brew install jundot/omlx/omlx
omlx start          # background server on http://localhost:8000, auto-restarts
```

Or download the signed DMG from [Releases](https://github.com/jundot/omlx/releases) — the app adds a menu-bar controller and installs the same `omlx` CLI shim. Requires macOS 15+, Apple Silicon. (The "custom kernel" build warning in the README concerns GLM/MiniMax/Qwen3.5 families, not dense Qwen3.8 — brew/DMG installs are fine here.)

### 2. Get an MTP-preserving quant

The MTP speedup needs a quant whose `mtp.*` tensors were kept. Two routes:

**Route 1 — search live, verify before downloading.** Open `http://localhost:8000/admin` → Downloader → search `Qwen3.8 mtp`, or browse [huggingface.co/models?search=Qwen3.8-27B+mtp](https://huggingface.co/models?search=Qwen3.8-27B+mtp). Pick a ~4-bit MLX quant whose card says the MTP head is preserved (oQ4e-mtp naming, or an `mlx-community` `-MTP-4bit` build), and only trust a repo whose page you have actually opened — specific names previously listed here turned out not to exist.

**Route 2 — build it yourself (cannot 404).** oMLX ships the oQ quantizer with a **Preserve MTP** option (`preserve_mtp` in `omlx/admin/oq_manager.py`; MTP tensors are bit-protected, `omlx/oq.py`). Download the official release and quantize locally:

```bash
pip install -U "huggingface_hub[cli]"
hf download Qwen/Qwen3.8-27B \
  --local-dir ~/.omlx/models/Qwen/Qwen3.8-27B
```

Then in `http://localhost:8000/admin` → the model → **Quantize (oQ)** → level `oQ4e`, **Preserve MTP** enabled. The full checkpoint is a ~56 GB download, but the streaming quantizer processes tensors via mmap without loading the whole model, so it runs within 48 GB (`docs/oQ_Quantization.md`); the output is a ~16 GB `Qwen3.8-27B-oQ4e-mtp` directory you can delete the source for afterwards.

### 3. Configure the model (admin panel → model → settings)

In `http://localhost:8000/admin`, on the model's per-model settings (persisted to `~/.omlx/settings.json`; changes apply without restart — `omlx/model_settings.py`):

- **`mtp_enabled: true`** — Lightning MTP draft+verify; `qwen3_8` is in the supported gate (`omlx/engine_pool.py:109`). Leave `mtp_num_draft_tokens` unset — an adaptive controller picks depth 1–3 from rolling acceptance (`omlx/model_settings.py`; coding-task acceptance around 80% at depth 3 per the project's published benchmarks).
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

## Configuration B — MTPLX (verified turnkey path)

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
| Best quant here | self-built `oQ4e-mtp` (~16 GB) or a verified community upload — see A.2 | `Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed` (4-bit; **verified**: default model ID in MTPLX source) |

They coexist fine on different ports if you want to A/B them. Interesting footnote: oMLX's Lightning-MTP verify kernels are credited to MTPLX (omlx README acknowledgments), so the speed core is shared lineage.

Related: [[qwen38-claude-code-m4]] (the wider comparison: Ollama, LM Studio, speed math, model background).
