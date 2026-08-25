import path from "node:path";
import { dynamicLoader } from "fumadocs-core/source";
import { obsidian } from "fumadocs-obsidian";
import { slug } from "github-slugger";
import { remarkLooseLinks } from "@/lib/remark-loose-links";
import { titleFromHeading } from "@/lib/title-from-heading";

/** The Obsidian vault is the whole repo, narrowed by `include`. */
const vaultDir = path.resolve(process.cwd(), "..");

export const vault = obsidian({
  dir: vaultDir,
  // Everything documentary in the repo. Never node_modules/, .obsidian/,
  // site/, .claude/. Only *.md (not *.json/*.yaml — those are validated as
  // meta files) plus everything under raw/assets (served as media).
  // `.scratch/**` must be spelled out: globs do not enter dot-directories
  // on their own.
  include: [
    "*.md",
    "wiki/**/*.md",
    "!wiki/index.md", // replaced by the home page TOC (plan 003)
    "raw/**/*.md",
    "raw/assets/**/*",
    "plans/**/*.md",
    "docs/**/*.md",
    ".scratch/**/*.md",
  ],
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

// In dev, the fumadocs-obsidian dev server (see package.json "dev") watches
// the vault and tells this process which file changed, so the next request
// re-reads it. Outside dev the env var is unset and this is a no-op.
if (process.env.NODE_ENV === "development") {
  const { watchWithDevServer } = await import("fumadocs-obsidian/dev/ws");
  // The dev server filters watched files with picomatch, which treats an
  // array as an OR of patterns — a "!foo" entry matches everything that
  // is not foo, so the whole repo (node_modules, .next) gets watched.
  // Strip negations: they only narrow the page list, which tinyglobby
  // already handles when the vault is read.
  await watchWithDevServer({
    ...vault,
    include: vault.include.filter((pattern) => !pattern.startsWith("!")),
  });
}

/** `How to Store Dotfiles - A Bare Git Repository` → `how-to-store-dotfiles-a-bare-git-repository` */
function slugify(segment: string): string {
  return slug(segment).replace(/-+/g, "-");
}

const FOLDER_LABELS: Record<string, string> = {
  ".scratch": "Scratch (issues & research)",
};

/**
 * Re-reads the vault on every `get()` (cheap: only invalidated files are
 * re-parsed), so dev picks up new and edited pages. `bun run build` calls it
 * once per render with nothing invalidated — same output as a static loader.
 */
const loader = dynamicLoader(vault.dynamicSource(), {
  baseUrl: "/docs",
  // Default slugs are encodeURI(path segment), which keeps spaces as %20.
  // Make every URL segment lowercase-kebab instead. Links between pages are
  // resolved by file path, not slug, so this cannot break them.
  slugs: (_file, next) => next().map((seg) => slugify(decodeURI(seg))),
  plugins: [titleFromHeading],
  pageTree: {
    transformers: [
      {
        folder(node, folderPath) {
          const label = FOLDER_LABELS[folderPath];
          return label ? { ...node, name: label } : node;
        },
      },
    ],
  },
});

/** Await this in every server component / route that needs pages. */
export function getSource() {
  return loader.get();
}

/** The type of what `getSource()` resolves to; use it in helper signatures. */
export type Source = Awaited<ReturnType<typeof getSource>>;
