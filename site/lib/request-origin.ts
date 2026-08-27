import type { NextRequest } from "next/server";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

/** Hostname of a URL-ish header value, or null when unparseable/absent. */
function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

/** Bare host (strip :port) of a Host header, or null. */
function hostHeaderName(value: string | null): string | null {
  if (!value) return null;
  // Host may be "127.0.0.1:3000" or "[::1]:3000".
  const m = value.match(/^(\[[^\]]+\]|[^:]+)/);
  return m ? m[1] : null;
}

/**
 * True when the request demonstrably originates from the owner's own
 * localhost session. Enforces the ADR 0003 assumption that "only the owner
 * talks to it" against same-browser cross-origin POSTs and DNS rebinding.
 *
 * - If Origin (or, fallback, Referer) is present, its host must be loopback.
 *   A cross-origin browser request always carries a foreign Origin here.
 * - The Host header must be a loopback name (kills DNS rebinding, where the
 *   attacker hostname resolves to 127.0.0.1 but Host is the attacker domain).
 * - A missing Origin AND missing Referer is allowed (non-browser clients like
 *   curl and the Playwright harness send neither) — but the Host check still
 *   applies.
 */
export function isLocalRequest(req: NextRequest): boolean {
  const host = hostHeaderName(req.headers.get("host"));
  if (!host || !LOOPBACK_HOSTS.has(host)) return false;

  const originHost =
    hostOf(req.headers.get("origin")) ?? hostOf(req.headers.get("referer"));
  if (originHost !== null && !LOOPBACK_HOSTS.has(originHost)) return false;

  return true;
}
