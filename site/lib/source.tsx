import path from "node:path";
import type { ReactNode } from "react";
import { dynamicLoader } from "fumadocs-core/source";
import type * as PageTree from "fumadocs-core/page-tree";
import { obsidian } from "fumadocs-obsidian";
import { slug } from "github-slugger";
import {
  BookOpen,
  ClipboardList,
  FileCode2,
  FileText,
  FlaskConical,
  History,
  Inbox,
  Info,
  LayoutGrid,
  Settings,
} from "lucide-react";
import { remarkLooseLinks } from "@/lib/remark-loose-links";
import { titleFromHeading } from "@/lib/title-from-heading";
import { TOOLS } from "@/lib/config-files";

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
    "!AGENTS.md", // byte-identical sync copy of CLAUDE.md for non-Claude agents; not a distinct page
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
export function slugify(segment: string): string {
  return slug(segment).replace(/-+/g, "-");
}

const FOLDER_LABELS: Record<string, string> = {
  ".scratch": "Scratch (issues & research)",
};

const FOLDER_ICONS: Record<string, ReactNode> = {
  wiki: <BookOpen className="size-4" />,
  raw: <Inbox className="size-4" />,
  plans: <ClipboardList className="size-4" />,
  docs: <FileText className="size-4" />,
  ".scratch": <FlaskConical className="size-4" />,
};

const ROOT_PAGE_ICONS: Record<string, ReactNode> = {
  "CLAUDE.md": <FileCode2 className="size-4" />,
  "CONTEXT.md": <Info className="size-4" />,
  "log.md": <History className="size-4" />,
};

/**
 * Sidebar entry for the config editor: one page per TOOLS entry. `defaultOpen`
 * matters — a collapsed folder does not render its children into the HTML at
 * all, so without it the tool links are invisible until the reader clicks.
 */
function configFolder(): PageTree.Folder {
  return {
    type: "folder",
    name: "Config",
    $id: "config",
    icon: <Settings className="size-4" />,
    defaultOpen: true,
    children: Object.entries(TOOLS).map(([tool, { label }]) => ({
      type: "page" as const,
      name: label,
      url: `/config/${tool}`,
      $id: `config/${tool}`,
    })),
  };
}

/**
 * Sidebar entry for the artifacts browser: a single link to the index page,
 * which lists every generated artifact. Same shape as configFolder() above —
 * `defaultOpen` matters for the same reason.
 */
function artifactsFolder(): PageTree.Folder {
  return {
    type: "folder",
    name: "Artifacts",
    $id: "artifacts",
    icon: <LayoutGrid className="size-4" />,
    defaultOpen: true,
    children: [
      {
        type: "page" as const,
        name: "Browse artifacts",
        url: "/artifacts",
        $id: "artifacts/index",
      },
    ],
  };
}

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
          const icon = FOLDER_ICONS[folderPath];
          return { ...node, ...(label && { name: label }), ...(icon && { icon }) };
        },
        file(node, filePath) {
          const icon = ROOT_PAGE_ICONS[filePath ?? ""];
          return icon ? { ...node, icon } : node;
        },
        /**
         * The config editor is a hand-built route with no file in the vault,
         * so the loader cannot discover it. Append it once the tree is built
         * and every sidebar on the site lists it — docs, home, config and the
         * 404s all render the same tree.
         */
        root(node) {
          return {
            ...node,
            children: [...node.children, configFolder(), artifactsFolder()],
          };
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
