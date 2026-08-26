# site

Fumadocs UI for the second-brain wiki. Reads `../wiki` and `../raw` directly
(Obsidian syntax supported) and builds a static site into `out/`.

- `bun install`
- `bun run dev` — local preview at http://localhost:3000; new and edited pages show up automatically (file watcher on port 8000, `-p` to change)
- `bun run build` — static export to `out/`
- `bun run start` — serve the export locally

The home page (`/`) is a generated table of contents (`lib/toc.ts`): every page grouped by frontmatter `type`, with the one-line summaries read from `../wiki/index.md`. `wiki/index.md` itself is not published as a page.

Every page — the home table of contents, `/docs/*`, the config editor at
`/config/<tool>`, and the 404s — renders inside Fumadocs' `DocsLayout`, so the
navigation sidebar is always present. The shared props come from
`docsLayoutProps()` in `lib/layout.shared.tsx`; add new pages through it rather
than constructing a `DocsLayout` by hand. The sidebar's `Config` folder is
injected by a page-tree `root` transformer in `lib/source.ts` and is generated
from `TOOLS` in `lib/config-files.ts` — adding a tool there adds it to the
sidebar with no other change.

Images in `../raw/assets` are copied to `public/vault/raw/assets` before dev/build.
