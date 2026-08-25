---
status: accepted
---

# Personal wiki lives in a nested private repo, not a directory of the main repo

The work Mac must never hold personal wiki pages, but they must stay version-controlled and render on the personal Mac's site. Sparse checkout and partial clone were rejected because both leave the personal blobs in `.git` on the work Mac (partial clone re-fetches them on `git log -p` / `git grep`). So `personal/` (holding `wiki/`, `raw/`, `memory/`, `log.md`) is a separate private repo nested in the main tree as a git submodule, left uninitialised on the work Mac, which leaves no bytes there. The submodule was chosen over a hostname-gated chezmoi external because the link is versioned in git and the work Mac's read-only deploy key blocks fetching it server-side (config-system ticket 04, 2026-08-25). Exclusion is by path, never by page frontmatter, so one forgotten flag can't leak a page.

## Consequences

- `wiki/index.md` lists shared pages only; the personal repo keeps its own index.
- Wikilinks from shared pages into personal pages dangle on the work Mac.
- The site must render with `personal/` empty.
- Personal ingests are logged in `personal/log.md`, not the root `log.md`.

Evidence: `.scratch/config-system/research/02-work-exclusions.md`.
