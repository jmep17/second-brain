/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { dotfilesDir, isChezmoiMeta, resolveSource } from "./config-files";

describe("resolveSource", () => {
  test.each([
    ["a known tool file", "dot_config/tmux/tmux.conf"],
    ["a nested new path", "dot_config/new/file.conf"],
  ])("accepts %s", (_name, rel) => {
    const abs = resolveSource(rel);
    expect(abs.startsWith(dotfilesDir)).toBe(true);
  });

  test.each([
    ["a parent-relative escape", "../CLAUDE.md"],
    ["a deep parent-relative escape", "../../etc/passwd"],
    ["an absolute path", "/etc/passwd"],
    ["a mid-path escape", "a/../../b"],
  ])("throws on %s", (_name, rel) => {
    expect(() => resolveSource(rel)).toThrow();
  });
});

describe("isChezmoiMeta", () => {
  test.each([
    [".chezmoiignore", true],
    [".chezmoiignore.tmpl", true],
    [".chezmoiremove.tmpl", true],
    [".chezmoi.toml.tmpl", true],
    [".chezmoidata/skills.toml", true],
    ["run_after_prune.sh.tmpl", true],
    ["scripts/run_once_setup.sh", true],
    ["dot_config/tmux/tmux.conf", false],
    ["dot_zshrc", false],
    // Current behavior: basename must START with "run_"; a basename that
    // merely contains "run_" mid-name (after the "dot_" prefix) does not
    // match. Documented here, not asserted as desired — plans 028/029 own
    // any change to this guard.
    ["dot_run_thing", false],
  ])("returns %s for %j", (rel, expected) => {
    expect(isChezmoiMeta(rel)).toBe(expected);
  });
});
