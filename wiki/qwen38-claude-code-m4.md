---
title: Running Qwen3.8 locally in Claude Code (MacBook Pro M4, 48 GB)
type: answer
created: 2026-08-25
updated: 2026-08-25
sources: []
---

# Running Qwen3.8 locally in Claude Code (MacBook Pro M4, 48 GB)

Web research, 2026-08-25. No raw source saved; all claims cited by URL.

## What "Qwen3.8" is, and which variant fits

Qwen released the 3.8 generation in mid-August 2026 ([QwenLM/Qwen3.8](https://github.com/QwenLM/Qwen3.8)):

- **Qwen3.8-Max** — 2.4T-parameter sparse MoE (~95B active), 1M context. API/cloud only; irrelevant for local use ([Yotta Labs](https://www.yottalabs.ai/post/qwen-3-8-max-release-date-specs-how-to-access-2026)).
- **Qwen3.8-27B** — ~28B **dense** model with a vision encoder, Apache 2.0, 262k native context, and a native multi-token-prediction (MTP) head ([Latent Space](https://www.latent.space/p/ainews-qwen-38-max24t-and-27b-new), [Medium overview](https://medium.com/@rosgluk/qwen-3-8-27b-is-coming-and-it-could-be-the-most-important-local-ai-release-of-2026-c1cf381d5292)).

**Qwen3.8-27B at 4-bit is the target for a 48 GB machine**: ~17–18 GB of weights, leaving room for a 64k-token KV cache plus the OS and apps ([Yotta Labs specs](https://www.yottalabs.ai/post/qwen-3-8-27b-specs-hardware-requirements-how-to-run-2026)). 6-bit (~21 GB) fits with less KV headroom; 8-bit (~29 GB) fits but gets tight at long context and is meaningfully slower. Agentic quality is the real story: reported 73 on Terminal-Bench 2.1, 61.7 on SWE-bench Pro, and reviewers reporting **zero failed tool calls across multi-hour agentic sessions** — a large step over Qwen3.6, which needed thinking mode disabled to avoid bad agentic loops ([MindStudio agentic test](https://www.mindstudio.ai/blog/qwen3-8-27b-agentic-coding-test)).

## Realistic speed on this hardware

A "MacBook Pro M4 48 GB" is either an M4 Pro (273 GB/s memory bandwidth) or an M4 Max (410–546 GB/s); generation speed on a dense 27B is bandwidth-bound, so the Max is roughly 2× the Pro.

- Measured on **M4 Pro (20-core GPU, 48 GB), 4-bit with MTP**: ~125 tok/s prefill, ~24 tok/s generation ([oMLX benchmark](https://omlx.ai/benchmarks/performance/yd0ekfoi)).
- Measured on **M4 Max with oMLX native MTP**: 48–65 tok/s generation ([Weschera A/B benchmark](https://github.com/Weschera/Qwen3.8-27B-oMLX-MTP-Mac)); MTPLX reports 2–3× over plain MLX decoding (32.4 vs 17.4 tok/s vs LM Studio on a 52k-token task) ([MTPLX](https://github.com/youssofal/MTPLX)).

For Claude Code specifically, **prefill speed and cache reuse matter more than generation speed** — its system prompt plus history means each request can reprocess tens of thousands of tokens ([jangwook.net analysis](https://jangwook.net/en/blog/en/claude-code-local-model-inefficiency/)).

## The three setups, ranked

### 1. Ollama — simplest (recommended start)

Ollama ≥ 0.14 natively speaks the Anthropic Messages API at `http://localhost:11434`, so no proxy is needed ([Ollama blog](https://ollama.com/blog/claude), [anthropic-compatibility docs](https://docs.ollama.com/api/anthropic-compatibility)). On Apple Silicon it runs an MLX build: `ollama pull qwen3.8:27b-mlx` (~18 GB 4-bit, Ollama ≥ 0.32.12) ([library entry](https://ollama.com/library/qwen3.8:27b-mlx)).

```bash
export OLLAMA_CONTEXT_LENGTH=65536        # Ollama defaults to 4k, which breaks Claude Code
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_AUTH_TOKEN=ollama        # required but ignored
export ANTHROPIC_DEFAULT_SONNET_MODEL=qwen3.8:27b-mlx
export ANTHROPIC_DEFAULT_OPUS_MODEL=qwen3.8:27b-mlx
export ANTHROPIC_DEFAULT_HAIKU_MODEL=qwen3:8b   # small model for background/subagent calls
claude
```

The tier-mapping variables matter: without them Claude Code requests `claude-sonnet-*` model names the local server rejects ([KDnuggets](https://www.kdnuggets.com/pairing-claude-code-with-local-models)). Newer Ollama also has a one-liner: `ollama launch claude --model <model>` ([community profile example](https://ollama.com/odytrice/qwen3.8)).

### 2. LM Studio — most control over MLX settings

LM Studio ≥ 0.4.1 exposes an Anthropic-compatible `/v1/messages` at `http://localhost:1234` with streaming and tool use ([LM Studio blog](https://lmstudio.ai/blog/claudecode), [docs](https://lmstudio.ai/docs/developer/anthropic-compat)). Same env-var pattern with `ANTHROPIC_AUTH_TOKEN=lmstudio`. Advantages over Ollama: GUI control of context length, **KV-cache quantization** (halves KV memory — real headroom at 64k context on 48 GB), speculative decoding, and easy A/B between MLX quants. LM Studio recommends ≥ 25k context for Claude Code; 64k is the practical floor for comfort ([LM Studio integration docs](https://lmstudio.ai/docs/integrations/claude-code)).

### 3. oMLX / MTPLX — fastest (uses the model's native MTP head)

Qwen3.8-27B ships its multi-token-prediction head, so an MTP-aware server drafts several tokens and verifies them in one pass — *exact* speculative decoding (identical output distribution), with measured draft-acceptance of 0.95/0.88/0.80 at depths 1–3 on coding tasks ([MTPLX](https://github.com/youssofal/MTPLX)). This is the 2–3× generation speedup, and it matters most on the M4 Pro, where baseline decode is only ~24 tok/s. [oMLX](https://omlx.ai/benchmarks/performance/yd0ekfoi) serves an `oQ4e-mtp` quant; [Rapid-MLX](https://github.com/raullenchai/Rapid-MLX) is a similar OpenAI-compatible MLX server with prompt caching (0.08s cached TTFT) and tool-call parsers that advertises Claude Code support. More setup than Ollama/LM Studio; worth it once the workflow sticks.

## Efficiency settings that matter more than the runtime

- **Fix the prompt-cache killer.** Recent Claude Code prepends a changing attribution header to every message, invalidating the local server's prefix cache each turn — up to 90% slower. Set `"CLAUDE_CODE_ATTRIBUTION_HEADER": "0"` in `~/.claude/settings.json`; optionally launch with `--exclude-dynamic-system-prompt-sections` ([ThinkSmart.Life](https://thinksmart.life/research/posts/kv-cache-local-inference/), [Mykola Aleksandrov](https://www.mykolaaleksandrov.dev/posts/2026/06/claude-code-llamacpp-prompt-cache-fix/)).
- **Context ≥ 32k, ideally 64k.** Below ~25k Claude Code misbehaves; 64k needs the KV headroom that 4-bit weights (and KV-cache quantization) leave free ([Ollama integration docs](https://docs.ollama.com/integrations/claude-code)).
- **Map the haiku tier to a small model** (e.g. `qwen3:8b`, 5.2 GB) so background summarization/title calls don't queue behind the 27B.
- **Use the model's built-in chat template.** Tool-calling breaks with generic templates; there is a community-fixed template for Claude Code on the [HF model discussion](https://huggingface.co/Qwen/Qwen3.8-27B/discussions/68) ([MindStudio GGUF setup](https://www.mindstudio.ai/blog/qwen3-8-27b-local-gguf-setup?b16c3391_page=2)).
- **Shrink the prompt**: disable unused MCP servers, keep CLAUDE.md lean, `/compact` early — every token is reprocessed on cache misses.

## If generation speed trumps model quality

Qwen3-Coder-30B-A3B (previous generation, MoE with only ~3B active parameters) decodes at ~55–100 tok/s on M4-class machines — 2–4× faster than dense Qwen3.8-27B — at the cost of the 3.8 generation's agentic reliability gains ([SiliconScore](https://siliconscore.com/models/qwen3-coder-30b-a3b/), [Unsloth](https://unsloth.ai/docs/models/tutorials/qwen3-coder-how-to-run-locally)). Reasonable fallback if 24 tok/s on an M4 Pro feels too slow and MTP serving is too much setup.

## Bottom line

Start with **Ollama + `qwen3.8:27b-mlx` (4-bit) + 64k context + the attribution-header fix + a small haiku-tier model**. If decode speed on an M4 Pro disappoints, move to an MTP-aware server (oMLX/MTPLX) for 2–3×, or drop to Qwen3-Coder-30B-A3B for raw speed.

Related: [[claude-code-memory-plan-locations]], [[claude-auto-memory]] (Claude Code configuration surface).
