---
title: Context Reducer Design
type: synthesis
created: 2026-08-26
updated: 2026-08-26
sources: []
---

# Context Reducer Design

This is the temporary design memory and handoff for a possible standalone context-reduction tool. It is not part of the Second Brain's domain model. Keep updating this page until the owner chooses the product's documentation home.

Related research: [[open-source-local-context-reducers]].

## Resume here

The design interview is paused before questions 9–14. Resume with the questions under **Open interview frontier**. Do not treat the recommended answers there as accepted.

The choices already accepted are still **provisional working assumptions**. The owner wants to see a prototype's outcome before making them durable. No architectural decision is accepted yet, and no product ADR should be created yet.

## User intent and corrections

- Create a context reducer for coding-agent clients including Claude Code and Codex.
- Cover all forms of reduction eventually rather than mistaking one narrow mechanism for the whole product.
- Begin as a personal tool while avoiding needless coupling that would prevent later open-sourcing.
- Keep raw context and the reduction process local by default.
- Treat the recommendations accepted so far as hypotheses to test, not final decisions.
- The Second Brain is only recording and developing this idea; it is not the context-reducer project itself.
- The eventual location of authoritative product documentation is undecided. The owner will decide where it belongs later. Until then, continue recording the work on this page.

An earlier draft incorrectly added context-reducer terms to the Second Brain's root `CONTEXT.md`. That change was removed. Do not put product vocabulary or product ADRs in the Second Brain's domain documentation.

## Interview record

### Round 1 — accepted

1. **Product breadth:** all four reduction layers are in the intended scope.
2. **First consumer:** personal tool first, designed so it could later be open-sourced.
3. **Privacy boundary:** raw context and reduction remain local. Reduced context may go to the model provider the agent already uses, but the reducer must not introduce another recipient.

### Round 2 — accepted provisionally

4. **Delivery scope:** design for all four layers but implement incrementally. Begin with session-history reduction plus addressable tool and file results; add repository retrieval and full outbound-prompt interception later.
5. **Architecture seam:** one shared core with client-specific adapters. Aim for semantic portability across clients rather than identical mechanics.
6. **Loss semantics:** the system can use lossy representations only when omitted originals remain locally recoverable through stable references. Do not describe a lossy summary itself as lossless.
7. **Unequal client capabilities:** degrade visibly to explicit or manual operations where a client lacks native integration. Do not make provider or TLS interception foundational merely to force equivalence.
8. **Authority:** progress from shadow evaluation, to previewed/manual reduction, to automatic application only after a policy meets measured safety thresholds. Original retrieval remains available throughout.

## Intended product

A personal-first tool, designed so it could later be open-sourced, that reduces context supplied to coding agents such as Claude Code and Codex. Its core should not depend on the Second Brain.

The eventual scope spans four distinct reduction layers:

1. session history;
2. tool and file output;
3. repository-context selection;
4. complete outbound prompts.

The system should be designed to accommodate all four layers but implemented incrementally. The first vertical slice should combine session-history reduction with addressable tool and file results. Repository retrieval and full outbound-prompt interception come later so that failures can be attributed to one layer at a time.

The four layers are related but distinct:

| Layer | Context being reduced | Likely integration pressure |
|---|---|---|
| Session history | Earlier turns, decisions, attempts, and results | Client session formats, compaction, resume/handoff |
| Tool and file output | Large reads, logs, JSON, MCP payloads | Hooks, wrappers, local artifact retrieval |
| Repository selection | Code and documentation chosen for inspection | Indexes, symbol graphs, search and retrieval tools |
| Outbound prompt | The complete request sent to a model | Provider API compatibility or proxying |

## Working vocabulary

**Context reducer**:
The overall system that coordinates multiple ways of reducing context supplied to coding agents.

**Reduction layer**:
One class of context targeted by reduction: session history, tool and file output, repository selection, or the complete outbound prompt.

**Local reduction**:
Reduction in which raw context and the reduction process remain on the workstation. Reduced context may be sent to the model provider already selected by the agent, but reduction does not introduce another data recipient.

**Recoverable reduction**:
A reduction whose omitted source content remains locally available through stable references. The reduced representation may be lossy; recoverability applies to the system, not to the summary itself.

The following terms have been proposed but are not yet accepted:

**Context capsule**:
A bounded, client-neutral continuation view containing task state and stable references to supporting artifacts.

**Source event**:
An immutable normalized record of something that contributed context, retaining its original client identity and provenance.

**Source artifact**:
Immutable original content stored outside the active context and addressed by a stable identifier.

## Working design assumptions

- One shared core should own reduction artifacts, policies, provenance, and retrieval. Client-specific adapters translate Claude Code, Codex, and future client events into and out of that core.
- Cross-client support means semantic portability, not identical integration behaviour. Missing client capabilities should degrade visibly to explicit or manual operations rather than forcing invasive interception.
- Original content omitted by a lossy representation should remain locally recoverable through a stable reference.
- Authority should progress from shadow evaluation, to previewed or manual reduction, to automatic policies that have met measured safety thresholds. Retrieval of original content remains available throughout.

## Research baseline

The existing 25-project survey found no single mature tool that safely handles every layer for both Claude Code and Codex. Its current shortlist is:

- llmtrim or Headroom for broad request interception;
- Codanna, CostWise, or Code Context Engine for repository retrieval;
- mcp-trunc-proxy or tokz/compress for targeted output virtualization;
- client-specific history approaches for Claude Code and Codex.

The research also established important distinctions:

- prompt-cache optimization may reduce cost or latency without reducing the context window;
- “local” describes where reduction and raw storage happen, not necessarily where the selected agent model runs;
- Claude Code and Codex expose different integration and compaction capabilities;
- “lossless” history products commonly mean that raw lineage remains recoverable, not that summaries preserve every fact in their visible representation.

Consult [[open-source-local-context-reducers]] before selecting dependencies or claiming that a single existing project covers the whole design.

## Open interview frontier

These questions were asked but have **not** been answered. The arrows preserve the current recommendation only.

### Q9 — Documentation lifecycle

While there is no standalone project, should the Second Brain hold the evolving synthesis, with accepted vocabulary and ADRs moving into the product repository once it exists?

→ Recommend yes: provisional exploration here, authoritative documentation beside the future product.

### Q10 — Capture versus reduction

Should context be captured continuously even while applying reductions remains manual, or should collection begin only when reduction is requested?

→ Recommend passive continuous capture with explicit reduction. Late capture cannot reliably recover already-discarded tool output.

### Q11 — Core data model

Should the shared core store mutable transcripts, opaque client session files, or normalized append-only events referencing immutable content?

→ Recommend normalized append-only events plus content-addressed artifacts, while retaining original client identifiers and payload provenance. Summaries and selections become replaceable projections.

### Q12 — Portable output

What should a reduced session produce when a task moves between clients?

→ Recommend a client-neutral context capsule containing the goal, constraints, decisions, changed files, test state, failed approaches, unresolved questions, and stable evidence references.

### Q13 — Optimization order

When goals conflict, which wins: correctness, recoverability, token reduction, latency, or storage size?

→ Recommend correctness, then recoverability, token reduction, latency, and storage size. Evaluate task completion and evidence recall alongside token savings.

### Q14 — Model involvement

Should reduction use deterministic transforms, a local model, or both?

→ Recommend a hybrid. Use deterministic processing for capture, deduplication, structure, budgets, storage, and provenance. Allow a local model to synthesize semantic state, but keep claims traceable and preserve a model-free operating path.

## Design procedure

Use this procedure while the design remains in the Second Brain:

1. **Resume from this memory.** Read this page and [[open-source-local-context-reducers]] before asking more questions or changing assumptions.
2. **Work the design tree in rounds.** Ask every currently unblocked decision together, number the questions, and include a recommended answer. Do not ask questions whose prerequisites remain unsettled.
3. **Find facts instead of asking for them.** Inspect relevant client documentation, source code, local files, and prior research. Ask the owner only for preferences, priorities, constraints, and trade-off decisions.
4. **Separate answer states.** Mark each item as unanswered, recommended, provisionally accepted, validated, or accepted. Silence is not acceptance.
5. **Record each round immediately.** Update the interview record, working vocabulary, assumptions, open frontier, and contradiction notes on this page. Update `wiki/index.md` only if the page's one-line scope changes materially.
6. **Prototype before freezing uncertain architecture.** Define a small experiment and its success measures. Record observed outcomes separately from expectations. Use evidence to confirm, revise, or reject provisional decisions.
7. **Do not create premature ADRs.** Create one only after the owner accepts a decision that is hard to reverse, surprising without context, and the result of a real trade-off.
8. **Keep the Second Brain boundary clean.** Do not add context-reducer vocabulary to the root `CONTEXT.md`, and do not put reducer ADRs in this repository's `docs/adr/`.
9. **Migrate authority when a product home exists.** Copy accepted glossary terms and decisions into the product repository, then change this page to link to the authoritative files. Preserve this page as the historical synthesis rather than silently rewriting the exploration.

## Documentation to produce

### While the location is undecided

- **This design memory:** complete handoff, interview record, provisional model, unanswered decisions, and documentation procedure.
- **Research synthesis:** the existing comparison of available reducers and integration constraints in [[open-source-local-context-reducers]].
- **Prototype report:** create only when an experiment is run; record setup, corpus, expected result, observed result, failures, and resulting decision changes.

### In the eventual product repository

Create these lazily as their content becomes real:

1. **`CONTEXT.md` — product glossary only.** Define canonical domain terms such as context reducer, reduction layer, source event, source artifact, context capsule, reduction policy, and client adapter. Keep implementation details and decisions out.
2. **Product brief or README.** State the user problem, explicit scope and non-goals, privacy promise, supported clients, and first usable workflow.
3. **Architecture overview.** Describe the shared core, capture path, artifact store, projections, policy engine, retrieval path, and client adapters.
4. **Artifact and event contract.** Specify identifiers, provenance, immutability, ordering, versioning, integrity, and the schemas for source events, source artifacts, and context capsules.
5. **Client capability matrix.** Record how each client supports capture, injection, compaction, retrieval, resume, hooks, MCP, and provider routing; state every fallback and unsupported capability.
6. **Reduction-policy specification.** Define eligibility, budgets, protected content, evidence-link requirements, thresholds, failure behaviour, and shadow/manual/automatic modes.
7. **Privacy, security, and retention model.** Document where raw content lives, which processes can read it, whether it is encrypted, how long it remains, deletion semantics, redaction, repository/worktree isolation, and the rule against introducing another recipient.
8. **Evaluation plan and benchmark corpus.** Measure task correctness, evidence recall, missed diagnostics, recovery calls, token reduction, latency, retries, and storage. Compare one reduction layer at a time against unreduced baselines.
9. **Prototype reports.** Preserve the evidence used to promote or reject provisional choices.
10. **ADRs.** Record only accepted, durable trade-offs. Plausible later candidates include the event/artifact model, integration boundary, storage technology, and privacy boundary—but none qualifies yet.
11. **Implementation roadmap or issue set.** Break the validated vertical slice into independently testable work only after its contracts and evaluation criteria are clear.
12. **User and operations guide.** Explain installation, client setup, shadow mode, inspecting a proposed reduction, retrieving originals, retention controls, diagnostics, and removal.

## Remaining design tree

After Q9–Q14, continue outward through:

1. session, project, repository, branch, and worktree identity;
2. event ordering, deduplication, content addressing, and mutation handling;
3. the exact context-capsule contract and token-budget allocation;
4. protected information that may never be reduced automatically;
5. artifact retention, promotion, deletion, encryption, and redaction;
6. summarization prompts, deterministic fallbacks, provenance, and contradiction handling;
7. retrieval UX and how an agent discovers missing evidence;
8. Claude Code and Codex capture/injection adapters and their failure modes;
9. first-client and first-platform selection;
10. benchmark tasks, baselines, acceptance thresholds, and rollback criteria;
11. prototype boundaries, implementation language, packaging, and distribution;
12. observability, corruption recovery, migrations, and eventual open-source constraints.
