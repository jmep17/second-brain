# Where work Claude memory lives and is tracked

Type: grilling
Status: open
Blocked by: 04

## Question

Claude Code auto-memory is machine-local by default (`~/.claude/projects/<project>/memory/`). The personal Mac can redirect it into the personal repo via `autoMemoryDirectory`. The work Mac has no personal-account write credential (ticket 02), so its memory can only be tracked in the work-account repo. Decide where work memory lives and how it is versioned:

- (a) plain directory `work/memory/` in the work Mac's clone, committed locally, pushed to the work remote only; main repo never contains `work/`
- (b) symmetric submodules `personal/` and `work/`, each initialised on one machine only
- (c) a separate work-account repo cloned outside the monorepo

Also decide whether (a) introduces a general "work-only" content class at path `work/` (add to CONTEXT.md and the ticket 02 table), and whether `autoMemoryDirectory` is set per host in the `settings.json` chezmoi template.

Facts to verify before deciding: does git on the work Mac ignore files written under an uninitialised submodule path (matters if the same `personal/memory/` path were used on both hosts)?

Split out of ticket 04 during grilling on 2026-08-25 (round 2, Q5/Q5b).
