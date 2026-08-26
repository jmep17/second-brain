import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DefaultNotFound } from "fumadocs-ui/layouts/home/not-found";
import { docsLayoutProps } from "@/lib/layout.shared";

export default async function NotFound() {
  return (
    <DocsLayout {...await docsLayoutProps()}>
      <main className="flex w-full flex-1 flex-col py-10">
        <DefaultNotFound />
      </main>
    </DocsLayout>
  );
}
