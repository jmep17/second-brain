# Research: diagram engine alternatives (decision record)

> Not an executable plan. This is the evidence behind the engine choice that
> plans 003–007 assume. Read it before executing 005.

- **Researched at**: commit `cd109ef`, 2026-08-26
- **Question**: keep Mermaid, move to authored SVG, or adopt a different engine?
- **Answer**: three tiers — Mermaid+ELK by default, Graphviz-WASM as an escape
  hatch, authored SVG for hero diagrams. Drop `mindmap` entirely.

## The constraint that decides most of it

`diagram-plans` writes an HTML file to disk and opens it with
`scripts/open-url.sh`. The browser therefore loads it as **`file://`**, whose
origin is `null`. That rules out:

- **Real Web Workers** — `new Worker(...)` from a `null` origin throws in
  Chrome and Firefox, including `blob:` worker URLs.
- **Same-origin `fetch` of sibling assets** — a relative `fetch('./x.wasm')`
  from `file://` is blocked.

Cross-origin ESM imports and `fetch()` to an HTTPS CDN **do** work, because
jsDelivr sends `Access-Control-Allow-Origin: *`. The current page already
depends on this.

## Options evaluated

| Engine                                               | Works from `file://` | Payload                | Auto-layout quality                                            | Geist-themable      | LLM authorability                                   | Verdict                                                |
| ---------------------------------------------------- | -------------------- | ---------------------- | -------------------------------------------------------------- | ------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Mermaid + dagre (today)                              | yes                  | ~1 MB lazy chunks      | poor — `mindmap` is force-directed, dagre crosses edges freely | partial             | excellent                                           | keep as the base                                       |
| **Mermaid + ELK**                                    | **yes** — verified   | +1.63 MB chunk         | **good** — layered, far fewer crossings                        | same as Mermaid     | identical syntax                                    | **default**                                            |
| **Graphviz WASM** (`@hpcc-js/wasm-graphviz`)         | **yes** — verified   | 821 KB, wasm inlined   | **best** — `splines=ortho` gives true right angles             | full, per-attribute | good; DOT is verbose but LLMs write it reliably     | **escape hatch**                                       |
| D2 (`@terrastruct/d2`)                               | **no**               | 22 MB wasm + 8.2 MB JS | excellent                                                      | excellent           | good                                                | **rejected** for the browser                           |
| Authored inline SVG (`cathrynlavery/diagram-design`) | yes                  | 0                      | perfect — you place every node                                 | yes                 | expensive; needs a geometry verifier to stay honest | hero/architecture only                                 |
| Kroki / PlantUML server                              | yes                  | 0                      | good                                                           | limited             | good                                                | **rejected** — sends the user's plans to a third party |
| nomnoml, flowchart.js                                | yes                  | small                  | weak                                                           | limited             | ok                                                  | no advantage over Mermaid                              |

## Evidence

**Mermaid + ELK runs without a real Worker.** `@mermaid-js/layout-elk@0.2.3`
lazy-loads `dist/chunks/mermaid-layout-elk.esm.min/render-T4E67GNI.mjs`
(1,630,635 bytes). That bundle contains one `new Worker` call, but it is on the
`workerUrl` branch only. The bundled entry point supplies its own
`workerFactory` from the in-bundle `./elk-worker.min.js` shim — a plain class,
not a DOM `Worker`. Verified by extracting the constructor:

```
if (typeof Pc > "u" && typeof ro > "u") throw new Error("Cannot construct an ELK without both 'workerUrl' and 'workerFactory'.");
var Wn = ro; typeof Pc < "u" && typeof ro > "u" && (Wn = function (Bh) { return new Worker(Bh) });
...
if (!Vt.workerFactory) { var ro = rn("./elk-worker.min.js"), Pc = ro.Worker; Vt.workerFactory = function (Wn) { return new Pc(Wn) } }
```

The `!Vt.workerFactory` fallback wins because no `workerUrl` is passed. Layout
runs on the main thread.

**D2 cannot run from `file://`.** `@terrastruct/d2@0.1.33` ships
`dist/browser/index.js` (8,194,866 bytes) containing `new Worker` plus two
`createObjectURL` calls — the blob-worker pattern, blocked at a `null` origin —
and `dist/node-esm/d2.wasm` is 22,072,784 bytes. Even ignoring the worker, 30 MB
per page is untenable. D2 remains viable only as an _optional local CLI_ the
skill shells out to; that is deferred, not planned.

**Graphviz WASM is worker-free.** `@hpcc-js/wasm-graphviz@1.28.0`
`dist/index.js` is 821,212 bytes with the wasm inlined; grepping it finds
`instantiateStreaming` and `wasmBinary` but **zero** `new Worker` /
`importScripts` occurrences.

**Mermaid's `mindmap` cannot be made readable.** From mermaid source
`packages/mermaid/src/diagrams/mindmap/styles.ts`, node fills come from the
`cScale0..11` rainbow and branch strokes are generated as
`stroke-width: 17 - 3 * i` — **17px at depth 0**, with no config knob. Layout is
force-directed `cose-bilkent` (`config.schema.yaml:1098-1101`), labels are hard
capped at `maxNodeWidth: 200`, and `classDef` is unsupported. It is
structurally incapable of the flat, hairline, monochrome Geist look.

**Mermaid's `neo` look is much closer to Geist than `neutral`.** From
`themes/theme-neo.js`: `background: '#ffffff'`, `mainBkg: '#ffffff'`,
`nodeBorder: '#000000'` — white node, black hairline. Compare
`themes/theme-neutral.js`: `mainBkg: '#eee'`, `lineColor: '#666'`. Note
`theme-neo-dark.js` sets `background: '#333'` and `mainBkg: '#2a2020'` (a brown
tint), so dark mode still needs explicit `themeVariables` overrides — which is
why plan 004 uses `theme: 'base'` with a full Geist variable set rather than
relying on a named theme.

## Decision

1. **Default** — Mermaid `flowchart` with `layout: 'elk'`, `look: 'neo'`,
   `theme: 'base'`, and a full Geist `themeVariables` block. Covers roughly 80%
   of plan/brainstorm/roadmap requests.
2. **Escape hatch A** — Graphviz DOT through `@hpcc-js/wasm-graphviz` with
   `splines=ortho` when a graph has fan-in or cycles that ELK still tangles.
   _Deferred: not in plans 001–008. Revisit once 005 has shipped and you can
   judge whether ELK alone is enough._
3. **Escape hatch B** — authored inline SVG following the `diagram-design`
   grammar for hero/architecture diagrams. _Also deferred for the same reason._
4. **`mindmap` is removed** from the skill's type table (plan 005). Brainstorms
   become `flowchart LR` trees, which ELK lays out cleanly and Geist themes
   completely.

Tiers 2 and 3 are deliberately **not** planned yet. Ship 001–008, use the tool
for a couple of weeks, and only then decide whether Mermaid+ELK's ceiling is
actually the binding constraint. Building three engines before knowing that is
speculative work.
