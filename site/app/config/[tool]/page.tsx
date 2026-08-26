import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfigEditor } from "@/components/config-editor";
import { CommitBox } from "@/components/commit-box";
import { repoRoot, TOOLS } from "@/lib/config-files";
import { slugify } from "@/lib/source";

export const dynamic = "force-dynamic";

interface DocLink {
  title: string;
  href: string;
}

/**
 * Wiki pages carrying `tool: <name>` frontmatter (ADR 0003: ingest adds the
 * field, no site-side mapping). Read directly rather than through the
 * Fumadocs loader: the loader strips unknown frontmatter fields.
 */
async function docsForTool(tool: string): Promise<DocLink[]> {
  const wikiDir = path.join(repoRoot, "wiki");
  const docs: DocLink[] = [];
  for (const name of await fs.readdir(wikiDir)) {
    if (!name.endsWith(".md")) continue;
    const text = await fs.readFile(path.join(wikiDir, name), "utf8");
    const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1];
    if (!fm) continue;
    const toolField = fm.match(/^tool:\s*(\S+)\s*$/m)?.[1];
    if (toolField !== tool) continue;
    const title = fm.match(/^title:\s*(.+)$/m)?.[1] ?? name;
    docs.push({
      title: title.trim(),
      href: `/docs/wiki/${slugify(name.replace(/\.md$/, ""))}`,
    });
  }
  return docs;
}

export default async function ConfigToolPage(props: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await props.params;
  // Object.hasOwn: a plain index would let /config/toString reach inherited
  // Object.prototype members and crash instead of 404ing.
  const entry = Object.hasOwn(TOOLS, tool) ? TOOLS[tool] : undefined;
  if (!entry) notFound();

  const docs = await docsForTool(tool);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{entry.label}</h1>
        <p className="text-fd-muted-foreground mt-2 text-sm">
          Edits write to <code>dotfiles/</code> and run{" "}
          <code>chezmoi apply</code>. Committing is a separate step.
        </p>
      </header>

      {docs.length > 0 && (
        <section className="mb-8 rounded-lg border bg-fd-card p-4">
          <h2 className="text-fd-muted-foreground text-sm font-semibold tracking-wide uppercase">
            Docs
          </h2>
          <ul className="mt-2 space-y-1">
            {docs.map((doc) => (
              <li key={doc.href}>
                <Link href={doc.href} className="text-sm font-medium underline">
                  {doc.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-8">
        {entry.files.map((file) => (
          <ConfigEditor key={file} path={file} />
        ))}
      </div>

      <div className="mt-10">
        <CommitBox />
      </div>
    </main>
  );
}
