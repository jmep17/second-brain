import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import Link from "next/link";
import type { Metadata } from "next";
import { baseOptions } from "@/lib/layout.shared";
import { buildToc } from "@/lib/toc";

export const metadata: Metadata = {
  title: "Second Brain",
  description: "Table of contents for the wiki and its sources.",
};

export default function Home() {
  const groups = buildToc();
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="mb-2 text-3xl font-semibold">Table of contents</h1>
        <p className="text-fd-muted-foreground mb-8">
          Every page on this site, grouped by type.
        </p>
        {groups.map((group) => (
          <section key={group.label} className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">{group.label}</h2>
            {group.entries.length === 0 ? (
              <p className="text-fd-muted-foreground text-sm">(none yet)</p>
            ) : (
              <ul className="space-y-2">
                {group.entries.map((entry) => (
                  <li key={entry.url}>
                    <Link href={entry.url} className="font-medium underline">
                      {entry.title}
                    </Link>
                    {entry.summary ? (
                      <span className="text-fd-muted-foreground">
                        {` — ${entry.summary}`}
                      </span>
                    ) : null}
                    {entry.updated ? (
                      <span className="text-fd-muted-foreground text-xs">
                        {` (updated ${entry.updated})`}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
    </DocsLayout>
  );
}
