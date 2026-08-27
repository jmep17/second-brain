# ADHD-friendly writing

Every document an agent writes for the human in this repo — plans, specs,
tickets, wiki pages, answers, artifact pages, README index files — follows
these rules. They exist because structure is external working memory: the
page holds the outline so the reader doesn't have to. Evidence and sources:
`.claude/skills/adhd-summarize/references/research.md` and plan
`plans/044-adhd-friendly-authoring-standard.md`.

## The ten rules

1. **Conclusion first (BLUF).** Open with ≤3 sentences: what this is, why
   it matters, what happens next. Never make the reader earn the point.
2. **One next action, always visible.** Every actionable document names
   exactly one "start here". A reader with 15 seconds leaves knowing it.
3. **Chunk by intent.** ≤3 sentences per paragraph, ~5 items per group,
   one idea per chunk. Don't mix what/why/how in one paragraph.
4. **Headings state the point.** "Vendoring Mermaid removes the CDN risk",
   not "Mermaid considerations". Headings alone must carry the argument.
5. **Tag effort.** Steps and tasks carry a size (S/M/L or minutes). An
   untagged task feels infinite and gets deferred (time blindness).
6. **Show progress.** Status per step (todo/doing/done/blocked), N-of-M
   counts. Keep done items visible — the shrinking list is the reward.
7. **Layer the depth.** 10-second TL;DR → 2-minute skim layer → full
   detail. Fold long detail so re-entry works at any layer.
8. **Same shape every time.** Reuse the repo's templates verbatim; never
   invent a new layout when an existing one fits. Predictable beats novel.
9. **Emphasis is a budget.** Bold only load-bearing phrases; sparse
   semantic color; no decorative stimulus. If everything is loud, nothing is.
10. **Concrete beats abstract.** Numbers, file paths, names, commands —
    give attention something to grip; delete filler.

## Where each rule binds

- Markdown plans/specs/tickets: rules 1–8 are the "At a glance" block,
  effort tags, and status lines their templates carry.
- HTML artifact pages: `plugins/DESIGN.md` maps these rules onto the page
  contract (TL;DR card, next-action line, status chips, folded depth).
- Summaries of external documents: the `adhd-summarize` skill already
  implements these rules reader-side.
