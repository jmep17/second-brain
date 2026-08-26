// Build a generated page from the live MERMAID.md template, so the render
// check can never pass against a stale copy of it.
// Usage: node test/make-fixture.mjs [outPath]
import fs from "node:fs";
import path from "node:path";

const TEMPLATE = "plugins/diagram-plans/skills/diagram-plans/MERMAID.md";
const out = process.argv[2] ?? "test/fixtures/sample-plan.html";

const md = fs.readFileSync(TEMPLATE, "utf8");
const m = md.match(/```html\n([\s\S]*?)\n```/);
if (!m) {
  console.error(`FAIL  no <!doctype html> template found in ${TEMPLATE}`);
  process.exit(1);
}

const DIAGRAM = `flowchart LR
  A["Draft the change"] --> B["Review"]
  B --> C["Stage"]
  C --> D["Release"]
  B -.-> R["Risk: reviewer unavailable"]`;

let html = m[1]
  .replace(/<title>TOPIC<\/title>/, "<title>Sample release plan</title>")
  .replace(/<h1>TOPIC<\/h1>/, "<h1>Sample release plan</h1>")
  .replace(/Plan · YYYY-MM-DD · flowchart/, "Plan · 2026-08-26 · flowchart")
  .replace(
    /(<pre class="mermaid">\n)[\s\S]*?(\n\s*<\/pre>)/,
    (_, open, close) => open + DIAGRAM + close
  );

if (html.includes("TOPIC") || html.includes("YYYY-MM-DD")) {
  console.error(
    "FAIL  placeholders left in fixture (template markers changed?)"
  );
  process.exit(1);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`PASS  fixture  ${out} (${html.length} bytes, from ${TEMPLATE})`);
