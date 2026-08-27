# Plan 019: Fix duplicate sidebar entry and add section icons

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**, from the repo root:
>
> ```
> git diff --stat c0ee11c..HEAD -- site/lib/source.ts site/package.json
> ```
>
> If either file changed since this plan was written, compare the "Current
> state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW (presentational sidebar-tree changes only; no route, data, or
  layout logic moves)
- **Depends on**: none
- **Category**: bug (dedupe) + dx/tech-debt (icons)
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

The owner asked for the site sidebar's appearance to be improved, with a
screenshot of the rendered sidebar as the spec. Two concrete, verifiable
problems are visible in that render and confirmed against the live page tree:

1. **A real duplicate.** The sidebar lists two root pages both titled
   "Second Brain — Schema" — one back to back with the other. This is
   `AGENTS.md` and `CLAUDE.md`, which are byte-identical (`diff AGENTS.md
   CLAUDE.md` produces no output): `CLAUDE.md` is this repo's real doc,
   `AGENTS.md` is a synced copy kept only so Codex and other
   non-Claude agents can find the same instructions (see
   `plans/010-cross-agent-install-and-enforcement.md`). It was never meant to
   be a second, independently-readable wiki page — indexing it in the vault
   was an oversight, not a decision. A reader has no way to tell the two
   sidebar entries apart or know which one is "the" doc.
2. **No visual hierarchy.** Every one of the ~10 top-level sidebar entries
   (3 root pages, 7 top-level folders) is plain text with no icon, so the
   whole list reads as one undifferentiated block and is slow to scan —
   exactly the "wall of text" the screenshot shows. Fumadocs' sidebar already
   renders an `icon` field per node when one is set (confirmed in
   `node_modules/fumadocs-ui/dist/layouts/docs/slots/sidebar.js`, e.g. line
   264: `children: selected.icon`); the page tree here just never sets it.
   `lucide-react` is already resolvable from `site/` (it's a dependency of
   `fumadocs-ui`, confirmed present at `site/node_modules/lucide-react`,
   version `1.34.0`), so no new package needs to be fetched — it should still
   be added as an explicit `dependencies` entry in `site/package.json` since
   this plan imports it directly rather than through fumadocs' own re-exports.

Both fixes are pure page-tree data — no component, layout, or route changes.

## Current state

- `site/lib/source.ts` — builds the Obsidian vault config and the page tree
  transformers. This is the only file that needs to change for both fixes.

Full relevant excerpt, current as of commit `c0ee11c`:

```ts
// lines 13-29
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
```

```ts
// lines 62-142
const FOLDER_LABELS: Record<string, string> = {
  ".scratch": "Scratch (issues & research)",
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
          return label ? { ...node, name: label } : node;
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
```

Relevant library facts, verified at commit `c0ee11c`:

- `PageTreeTransformer` (`site/node_modules/fumadocs-core/dist/index-DQWu2opy2.d.ts`,
  line 69) exposes `file?(node: Item, filePath?: string): Item` in addition to
  the `folder` and `root` hooks already used above. `filePath` is the vault
  path relative to `vaultDir` (e.g. `"CLAUDE.md"`, `"wiki/some-page.md"`) —
  the same shape `folderPath` already uses for folders (`".scratch"` in
  `FOLDER_LABELS`).
- `icon` on both `Item` and `Folder`
  (`site/node_modules/fumadocs-core/dist/definitions-D8-KI7Uy.d.ts`, lines
  39 and 61) is typed `ReactNode` — set it to a JSX element directly, not a
  string; there is no icon-name resolver configured anywhere in this repo
  (`grep -rn "icons=" site/` returns nothing), so a string would render as
  literal text.
- The dev-watcher rebuild block (`site/lib/source.ts` lines 41-56) does
  `vault.include.filter((pattern) => !pattern.startsWith("!"))` — it already
  strips negation patterns like the existing `"!wiki/index.md"` entry before
  handing the list to the watcher. A new `"!AGENTS.md"` entry is handled by
  this existing code with no further change.
- `site/node_modules/lucide-react/dist/lucide-react.d.ts` confirms these
  exact export names exist in the installed version (`1.34.0`): `FileCode2`,
  `Info`, `History`, `BookOpen`, `Inbox`, `ClipboardList`, `FileText`,
  `FlaskConical`, `Settings`, `LayoutGrid`.

## Commands you will need

| Purpose   | Command                                | Expected on success        |
| --------- | --------------------------------------- | --------------------------- |
| Install   | `cd site && bun install` (or `npm install` — check for `bun.lock` vs `package-lock.json` in `site/` first; this repo uses `bun.lock`) | exit 0 |
| Typecheck | `cd site && bun run typecheck`          | exit 0, no errors            |
| Build     | `cd site && bun run build`              | exit 0, static export succeeds |
| Dev serve | `cd site && bun run dev`                | starts on `127.0.0.1:4317` (or the configured port); used for manual visual check only |

(Verified from `site/package.json` `scripts` at commit `c0ee11c`. `bun` is
this repo's package manager — `site/bun.lock` is present and there is no
`site/package-lock.json` or `site/yarn.lock`.)

## Scope

**In scope** (the only files you should modify):

- `site/lib/source.ts`
- `site/package.json` (add `lucide-react` to `dependencies`)
- `site/bun.lock` (regenerated by `bun install` after the `package.json`
  change — do not hand-edit it)

**Out of scope** (do NOT touch, even though they look related):

- `AGENTS.md` / `CLAUDE.md` themselves — this plan only stops indexing
  `AGENTS.md` as a wiki page; it does not touch either file's content or the
  cross-agent sync convention described in
  `plans/010-cross-agent-install-and-enforcement.md`.
- `site/lib/config-files.ts` (`TOOLS`) — `configFolder()` reads it but this
  plan does not change what tools are listed, only adds an icon to the
  folder itself.
- `site/app/global.css` and any other styling file — no CSS changes; icons
  are supplied as page-tree data and Fumadocs' existing sidebar component
  renders them without further styling (confirmed in "Current state").
- `site/lib/layout.shared.tsx` — unrelated; it only sets the nav title, not
  the tree.

## Git workflow

- Branch: `advisor/019-sidebar-dedupe-icons` (matches this repo's
  `advisor/NNN-<slug>` convention used for plans 001 and 003).
- One commit for both changes is fine; message style matches recent history
  (`git log --oneline -8`), e.g. `site: dedupe AGENTS.md from sidebar, add
  section icons`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Stop indexing `AGENTS.md` as a separate wiki page

In `site/lib/source.ts`, add a negation entry to `vault.include` immediately
after the existing `"*.md"` line, following the same pattern the file already
uses for `"!wiki/index.md"`:

```ts
  include: [
    "*.md",
    "!AGENTS.md", // byte-identical sync copy of CLAUDE.md for non-Claude agents; not a distinct page
    "wiki/**/*.md",
    "!wiki/index.md", // replaced by the home page TOC (plan 003)
    ...
```

**Verify**: `cd site && bun run build && grep -o '"Second Brain — Schema"' out/docs/wiki.txt 2>/dev/null; grep -ro "Second Brain — Schema" .next/server/app/docs/wiki.html 2>/dev/null | wc -l` should print `1` (only `CLAUDE.md`'s copy remains). If the build output layout differs from this guess, instead run `bun run dev`, request `http://127.0.0.1:4317/docs/wiki` (or whatever port the dev server prints), and confirm the string `"Second Brain — Schema"` appears exactly once in the response body, and that `AGENTS.md` no longer appears as a `$ref` anywhere in it (`curl -s <url> | grep -o 'AGENTS.md' ` → no matches).

### Step 2: Add `lucide-react` as an explicit dependency

In `site/package.json`, add `"lucide-react": "^1.34.0"` to `"dependencies"`
(match the version already resolved in `site/node_modules/lucide-react`, seen
via `cat site/node_modules/lucide-react/package.json | grep '"version"'`).
Run `cd site && bun install` to update `site/bun.lock`.

**Verify**: `cd site && git diff --stat -- package.json bun.lock` shows both
files changed; `bun run typecheck` still exits 0.

### Step 3: Add icons to the three root pages

In `site/lib/source.ts`, import the icon components at the top of the file
(after the existing `TOOLS` import):

```ts
import { FileCode2, History, Info } from "lucide-react";
```

Add a `file` transformer alongside the existing `folder`/`root` ones inside
the `transformers` array (do not remove or reorder the existing two):

```ts
        file(node, filePath) {
          const icon = ROOT_PAGE_ICONS[filePath ?? ""];
          return icon ? { ...node, icon } : node;
        },
```

Above the transformers object (near `FOLDER_LABELS`), add the lookup table it
reads from, keyed by vault-relative path exactly as `FOLDER_LABELS` is keyed
by folder path:

```ts
const ROOT_PAGE_ICONS: Record<string, ReactNode> = {
  "CLAUDE.md": <FileCode2 className="size-4" />,
  "CONTEXT.md": <Info className="size-4" />,
  "log.md": <History className="size-4" />,
};
```

This requires importing `ReactNode` — add `import type { ReactNode } from
"react";` near the top of the file. Because this file now contains JSX, it
must be renamed from `source.ts` to `source.tsx`, and every import of it
(`import ... from "@/lib/source"` / `"./source"`) keeps working unchanged
(TypeScript/Next resolve the extensionless specifier to the `.tsx` file the
same way it resolved `.ts`) — but you must `git mv site/lib/source.ts
site/lib/source.tsx` so the rename is tracked, and update `tsconfig.json` /
`next.config.mjs` only if either hard-codes the `.ts` extension (check with
`grep -rn "lib/source" site/tsconfig.json site/next.config.mjs` first — expect
no matches).

**Verify**: `grep -rln '"@/lib/source"' site/` lists every importer
unchanged (do not edit these files); `bun run typecheck` exits 0.

### Step 4: Add icons to the top-level folders

Still in `site/lib/source.ts`, import the remaining icon components in the
same import statement from Step 3:

```ts
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
```

Add a folder-path-keyed icon table next to `ROOT_PAGE_ICONS`:

```ts
const FOLDER_ICONS: Record<string, ReactNode> = {
  wiki: <BookOpen className="size-4" />,
  raw: <Inbox className="size-4" />,
  plans: <ClipboardList className="size-4" />,
  docs: <FileText className="size-4" />,
  ".scratch": <FlaskConical className="size-4" />,
};
```

Extend the existing `folder` transformer to also set the icon (keep the
existing label-rewriting behavior intact):

```ts
        folder(node, folderPath) {
          const label = FOLDER_LABELS[folderPath];
          const icon = FOLDER_ICONS[folderPath];
          return { ...node, ...(label && { name: label }), ...(icon && { icon }) };
        },
```

Add icons to the two hand-built folders by setting `icon` directly in their
literals:

```ts
function configFolder(): PageTree.Folder {
  return {
    type: "folder",
    name: "Config",
    $id: "config",
    icon: <Settings className="size-4" />,
    defaultOpen: true,
    ...
```

```ts
function artifactsFolder(): PageTree.Folder {
  return {
    type: "folder",
    name: "Artifacts",
    $id: "artifacts",
    icon: <LayoutGrid className="size-4" />,
    defaultOpen: true,
    ...
```

**Verify**: `bun run typecheck` exits 0; `bun run build` exits 0.

### Step 5: Visual check

Run `cd site && bun run dev`, open the printed URL in a browser, and confirm
against the sidebar:

- Exactly one "Second Brain — Schema" entry (was two).
- `CLAUDE.md`, `CONTEXT.md`, `log.md`, `Wiki`, `Raw`, `Plans`, `Docs`,
  `Scratch (issues & research)`, `Config`, `Artifacts` each show a small
  leading icon.
- No icon renders as broken/missing (a box or blank glyph) in either light
  and dark theme (toggle with the theme switch at the sidebar's bottom).

This step has no machine-checkable output — record what you saw in your
final report instead of a pass/fail line.

## Test plan

There is no existing automated test coverage for the sidebar tree
(`site/scripts/test-artifact-review.mjs` covers the artifact reviewer only,
confirmed by its name and by `grep -rln "getPageTree\|getSource" site/**/*.test.*` returning no matches). This plan does not add one — it is a
small, purely-declarative data change with a fast, cheap manual check (Step
5), and introducing a new test harness for page-tree shape is out of
proportion to the change. `bun run typecheck` and `bun run build` are the
verification gates.

## Done criteria

Machine-checkable where possible; the last two are the visual checks from
Step 5:

- [ ] `bun run typecheck` (from `site/`) exits 0
- [ ] `bun run build` (from `site/`) exits 0
- [ ] `grep -c "Second Brain — Schema" <rendered /docs/wiki HTML>` → `1`
- [ ] `grep -c "AGENTS.md" <rendered /docs/wiki HTML>` → `0`
- [ ] `grep -n '"lucide-react"' site/package.json` → present under
      `dependencies`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] Visual check (Step 5): every listed top-level entry shows an icon, in
      both themes
- [ ] `plans/README.md` status row for 019 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at `site/lib/source.ts` doesn't match the "Current state"
  excerpts (the codebase has drifted since this plan was written).
- `AGENTS.md` and `CLAUDE.md` are no longer byte-identical when you check
  (`diff AGENTS.md CLAUDE.md` from the repo root) — that would mean `AGENTS.md`
  has diverged into real content of its own, and excluding it from the vault
  would silently drop that content from the site. Re-verify before proceeding
  with Step 1 only.
- `bun run typecheck` still fails after the `.tsx` rename in Step 3 with an
  error that isn't about a missing icon export or a JSX-in-`.ts` complaint —
  that suggests something else imports `site/lib/source.ts` by its literal
  `.ts` extension.
- Any of the ten named icon exports (`FileCode2`, `Info`, `History`,
  `BookOpen`, `Inbox`, `ClipboardList`, `FileText`, `FlaskConical`,
  `Settings`, `LayoutGrid`) does not exist in the installed `lucide-react`
  version — re-check with `node -e "console.log(typeof
  require('lucide-react').<Name>)"` from `site/` and pick a same-meaning
  substitute from `site/node_modules/lucide-react/dist/lucide-react.d.ts`
  rather than guessing.

## Maintenance notes

- If a new top-level folder or root page is added to the vault later (a new
  `include` entry, or a new root `*.md` file), it will render with no icon
  until someone adds an entry to `FOLDER_ICONS` / `ROOT_PAGE_ICONS`. That's
  an acceptable default (plain text, not broken) — no fallback icon is
  required.
- If `AGENTS.md` and `CLAUDE.md` are ever intentionally allowed to diverge
  (e.g. Codex-specific instructions get appended to `AGENTS.md`), the
  `"!AGENTS.md"` exclusion added in Step 1 must be revisited — at that point
  `AGENTS.md` stops being a pure sync copy and readers may want to see it in
  the site with a label that distinguishes it from `CLAUDE.md` (e.g. via
  `FOLDER_LABELS`-style renaming) rather than hiding it.
- This plan does not address folder-name casing further down the tree (e.g.
  `docs/adr` renders as "Adr", not "ADR") — no screenshot evidence covered
  that state, and it wasn't included in scope; flag it as a follow-up if the
  owner notices it, using the same `FOLDER_LABELS` mechanism already in
  `site/lib/source.ts`.
