import { readFileSync } from "node:fs";
import path from "node:path";
import { getSource } from "@/lib/source";

/** Group order and labels follow the page types listed in CLAUDE.md. */
export const WIKI_GROUPS: { type: string; label: string }[] = [
  { type: "synthesis", label: "Syntheses" },
  { type: "concept", label: "Concepts" },
  { type: "entity", label: "Entities" },
  { type: "source-summary", label: "Source summaries" },
  { type: "answer", label: "Answers" },
];

export type TocEntry = {
  title: string;
  url: string;
  summary?: string;
  updated?: string;
};

export type TocGroup = { label: string; entries: TocEntry[] };

/** Frontmatter is untyped beyond title/description; read extras defensively. */
function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * One-line summaries from wiki/index.md, keyed by wikilink slug.
 * Entry format (fixed by CLAUDE.md's ingest step): `- [[slug]] — summary`.
 */
export function readIndexSummaries(): Map<string, string> {
  const file = path.resolve(process.cwd(), "..", "wiki", "index.md");
  const summaries = new Map<string, string>();
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return summaries; // no index.md: entries simply have no summary
  }
  const entry = /^- \[\[([^\]|#]+)(?:[|#][^\]]*)?\]\] — (.+)$/;
  for (const line of text.split("\n")) {
    const m = entry.exec(line);
    if (m) summaries.set(m[1].trim(), m[2].trim());
  }
  return summaries;
}

/** Build the grouped table of contents from the site's own page list. */
export async function buildToc(): Promise<TocGroup[]> {
  const summaries = readIndexSummaries();
  const groups = new Map<string, TocEntry[]>();
  const wikiOther: TocEntry[] = [];
  const sources: TocEntry[] = [];
  const source = await getSource();

  for (const page of source.getPages()) {
    const fm = page.data.frontmatter as Record<string, unknown>;
    const slug = path.basename(page.path, ".md");
    const entry: TocEntry = {
      title: page.data.title,
      url: page.url,
      summary: page.data.description ?? summaries.get(slug),
      updated: asString(fm.updated),
    };
    if (page.path.startsWith("raw/")) {
      sources.push(entry);
      continue;
    }
    const type = asString(fm.type);
    if (type && WIKI_GROUPS.some((g) => g.type === type)) {
      const list = groups.get(type) ?? [];
      list.push(entry);
      groups.set(type, list);
    } else {
      wikiOther.push(entry);
    }
  }

  const byTitle = (a: TocEntry, b: TocEntry) => a.title.localeCompare(b.title);
  const result: TocGroup[] = WIKI_GROUPS.map((g) => ({
    label: g.label,
    entries: (groups.get(g.type) ?? []).sort(byTitle),
  }));
  if (wikiOther.length) {
    result.push({
      label: "Other wiki pages",
      entries: wikiOther.sort(byTitle),
    });
  }
  result.push({ label: "Sources", entries: sources.sort(byTitle) });
  return result;
}
