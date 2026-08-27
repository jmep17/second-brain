/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { isLocalRequest } from "./request-origin";

function request(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://127.0.0.1:3000/x", { headers });
}

describe("isLocalRequest", () => {
  test("rejects a foreign Origin", () => {
    const req = request({
      host: "127.0.0.1:3000",
      origin: "https://evil.example",
    });
    expect(isLocalRequest(req)).toBe(false);
  });

  test("accepts a same-origin loopback request", () => {
    const req = request({
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
    });
    expect(isLocalRequest(req)).toBe(true);
  });

  test("accepts localhost host and origin", () => {
    const req = request({
      host: "localhost:3000",
      origin: "http://localhost:3000",
    });
    expect(isLocalRequest(req)).toBe(true);
  });

  test("accepts a null-Origin request with a loopback Host (curl/Playwright)", () => {
    const req = request({ host: "127.0.0.1:3000" });
    expect(isLocalRequest(req)).toBe(true);
  });

  test("rejects a foreign Host (DNS rebinding)", () => {
    const req = request({ host: "attacker.example" });
    expect(isLocalRequest(req)).toBe(false);
  });

  test("falls back to Referer and rejects a foreign one", () => {
    const req = request({
      host: "127.0.0.1:3000",
      referer: "https://evil.example/page",
    });
    expect(isLocalRequest(req)).toBe(false);
  });
});
