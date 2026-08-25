# Research: runtime for an editing web UI

Ticket: [03-ui-runtime](../issues/03-ui-runtime.md). Date: 2026-08-25.
Versions checked: Next.js 16.3.2, fumadocs-core/ui 16.15.1, fumadocs-obsidian 1.0.3 (`site/package.json`).

## Summary

- `output: 'export'` cannot host a file-writing API. Route handlers in an export are pre-rendered at build time (GET only, `force-static`); Server Actions and request-dependent handlers are unsupported. Source: [Next.js static export guide](https://nextjs.org/docs/app/guides/static-exports) ("Only the `GET` HTTP verb is supported ... If you need to read dynamic values from the incoming request, you cannot use a static export"; unsupported list includes Server Actions, Route Handlers that rely on Request, rewrites, proxy).
- Dropping `output: 'export'` and running `next dev` (or `next build && next start`) unlocks route handlers and Server Actions with no other code change. The existing search route (`site/app/api/search/route.ts`, `staticGET` + `revalidate = false`) keeps working.
- Fumadocs can read markdown from any directory: `obsidian({ dir, include })` takes an absolute vault root and globs (`site/lib/source.ts` already points `dir` at the repo root, `include: ["wiki/**/*.md", ...]`; `node_modules/fumadocs-obsidian/dist/index.d.ts` lines 68-71). Adding `config/**/*.md` is one line.
- But Fumadocs only treats `.md`/`.mdx` as pages; everything else is classified as `media` (`node_modules/fumadocs-obsidian/dist/index.js` line 28: `ContentExtensions = new Set([".md", ".mdx"])`). `.zshrc`, `*.fish`, `*.lua`, `*.toml`, `settings.json` will never render as Fumadocs pages. The editing UI needs its own read/write file API regardless of which runtime is chosen; Fumadocs stays the wiki renderer only.
- For live updates without restart, fumadocs-obsidian ships `dynamicSource()` + `dynamicLoader()` and a watcher (`fumadocs-obsidian dev -- next dev`, `vault.devServer()`), with `invalidate()`/`revalidate()` on the loader. Source: [Obsidian integration](https://fumadocs.dev/docs/integrations/content/obsidian), [Source API](https://fumadocs.dev/docs/headless/source-api). The README note "restart to pick up new wiki pages" goes away.

## Options

### A. Next.js as a local server (recommended)

- Change: remove `output: "export"` from `site/next.config.mjs`; `images.unoptimized` can stay.
- Add `app/api/files/route.ts` (GET/PUT) or Server Actions that read/write under an allow-listed set of repo paths. Runs in Node, so `node:fs` is available.
- Switch `lib/source.ts` to `dynamicLoader(vault.dynamicSource())` + `fumadocs-obsidian dev -- next dev` so edits to wiki pages show without restart.
- Run: `bun run dev` (already exists). For a no-dev-overhead option: `output: 'standalone'` then `node .next/standalone/server.js` ([Next.js output docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)).
- Cost: small. One config line, one route file, one loader swap. Lose the `out/` static artifact (no static hosting). Only one process, one port.
- Risk: the web UI writes files as the logged-in user with no auth; bind to localhost only.

### B. Static export + separate Bun/Hono server

- Keep `out/`; add `server/index.ts` with Hono (`export default { port, fetch: app.fetch }`, `serveStatic` from `hono/bun`) that serves `out/` and exposes `/api/files`. Source: [Hono on Bun](https://hono.dev/docs/getting-started/bun).
- Cost: medium. Second package, second process (or Hono serves the export), CORS/port wiring, and the static site cannot render newly edited wiki pages until rebuilt (export is build-time). Rewrites/proxy are unsupported in export mode, so the static site must call the API by absolute URL.
- Wins only if a Node/Next server is unacceptable. It is not here.

### C. Tauri wrapper

- Tauri requires `output: 'export'` ("Tauri doesn't support server-based solutions") and file access goes through Rust commands / the fs plugin. Source: [Tauri Next.js guide](https://v2.tauri.app/start/frontend/nextjs/).
- Cost: high. Rust toolchain, a second language for the file API, same static-render staleness as B, and the wiki search route still needs a build. Gains a dock icon and nothing else the ticket asks for.
- Electron: same shape as C with a bundled Node; not evaluated further.

## Recommendation

Option A. Turn `site/` into a localhost Next.js server: drop the export flag, add a file API route (or Server Actions) scoped to `../config/**` and `../wiki/**`, use `dynamicSource()` for live wiki reload. Migration is hours, not days. Revisit B/C only if a static deploy target reappears.

## Open questions surfaced

- Does the work machine need the site at all, or only the personal one? Affects whether any static deploy target remains.
- Rendering config files: raw text editor is trivial; a "docs page per config" (ticket 06) would be a hand-written wiki page next to the file, not a Fumadocs render of the file itself.
- `dynamicSource()` on Next 16 with Turbopack: the docs describe the CLI watcher path; verify in the prototype (ticket 07).
