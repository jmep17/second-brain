# Mermaid reference for diagram-plans

## Which diagram

| Request smells like | Diagram | Why |
|---|---|---|
| "ideas for", "brainstorm", "break down", "what goes into" | `mindmap` | Radial tree; unordered branches |
| "plan", "steps", "how should we", "decision" | `flowchart TD` | Ordered, with branches on decisions |
| "options", "compare", "trade-offs", "A vs B" | `flowchart LR` with one `subgraph` per option; `quadrantChart` when two axes matter | Side-by-side, same shape per option |
| "roadmap", "phases", "quarter", "milestones" | `timeline` (no dates) or `gantt` (dates) | Time on one axis |
| "architecture", "components", "how it fits" | `flowchart LR` | Boxes and arrows |
| "what calls what", "request flow" | `sequenceDiagram` | Ordered messages between parties |
| "states", "lifecycle" | `stateDiagram-v2` | Transitions |

## HTML template (Geist)

A complete, standalone document. Styling follows Vercel's Geist design system: Geist Sans / Geist Mono, neutral gray scale, 1px `#eaeaea` borders, 6–8px radii, black-on-white with a dark scheme. Mermaid comes from the jsDelivr CDN and re-renders when the color scheme flips. Replace `TOPIC`, the diagram, and the notes; leave the rest.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TOPIC</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --geist-bg: #ffffff; --geist-fg: #171717;
    --accents-1: #fafafa; --accents-2: #eaeaea; --accents-3: #999999; --accents-5: #666666;
    --geist-success: #0070f3; --geist-warning: #f5a623; --geist-error: #ee0000;
    --radius: 8px; --font-sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root { --geist-bg: #000000; --geist-fg: #ededed; --accents-1: #111111; --accents-2: #333333; --accents-3: #888888; --accents-5: #a1a1a1; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--geist-bg); color: var(--geist-fg); font-family: var(--font-sans); font-size: 14px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  main { max-width: 1200px; margin: 0 auto; padding: 48px 24px 64px; }
  header { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--accents-2); padding-bottom: 16px; margin-bottom: 24px; }
  h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
  .meta { font-family: var(--font-mono); font-size: 12px; color: var(--accents-5); }
  .badge { display: inline-block; font-family: var(--font-mono); font-size: 11px; padding: 2px 8px; border: 1px solid var(--accents-2); border-radius: 999px; color: var(--accents-5); margin-right: 8px; }
  .card { background: var(--geist-bg); border: 1px solid var(--accents-2); border-radius: var(--radius); padding: 24px; overflow-x: auto; }
  .card + .card { margin-top: 16px; }
  .mermaid { display: flex; justify-content: center; }
  .mermaid svg { max-width: 100%; height: auto; }
  h2 { font-size: 14px; font-weight: 500; color: var(--accents-5); margin: 32px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; }
  ul.notes { margin: 0; padding: 0; list-style: none; border: 1px solid var(--accents-2); border-radius: var(--radius); }
  ul.notes li { padding: 10px 16px; border-top: 1px solid var(--accents-2); }
  ul.notes li:first-child { border-top: 0; }
  ul.notes li::before { content: "—"; color: var(--accents-3); margin-right: 8px; }
  code { font-family: var(--font-mono); font-size: 12.5px; background: var(--accents-1); border: 1px solid var(--accents-2); border-radius: 4px; padding: 1px 5px; }
  .risk { color: var(--geist-warning); } .open { color: var(--geist-success); }
</style>
</head>
<body>
<main>
  <header>
    <h1>TOPIC</h1>
    <div class="meta"><span class="badge">mindmap</span>YYYY-MM-DD</div>
  </header>

  <section class="card">
    <pre class="mermaid">
mindmap
  root((TOPIC))
    Branch A
      Leaf
      ⚠ risk: something
    Branch B
      ? open: question
    </pre>
  </section>

  <h2>Notes</h2>
  <ul class="notes">
    <li>One-line note that would not fit a label.</li>
    <li class="risk">⚠ A risk, stated once.</li>
    <li class="open">? The decision the reader must make.</li>
  </ul>
</main>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  const sources = [...document.querySelectorAll("pre.mermaid")].map(el => el.textContent);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  async function render() {
    const dark = mq.matches;
    mermaid.initialize({
      startOnLoad: false,
      theme: dark ? "dark" : "neutral",
      themeVariables: { fontFamily: "Geist, system-ui, sans-serif", fontSize: "14px" },
      mindmap: { padding: 12 }, flowchart: { curve: "basis", padding: 12 }
    });
    document.querySelectorAll("pre.mermaid").forEach((el, i) => { el.removeAttribute("data-processed"); el.textContent = sources[i]; });
    await mermaid.run({ nodes: document.querySelectorAll("pre.mermaid") });
  }
  mq.addEventListener("change", render);
  render();
</script>
</body>
</html>
```

## Syntax crib

### mindmap
```
mindmap
  root((Center))
    Branch
      Leaf
      Leaf
    Branch
```
Indentation is the tree. Shapes: `((circle))`, `(rounded)`, `[square]`, `{{hexagon}}`, `)cloud(`. Icons/classes are unnecessary.

### flowchart
```
flowchart TD
  A[Start] --> B{Decision?}
  B -- yes --> C[Do X]
  B -- no --> D[Do Y]
  C --> E[Done]
  D --> E
  subgraph Option 1
    C
  end
```
Labels containing `(`, `[`, `:` or quotes go in double quotes: `A["Read config (json)"]`.

### quadrantChart
```
quadrantChart
  title Effort vs impact
  x-axis Low effort --> High effort
  y-axis Low impact --> High impact
  quadrant-1 Do now
  quadrant-2 Plan
  quadrant-3 Skip
  quadrant-4 Quick wins
  "Option A": [0.3, 0.8]
  "Option B": [0.7, 0.6]
```

### timeline
```
timeline
  title Roadmap
  Phase 1 : Scaffold : Tests
  Phase 2 : Hooks : Docs
```

### sequenceDiagram
```
sequenceDiagram
  User->>CLI: prompt
  CLI->>Hook: UserPromptSubmit
  Hook-->>CLI: nudge text
```

### stateDiagram-v2
```
stateDiagram-v2
  [*] --> Draft
  Draft --> Published: publish
  Published --> [*]
```
