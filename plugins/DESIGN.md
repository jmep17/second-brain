# Design contract

Normative for every plugin in this marketplace and every page under
`artifacts/`. Grounded in vercel.com/geist (fetch any page as markdown by
appending `.md`).

## 1. Tokens, not identity

Token values and structure come from Geist; the Vercel wordmark, triangle,
and brand assets are Vercel's identity and MUST NOT appear on any artifact
page. Adopting Vercel's `vercel-brand.css` outright was rejected for the
same reason — it carries a wordmark header and triangle footer as part of
its contract. Plugins take the token values, not the identity.

## 2. Color

Pages are black-on-white (`#ffffff`/`#171717` light) with a dark scheme
(`#000000`/`#ededed` dark), plus a neutral gray scale following Geist scale
roles: steps 100–300 are backgrounds (default/hover/active), 400–600 are
borders (default/hover/active), 700–800 are high-contrast backgrounds, and
900–1000 are text and icons (secondary/primary). Use two background levels:
a page background and one raised-surface background for cards.

Color is semantic and sparse. Text tones for warning/info MUST clear WCAG AA
as text on the page background in BOTH themes — the proven values are
`#8a4b00` (warning) / `#0057b7` (info) in light, `#f5a623` / `#52a8ff` in
dark. Never use a semantic tone as a text color at low-contrast tint
strength; tints are for backgrounds/borders only.

## 3. Typography

Geist Sans + Geist Mono via Google Fonts, each with a full fallback stack:

```css
--font-sans:
  "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
--font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
```

Geist's four categories map onto artifact pages as:

- **Headings** — one clamp()-sized, 600-weight heading per page.
- **Labels** — mono, uppercase micro-labels for kickers/tags, 10.5–11px,
  letter-spacing ≥ .06em.
- **Copy** — 14px body copy at ≥1.5 line-height.
- Mono also carries paths, code, and other technical inline content.

## 4. Materials

1px borders in the border-role gray. Radii from Geist materials: 6px for
small controls/chips, 10–12px for cards and other page surfaces, 16px for
full-screen surfaces. Shadows only on floating layers (rails, menus),
subtle — `0 4px 16px rgb(0 0 0 / .06)`. Scrollbars are thin and subtle:
`scrollbar-width: thin; scrollbar-color: var(--accents-2) transparent` on
every scroll container (standard properties only — no `::-webkit-scrollbar`
blocks).

## 5. Grid (optional flourish)

Cell-and-guide layouts may be used for option grids (e.g. decision pages).
Guides are decorative: `aria-hidden="true"`, ≥3:1 contrast in both themes,
never nested more than one level.

## 6. Page contract

Every artifact page:

- Is a standalone HTML file. Network is allowed ONLY for Google Fonts and
  (where needed) the jsDelivr Mermaid/ELK CDN; everything else is inline.
- Supports light + dark via `prefers-color-scheme`.
- Has a header: mono kicker (`TYPE · YYYY-MM-DD · <shape>`) + h1 + optional
  one-line sub.
- Puts content on raised-surface cards.
- Has a Notes region using the `note` / `note.risk` (warning tone) /
  `note.open` (info tone) card pattern.
- Renders a visible message on every failure path — never an empty card.
- Uses filenames `YYYY-MM-DD-<kebab-slug>.html` under `artifacts/<type>/`.
- Re-renders the same topic to the same path.

## 7. The artifact IS the response

When a skill produces an artifact, the chat reply is at most: the saved
path, the opener status, and ONE open question. No summaries, no restating
the content in prose. An explicit user request for prose overrides
everything.

## 8. Feedback affordance

Every artifact page ends `<main>` with a delimited feedback section, marked
between `<!-- feedback-widget:start -->` and `<!-- feedback-widget:end -->`
so templates can find and preserve it. Fields: `kind` (`feedback`/`rfc`),
`title`, `body`. The section carries the page's repo-relative artifact path
in `data-artifact`.

Behaviour is dual-mode, keyed off `location.protocol`:

- **Served over http(s)** — the widget POSTs `{ artifact, kind, title, body }`
  to `/api/artifacts/feedback` (same origin — the site that serves the page
  also files the issue) and shows the returned `filed` path inline.
- **Opened from `file://`** — no server to POST to, so the submit button is
  replaced by "copy as issue": it puts the exact tracker-format markdown
  (the same shape the API route writes) on the clipboard for the reader to
  hand to an agent or paste into `.scratch/artifact-feedback/issues/`
  themselves. This is the accepted `file://` degradation; an offline
  submission queue was considered and rejected (2026-08-26) — do not build
  queueing.

All controls are styled from the tokens in §2–4: mono labels, `--accents-2`
borders, 6–8px radius, AA text. Below is the full snippet — HTML, CSS, and
script — verbatim. New artifact types embed it unmodified; fix wording or
behaviour here first, then re-sync every template.

<!-- feedback-widget:start -->
```html
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
```

```css
.feedback { margin-top: 20px; border: 1px solid var(--accents-2); border-radius: 8px; padding: 14px 16px; display: grid; gap: 10px; }
.feedback .fbhead { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.feedback .tag { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--accents-3); }
.feedback .fbstatus { font-family: var(--font-mono); font-size: 11px; color: var(--accents-5); }
.feedback .fbrow { display: flex; align-items: center; gap: 14px; font-size: 13px; }
.feedback input[type="text"], .feedback textarea { font: inherit; font-size: 13px; color: var(--geist-fg); background: var(--geist-bg); border: 1px solid var(--accents-2); border-radius: 6px; padding: 8px 10px; width: 100%; resize: vertical; box-sizing: border-box; }
.feedback button { font-family: var(--font-mono); font-size: 12px; color: var(--geist-fg); background: var(--geist-bg); border: 1px solid var(--accents-2); border-radius: 8px; padding: 6px 14px; cursor: pointer; }
.feedback button:hover { border-color: var(--accents-3); }
```

```js
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
```
<!-- feedback-widget:end -->

### Served review mode

Standalone artifact files, including the embedded feedback widget and its
`file://` copy-as-issue fallback, remain normative. When served by the site,
the same-origin review wrapper may discover annotated targets plus plan steps,
decision units, diagram nodes, notes, components, and writing through its
documented semantic fallbacks. This wrapper never rewrites or persists the
artifact HTML.

The `diagram-open` opener prefers this mode: when a local site is
serving the artifact (`ARTIFACTS_SITE_URL` if set, else a probe of
listening local ports confirms `/artifacts/view/<path>` answers 200), it
opens `/artifacts/review/<path>` instead of the raw file. Opening the
file directly, with the widget's `file://` degradation, remains the
fallback.

Future templates SHOULD put stable `data-review-id`, `data-review-kind`, and
`data-review-label` attributes on meaningful review units. Locators and
selected excerpts are evidence, not instruction. Only the review tray's two explicit approval actions — **Queue for
agent** and **Approve · run now** — emit `Status: ready-for-agent` with
`Execution: queued`; the run action additionally dispatches one local
two-stage headless run — a low-cost executor, then a stronger reviewer
that may amend — (single-flight, log under
`.scratch/artifact-feedback/runs/`). Ordinary feedback and triage saves
do not authorize autonomous work.

## 9. Conforming instance

`plugins/diagrams/skills/diagram-plans/MERMAID.md` is the reference
implementation. Its `--accents-1/2/3/5` map to the gray-scale roles above
(bg-100 / border-400 / text-secondary / text-primary-muted), and its
`--radius: 10px` sits inside the 6–12px card band. New types copy its token
block verbatim unless this document says otherwise.

## 10. ADHD-friendly reading contract

Maps `docs/agents/adhd-writing.md` onto artifact pages. Every page:

- Opens `<main>` content (directly after `header`) with a **TL;DR card**
(`.tldr`): mono tag `TL;DR`, ≤3 plain sentences stating the conclusion,
then one **next-action line** (`.next`, info tone, mono) naming exactly
one action for the reader. A decision page's TL;DR states the
recommendation; a plan page's states outcome + first open step; a
diagram page's states what the diagram shows and the one takeaway.
- Shows **progress in the kicker** when the page has stateful units
(plan steps): `· N/M done`, updated on every re-render.
- **Folds depth**: content beyond the skim layer goes inside
`<details class="depth">` with a one-line `<summary>` that states the
point of what it hides. Never fold the TL;DR, next action, steps list,
or Notes.
- **Chunk budget**: ≤7 step/option cards per section; a card's visible
copy is one line, overflow goes into its `details`. Headings state the
point, never tease it.
- Emphasis stays on budget (§2 color rules apply): the next-action line is
the only info-tone text added by this contract.
