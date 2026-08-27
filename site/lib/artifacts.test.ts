/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import {
  artifactsDir,
  feedbackDir,
  nextIssueNumber,
  resolveArtifact,
} from "./artifacts";

describe("resolveArtifact", () => {
  test("accepts a nested html path", () => {
    const abs = resolveArtifact("diagrams/2026-08-26-x.html");
    expect(abs.startsWith(artifactsDir)).toBe(true);
    expect(abs.endsWith(".html")).toBe(true);
  });

  test.each([
    ["a parent-relative escape", "../wiki/index.md"],
    ["a mid-path escape", "diagrams/../../x.html"],
    ["a markdown file", "diagrams/x.md"],
    ["an extensionless file", "diagrams/x"],
  ])("throws on %s", (_name, rel) => {
    expect(() => resolveArtifact(rel)).toThrow();
  });
});

describe("nextIssueNumber", () => {
  test("returns a zero-padded string strictly greater than every existing NN- prefix", async () => {
    let max = 0;
    try {
      const files = await fs.readdir(feedbackDir);
      for (const f of files) {
        const m = /^(\d+)-/.exec(f);
        if (m) max = Math.max(max, parseInt(m[1], 10));
      }
    } catch {
      // feedbackDir absent: current behavior returns "01", handled below.
    }

    const next = await nextIssueNumber();
    const nextNum = parseInt(next, 10);

    expect(nextNum).toBeGreaterThan(max);
    expect(next).toBe(String(max + 1).padStart(2, "0"));
    // Confirm we're reading the real, on-disk directory (read-only —
    // this test does not create or delete anything under feedbackDir).
    expect(path.basename(feedbackDir)).toBe("issues");
  });
});
