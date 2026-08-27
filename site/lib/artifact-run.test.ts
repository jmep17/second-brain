/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { validIssueFilename } from "./artifact-run";

describe("validIssueFilename", () => {
  test.each(["01-fix-thing.md", "123-a.b_c-d.md"])("accepts %j", (name) => {
    expect(validIssueFilename(name)).toBe(true);
  });

  test.each([
    "../01-x.md",
    "01-x.txt",
    "x.md",
    "01-.md",
    "01-$(cmd).md",
    "01-fix/thing.md",
    "01-fix thing.md",
    "01-fix\nthing.md",
    "",
  ])("rejects %j", (name) => {
    expect(validIssueFilename(name)).toBe(false);
  });
});
