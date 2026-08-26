---
name: plan-pages
description: Render a plan, specification, or tickets document—or a plan the agent is about to deliver—as a standalone Geist-styled HTML plan page opened in the browser. Use when the user requests a plan artifact or the plan-artifact hook nudge appears.
---

Plans are ordered work: show sequence, state, dependencies, risks, and open questions on one reviewable page.

## Steps

1. **Pick the content.** Identify the plan's ordered steps, current status for each step, explicit dependencies, risks, and at most one open question.
2. **Gather the source.** Read the plan/spec/tickets document and every local file needed to ground its claims. When no document exists yet, gather the evidence the plan depends on before writing. Done when every step and dependency traces to inspected evidence rather than a guess.
3. **Write the HTML file** from [`TEMPLATE.md`](TEMPLATE.md) verbatim; change only its placeholders and repeatable step, dependency, and note cards. Path:
   - directory: `$PLANS_DIR` if set (absolute, or relative to the project root), else `artifacts/plans/`; create it if missing;
   - filename: `YYYY-MM-DD-<kebab-slug>.html`; re-rendering the same topic reuses the same path;
   - keep steps short enough to scan, use only `todo`, `doing`, `done`, or `blocked` status chips, and omit a chip when status is unknown.
4. **Open it in the browser.** Run `diagram-open <absolute-file-path>`. If unavailable, run `bash "${CLAUDE_PLUGIN_ROOT}/bin/diagram-open" <absolute-file-path>`. If the agent defines neither command nor `CLAUDE_PLUGIN_ROOT`, run `bash <dir-of-this-SKILL.md>/../../bin/diagram-open <absolute-file-path>`. On a revision, refresh the existing tab. `DIAGRAMS_OPEN=0` skips opening for every artifact type.
5. **The artifact is the response.** Reply with at most the saved path, opener status, and one open question, per `plugins/DESIGN.md` section 7. An explicit request for prose overrides this contract.

Done when the page exists at the configured path, the opener reports `opened` or opening was disabled, and the reply follows the artifact response contract.

## Rules

- The Markdown plan remains the source of truth when one exists; the HTML page is its review surface.
- Keep dependencies as mono text (`03 ← 01, 02`). Use a companion diagram artifact when the relationships need a graph.
- Keep every asset inline except Google Fonts. The page renders fully offline with fallback fonts.
- Preserve the feedback widget from the template. Change its `data-artifact` path to the final repo-relative artifact path.
- When revising the same topic, edit the existing file instead of making a duplicate.
