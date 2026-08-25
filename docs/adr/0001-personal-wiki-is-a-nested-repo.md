---
status: accepted
---

# Personal wiki lives in a nested private repo, not a directory of the main repo

The work Mac must never hold personal wiki pages, but they must stay version-controlled and render on the personal Mac's site. Sparse checkout and partial clone were rejected because both leave the personal blobs in `.git` on the work Mac (partial clone re-fetches them on `git log -p` / `git grep`). So `wiki/personal/` (and `raw/personal/`) is a separate private repo nested in the main tree — an uninitialised submodule or a hostname-gated chezmoi external — which leaves no bytes on the work Mac. Exclusion is by path, never by page frontmatter, so one forgotten flag can't leak a page.

## Consequences

- `wiki/index.md` lists shared pages only; the personal repo keeps its own index.
- Wikilinks from shared pages into personal pages dangle on the work Mac.
- The site must render with `wiki/personal/` absent.
- The exact nesting mechanism is decided in the config-system map, ticket 04.

Evidence: `.scratch/config-system/research/02-work-exclusions.md`.
