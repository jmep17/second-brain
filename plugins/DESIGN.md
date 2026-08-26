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
subtle — `0 4px 16px rgb(0 0 0 / .06)`.

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

## 8. Feedback affordance (placeholder)

Every artifact page reserves a feedback affordance; its concrete widget and
API contract are defined by plan 012 and appended to this document then.

## 9. Conforming instance

`plugins/diagrams/skills/diagram-plans/MERMAID.md` is the reference
implementation. Its `--accents-1/2/3/5` map to the gray-scale roles above
(bg-100 / border-400 / text-secondary / text-primary-muted), and its
`--radius: 10px` sits inside the 6–12px card band. New types copy its token
block verbatim unless this document says otherwise.
