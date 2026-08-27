# Approve: Geist review chrome, Dashboard artifacts index, Open question on the page

Status: resolved
Kind: feedback
Artifact: artifacts/decisions/2026-08-27-artifacts-workflow-direction.html
Date: 2026-08-27

Approved options: Geist review chrome; Dashboard artifacts index; Open question on the page. Turn these into plans.

## Comments

- 2026-08-27: Claimed directly by the owner (interactive session, not the autonomous queue — this batch has no `Execution:` line so it never entered that pipeline). Turning the three approved options into `plans/NNN-*.md` files via the `improve` skill's `plan` variant, per the repo's established plan workflow (see `plans/README.md`).
- 2026-08-27: Resolved. Wrote `plans/017-geist-review-chrome.md`, `plans/018-dashboard-artifacts-index.md`, and `plans/020-open-question-on-the-page.md` (each fully specified: current state grounded in actual file:line reads, not the decision artifact's citations alone; scope; steps with verify commands; done criteria; STOP conditions), and added their rows plus a summary note to `plans/README.md`. Numbers 017/018/020, not 016/017/018 as first written, and skip 019: a concurrent session was independently writing a plan numbered 016 at the same time, found the collision, renumbered itself to 019, and left a note asking this issue's author to add rows once ready. Both sessions then landed on 019 for different files a second time; resolved by taking 017/018/020 here and leaving the concurrent session's 019 untouched. No code was written — plan files only, per the `improve` skill's hard rule. No `plans/014` file was touched. Plans 017/018/020 are new work, not yet executed; a future "execute 017/018/020" or dispatched-executor run against them is a separate action.
