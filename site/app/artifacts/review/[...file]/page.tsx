import fs from "node:fs/promises";
import { notFound } from "next/navigation";
import { ArtifactReviewer } from "@/components/artifact-reviewer";
import { resolveArtifact } from "@/lib/artifacts";

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
    <ArtifactReviewer
      artifact={`artifacts/${rel}`}
      src={`/artifacts/view/${rel}`}
    />
  );
}
