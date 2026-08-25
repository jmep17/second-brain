import type { Link, PhrasingContent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

/**
 * CommonMark forbids unescaped spaces in a link destination, so remark leaves
 * `[label](../raw/File With Spaces.md)` as literal text. Obsidian accepts it,
 * and the wiki's citations to `raw/` files are written that way. Turn such
 * leftovers back into link nodes; `createRelativeLink` resolves the path.
 *
 * Only destinations ending in `.md` (optionally `#heading`) that contain
 * whitespace are touched — anything else was either already parsed as a
 * link or is not a vault link.
 */
const LOOSE_LINK = /\[([^\]\n]+)\]\(([^()\n]*\.md(?:#[^()\n]*)?)\)/g;

export function remarkLooseLinks() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      const value = node.value;
      const out: PhrasingContent[] = [];
      let last = 0;

      for (const match of value.matchAll(LOOSE_LINK)) {
        const [whole, label, destination] = match;
        if (!/\s/.test(destination)) continue; // a valid link; already parsed
        const start = match.index ?? 0;
        if (start > last) {
          out.push({ type: "text", value: value.slice(last, start) });
        }
        const link: Link = {
          type: "link",
          url: destination,
          children: [{ type: "text", value: label }],
        };
        out.push(link);
        last = start + whole.length;
      }

      if (last === 0) return; // nothing converted in this text node
      if (last < value.length) {
        out.push({ type: "text", value: value.slice(last) });
      }
      (parent.children as PhrasingContent[]).splice(index, 1, ...out);
      return index + out.length; // continue after the inserted nodes
    });
  };
}
