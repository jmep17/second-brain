import type { LoaderPlugin } from "fumadocs-core/source";

const H1 = /^#\s+(.+?)\s*$/m;

/**
 * Plans, ADRs, agent docs and issues have no `title:` frontmatter; without
 * this they would be titled by filename ("001-fumadocs-wiki-site"). Use the
 * first `# ` heading instead. Pages with a frontmatter title are untouched.
 */
export const titleFromHeading: LoaderPlugin = {
  name: "title-from-heading",
  transformStorage({ storage }) {
    for (const filePath of storage.getFiles()) {
      const file = storage.read(filePath);
      if (!file || file.format !== "page") continue;
      const data = file.data as {
        title: string;
        content?: unknown;
        frontmatter?: Record<string, unknown>;
      };
      if (typeof data.frontmatter?.title === "string") continue;
      if (typeof data.content !== "string") continue;
      const match = H1.exec(data.content);
      if (match) data.title = match[1];
    }
  },
};
