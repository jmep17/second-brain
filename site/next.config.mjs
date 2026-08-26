/** @type {import('next').NextConfig} */
const config = {
  // Prototype (ticket 07): static export dropped per the runtime decision in
  // .scratch/config-system/issues/03-ui-runtime.md — the config editor needs
  // request-driven route handlers, which `output: "export"` forbids.
  reactStrictMode: true,
  // Keep Next 16 from writing its own AGENTS.md/CLAUDE.md into site/ —
  // the repo root owns those files.
  agentRules: false,
  // No image optimizer dependency (sharp). Content images are rendered as
  // plain <img> (see app/docs/[[...slug]]/page.tsx); this is a safety net
  // for any next/image usage inside fumadocs-ui.
  images: { unoptimized: true },
};

export default config;
