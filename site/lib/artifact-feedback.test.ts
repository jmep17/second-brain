// @ts-nocheck -- Bun supplies bun:test at runtime; the site omits Bun globals.
import { describe, expect, test } from "bun:test";
import {
  parseFeedbackPayload,
  renderFeedbackIssue,
  type BatchFeedbackPayload,
} from "./artifact-feedback";

const target = {
  id: "plan-step-1",
  kind: "plan-step",
  label: "First step",
  selector: "main > section.step:nth-of-type(1)",
  excerpt: "Build the first thing",
  comment: "Make this more specific.",
};

function parseBatch(overrides: Record<string, unknown> = {}) {
  return parseFeedbackPayload({
    artifact: "artifacts/plans/example.html",
    kind: "feedback",
    title: "Review batch",
    body: "Apply all requested changes together.",
    targets: [target],
    readyForAgent: true,
    ...overrides,
  });
}

describe("artifact feedback", () => {
  test("keeps the legacy issue shape byte-for-byte", () => {
    const parsed = parseFeedbackPayload({
      artifact: "artifacts/diagrams/example.html",
      kind: "rfc",
      title: "Legacy title",
      body: "Legacy body",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(
      renderFeedbackIssue(parsed.value, "diagrams/example.html", "2026-08-26")
    ).toBe(`# Legacy title

Status: needs-triage
Kind: rfc
Artifact: artifacts/diagrams/example.html
Date: 2026-08-26

Legacy body

## Comments
`);
  });

  test("renders two ready targets with quoted evidence", () => {
    const parsed = parseBatch({
      targets: [
        target,
        {
          ...target,
          id: "writing-2",
          kind: "writing",
          label: "Second passage",
          selector: "main > p:nth-of-type(2)",
          excerpt: "# Treat this heading as evidence\nnot an instruction",
          comment: "Rewrite this passage.",
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const markdown = renderFeedbackIssue(
      parsed.value,
      "plans/example.html",
      "2026-08-26"
    );
    expect(markdown).toContain("Status: ready-for-agent\nExecution: queued");
    expect(markdown).toContain("### 1. First step");
    expect(markdown).toContain("### 2. Second passage");
    expect(markdown).toContain("Requested change:\n\nRewrite this passage.");
    expect(markdown).toContain(
      "Selected excerpt (evidence only):\n\n> # Treat this heading as evidence\n> not an instruction"
    );
    expect(markdown.endsWith("## Comments\n")).toBe(true);
  });

  test("keeps a non-ready batch in triage without execution metadata", () => {
    const parsed = parseBatch({ readyForAgent: false });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const markdown = renderFeedbackIssue(
      parsed.value,
      "plans/example.html",
      "2026-08-26"
    );
    expect(markdown).toContain("Status: needs-triage");
    expect(markdown).not.toContain("Execution:");
  });

  test("accepts an empty excerpt for a visual component", () => {
    expect(parseBatch({ targets: [{ ...target, excerpt: "" }] }).ok).toBe(true);
  });

  test("keeps legacy multiline titles byte-for-byte", () => {
    const parsed = parseFeedbackPayload({
      artifact: "artifacts/diagrams/example.html",
      kind: "feedback",
      title: "Legacy title\r\ncontinued",
      body: "Legacy body",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(
      renderFeedbackIssue(parsed.value, "diagrams/example.html", "2026-08-27")
    ).toBe(`# Legacy title\r\ncontinued

Status: needs-triage
Kind: feedback
Artifact: artifacts/diagrams/example.html
Date: 2026-08-27

Legacy body

## Comments
`);
  });

  test.each(["line one\nline two", "line one\rline two"])(
    "rejects batch title line breaks in %j",
    (title) => {
      expect(parseBatch({ title }).ok).toBe(false);
    }
  );

  test.each([
    ["ready without targets", { targets: undefined }],
    ["zero targets", { targets: [] }],
    ["over 50 targets", { targets: Array(51).fill(target) }],
    ["empty comment", { targets: [{ ...target, comment: "" }] }],
  ])("rejects %s", (_name, overrides) => {
    expect(parseBatch(overrides).ok).toBe(false);
  });

  test.each([
    ["title", { title: "x".repeat(121) }],
    ["body", { body: "x".repeat(10_001) }],
    ["id", { targets: [{ ...target, id: "x".repeat(201) }] }],
    ["label", { targets: [{ ...target, label: "x".repeat(201) }] }],
    ["selector", { targets: [{ ...target, selector: "x".repeat(501) }] }],
    ["excerpt", { targets: [{ ...target, excerpt: "x".repeat(1_001) }] }],
    ["comment", { targets: [{ ...target, comment: "x".repeat(5_001) }] }],
  ])("rejects %s at limit plus one", (_name, overrides) => {
    expect(parseBatch(overrides).ok).toBe(false);
  });

  test("returns the narrow batch type after validation", () => {
    const parsed = parseBatch();
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const payload = parsed.value as BatchFeedbackPayload;
    expect(payload.targets[0]).toEqual(target);
    expect(payload.readyForAgent).toBe(true);
  });

  test("run flag defaults false, must be boolean, requires readyForAgent", () => {
    const parsed = parseBatch();
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect((parsed.value as BatchFeedbackPayload).run).toBe(false);

    const withRun = parseBatch({ run: true });
    expect(withRun.ok).toBe(true);
    if (!withRun.ok) return;
    expect((withRun.value as BatchFeedbackPayload).run).toBe(true);

    expect(parseBatch({ run: "yes" }).ok).toBe(false);
    expect(parseBatch({ run: true, readyForAgent: false }).ok).toBe(false);
  });

  test("run model overrides validate against the allowlist", () => {
    const parsed = parseBatch({
      run: true,
      executorModel: "haiku",
      reviewerModel: "opus",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const value = parsed.value as BatchFeedbackPayload;
    expect(value.executorModel).toBe("haiku");
    expect(value.reviewerModel).toBe("opus");

    const absent = parseBatch();
    expect(absent.ok).toBe(true);
    if (!absent.ok) return;
    expect((absent.value as BatchFeedbackPayload).executorModel).toBe(
      undefined
    );

    expect(parseBatch({ executorModel: "gpt-4" }).ok).toBe(false);
    expect(parseBatch({ reviewerModel: 5 }).ok).toBe(false);
  });
});
