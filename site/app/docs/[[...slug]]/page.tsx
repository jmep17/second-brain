import { source } from "@/lib/source";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ImgHTMLAttributes } from "react";
import defaultMdxComponents, { createRelativeLink } from "fumadocs-ui/mdx";
import * as ObsidianComponents from "fumadocs-obsidian/ui";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";

type Props = { params: Promise<{ slug?: string[] }> };

/** Frontmatter is untyped beyond title/description; read extras defensively. */
function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default async function Page({ params }: Props) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();

  const { body, toc } = await (
    await page.data.load()
  ).render({
    ...defaultMdxComponents,
    ...ObsidianComponents,
    // Turns the relative file hrefs produced for wikilinks and
    // ../raw/... citations into site URLs.
    a: createRelativeLink(source, page),
    // Plain <img>: no next/image (needs width/height + optimizer), so local
    // and remote images render without build-time size probing.
    img: (props: ImgHTMLAttributes<HTMLImageElement>) => (
      <img loading="lazy" {...props} />
    ),
  });

  const fm = page.data.frontmatter as Record<string, unknown>;
  const type = asString(fm.type);
  const updated = asString(fm.updated);

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? (
        <DocsDescription>{page.data.description}</DocsDescription>
      ) : null}
      {type || updated ? (
        <p className="text-fd-muted-foreground text-sm">
          {type ? <span>{type}</span> : null}
          {type && updated ? " · " : null}
          {/* one string, not two text children: React SSR would otherwise
              insert a comment between them and break the grep in Step 8 */}
          {updated ? <span>{`updated ${updated}`}</span> : null}
        </p>
      ) : null}
      <DocsBody>{body}</DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  return { title: page.data.title, description: page.data.description };
}
