# Plan 004: Make the page _and the diagram_ actually follow Geist, and inline the fonts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat cd109ef..HEAD -- plugins/diagram-plans/skills/diagram-plans/MERMAID.md plugins/diagram-plans/bin`
> If any in-scope file changed since this plan was written beyond what plans
> 001–003 did, compare the "Current state" excerpts against the live code
> before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/003-fix-render-harness.md`
- **Category**: design
- **Planned at**: commit `cd109ef`, 2026-08-26

## Why this matters

The README claims the page is "styled on Vercel's Geist design system". Two
things are wrong with that.

**The diagram itself is not Geist-styled at all — only the page chrome is.** The
template passes Mermaid only `fontFamily` and `fontSize`, so every colour inside
the SVG comes from Mermaid's stock `neutral` theme in light mode
(`mainBkg: '#eee'`, `lineColor: '#666'`) and its `dark` theme in dark mode
(slate and purple). The reader sees a Geist-white page containing a grey,
off-brand, low-contrast diagram.

**The page tokens are the legacy 2020 Vercel Design palette, not Geist.** The
`--accents-1..5` scale was superseded by Geist's `--ds-gray-100..1000` plus a
`--ds-gray-alpha-*` scale. Worse, the semantic colours are both stale and
misnamed: `--geist-success: #0070f3` holds a _blue_ — and not even Geist's blue
(`#006bff`) — while Geist's success is green-900. The grey values that are
present (`#171717`, `#fafafa`, `#eaeaea`, `#ededed`) do happen to match Geist
gray-1000 / background-200 / gray-400, which is why this reads as "nearly right"
rather than obviously wrong.

The concrete harm is measurable: `.risk` renders `#f5a623` on `#ffffff`, a
contrast ratio of **2.03:1**. WCAG AA needs 4.5:1. The risk callouts — the lines
a reader most needs to see — are the least legible text on the page. Geist's
amber-900 (`#aa4d00`) gives 5.57:1.

Inlining the fonts as `data:` URIs fixes a second-order problem at the same
time: Geist and Geist Mono are variable fonts whose latin subsets are only
**29,400** and **23,128** bytes (70 KB combined as base64). Inlining them makes
`document.fonts.ready` resolve without a network round-trip, which removes the
last route back to the label-overflow bug plan 003 fixed, and makes a saved page
render identically offline or when emailed to someone else.

## Current state

`plugins/diagram-plans/skills/diagram-plans/MERMAID.md:26-38` — the font link and
the token block to replace:

```html
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
```

`MERMAID.md:56` — the failing contrast:

```css
.risk {
  color: var(--geist-warning);
}
.open {
  color: var(--geist-success);
}
```

And the `themeConfig(dark)` function plan 003 created as a seam for this plan:

```js
function themeConfig(dark) {
  return {
    theme: dark ? "dark" : "neutral",
    themeVariables: {
      fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
      fontSize: "16px",
    },
  };
}
```

### The authoritative Geist values

These were computed from the OKLCH definitions published in Vercel's own
`https://vercel.com/geist/vercel-brand.css` and converted to sRGB hex. Use them
exactly; do not re-derive or "improve" them.

| Token                 | Light     | Dark      |
| --------------------- | --------- | --------- |
| `--ds-gray-100`       | `#f2f2f2` | `#1a1a1a` |
| `--ds-gray-200`       | `#ebebeb` | `#1f1f1f` |
| `--ds-gray-300`       | `#e6e6e6` | `#292929` |
| `--ds-gray-400`       | `#eaeaea` | `#2e2e2e` |
| `--ds-gray-500`       | `#c9c9c9` | `#454545` |
| `--ds-gray-600`       | `#a8a8a8` | `#878787` |
| `--ds-gray-700`       | `#8f8f8f` | `#8f8f8f` |
| `--ds-gray-800`       | `#7d7d7d` | `#7d7d7d` |
| `--ds-gray-900`       | `#4d4d4d` | `#a0a0a0` |
| `--ds-gray-1000`      | `#171717` | `#ededed` |
| `--ds-background-100` | `#ffffff` | `#000000` |
| `--ds-blue-700`       | `#006bff` | `#006efe` |
| `--ds-blue-900`       | `#005ff2` | `#47a8ff` |
| `--ds-red-700`        | `#fc0035` | `#f13242` |
| `--ds-red-900`        | `#d8001b` | `#ff565f` |
| `--ds-amber-700`      | `#ffae00` | `#ffae00` |
| `--ds-amber-900`      | `#aa4d00` | `#ff9300` |
| `--ds-green-700`      | `#28a948` | `#00ac3a` |
| `--ds-green-900`      | `#107d32` | `#00ca50` |

Two deliberate departures, both because the published values do not translate
to a standalone page:

- **`--ds-background-200` is not used.** Its dark value computes to `#000000`,
  identical to `background-100`, so it cannot create the card lift it exists
  for. Cards use `--ds-background-100` with a `--ds-gray-alpha-400` border
  instead, which is Geist's actual card treatment.
- **The `--vbg-*` names from the brand CSS are not adopted.** That stylesheet is
  Vercel's _brand report_ foundation; it carries a Vercel wordmark header and
  triangle footer as part of its contract. Using it would brand a user's private
  planning diagrams as Vercel documents. Take the token values, not the identity.

Geist's semantic mapping, which is what the misnamed variables get replaced by:
`info → blue-700`, `success → green-900`, `warning → amber-900`,
`error → red-900`. Geist's own design guidance is "design in monochrome; use
colour only when it adds significant meaning" — so these four appear only on
risk/open/error affordances, never as decoration.

### Where this plan sits relative to its neighbours

Plan 003 owns the layout CSS, markup and script _structure_; plan 005 owns the
`theme` / `look` / `layout` keys and the diagram-type table. **This plan owns
every colour, every font, and the body of `themeConfig`.** Plan 005 will add
keys to the object you return — leave it as an object literal it can extend.

## Commands you will need

| Purpose              | Command                                                    | Expected on success                                           |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| Rebuild the font CSS | `bash tools/build-geist-fonts.sh`                          | exit 0; writes `plugins/diagram-plans/assets/geist-fonts.css` |
| Page structure lint  | `python3 test/lint-page.py test/fixtures/sample-plan.html` | exit 0                                                        |
| Render check         | `npm run test:render`                                      | exit 0                                                        |
| Everything           | `npm test`                                                 | exit 0                                                        |
| Contrast check       | `python3 tools/contrast.py <fg> <bg>`                      | prints a ratio                                                |

## Scope

**In scope**:

- `plugins/diagram-plans/assets/geist-fonts.css` (create — generated)
- `plugins/diagram-plans/assets/OFL.txt` (create — the font licence)
- `tools/build-geist-fonts.sh` (create)
- `tools/contrast.py` (create)
- `plugins/diagram-plans/bin/diagram-build` (create)
- `plugins/diagram-plans/skills/diagram-plans/MERMAID.md` — the `<head>` font
  link, the `:root` and dark-mode token blocks, every colour reference in the
  stylesheet, and the body of `themeConfig`
- `plugins/diagram-plans/skills/diagram-plans/SKILL.md` — **step 3's bullet list only**
- `test/fixtures/sample-plan.html` (regenerate)
- `README.md` — the sentence describing what the page loads
- `plugins/diagram-plans/.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` — version bump
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):

- Any other line of `SKILL.md` — plans 005, 006 and 007 own the rest.
- The layout CSS, markup, and script structure plan 003 landed. You are
  replacing colour values inside them, not restructuring them.
- The `theme` / `look` / `layout` keys — plan 005.
- Adding a colour to anything that is not a risk, open question, or error.
  Monochrome is the design system's instruction, not an oversight.

## Git workflow

- Branch: `advisor/004-geist-design-system`
- Message style `diagram-plans: <imperative>`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Vendor the fonts

Create `tools/build-geist-fonts.sh`. It must fetch the Google Fonts CSS with a
modern browser User-Agent (without one, Google serves TTF instead of WOFF2),
extract the **latin** subset URL for each family, download it, base64 it, and
emit a self-contained `@font-face` stylesheet.

```bash
#!/usr/bin/env bash
# Regenerate plugins/diagram-plans/assets/geist-fonts.css with Geist and Geist
# Mono inlined as base64 data: URIs, so a generated diagram page renders with no
# network access and no font-swap reflow.
# Usage: bash tools/build-geist-fonts.sh
set -euo pipefail

out="plugins/diagram-plans/assets/geist-fonts.css"
ua="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
css_url="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"

mkdir -p "$(dirname "$out")"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
curl -fsS -A "$ua" "$css_url" -o "$tmp/gf.css"

python3 - "$tmp" "$out" <<'PY'
import base64, re, sys, urllib.request
tmp, out = sys.argv[1], sys.argv[2]
css = open(f"{tmp}/gf.css").read()
want = {}
for sub, body in re.findall(r'/\* (latin) \*/\s*@font-face \{(.*?)\}', css, re.S):
    fam = re.search(r"font-family: '([^']+)'", body).group(1)
    url = re.search(r'url\((https://[^)]+)\)', body).group(1)
    want.setdefault(fam, url)          # variable font: one file serves all weights
if sorted(want) != ['Geist', 'Geist Mono']:
    raise SystemExit(f"expected Geist and Geist Mono, got {sorted(want)}")
parts = ["/* Generated by tools/build-geist-fonts.sh - do not edit by hand.",
         "   Geist and Geist Mono, latin subset, SIL Open Font License 1.1.",
         "   See assets/OFL.txt. */"]
for fam, url in sorted(want.items()):
    raw = urllib.request.urlopen(url).read()
    b64 = base64.b64encode(raw).decode()
    parts.append(
        f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:400 600;"
        f"font-display:block;src:url(data:font/woff2;base64,{b64}) format('woff2');}}")
open(out, "w").write("\n".join(parts) + "\n")
print(f"wrote {out} ({len(open(out).read())} bytes)")
PY
```

Then fetch the licence:
`curl -fsSL https://raw.githubusercontent.com/vercel/geist-font/main/OFL.txt -o plugins/diagram-plans/assets/OFL.txt`

Two details that matter: `font-display: block` (not `swap`) because a data URI
is instant and `block` guarantees Mermaid never measures against a fallback; and
`font-weight: 400 600` because both are variable fonts — one file covers the
whole range, which is why the payload is so small.

**Verify**:

- `bash tools/build-geist-fonts.sh` → exit 0
- `grep -c 'data:font/woff2;base64,' plugins/diagram-plans/assets/geist-fonts.css` → `2`
- `wc -c < plugins/diagram-plans/assets/geist-fonts.css` → between 68000 and 80000
- `head -3 plugins/diagram-plans/assets/OFL.txt | grep -c 'SIL Open Font License'` → `1`

### Step 2: Add `diagram-build` to splice the fonts in

The skill writes the page as text; it must not have to emit 70 KB of base64.
Instead the template carries a marker and a small executable replaces it.

Create `plugins/diagram-plans/bin/diagram-build` (`chmod +x`):

```bash
#!/usr/bin/env bash
# Replace the <!--GEIST_FONTS--> marker in a generated diagram page with the
# inlined Geist @font-face rules. Idempotent: a page with no marker is left alone.
# On PATH as `diagram-build` while the diagram-plans plugin is enabled.
# Usage: diagram-build <file.html>
set -euo pipefail

file="${1:?usage: diagram-build <file.html>}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fonts="$here/assets/geist-fonts.css"

[ -f "$file" ]  || { echo "no such file: $file" >&2; exit 1; }
[ -f "$fonts" ] || { echo "missing $fonts - run tools/build-geist-fonts.sh" >&2; exit 1; }

if ! grep -q '<!--GEIST_FONTS-->' "$file"; then
  echo "already built (no marker): $file"
  exit 0
fi

python3 - "$file" "$fonts" <<'PY'
import sys
page, fonts = sys.argv[1], sys.argv[2]
html = open(page, encoding="utf-8").read()
html = html.replace("<!--GEIST_FONTS-->", open(fonts, encoding="utf-8").read().strip(), 1)
open(page, "w", encoding="utf-8").write(html)
PY
echo "built $file"
```

**Verify**:

- `bash -n plugins/diagram-plans/bin/diagram-build` → exit 0
- `printf '<style><!--GEIST_FONTS--></style>' > /tmp/t.html && ./plugins/diagram-plans/bin/diagram-build /tmp/t.html && grep -c 'data:font/woff2' /tmp/t.html` → `2`
- Running it a second time on the same file prints `already built (no marker)` and exits 0

### Step 3: Replace the token block

In `MERMAID.md`, delete both `<link>` lines (the page no longer loads anything
from Google Fonts) and replace the `:root` / dark-mode blocks with:

```html
<style>
<!--GEIST_FONTS-->
  :root {
    color-scheme: light dark;
    /* Geist scales — values from vercel.com/geist/colors */
    --ds-gray-100: #f2f2f2; --ds-gray-200: #ebebeb; --ds-gray-300: #e6e6e6;
    --ds-gray-400: #eaeaea; --ds-gray-500: #c9c9c9; --ds-gray-600: #a8a8a8;
    --ds-gray-700: #8f8f8f; --ds-gray-800: #7d7d7d; --ds-gray-900: #4d4d4d;
    --ds-gray-1000: #171717;
    --ds-gray-alpha-300: rgba(0,0,0,0.10); --ds-gray-alpha-400: rgba(0,0,0,0.08);
    --ds-gray-alpha-600: rgba(0,0,0,0.24);
    --ds-background-100: #ffffff;
    --ds-blue-700: #006bff;  --ds-blue-900: #005ff2;
    --ds-red-700: #fc0035;   --ds-red-900: #d8001b;
    --ds-amber-700: #ffae00; --ds-amber-900: #aa4d00;
    --ds-green-700: #28a948; --ds-green-900: #107d32;
    /* semantic — Geist mapping */
    --info: var(--ds-blue-700); --success: var(--ds-green-900);
    --warning: var(--ds-amber-900); --error: var(--ds-red-900);
    /* shape and rhythm */
    --radius: 8px; --radius-small: 6px;
    --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
    --space-6: 24px; --space-8: 32px; --space-12: 48px;
    --font-sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --ds-gray-100: #1a1a1a; --ds-gray-200: #1f1f1f; --ds-gray-300: #292929;
      --ds-gray-400: #2e2e2e; --ds-gray-500: #454545; --ds-gray-600: #878787;
      --ds-gray-700: #8f8f8f; --ds-gray-800: #7d7d7d; --ds-gray-900: #a0a0a0;
      --ds-gray-1000: #ededed;
      --ds-gray-alpha-300: rgba(255,255,255,0.13); --ds-gray-alpha-400: rgba(255,255,255,0.14);
      --ds-gray-alpha-600: rgba(255,255,255,0.51);
      --ds-background-100: #000000;
      --ds-blue-700: #006efe;  --ds-blue-900: #47a8ff;
      --ds-red-700: #f13242;   --ds-red-900: #ff565f;
      --ds-amber-700: #ffae00; --ds-amber-900: #ff9300;
      --ds-green-700: #00ac3a; --ds-green-900: #00ca50;
    }
  }
```

Then update every remaining rule in the stylesheet to the new names — this is a
mechanical substitution, applied everywhere including the rules plan 003 added:

| Old                  | New                        |
| -------------------- | -------------------------- |
| `var(--geist-bg)`    | `var(--ds-background-100)` |
| `var(--geist-fg)`    | `var(--ds-gray-1000)`      |
| `var(--accents-1)`   | `var(--ds-gray-100)`       |
| `var(--accents-2)`   | `var(--ds-gray-alpha-400)` |
| `var(--accents-3)`   | `var(--ds-gray-700)`       |
| `var(--accents-5)`   | `var(--ds-gray-900)`       |
| `var(--geist-error)` | `var(--error)`             |

Finally fix the two failing rules at what was `MERMAID.md:56`:

```css
.risk {
  color: var(--warning);
}
.open {
  color: var(--info);
}
```

`--accents-2` maps to the _alpha_ border token rather than `--ds-gray-400`
because Geist uses translucent borders so a hairline reads correctly on any
surface. `--accents-3` was `#999999` — 2.85:1 on white, used only for the
decorative `—` bullet; `--ds-gray-700` keeps it quiet without being invisible.

**Verify**:

- `grep -c 'fonts.googleapis.com' plugins/diagram-plans/skills/diagram-plans/MERMAID.md` → `0`
- `grep -cE '\-\-accents-|--geist-success|--geist-warning|--geist-bg|--geist-fg' .../MERMAID.md` → `0`
- `grep -c 'GEIST_FONTS' .../MERMAID.md` → `1`
- `python3 tools/contrast.py '#aa4d00' '#ffffff'` → `5.57`, and `>= 4.5`
- `python3 tools/contrast.py '#006bff' '#ffffff'` → `>= 4.5`

Write `tools/contrast.py` first — a stdlib WCAG ratio calculator taking two hex
strings and printing the ratio to two decimals, exiting 1 if below 4.5.

### Step 4: Theme the diagram itself

Replace the body of `themeConfig(dark)` with a full Geist variable set. Mermaid
applies `themeVariables` over any base theme (its `calculate()` copies overrides
both before and after deriving colours), so these values win.

```js
function themeConfig(dark) {
  const g = dark
    ? {
        bg: "#000000",
        fg: "#ededed",
        line: "#8f8f8f",
        border: "#2e2e2e",
        surface: "#1a1a1a",
        muted: "#a0a0a0",
        accent: "#47a8ff",
      }
    : {
        bg: "#ffffff",
        fg: "#171717",
        line: "#8f8f8f",
        border: "#eaeaea",
        surface: "#f2f2f2",
        muted: "#4d4d4d",
        accent: "#005ff2",
      };
  return {
    theme: "base",
    themeVariables: {
      darkMode: dark,
      background: g.bg,
      primaryColor: g.bg, // node fill
      primaryTextColor: g.fg,
      primaryBorderColor: g.border,
      secondaryColor: g.surface,
      tertiaryColor: g.surface,
      mainBkg: g.bg,
      nodeBorder: g.border,
      nodeTextColor: g.fg,
      lineColor: g.line,
      textColor: g.fg,
      titleColor: g.fg,
      edgeLabelBackground: g.bg,
      clusterBkg: g.surface,
      clusterBorder: g.border,
      labelBoxBkgColor: g.bg,
      labelBoxBorderColor: g.border,
      labelTextColor: g.fg,
      errorBkgColor: g.bg,
      errorTextColor: g.fg,
      fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
      fontSize: "16px",
    },
  };
}
```

`theme: "base"` replaces `dark ? "dark" : "neutral"`. Base is the theme Mermaid
documents as the one intended for customisation; it derives the rest of its
palette from the primaries above, so a variable you forget lands somewhere
coherent instead of reverting to `#eee`.

**Verify**:

- `grep -c 'theme: "base"' .../MERMAID.md` → `1`
- `grep -cE 'theme: dark \? "dark"' .../MERMAID.md` → `0`
- `grep -c 'primaryColor' .../MERMAID.md` → `1`

### Step 5: Tell the skill to run `diagram-build`

In `SKILL.md` step 3 **only**, add a final bullet to the existing list:

```
   - After writing the file, run `diagram-build <absolute-file-path>` to inline the Geist fonts (falls back to `bash "${CLAUDE_PLUGIN_ROOT}/bin/diagram-build" <path>` if the command is not on `PATH`). The page is not finished until this reports `built`.
```

Change no other line of `SKILL.md`.

**Verify**:

- `grep -c 'diagram-build' plugins/diagram-plans/skills/diagram-plans/SKILL.md` → `2`
- `git diff --numstat -- .../SKILL.md` → exactly `1	0	...`

### Step 6: Update the docs and bump the version

In `README.md`, replace:

> Each page loads Mermaid from jsDelivr and the Geist fonts from Google Fonts, follows your OS light/dark scheme, and otherwise has no dependencies.

with:

> Each page embeds the Geist fonts directly (SIL Open Font License — see `plugins/diagram-plans/assets/OFL.txt`) and loads only Mermaid, from jsDelivr, on first view. Colours come from Vercel's published Geist scales in both light and dark, and every foreground/background pair meets WCAG AA.

Bump the version to `0.3.0` in both manifests (plan 001 set `0.2.0`) and confirm
with `bash tools/check-version-sync.sh`.

**Verify**:

- `grep -c 'Google Fonts' README.md` → `0`
- `bash tools/check-version-sync.sh` → `version in sync: 0.3.0`

### Step 7: Regenerate the fixture and clear the remaining allowances

Rebuild `test/fixtures/sample-plan.html` from the updated template **and run
`diagram-build` on it** so the fonts are inlined. Then delete the
`geist-tokens`, `no-legacy-tokens`, `font-inlined` and `no-external-css` entries
from any `--allow-fail` list left in `package.json`. After this plan there must
be **no allowances left** from plans 002–004.

**Verify**:

- `npm test` → exit 0
- `grep -cE 'allow-fail|ALLOW_FAIL' package.json` → `0`
- `python3 test/lint-page.py test/fixtures/sample-plan.html` → all PASS including `geist-tokens`, `no-legacy-tokens`, `font-inlined`, `no-external-css`

### Step 8: Look at it

Open the fixture in a real browser in both colour schemes. Confirm by eye:

- Node fills are white on white / black on black with a hairline border — not
  grey boxes, and not slate-and-purple in dark mode.
- All diagram text is Geist, including edge labels.
- The `.risk` line in the notes list is legibly amber-brown in light mode, not
  pale orange.

This is the one judgement call in the plan and it is deliberate: the automated
checks confirm the tokens are _present_, not that the result looks right. If it
does not, report what you see rather than adjusting values to taste.

## Test plan

No new test files; verification runs through plan 002's harness. Add these two
rules to `test/lint-page.py` if they are not already there from plan 002:

- `geist-semantic` — the file contains `--warning: var(--ds-amber-900)` and
  `--success: var(--ds-green-900)`. Guards against the misnaming coming back.
- `theme-base` — the file contains `theme: "base"`.

Then confirm each detects breakage, and revert:

| Injected fault                                          | Must fail rule     |
| ------------------------------------------------------- | ------------------ |
| Restore `--geist-success: #0070f3`                      | `no-legacy-tokens` |
| Restore the Google Fonts `<link>`                       | `no-external-css`  |
| Remove the `<!--GEIST_FONTS-->` splice from the fixture | `font-inlined`     |
| Set `theme: "neutral"`                                  | `theme-base`       |
| Set `--warning: var(--ds-amber-700)`                    | `geist-semantic`   |

## Done criteria

ALL must hold:

- [ ] `npm test` exits 0 with the render check running (not skipped)
- [ ] `grep -cE '\-\-accents-|--geist-success|--geist-warning|--geist-error|--geist-bg|--geist-fg|#f5a623|#0070f3|#ee0000' .../MERMAID.md` returns `0`
- [ ] `grep -c 'fonts.googleapis.com' .../MERMAID.md` returns `0`
- [ ] `grep -c 'theme: "base"' .../MERMAID.md` returns `1`
- [ ] `plugins/diagram-plans/assets/geist-fonts.css` exists, is 68–80 KB, and contains exactly 2 `data:font/woff2;base64,` occurrences
- [ ] `plugins/diagram-plans/assets/OFL.txt` exists and names the SIL Open Font License
- [ ] `test -x plugins/diagram-plans/bin/diagram-build` exits 0
- [ ] `python3 tools/contrast.py '#aa4d00' '#ffffff'` exits 0 with a ratio ≥ 4.5, and the same for every `--info`/`--success`/`--warning`/`--error` value against its background in both schemes
- [ ] `grep -cE 'allow-fail|ALLOW_FAIL' package.json` returns `0`
- [ ] `bash tools/check-version-sync.sh` prints `version in sync: 0.3.0`
- [ ] All five injected faults in the test plan failed their rule and were reverted
- [ ] `git status --porcelain` lists no file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `themeConfig(dark)` does not exist in `MERMAID.md` — plan 003 has not landed,
  and this plan has no seam to fill.
- `tools/build-geist-fonts.sh` produces a file outside 68–80 KB, or a subset
  count other than 2. Google Fonts may have changed what it serves; report the
  actual URLs rather than adjusting the bounds.
- Google Fonts serves TTF rather than WOFF2 despite the browser User-Agent.
  Report it; do not fall back to shipping TTF, which is several times larger.
- Any semantic colour fails the 4.5:1 contrast check against its own
  background in either scheme. Report the pair and the ratio — do not
  substitute a colour that is not in the Geist scales.
- Setting `theme: "base"` makes the render check fail `no-error` for a diagram
  type other than flowchart. Report which type; plan 005 may need to reorder.

## Maintenance notes

- `geist-fonts.css` is **generated**. Never hand-edit it; re-run
  `tools/build-geist-fonts.sh`. Google Fonts rotates the `v5`/`v6` path segments
  in its URLs, so the script fetches the CSS rather than hard-coding font URLs —
  keep it that way.
- The `<!--GEIST_FONTS-->` marker couples the template to `diagram-build`. If
  someone writes a page by hand and skips the build step, the page renders with
  the fallback font stack — legible, but it reintroduces the measurement drift
  plan 003 fixed. Plan 007's validation gate should treat a leftover marker as
  a hard failure.
- The Geist scales are copied values, not a live dependency. If Vercel changes
  them, nothing here notices. Re-derive from `vercel.com/geist/vercel-brand.css`
  if the palette ever looks off; the conversion is OKLCH → sRGB.
- Reviewer should scrutinize: that no colour outside the Geist scales was
  introduced, and that `themeConfig` is still an extensible object literal for
  plan 005.
- Deferred: a light/dark toggle (the page follows the OS scheme, which Geist's
  own guidance prefers), and P3 wide-gamut colour.
