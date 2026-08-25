# Runtime for an editing web UI

Type: research
Status: resolved
Blocked by: —

## Question

The current site is a Fumadocs/Next.js _static export_ (`site/`, `bun run build` → `out/`). A UI that edits files on disk needs a server process. Investigate options: run the Next.js app as a local dev/server with API routes that read/write repo files; a small separate local server (Bun/Hono) the static site calls; a desktop wrapper (Tauri/Electron). Check Fumadocs docs for whether static export and server routes can coexist, and how it handles MDX from arbitrary directories (`../config/**`).

Deliver: what it costs to move from static export to a local server, and a recommended runtime shape.

## Answer

Recommended shape: run `site/` as a localhost Next.js server instead of a static export. Remove `output: "export"`, add a file-read/write API (route handler or Server Actions) allow-listed to `../config/**` and `../wiki/**`, and switch the Fumadocs loader to `dynamicLoader(vault.dynamicSource())` with the `fumadocs-obsidian dev` watcher so edits show live.

Why: static export forbids request-driven route handlers and Server Actions entirely (Next.js docs), so any editing UI needs a server. Next itself is the cheapest one. Fumadocs can already read markdown from any directory via `dir`/`include`, but it only renders `.md`/`.mdx`; shell/lua/toml/json config files need the custom file API no matter what. A separate Bun/Hono server or a Tauri wrapper adds a second process or a Rust layer and keeps the wiki render stale until rebuild.

Migration cost: small (one config line, one route file, one loader swap; lose the `out/` static artifact). Details and citations: [research/03-ui-runtime.md](../research/03-ui-runtime.md).
