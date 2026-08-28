/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { consumeDispatchToken, issueDispatchToken } from "./dispatch-token";

describe("dispatch token", () => {
  test("a fresh token consumes once for its issue", () => {
    const token = issueDispatchToken("01-example.md");
    expect(consumeDispatchToken(token, "01-example.md")).toBe(true);
  });

  test("a token cannot be consumed twice", () => {
    const token = issueDispatchToken("02-example.md");
    expect(consumeDispatchToken(token, "02-example.md")).toBe(true);
    expect(consumeDispatchToken(token, "02-example.md")).toBe(false);
  });

  test("a token bound to a different issue is rejected", () => {
    const token = issueDispatchToken("03-example.md");
    expect(consumeDispatchToken(token, "04-other.md")).toBe(false);
  });

  test("a wrong-issue attempt still burns the token (single-use on any outcome)", () => {
    const token = issueDispatchToken("05-example.md");
    expect(consumeDispatchToken(token, "06-other.md")).toBe(false);
    // Even the correct issue can no longer redeem it.
    expect(consumeDispatchToken(token, "05-example.md")).toBe(false);
  });

  test("an unknown token is rejected", () => {
    expect(consumeDispatchToken("not-a-real-token", "07-example.md")).toBe(
      false
    );
  });
});
