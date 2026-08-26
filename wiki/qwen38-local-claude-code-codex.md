---
title: Run Qwen3.8 locally with Claude Code and Codex (M4 Pro, 48 GB)
type: answer
created: 2026-08-26
updated: 2026-08-26
sources:
  - https://huggingface.co/Qwen/Qwen3.8-27B
  - https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B
  - https://ollama.com/library/qwen3.8
  - https://docs.ollama.com/api/anthropic-compatibility
  - https://docs.ollama.com/api/openai-compatibility
  - https://github.com/ollama/ollama/blob/main/docs/integrations/codex.mdx
  - https://learn.chatgpt.com/docs/config-file/config-reference
  - https://github.com/openai/codex/blob/main/codex-rs/model-provider-info/src/lib.rs
---

# Run Qwen3.8 locally with Claude Code and Codex (M4 Pro, 48 GB)

## Recommendation

On this **48 GB M4 Pro MacBook Pro**, run **`qwen3.8:27b-mlx` through Ollama**, give the agent a **64k context window**, and launch Claude Code or Codex through Ollama's integration commands. This is the shortest verified path and one installed model can serve both clients.

Do not try to run `Qwen3.8-2.4T-A95B` locally. It is a sparse model with **2.4 trillion total / 95 billion active parameters**; even its active parameter count exceeds the laptop's memory before allowing for weights, experts, KV cache, and the OS ([official model card](https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B#model-overview)). Use Qwen Cloud or another remote host if “Qwen3.8-Max” is what was intended.

## Which model the names refer to

- **`Qwen/Qwen3.8-27B`** is the local candidate: a dense 27B vision-language model with an MTP head and 262,144-token native context ([official model card](https://huggingface.co/Qwen/Qwen3.8-27B#model-overview)). The unquantized Hugging Face repository is 55.6 GB, so it does not fit usefully in 48 GB alongside runtime state ([official files](https://huggingface.co/Qwen/Qwen3.8-27B/tree/main)).
- **Ollama `qwen3.8:27b-mlx`** is an 18 GB MLX package with a 256k advertised context limit. Ollama also lists `qwen3.8:27b`; select the explicit `-mlx` tag on Apple Silicon ([official Ollama library](https://ollama.com/library/qwen3.8)).
- **`Qwen/Qwen3.8-2.4T-A95B`** is the Max-class open checkpoint, not “a 95B model that will just squeeze in.” It has 512 experts and activates 10 routed plus one shared expert per token ([official model card](https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B#model-overview)).

## Install and configure the shared local server

Install Ollama for macOS from its official distribution, then:

```bash
ollama pull qwen3.8:27b-mlx
OLLAMA_CONTEXT_LENGTH=65536 ollama serve
```

If the Ollama app is already running, quit it before starting the shell server with the environment override, or set `OLLAMA_CONTEXT_LENGTH=65536` in the app's launch environment. Confirm what is loaded during an agent session:

```bash
ollama ps
```

The 64k setting is deliberate. Ollama's official Codex integration says Codex needs a large context and recommends **at least 64k** ([Ollama Codex integration](https://github.com/ollama/ollama/blob/main/docs/integrations/codex.mdx#usage-with-ollama)). It also leaves roughly 30 GB of unified memory beyond the 18 GB model package for macOS, applications, runtime buffers, and cache. Do not expose the server beyond localhost unless authentication and network controls are added.

## Claude Code

### Preferred launch

```bash
ollama launch claude --model qwen3.8:27b-mlx
```

The model's official Ollama page advertises exactly this Claude Code integration ([Ollama model page](https://ollama.com/library/qwen3.8)), while Ollama's Anthropic-compatibility documentation says `ollama launch claude` configures and launches Claude Code and `--config` configures without launching ([official integration docs](https://docs.ollama.com/api/anthropic-compatibility#using-with-claude-code)):

```bash
ollama launch claude --model qwen3.8:27b-mlx --config
```

### Transparent/manual launch

If the launcher does not recognize the newly released model, use the protocol directly:

```bash
ANTHROPIC_AUTH_TOKEN=ollama \
ANTHROPIC_BASE_URL=http://localhost:11434 \
claude --model qwen3.8:27b-mlx
```

Ollama documents the token as required but ignored and the base URL **without `/v1`**. Its `/v1/messages` compatibility includes streaming, system prompts, multi-turn conversations, tools, tool results, vision, and thinking blocks ([Anthropic compatibility](https://docs.ollama.com/api/anthropic-compatibility)).

Do not permanently export `ANTHROPIC_BASE_URL` in a general shell profile unless every Claude Code session should use Ollama; a small wrapper function or alias avoids accidentally redirecting normal Anthropic sessions.

## Codex CLI

### Preferred launch

```bash
ollama launch codex
```

Choose `qwen3.8:27b-mlx` when prompted. `ollama launch codex --config` writes the integration without launching, and `ollama launch codex --restore` removes its generated profile/catalog ([official Ollama Codex integration](https://github.com/ollama/ollama/blob/main/docs/integrations/codex.mdx#quick-setup)).

### Minimal manual launch

```bash
codex --oss -m qwen3.8:27b-mlx
```

Codex has a built-in `ollama` OSS provider on port 11434 and now uses the **Responses API**; the old `ollama-chat` provider and `wire_api = "chat"` are explicitly rejected in current Codex source ([OpenAI Codex provider source](https://github.com/openai/codex/blob/main/codex-rs/model-provider-info/src/lib.rs)). Ollama supports `/v1/responses` with streaming, tool calls, and reasoning summaries ([Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility#v1responses)).

For a persistent selection in `~/.codex/config.toml`, use a named profile so local Qwen does not replace the normal OpenAI default:

```toml
[profiles.qwen-local]
model = "qwen3.8:27b-mlx"
model_provider = "ollama"
model_context_window = 65536
model_reasoning_effort = "medium"
model_supports_reasoning_summaries = true
```

Launch it with:

```bash
codex --profile qwen-local
```

The official Codex configuration reference defines profiles, `model_provider`, `model_context_window`, and the reasoning controls; it also says `openai`, `ollama`, and `lmstudio` are reserved built-in provider IDs ([Codex config reference](https://learn.chatgpt.com/docs/config-file/config-reference)). Do not add a `[model_providers.ollama]` table unless diagnosing a version-specific problem—the built-in provider already has the correct Responses endpoint.

## Speed-oriented configuration

1. **Use the 18 GB MLX quant, not full precision.** The full repository is larger than physical memory once runtime overhead is counted; swapping destroys interactive agent performance.
2. **Start at 64k context, not 256k.** The model supports 262k natively, but capability is not free allocation. Agent harnesses need more than chat defaults, while 64k is Ollama's documented Codex recommendation and is a safer memory/latency point on 48 GB.
3. **Keep reasoning at medium initially.** Qwen says thinking is enabled by default and `reasoning_effort` controls depth ([official Qwen card](https://huggingface.co/Qwen/Qwen3.8-27B#qwen38-highlights)). Higher effort improves difficult work but emits more tokens and makes agent loops slower.
4. **Keep one agent client active at a time.** Claude Code and Codex can share the same server/model, but concurrent generations compete for the same GPU and memory bandwidth.
5. **Measure the real session.** Use `ollama ps` to confirm context/allocation and compare time-to-first-token plus generation speed on the same repository task before changing quant or context.
6. **Only chase MTP after the baseline works.** The official model has an MTP head, but Ollama's model page does not promise that its package uses native multi-token speculative decoding. An MTP-aware MLX server may be faster, but that is a separate, less turnkey path documented in [[qwen38-mtp-server-setup]].

## Practical expectations and limitations

This setup is plausible, not equivalent to hosted frontier Codex or Claude. Qwen reports strong coding scores and evaluates several tasks through a Claude Code harness ([official benchmark notes](https://huggingface.co/Qwen/Qwen3.8-27B#benchmark-results)), but those are vendor results and not a speed or reliability measurement for this laptop. Local serving also lacks some hosted-provider features. In particular, Ollama's Responses support is non-stateful, so prompt reuse depends on the local runtime rather than `previous_response_id` or hosted conversations ([Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility#v1responses)).

The clean rollout is therefore:

1. install `qwen3.8:27b-mlx` once;
2. validate a 64k Claude Code session with `ollama launch claude`;
3. validate Codex with `codex --oss -m qwen3.8:27b-mlx`;
4. add the named Codex profile only after the one-shot command works;
5. benchmark before considering the more complex MTP route.

Related: [[qwen38-claude-code-m4]], [[qwen38-mtp-server-setup]].
