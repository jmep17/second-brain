---
name: decision-pages
description: Render a decision, RFC, ADR-shaped request, or “should we choose X or Y?” comparison as a standalone Geist-styled HTML decision page opened in the browser. Use when the user requests a decision artifact or the plan-artifact hook routes an RFC document here.
---

Decisions need a compact record of context, real options, trade-offs, and the recommendation.

## Steps

1. **Pick the content.** Identify the decision status (`proposed`, `accepted`, or `rejected`), context, viable options, trade-offs, recommendation, risks, and at most one open question.
2. **Gather the evidence.** Read the RFC/ADR and every local source needed to ground the comparison. When no source document exists, inspect the relevant system before choosing. Done when every option and trade-off traces to inspected evidence rather than a guess.
3. **Write the HTML file** from [`TEMPLATE.md`](TEMPLATE.md) verbatim; change only its placeholders and repeatable option and note cards. Path:
   - directory: `$DECISIONS_DIR` if set (absolute, or relative to the project root), else `artifacts/decisions/`; create it if missing;
   - filename: `YYYY-MM-DD-<kebab-slug>.html`; re-rendering the same topic reuses the same path;
   - keep Context to three sentences or fewer and recommendation rationale to one line.
4. **Open it in the browser.** Run `diagram-open <absolute-file-path>`. If unavailable, run `bash "${CLAUDE_PLUGIN_ROOT}/bin/diagram-open" <absolute-file-path>`. If the agent defines neither command nor `CLAUDE_PLUGIN_ROOT`, run `bash <dir-of-this-SKILL.md>/../../bin/diagram-open <absolute-file-path>`. On a revision, refresh the existing tab. `DIAGRAMS_OPEN=0` skips opening for every artifact type. When a local site is serving the repo's `artifacts/` (`ARTIFACTS_SITE_URL` if set, else a probe of listening local ports), the opener opens the served review page — `/artifacts/review/<type>/<file>`, with element selection and batch feedback — instead of the raw file; `file://` is the fallback.
5. **The artifact is the response.** Reply with at most the saved path, opener status, and one open question, per `plugins/DESIGN.md` section 7. An explicit request for prose overrides this contract.

Done when the page exists at the configured path, the opener reports `opened` or opening was disabled, and the reply follows the artifact response contract.

## Rules

- The RFC or ADR remains the source of truth when one exists; the HTML page is its review surface.
- Include only viable options. Use the same level of detail for each option so the comparison is honest.
- Keep every asset inline except Google Fonts. The page renders fully offline with fallback fonts.
- Preserve the feedback widget from the template with RFC selected. Change its `data-artifact` path to the final repo-relative artifact path.
- When revising the same topic, edit the existing file instead of making a duplicate.
- Option cards are clickable: the template's selection script composes the picked options into the feedback widget's title/body. Preserve it, and keep option `<h2>` text short — it becomes the approval text.
- The template omits DESIGN.md §5 guide lines; add them only when the options form a clean 2×2 grid — stray guide stubs read as visual noise on any other layout.
- When the options propose UI changes, offer to spin up wireframes (quick mock pages or the prototype skill) before the decision is locked; put that offer in the reply's open question.
