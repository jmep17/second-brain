---
title: Open-source, local-only context reducers for Claude Code and Codex
type: answer
created: 2026-08-26
updated: 2026-08-26
sources:
  - "https://github.com/lossless-claude/lcm"
  - "https://github.com/GodsBoy/lossless-code"
  - "https://github.com/tokz-dev/compress"
  - "https://github.com/elara-labs/code-context-engine"
  - "https://github.com/blakemcbride/Code-RAG"
  - "https://github.com/fkiene/llmtrim"
  - "https://github.com/headroomlabs-ai/headroom"
  - "https://github.com/bartolli/codanna"
  - "https://github.com/okyashgajjar/costwise-mcp"
  - "https://github.com/oraios/serena"
  - "https://github.com/marco-jardim/mcp_trunc_proxy"
  - "https://github.com/alibaizhanov/densely"
  - "https://github.com/anvanster/compressor"
  - "https://github.com/sphragis-oss/isthmos"
  - "https://github.com/kehoej/contextception"
  - "https://github.com/henri-edh/context-mode-mcp"
  - "https://github.com/NodeNestor/claude-rolling-context"
  - "https://github.com/buildoak/wet"
  - "https://github.com/zzallirog/weighted-compact"
  - "https://github.com/zilliztech/claude-context"
  - "https://github.com/uwuclxdy/claudix"
  - "https://github.com/lytics/dev-agent"
  - "https://github.com/hyunjae-labs/lore"
  - "https://github.com/yatesdr/go-llm-proxy"
  - "https://github.com/rtk-ai/rtk"
---

# Open-source, local-only context reducers for Claude Code and Codex

## Revised conclusion

RTK should **not** be the general recommendation. It is a command-specific stdout formatter whose Codex integration depends on the model following instructions. It touches neither conversation history nor built-in file reads, MCP payloads, tool schemas, or repeated repository discovery. Its percentage claims concern supported Bash output, not the total context window ([RTK README](https://github.com/rtk-ai/rtk)).

There is no single mature tool that safely solves every layer for both clients. The strongest trials found in this broader search are:

1. **llmtrim** for the broadest OSI-licensed, cross-client interception. It supports Claude Code and Codex through a local HTTPS proxy, makes no extra model calls, includes a lossless mode and content-aware lossy modes, and quality-gates cuts against query coverage. The price is a major trust surface: it installs a local CA and performs TLS interception ([repository](https://github.com/fkiene/llmtrim)).
2. **Headroom** for a conventional cross-client local API proxy. It has explicit `wrap claude` and `wrap codex` paths, content-aware compression, reversible cached originals, and an Apache-2.0 repository. It is broad and active, but the proxy sees provider traffic and Claude needs a tool-search setting through custom base URLs or schemas can enlarge the initial context ([README](https://github.com/headroomlabs-ai/headroom), [proxy caveat](https://github.com/headroomlabs-ai/headroom/blob/main/docs/content/docs/troubleshooting.mdx)).
3. **Codanna** for local repository navigation across both clients. It indexes symbols, calls, dependencies, documents, and semantic embeddings locally, explicitly documents Claude Code and Codex, and has a current release/changelog trail ([repository](https://github.com/bartolli/codanna), [changelog](https://github.com/bartolli/codanna/blob/main/CHANGELOG.md)).
4. **CostWise** as a lighter structural alternative: Tree-sitter plus SQLite, token-budgeted symbol/call results, local stashing and fact memory, explicit Claude/Codex configs, and no API key ([repository](https://github.com/okyashgajjar/costwise-mcp)).
5. **mcp-trunc-proxy** when one or two verbose MCP servers are the actual problem. It stores oversized results locally and exposes preview/range/grep/tail retrieval rather than injecting the whole result ([repository](https://github.com/marco-jardim/mcp_trunc_proxy)).

Two focused additions are also worth a trial: **tokz/compress** for automatic, byte-exact Claude file/MCP reduction, and **Code Context Engine** as a locally embedded repository retriever with explicit setup for both clients. tokz's Codex MCP currently is not automatically selected, while Code Context Engine depends on agent instructions rather than enforced interception ([tokz/compress](https://github.com/tokz-dev/compress), [Code Context Engine](https://github.com/elara-labs/code-context-engine)).

For Claude Code history, **Rolling Context** with an explicitly local Ollama/LM Studio/vLLM summarizer is plausible; **weighted-compact** favours auditability over automation. For Codex with a local model, **go-llm-proxy** implements the Responses compaction endpoint, although Claude compaction is explicitly unsupported ([Rolling Context](https://github.com/NodeNestor/claude-rolling-context), [weighted-compact](https://github.com/zzallirog/weighted-compact), [go-llm-proxy](https://github.com/yatesdr/go-llm-proxy/blob/master/docs/codex.md)).

## Definitions

“Local reduction” means filtering, indexing, compression, storage, or summarization happens on the workstation. The reduced prompt may still be sent to the configured model provider. A “local MCP server” may still call hosted embeddings or storage and is not automatically local-only.

- **OSI open source:** MIT, Apache-2.0, BSD-3-Clause, GPL-3.0, MPL-2.0, or another approved licence.
- **Source-available:** readable source with non-OSI restrictions. Context Mode (Elastic-2.0) and Caveman's engine (BSL-1.1) belong here.
- **Local by default:** no hosted reducer, embedding API, or database is needed in normal use.
- **Local with configuration:** qualifies only after selecting a local summarizer, embeddings, and/or vector database.
- **Cache optimisation is not context reduction:** it can lower billing or latency without shrinking the window.

## Candidate matrix

| Project | Actual layer | Claude | Codex | Local status | License | Main risk |
|---|---|---:|---:|---|---|---|
| [llmtrim](https://github.com/fkiene/llmtrim) | HTTPS proxy; dedup, output pruning, JSON sampling, code skeletons, lexical selection | Explicit | Explicit | Local by default; no model calls | MPL-2.0 | Installs local CA/MITMs TLS; lossy presets can alter evidence; capture options retain prompts |
| [Headroom](https://github.com/headroomlabs-ai/headroom) | Proxy compresses history, tool output, files, JSON; reversible cache | Explicit wrapper/MCP | Explicit wrapper/MCP | Local-first; upstream remains configured provider | Apache-2.0 | Proxy owns traffic; may disrupt Claude tool-schema deferral |
| [Codanna](https://github.com/bartolli/codanna) | Symbol/call/dependency index, semantic search, document RAG | Explicit MCP/skill | Explicit MCP/skill | Local; downloads embedding model | Apache-2.0 | Index/model cost and retrieval omissions |
| [CostWise](https://github.com/okyashgajjar/costwise-mcp) | Tree-sitter/SQLite, bounded reads, stash/recall, facts | Explicit | Explicit | Local; optional CI/Postgres paths are not | MIT | Young; agent must choose its tools; benchmarks use naive baseline |
| [Code Context Engine](https://github.com/elara-labs/code-context-engine) | Tree-sitter chunks, hybrid retrieval/graph, local memory and output compression | MCP + instructions | MCP + AGENTS.md | Local via bundled ONNX or Ollama; optional LLM summaries if Ollama is present | MIT | 11 tool schemas; retrieval benchmark has severe monorepo failure case; no enforced built-in-read interception |
| [Serena](https://github.com/oraios/serena) | LSP outlines, references, targeted reads/edits | Explicit | Explicit | Local with free LSP backend | MIT | Selective retrieval, not transcript reduction |
| [tokz/compress](https://github.com/tokz-dev/compress) | Tree-sitter/BM25 selects byte-exact file spans; local original retrieval; MCP-output hook | Automatic plugin/hooks | MCP registered but current Codex may not surface it | Local; no network/model by default, LLMLingua opt-in | MIT | Very young; 90.7% span recall means omissions/retrieval; Codex normally keeps built-in Read |
| [mcp-trunc-proxy](https://github.com/marco-jardim/mcp_trunc_proxy) | Virtualises large MCP output behind preview/range/grep/tail | Explicit | Generic MCP, not first-party verified | Local; memory/file/Redis | GPL-3.0 | Extra round trips and possible missed content |
| [Densely](https://github.com/alibaizhanov/densely) | Lossless compressed payload + preview/expansion; hook | Explicit | No documented adapter | Local; optional neural model | MIT | Payload unreadable until expansion; extremely young |
| [Compressor](https://github.com/anvanster/compressor) | Claude hook shrinks Read/Bash/Grep/Glob; lean instructions | Native | Instructions only | Local | MIT | No Codex output-hook enforcement |
| [isthmos](https://github.com/sphragis-oss/isthmos) | JSON field pruning and text truncation | Native hook | Wrapper only | Local | Apache-2.0 | Rules can silently remove needed fields |
| [Contextception](https://github.com/kehoej/contextception) | Static graph/git ranking with token budget | MCP | MCP | Local; update check optional | MIT | Young, six language families |
| [Context Mode](https://github.com/henri-edh/context-mode-mcp) | Sandboxed tools, extraction, SQLite events after compaction | Plugin/hooks | MCP/hooks | Local by claim | **Elastic-2.0** | Not OSI; invasive rerouting; maintainer benchmarks |
| [Rolling Context](https://github.com/NodeNestor/claude-rolling-context) | Rolling old-message summary, recent verbatim tail | Plugin/proxy | No | **Only local with local summarizer** | MIT | Lossy summary recursion and proxy/logging risks |
| [lossless-claude LCM](https://github.com/lossless-claude/lcm) | SQLite summary DAG, raw lineage, promoted memory, expansion | Automatic hooks/MCP | Connector/import/manual MCP; no automatic capture/compaction | **Not local-only by default**: `auto` uses Claude process; local storage and redaction | MIT | “Lossless” means recoverable raw history, not lossless summaries; daemon and sensitive transcript store; Codex support incomplete |
| [lossless-code](https://github.com/GodsBoy/lossless-code) | SQLite DAG, bounded restore bundle, BM25 recall, dream patterns | Automatic hooks/MCP | SessionStart hook/launcher + MCP; tail import opt-in | **Not local-only by default**: auto prefers Claude CLI/API; force extractive or Ollama | MIT | Cloud summarization unless configured; complex hook/vault/dream system; Codex does not mirror Claude turn capture/compaction |
| [wet](https://github.com/buildoak/wet) | Replaces stale tool results; deterministic transforms in auto mode | Explicit | Roadmap | Local in deterministic tier | MIT | Passthrough by default; single active-session design |
| [weighted-compact](https://github.com/zzallirog/weighted-compact) | Claude JSONL recap and ranked substrate | MCP/manual | No | Local | MIT | Own tests find no ranking edge over BM25/recency; alpha workflow |
| [Claude Context](https://github.com/zilliztech/claude-context) | AST chunks, BM25+dense retrieval, vector index | Explicit | Explicit | **Only local with Ollama + local Milvus** | Apache-2.0 | Quick start is cloud-dependent; heavy local stack |
| [claudix](https://github.com/uwuclxdy/claudix) | Local semantic index; can intercept Grep | Native plugin | No | Local bundled model/Ollama | MIT OR Apache-2.0 | New and invasive grep interception |
| [dev-agent](https://github.com/lytics/dev-agent) | Semantic/graph/git retrieval, progressive budgets | Explicit | Not documented | Local by design | MIT | Own benchmark concedes reduced deep-debug thoroughness |
| [lore](https://github.com/hyunjae-labs/lore) | Searches prior Claude/Codex sessions locally | Explicit | Explicit | Local ONNX/sqlite-vec | MIT | Stale results and sensitive transcript index |
| [go-llm-proxy](https://github.com/yatesdr/go-llm-proxy) | Local router; Codex `/v1/responses/compact` | Routing only | Explicit compaction | Local with local backend | MIT | Summary quality and proxy trust; no Claude compaction |
| [RTK](https://github.com/rtk-ai/rtk) | Formats supported shell commands | Native rewrite | Instruction-guided | Local; telemetry opt-in | Apache-2.0 | Bypassed by built-ins, MCP, history, and noncompliance |
| [Code-RAG](https://github.com/blakemcbride/Code-RAG) | Local semantic snippets, symbols, dependents, history | MCP + routing note | Explicit MCP guide | Local Ollama embeddings/Postgres | **Licence metadata conflict:** LICENSE.txt detected as BSD-2-Clause; README says Apache-2.0 | Heavy Java 21/Postgres/pgvector/Ollama stack; no releases; clarify licence before redistribution |

Maintenance is a 2026-08-26 snapshot. Releases, changelogs, tests, explicit limitations, and integration paths were weighted above stars.

## The most useful trials

### llmtrim versus Headroom

llmtrim is the strongest newly found broad OSI candidate. It runs in-process without an extra summarizer, offers `safe` lossless and lossy agent/code/RAG modes, and reverts cuts when its query-coverage quality gate fails. It can intercept both clients even when they lack equivalent hook APIs ([repository](https://github.com/fkiene/llmtrim)). That capability comes from HTTPS interception: installing a local CA and giving a process plaintext access to all provider requests is a materially larger security decision than installing an MCP server. Keep it loopback-only, disable captures/update checks if desired, and inspect the certificate lifecycle before testing.

Headroom is operationally more conventional: `headroom wrap claude` or `headroom wrap codex` starts a local API proxy; MCP/library modes also exist. It covers multiple content types and retains originals for retrieval. The repository includes tests, release automation, an SBOM, provider adapters, limitations, and evaluation machinery ([repository](https://github.com/headroomlabs-ai/headroom)). Start with memory/code-graph extras disabled so the comparison measures compression. Through a custom Anthropic base URL, verify `ENABLE_TOOL_SEARCH`; otherwise Claude may eagerly inject schemas and erase the savings ([troubleshooting](https://github.com/headroomlabs-ai/headroom/blob/main/docs/content/docs/troubleshooting.mdx)).

### Codanna, CostWise, or Serena

Codanna is the strongest broad code-intelligence candidate: a local Rust index exposes definitions, callers, dependencies, impact analysis, semantic search, and document retrieval to both clients. Its current changelog and 15-language scope are meaningful maintenance signals ([repository](https://github.com/bartolli/codanna)).

CostWise uses Tree-sitter/SQLite, returns budgeted scopes rather than files, and adds local stash/recall plus durable facts. It documents both config surfaces and index freshness states. Its 99% claims compare to naive full-repository reads, so evaluate actual whole-session savings ([repository](https://github.com/okyashgajjar/costwise-mcp)). Serena remains the mature LSP-backed fallback, but only helps when the model chooses symbol tools ([repository](https://github.com/oraios/serena)). Run one repository retriever at a time; overlapping schemas and indexes can consume the saved context.

Code Context Engine is a credible fourth option. `cce init` writes client-specific MCP config and instructions for both Claude and Codex; its `[local]` extra runs a roughly 60 MB embedding model through ONNX, or it can use local Ollama. Tree-sitter chunks, FTS5/vector retrieval, graph expansion, output compression, and session recall all stay in local SQLite ([repository](https://github.com/elara-labs/code-context-engine)). Its benchmark is unusually reproducible and unusually useful about failure: reported Recall@10 is 0.95 on Django but only 0.07 on the Fiber monorepo. The advertised 94% is retrieval savings against its baseline, not guaranteed whole-session reduction.

### Target a known output source

- **mcp-trunc-proxy** is the clearest fit for a verbose database/browser/GitHub MCP. It retains results outside history and exposes targeted retrieval. Codex compatibility follows standard MCP but is not explicitly demonstrated ([repository](https://github.com/marco-jardim/mcp_trunc_proxy)).
- **tokz/compress** is the strongest automatic Claude-specific option found for large reads. A `PreToolUse` hook denies large built-in Read calls and directs the agent to byte-exact Tree-sitter/BM25 spans; `PostToolUse` compresses oversized MCP output; omitted ranges remain in a local cache. It is MIT, offline by default, fail-open, and has 109 tests plus a reproducible evaluation. Its own result is 90.7% span recall at 50.9% tokens retained, so targeted retrieval still matters. Codex setup only registers MCP and the project's cited upstream limitation says the model may not discover stdio tools, so it is not automatic there ([repository](https://github.com/tokz-dev/compress)).
- **Densely** stores redundant data losslessly in tokenizer-efficient carrier words and exposes exact expansion. This preserves bytes but not model readability; expansion is required. Its MIT project and benchmarks are extremely new ([repository](https://github.com/alibaizhanov/densely)).
- **Compressor** has native Claude output hooks plus a documented benchmark process; its Codex value is only an instruction pack ([repository](https://github.com/anvanster/compressor)).
- **isthmos** is appropriate for known verbose JSON fields. Use shadow mode first. Plain-text mode truncates rather than compresses ([repository](https://github.com/sphragis-oss/isthmos)).

### History compaction is client-specific

Rolling Context is a Claude localhost proxy that summarizes old messages, retains a recent verbatim tail, and keeps the original JSONL. It is local-only when `ROLLING_CONTEXT_SUMMARIZER_URL` points to a local OpenAI-compatible endpoint; native mode calls Claude. Summary recursion is lossy, debug logs can contain content, and the README records fixes for runaway logs and stale state ([repository](https://github.com/NodeNestor/claude-rolling-context)).

weighted-compact mines Claude session JSONL into inspectable artifacts. Its README candidly reports that its six-signal ranker has not beaten BM25/recency and its corpus is limited, so treat it as an auditable recap/search substrate, not proven `/compact` replacement ([repository](https://github.com/zzallirog/weighted-compact)).

Codex compaction requires protocol support. go-llm-proxy explicitly implements `/v1/responses/compact` for local backends and explicitly marks Claude compaction unsupported ([documentation](https://github.com/yatesdr/go-llm-proxy/blob/master/docs/codex.md)).

Two DAG-based “lossless” projects were missed earlier. [lossless-claude LCM](https://github.com/lossless-claude/lcm) is the more engineered Claude integration: four hooks automatically persist, compact, restore, and retrieve from a project SQLite summary DAG; raw messages remain expandable. It is MIT with 342 commits and tests. But default `auto` summarization resolves to a Claude subprocess, so it is not local-only unless the summarizer is disabled or redirected appropriately. Codex currently gets a skill/import/manual MCP workflow with no automatic restore, writeback, or compaction; the README explicitly tracks first-class support as unfinished.

[lossless-code](https://github.com/GodsBoy/lossless-code) also persists raw messages and source-linked summaries in SQLite, injects a bounded 1,000-token reference bundle, and supplies expansion/search. Claude has full hook automation. Codex has a SessionStart hook or launcher and optional local-tail task-state import, but not equivalent automatic turn capture and compaction. Its default provider order prefers the authenticated Claude CLI, then API keys, then a configured local OpenAI endpoint, and only then extractive TF-IDF; force `summaryProvider: local` or configure Ollama for genuinely local reduction. “Lossless” in both projects describes retention and lineage, not summary fidelity.

## Why RTK may disappoint

1. Its denominator is supported Bash output, not total context.
2. Codex receives behavioural instructions rather than transparent interception.
3. Claude's built-in Read, Grep, Glob, and MCP tools bypass it.
4. Already-terse commands gain little; most upside is large test/build/log output.
5. Formatting is not relevance and can hide an unusual diagnostic.
6. It does not prevent repeated discovery; retrieval can avoid whole tool calls.

RTK remains reasonable shell hygiene only after measurement shows test/build output is the bottleneck.

## Practical trial plan

Use 5–10 representative tasks and record total input tokens, cache writes/reads, wall time, tool calls, retries, missed diagnostics, and correctness.

1. Establish a no-reducer baseline.
2. Trial **llmtrim** only if local-CA/TLS interception is acceptable; otherwise trial **Headroom**, with extras disabled and Claude tool search verified.
3. Separately trial **Codanna** and **CostWise**; do not install both together.
4. If a named MCP dominates, wrap only it with **mcp-trunc-proxy**.
5. For Claude history pressure, compare native `/compact` with **Rolling Context + local summarizer**. For Codex/local-model use, test **go-llm-proxy** compaction.
6. Inspect missing evidence and extra retrieval calls, not just average token percentages.

## Exclusions and near-matches

- [Caveman](https://github.com/JuliusBrussee/caveman) supports both proxies and publishes a pinned benchmark, but its engine/proxy is BSL-1.1 source-available, not OSI; telemetry is on by default unless disabled.
- [Code-RAG](https://github.com/blakemcbride/Code-RAG) now has a licence file and qualifies as locally operated RAG, but GitHub detects BSD-2-Clause while the README says Apache-2.0. Both are OSI licences, yet the mismatch should be resolved before redistribution. It explicitly supports both clients and keeps embeddings local, but requires Java 21, PostgreSQL 17/pgvector, and Ollama, making it much heavier than the shortlisted retrievers.
- [Pino](https://github.com/alxsuv/pino) adds Anthropic prompt-cache breakpoints. It may reduce cost but does not shrink the prompt/window.
- [Repomix](https://github.com/yamadashy/repomix) exports a repository but does not govern a live session and can increase context.
- [Aider's repository map](https://github.com/Aider-AI/aider) is token-budgeted but internal to Aider rather than a supported integration.
- Hosted memory, embedding, observability, or compression services were excluded even when their adapter is open source.

## Bottom line

The revised shortlist is **llmtrim or Headroom**, **Codanna, CostWise, or Code Context Engine**, and **mcp-trunc-proxy or tokz/compress**, selected by the observed bottleneck and client. RTK is demoted to an optional narrow formatter. For Claude-only history, lossless-claude LCM and lossless-code are serious architectures, but neither is local-only by default and neither yet provides automatic Codex compaction.
