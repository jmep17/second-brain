/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  // Static export has no image optimizer. Content images are rendered as
  // plain <img> (see app/docs/[[...slug]]/page.tsx); this is a safety net
  // for any next/image usage inside fumadocs-ui.
  images: { unoptimized: true },
};

export default config;
