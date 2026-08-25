# Runtime for an editing web UI

Type: research
Status: open
Blocked by: —

## Question

The current site is a Fumadocs/Next.js _static export_ (`site/`, `bun run build` → `out/`). A UI that edits files on disk needs a server process. Investigate options: run the Next.js app as a local dev/server with API routes that read/write repo files; a small separate local server (Bun/Hono) the static site calls; a desktop wrapper (Tauri/Electron). Check Fumadocs docs for whether static export and server routes can coexist, and how it handles MDX from arbitrary directories (`../config/**`).

Deliver: what it costs to move from static export to a local server, and a recommended runtime shape.
