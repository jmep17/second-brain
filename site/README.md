# site

Fumadocs UI for the second-brain wiki. Reads `../wiki` and `../raw` directly
(Obsidian syntax supported) and builds a static site into `out/`.

- `bun install`
- `bun run dev` — local preview at http://localhost:3000 (restart to pick up new wiki pages)
- `bun run build` — static export to `out/`
- `bun run start` — serve the export locally

Images in `../raw/assets` are copied to `public/vault/raw/assets` before dev/build.
