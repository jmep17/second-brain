import fs from "node:fs/promises";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { notFound } from "next/navigation";
import { ArtifactReviewer } from "@/components/artifact-reviewer";
import { resolveArtifact } from "@/lib/artifacts";
import { docsLayoutProps } from "@/lib/layout.shared";

export default async function ArtifactReviewPage({
  params,
}: {
  params: Promise<{ file: string[] }>;
}) {
  const { file } = await params;
  const rel = file.join("/");

  let abs: string;
  try {
    abs = resolveArtifact(rel);
  } catch {
    notFound();
  }

  const exists = await fs
    .access(abs)
    .then(() => true)
    .catch(() => false);
  if (!exists) notFound();

  return (
    <DocsLayout {...await docsLayoutProps()}>
      <ArtifactReviewer
        artifact={`artifacts/${rel}`}
        src={`/artifacts/view/${rel}`}
      />
    </DocsLayout>
  );
}
