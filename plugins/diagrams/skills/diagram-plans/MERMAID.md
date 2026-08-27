# Mermaid reference for diagram-plans

> Design contract: this template implements
> [`plugins/DESIGN.md`](../../../DESIGN.md); change tokens there first.

## Which diagram

| Request smells like | Diagram | Why |
|---|---|---|
| "ideas for", "brainstorm", "break down", "what goes into" | `flowchart TD` with one `subgraph` per branch | Radial mindmaps cannot be themed or laid out; a subgraphed flowchart says the same thing and obeys ELK |
| "plan", "steps", "how should we", "decision" | `flowchart TD` | Ordered, with branches on decisions |
| "options", "compare", "trade-offs", "A vs B" | prefer the decisions plugin's `decision-pages` (option cards); here, `quadrantChart` when two axes matter | Cards beat subgraphs for comparisons |
| "roadmap", "phases", "quarter", "milestones" | `timeline` (no dates) or `gantt` (dates) | Time on one axis |
| "architecture", "components", "how it fits" | `flowchart TD` | Boxes and arrows |
| "what calls what", "request flow" | `sequenceDiagram` | Ordered messages between parties |
| "states", "lifecycle" | `stateDiagram-v2` | Transitions |

`mindmap` is not in this table on purpose. It ignores `themeVariables`, cannot
use the ELK layout engine, and collides its own branches past ~12 nodes. Use a
`flowchart TD` with a subgraph per branch instead.

Every flowchart is vertical: `flowchart TD` at top level, `direction TB`
inside subgraphs. `LR` is not used — wide layouts force sideways scrolling
and break responsive scaling on narrow screens.

## The page has two modes

One file, two ways to read it. The reader flips between them; nothing here
guesses on their behalf.

- **Document** (default) — the diagram sits in a figure, notes underneath.
  This is right for anything inside the complexity budget.
- **Canvas** — the `⛶ canvas` control in the figure bar takes the diagram
  full-bleed with pan and zoom, notes moved to a rail. This is right when a
  diagram is too wide or tall to read in place. `Esc` returns to the document.

Write the same file either way. The mode is a reading choice, not an authoring one.

## HTML template (Geist)

A complete, standalone document. Geist Sans / Geist Mono, the neutral scale,
1px borders, 6–10px radii, black-on-white with a dark scheme, and the same
tokens driving the *diagram* rather than only the page chrome. Mermaid and the
ELK layout engine come from jsDelivr. Replace `TOPIC`, the TL;DR, the
diagram, and the notes; leave the rest.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TOPIC</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --geist-bg: #ffffff; --geist-fg: #171717;
    --accents-1: #fafafa; --accents-2: #eaeaea; --accents-3: #999999; --accents-5: #666666;
    /* Text tones, not brand fills: both clear WCAG AA on --geist-bg. */
    --text-warning: #8a4b00; --text-info: #0057b7;
    --radius: 10px;
    --font-sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --geist-bg: #000000; --geist-fg: #ededed;
      --accents-1: #111111; --accents-2: #333333; --accents-3: #888888; --accents-5: #a1a1a1;
      --text-warning: #f5a623; --text-info: #52a8ff;
    }
  }
  * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: var(--accents-2) transparent; }
  html, body { height: 100%; }
  body {
    margin: 0; background: var(--geist-bg); color: var(--geist-fg);
    font-family: var(--font-sans); font-size: 14px; line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  main { max-width: 1100px; margin: 0 auto; padding: 56px 24px 96px; }

  header { margin-bottom: 28px; }
  .kicker { font-family: var(--font-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--accents-3); margin-bottom: 10px; }
  h1 { font-size: clamp(22px, 4.5vw, 30px); font-weight: 600; letter-spacing: -.03em; margin: 0 0 8px; }
  .sub { color: var(--accents-5); max-width: 62ch; margin: 0; }

  /* ---- tldr: the skim layer above the figure ---- */
  .tldr { border: 1px solid color-mix(in srgb, var(--text-info) 40%, var(--accents-2)); border-radius: var(--radius); background: var(--accents-1); padding: 14px 16px; margin-bottom: 20px; }
  .tldr .tag { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--text-info); display: block; margin-bottom: 6px; }
  .tldr p { margin: 0; }
  .tldr .next { font-family: var(--font-mono); font-size: 12.5px; color: var(--text-info); margin-top: 8px; }

  /* ---- figure: the diagram's home in document mode ---- */
  figure { margin: 0; border: 1px solid var(--accents-2); border-radius: var(--radius); background: var(--accents-1); overflow: hidden; }
  .figbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; row-gap: 4px; padding: 10px 14px; border-bottom: 1px solid var(--accents-2); font-family: var(--font-mono); font-size: 11px; color: var(--accents-5); }
  .figbar button { font: inherit; color: var(--geist-fg); background: var(--geist-bg); border: 1px solid var(--accents-2); border-radius: 8px; padding: 4px 10px; cursor: pointer; }
  .figbar button:hover { border-color: var(--accents-3); }
  .stage { overflow: auto; padding: 28px; background: var(--geist-bg); }
  .pan { transform-origin: 0 0; }
  .mermaid svg { display: block; margin: 0 auto; max-width: 100%; height: auto; }   /* real size, capped at the stage width */
  figcaption { padding: 12px 14px; border-top: 1px solid var(--accents-2); color: var(--accents-5); font-size: 13px; }

  /* ---- notes ---- */
  .notes { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 12px; margin-top: 28px; }
  .note { border: 1px solid var(--accents-2); border-radius: var(--radius); padding: 14px 16px; }
  .note .tag { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; display: block; margin-bottom: 6px; color: var(--accents-3); }
  .note.risk { border-color: color-mix(in srgb, var(--text-warning) 40%, var(--accents-2)); }
  .note.risk .tag { color: var(--text-warning); }
  .note.open { border-color: color-mix(in srgb, var(--text-info) 40%, var(--accents-2)); }
  .note.open .tag { color: var(--text-info); }

  code { font-family: var(--font-mono); font-size: 12.5px; background: var(--accents-1); border: 1px solid var(--accents-2); border-radius: 4px; padding: 1px 5px; }
  .err { font-family: var(--font-mono); font-size: 12.5px; white-space: pre-wrap; color: #ee0000; border: 1px solid #ee0000; border-radius: 8px; padding: 12px 14px; }

  .zoombar, .railtitle { display: none; }

  /* ================= canvas mode ==========================================
     The figure is promoted to full-bleed and the notes become a rail. Layout
     regime is chosen in JS and published as data-layout, so the CSS and the
     fit maths read the same value instead of duplicating breakpoints.
     ====================================================================== */
  body[data-mode="canvas"] { overflow: hidden; }
  body[data-mode="canvas"] main { max-width: none; padding: 0; }
  body[data-mode="canvas"] header, body[data-mode="canvas"] figcaption { display: none; }
  body[data-mode="canvas"] .tldr { display: none; }
  body[data-mode="canvas"] figure { position: fixed; inset: 0; z-index: 40; border: 0; border-radius: 0; background: var(--accents-1); display: flex; flex-direction: column; }
  body[data-mode="canvas"] .figbar { position: relative; z-index: 45; background: var(--geist-bg); }
  body[data-mode="canvas"] .stage {
    flex: 1; overflow: hidden; padding: 0; position: relative; cursor: grab;
    /* dragging a canvas must not sweep-select the diagram labels */
    user-select: none; -webkit-user-select: none; touch-action: none;
  }
  body[data-mode="canvas"] .stage.dragging { cursor: grabbing; }
  body[data-mode="canvas"] .stage svg { -webkit-user-drag: none; }
  body[data-mode="canvas"] .pan { position: absolute; top: 0; left: 0; will-change: transform; }
  body[data-mode="canvas"] .mermaid svg { margin: 0; max-width: none; }

  body[data-mode="canvas"] .notes {
    position: fixed; z-index: 45; display: block; margin: 0; overflow: auto;
    background: var(--geist-bg); border: 1px solid var(--accents-2);
    border-radius: var(--radius); box-shadow: 0 4px 16px rgb(0 0 0 / .06);
  }
  body[data-mode="canvas"] .note { border: 0; border-top: 1px solid var(--accents-2); border-radius: 0; padding: 10px 14px; font-size: 13px; }
  body[data-mode="canvas"] .note:first-of-type { border-top: 0; }
  body[data-mode="canvas"] .railtitle {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 10px 14px; border-bottom: 1px solid var(--accents-2); cursor: pointer;
    font-family: var(--font-mono); font-size: 11px; letter-spacing: .08em;
    text-transform: uppercase; color: var(--accents-5);
  }
  body[data-mode="canvas"] .notes.collapsed .note { display: none; }
  body[data-mode="canvas"] .zoombar { display: flex; gap: 6px; position: fixed; z-index: 45; }
  body[data-mode="canvas"] .zoombar button { font-family: var(--font-mono); font-size: 12px; background: var(--geist-bg); color: var(--geist-fg); border: 1px solid var(--accents-2); border-radius: 8px; padding: 6px 10px; cursor: pointer; }

  /* regime: wide (>860w & >560h) — rail is a full-height right column */
  body[data-mode="canvas"][data-layout="wide"] .notes { top: 68px; right: 20px; bottom: 20px; width: 300px; }
  body[data-mode="canvas"][data-layout="wide"] .zoombar { left: 20px; bottom: 20px; }
  /* regime: short (<=560h & >=600w) — landscape phone, narrow right column */
  body[data-mode="canvas"][data-layout="short"] .notes { top: 56px; right: 12px; bottom: 12px; width: 240px; font-size: 12px; }
  body[data-mode="canvas"][data-layout="short"] .zoombar { left: 12px; bottom: 12px; }
  /* regime: stacked — rail collapses to a bar at the bottom */
  body[data-mode="canvas"][data-layout="stacked"] .notes { left: 12px; right: 12px; bottom: 12px; max-height: 40vh; }
  body[data-mode="canvas"][data-layout="stacked"] .zoombar { right: 12px; top: 60px; }

  @media (max-width: 640px) {
    main { padding: 36px 16px 72px; }
    .stage { padding: 16px; }
  }
</style>
</head>
<body data-mode="document">
<main>
  <header>
    <div class="kicker">Plan · YYYY-MM-DD · flowchart</div>
    <h1>TOPIC</h1>
    <p class="sub">One sentence on what the diagram claims. Delete if the title says it.</p>
  </header>

  <section class="tldr" aria-label="Summary">
    <span class="tag">TL;DR</span>
    <p>What the diagram shows and the single takeaway a skimmer should keep.</p>
    <p class="next">Next → the branch or node to look at first.</p>
  </section>

  <figure>
    <div class="figbar">
      <span>flowchart · elk · neo</span>
      <button id="mode" type="button" aria-pressed="false">⛶ canvas</button>
    </div>
    <div class="stage" id="stage">
      <div class="pan" id="pan">
        <pre class="mermaid">
flowchart TD
  A["First step"] --> B{"Decision?"}
  B -- yes --> C["Do X"]
  B -- no --> D["Do Y"]
  C --> E["Done"]
  D --> E
        </pre>
      </div>
    </div>
    <figcaption>One line on how to read the edges. Delete if obvious.</figcaption>
  </figure>

  <section class="notes" id="notes">
    <div class="railtitle" id="railtitle"><span>Notes</span><span class="chev">–</span></div>
    <div class="note"><span class="tag">Note</span>One line that would not fit a label.</div>
    <div class="note risk"><span class="tag">Risk</span>A risk, stated once.</div>
    <div class="note open"><span class="tag">Open</span>The decision the reader must make.</div>
  </section>

  <!-- feedback-widget:start -->
  <section class="feedback" id="feedback" data-artifact="artifacts/diagrams/YYYY-MM-DD-<kebab-slug>.html">
    <div class="fbhead">
      <span class="tag">Feedback</span>
      <span class="fbstatus" id="fbstatus"></span>
    </div>
    <div class="fbrow">
      <label><input type="radio" name="fbkind" value="feedback" checked> Feedback</label>
      <label><input type="radio" name="fbkind" value="rfc"> RFC</label>
    </div>
    <input class="fbtitle" id="fbtitle" type="text" placeholder="One-line title" maxlength="120">
    <textarea class="fbbody" id="fbbody" rows="4" placeholder="What would you change, and why?"></textarea>
    <div class="fbrow">
      <button class="fbsubmit" id="fbsubmit" type="button">Submit</button>
    </div>
  </section>
  <style>
    .feedback { margin-top: 20px; border: 1px solid var(--accents-2); border-radius: 8px; padding: 14px 16px; display: grid; gap: 10px; }
    .feedback .fbhead { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .feedback .tag { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--accents-3); }
    .feedback .fbstatus { font-family: var(--font-mono); font-size: 11px; color: var(--accents-5); }
    .feedback .fbrow { display: flex; align-items: center; gap: 14px; font-size: 13px; }
    .feedback input[type="text"], .feedback textarea { font: inherit; font-size: 13px; color: var(--geist-fg); background: var(--geist-bg); border: 1px solid var(--accents-2); border-radius: 6px; padding: 8px 10px; width: 100%; resize: vertical; box-sizing: border-box; }
    .feedback button { font-family: var(--font-mono); font-size: 12px; color: var(--geist-fg); background: var(--geist-bg); border: 1px solid var(--accents-2); border-radius: 8px; padding: 6px 14px; cursor: pointer; }
    .feedback button:hover { border-color: var(--accents-3); }
  </style>
  <script>
    (() => {
      const section = document.getElementById("feedback");
      const status = document.getElementById("fbstatus");
      const submit = document.getElementById("fbsubmit");
      const isFile = location.protocol === "file:";
      if (isFile) submit.textContent = "copy as issue";
      submit.addEventListener("click", async () => {
        const kind = document.querySelector('input[name="fbkind"]:checked').value;
        const title = document.getElementById("fbtitle").value.trim();
        const body = document.getElementById("fbbody").value.trim();
        if (!title || !body) { status.textContent = "title and body required"; return; }
        const artifact = section.dataset.artifact;
        if (isFile) {
          const date = new Date().toISOString().slice(0, 10);
          const md = `# ${title}\n\nStatus: needs-triage\nKind: ${kind}\nArtifact: ${artifact}\nDate: ${date}\n\n${body}\n\n## Comments\n`;
          try {
            await navigator.clipboard.writeText(md);
            status.textContent = "copied — paste into .scratch/artifact-feedback/issues/";
          } catch (e) {
            status.textContent = `copy failed: ${e?.message ?? e}`;
          }
          return;
        }
        try {
          const res = await fetch("/api/artifacts/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artifact, kind, title, body }),
          });
          const data = await res.json();
          if (res.ok) {
            status.textContent = `filed: ${data.filed}`;
            const copy = document.createElement("button");
            copy.type = "button";
            copy.textContent = "copy prompt";
            copy.addEventListener("click", async () => {
              try {
                await navigator.clipboard.writeText(`Read the artifact feedback issue at ${data.filed} and act on it per docs/agents/issue-tracker.md.`);
                copy.textContent = "copied";
              } catch {
                copy.textContent = "copy failed";
              }
            });
            status.append(" ", copy);
          } else {
            status.textContent = `error: ${data.error ?? res.status}`;
          }
        } catch (e) {
          status.textContent = `request failed: ${e?.message ?? e}`;
        }
      });
    })();
  </script>
  <!-- feedback-widget:end -->
</main>

<div class="zoombar" id="zoombar">
  <button data-zoom="out" type="button">−</button>
  <button data-zoom="fit" type="button">fit</button>
  <button data-zoom="in" type="button">+</button>
</div>

<script type="module">
  const $ = (s) => document.querySelector(s);
  const stage = $("#stage"), pan = $("#pan"), notes = $("#notes"), modeBtn = $("#mode");
  const src = $("pre.mermaid").textContent;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const token = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  let mermaid, elkOk = false;
  try {
    mermaid = (await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")).default;
    try {
      const elk = await import("https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs");
      mermaid.registerLayoutLoaders(elk.default ?? elk);
      elkOk = true;
    } catch { /* optional: fall back to dagre rather than failing the page */ }
  } catch (e) {
    $("pre.mermaid").outerHTML = `<div class="err">Mermaid could not be loaded from the CDN.\n${e}\nThis page needs network access on first view.</div>`;
  }

  async function render() {
    if (!mermaid) return;
    const cfg = {
      startOnLoad: false, theme: "base", look: "neo",
      themeVariables: {
        fontFamily: "Geist, system-ui, sans-serif", fontSize: "14px",
        background: token("--geist-bg"), primaryColor: token("--accents-1"),
        primaryTextColor: token("--geist-fg"), primaryBorderColor: token("--accents-2"),
        secondaryColor: token("--geist-bg"), tertiaryColor: token("--geist-bg"),
        lineColor: token("--accents-3"), textColor: token("--geist-fg"),
        clusterBkg: "transparent", clusterBorder: token("--accents-2"),
        nodeBorder: token("--accents-2"), edgeLabelBackground: token("--geist-bg"),
        titleColor: token("--geist-fg")
      },
      flowchart: { curve: "linear", padding: 14, nodeSpacing: 44, rankSpacing: 56, useMaxWidth: false, htmlLabels: true }
    };
    if (elkOk) { cfg.layout = "elk"; cfg.elk = { mergeEdges: false, nodePlacementStrategy: "BRANDES_KOEPF" }; }
    try {
      await document.fonts.ready;          // measure labels against Geist, not a fallback
      mermaid.initialize(cfg);
      const { svg } = await mermaid.render(`d-${mq.matches ? "dark" : "light"}`, src);
      pan.innerHTML = `<div class="mermaid">${svg}</div>`;
    } catch (e) {
      pan.innerHTML = `<div class="err">Diagram failed to render.\n${e?.message ?? e}</div>`;
    }
    if (document.body.dataset.mode === "canvas") fit();
  }

  /* ---- canvas: regimes, pan, zoom ---- */
  let tx = 0, ty = 0, scale = 1;
  const apply = () => { pan.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };

  function layout() {
    const W = innerWidth, H = innerHeight;
    const mode = (W > 860 && H > 560) ? "wide" : (H <= 560 && W >= 600) ? "short" : "stacked";
    document.body.dataset.layout = mode;
    if (!notes.dataset.touched) notes.classList.toggle("collapsed", mode !== "wide");
    return mode;
  }
  function insets() {
    const mode = layout(), gap = 16;
    const r = notes.getBoundingClientRect();
    const live = r.width > 0 && r.height > 0;
    if (mode === "stacked") return { top: 56, right: 12, bottom: (live ? innerHeight - r.top : 60) + gap, left: 12 };
    return { top: mode === "short" ? 56 : 68, right: live ? Math.max(20, innerWidth - r.left + gap) : 20, bottom: 20, left: 20 };
  }
  function fit() {
    const svg = pan.querySelector("svg"); if (!svg) return;
    const b = svg.getBoundingClientRect(), w = b.width / scale, h = b.height / scale;
    if (!w || !h) return;
    const i = insets();
    /* never let the chrome starve the canvas entirely */
    const aw = Math.max(innerWidth * 0.5, innerWidth - i.left - i.right);
    const ah = Math.max(innerHeight * 0.4, innerHeight - i.top - i.bottom);
    scale = Math.min(1.15, aw / w, ah / h);
    tx = i.left + (aw - w * scale) / 2; ty = i.top + (ah - h * scale) / 2;
    apply();
  }
  const canvas = () => document.body.dataset.mode === "canvas";
  function setMode(m) {
    document.body.dataset.mode = m;
    modeBtn.setAttribute("aria-pressed", String(m === "canvas"));
    modeBtn.textContent = m === "canvas" ? "✕ close" : "⛶ canvas";
    if (m === "canvas") { layout(); fit(); }
    else { pan.style.transform = ""; tx = ty = 0; scale = 1; }
  }
  modeBtn.addEventListener("click", () => setMode(canvas() ? "document" : "canvas"));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && canvas()) setMode("document"); });
  $("#railtitle").addEventListener("click", () => {
    notes.dataset.touched = "1"; notes.classList.toggle("collapsed");
    notes.querySelector(".chev").textContent = notes.classList.contains("collapsed") ? "+" : "–";
    if (canvas()) fit();
  });
  stage.addEventListener("wheel", (e) => {
    if (!canvas()) return;
    e.preventDefault();
    const next = Math.min(3, Math.max(.2, scale * Math.exp(-e.deltaY * .0015)));
    tx = e.clientX - (e.clientX - tx) * (next / scale);
    ty = e.clientY - (e.clientY - ty) * (next / scale);
    scale = next; apply();
  }, { passive: false });
  let drag = false, sx = 0, sy = 0;
  stage.addEventListener("pointerdown", (e) => {
    if (!canvas() || e.button !== 0) return;
    e.preventDefault();                      // suppress the native select/drag gesture
    drag = true; sx = e.clientX - tx; sy = e.clientY - ty;
    stage.classList.add("dragging"); stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => { if (drag) { tx = e.clientX - sx; ty = e.clientY - sy; apply(); } });
  const endDrag = () => {
    drag = false; stage.classList.remove("dragging");
    const s = getSelection(); if (s && !s.isCollapsed && stage.contains(s.anchorNode)) s.removeAllRanges();
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("dragstart", (e) => e.preventDefault());
  $("#zoombar").addEventListener("click", (e) => {
    const k = e.target.dataset.zoom; if (!k) return;
    if (k === "fit") return fit();
    const next = Math.min(3, Math.max(.2, scale * (k === "in" ? 1.2 : 1 / 1.2)));
    const cx = innerWidth / 2, cy = innerHeight / 2;
    tx = cx - (cx - tx) * (next / scale); ty = cy - (cy - ty) * (next / scale);
    scale = next; apply();
  });
  let t = null;
  addEventListener("resize", () => { if (canvas()) { clearTimeout(t); t = setTimeout(fit, 120); } });
  mq.addEventListener("change", render);
  render();
</script>
</body>
</html>
```

## Syntax crib

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
`<br/>` inside a quoted label gives a second line; wrap the smaller half in
`<small>` for a subtitle.

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

## Notes on the template

- **ELK degrades, it does not fail.** If the layout package will not load the
  page falls back to dagre and still renders. If you are judging layout
  quality, check the console first.
- **`useMaxWidth: false` plus CSS `max-width: 100%` is deliberate.** Mermaid
  renders at real size and document mode scales the svg down responsively
  (`height: auto` keeps the aspect). Vertical-only layout is what keeps that
  scaling legible; canvas mode exists for when a diagram is too tall to read
  in place.
- **Fonts are awaited before render.** Mermaid measures label boxes at render
  time; measuring against a fallback font is what makes labels overflow their
  boxes once Geist arrives.
- **Both failure paths say so on the page** — CDN unreachable, and diagram
  source that will not parse. Neither shows an empty card.
