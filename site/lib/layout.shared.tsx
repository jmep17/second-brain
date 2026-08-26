import { getSource } from "@/lib/source";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import type { DocsLayoutProps } from "fumadocs-ui/layouts/docs";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: "Second Brain" },
  };
}

/**
 * Props shared by every DocsLayout on the site. Every page is wrapped in one
 * — docs, home, config and the 404s — so the sidebar is configured here once
 * instead of drifting across four call sites.
 */
export async function docsLayoutProps(): Promise<
  Omit<DocsLayoutProps, "children">
> {
  const source = await getSource();
  return { tree: source.getPageTree(), ...baseOptions() };
}
