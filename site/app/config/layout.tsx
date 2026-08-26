import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { docsLayoutProps } from "@/lib/layout.shared";
import type { ReactNode } from "react";

export default async function Layout({ children }: { children: ReactNode }) {
  return <DocsLayout {...await docsLayoutProps()}>{children}</DocsLayout>;
}
