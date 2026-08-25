import path from "node:path";
import { loader } from "fumadocs-core/source";
import { obsidian } from "fumadocs-obsidian";
import { slug } from "github-slugger";
import { remarkLooseLinks } from "@/lib/remark-loose-links";

/** The Obsidian vault is the whole repo, narrowed by `include`. */
const vaultDir = path.resolve(process.cwd(), "..");

export const vault = obsidian({
  dir: vaultDir,
  // Only the knowledge base. Never node_modules/, .obsidian/, plans/, docs/,
  // site/. Only *.md (not *.json/*.yaml — those are validated as meta files)
  // plus everything under raw/assets (served as media).
  // wiki/index.md is not a page: the home page (app/page.tsx) replaces it
  // and reads its summaries via lib/toc.ts.
  include: ["wiki/**/*.md", "!wiki/index.md", "raw/**/*.md", "raw/assets/**/*"],
  // Media files are copied to public/vault by scripts/sync-assets.mjs, so a
  // vault path like raw/assets/x.png is served at /vault/raw/assets/x.png.
  url: (vaultPath) => `/vault/${vaultPath}`,
  // Repairs `[text](../raw/File With Spaces.md)` links the markdown parser
  // drops (see lib/remark-loose-links.ts).
  remarkPlugins: [remarkLooseLinks],
  // Disable build-time image size probing: it fetches remote images over the
  // network and fails the build on any dead URL. Images render as plain <img>.
  remarkImageOptions: false,
});

/** `How to Store Dotfiles - A Bare Git Repository` → `how-to-store-dotfiles-a-bare-git-repository` */
function slugify(segment: string): string {
  return slug(segment).replace(/-+/g, "-");
}

export const source = loader(await vault.staticSource(), {
  baseUrl: "/docs",
  // Default slugs are encodeURI(path segment), which keeps spaces as %20.
  // Make every URL segment lowercase-kebab instead. Links between pages are
  // resolved by file path, not slug, so this cannot break them.
  slugs: (_file, next) => next().map((seg) => slugify(decodeURI(seg))),
});
