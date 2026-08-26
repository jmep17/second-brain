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

## HTML template

The file is wrapped in a document skeleton at publish time — write body content only, no `<html>`/`<head>`/`<body>`.

```html
<title>Topic Name</title>
<style>
  :root { --bg: #ffffff; --fg: #1a1a1a; --muted: #5c5c5c; --line: #e2e2e2; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --bg: #111214; --fg: #ececec; --muted: #a3a3a3; --line: #2a2b2f; }
  }
  :root[data-theme="dark"] { --bg: #111214; --fg: #ececec; --muted: #a3a3a3; --line: #2a2b2f; }
  body { background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; margin: 0; padding: 2rem; }
  h1 { font-size: 1.25rem; margin: 0 0 1rem; }
  .diagram { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; padding: 1rem; }
  .notes { color: var(--muted); font-size: 0.9rem; margin-top: 1rem; }
  .notes li { margin: 0.2rem 0; }
</style>

<h1>Topic Name</h1>
<div class="diagram">
<pre class="mermaid">
mindmap
  root((Topic))
    Branch A
      Leaf
      ⚠ risk: something
    Branch B
      ? open: question
</pre>
</div>
<ul class="notes">
  <li>One-line note that would not fit a label.</li>
</ul>
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
