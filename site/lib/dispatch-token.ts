import { randomUUID } from "node:crypto";

const TTL_MS = 5 * 60_000;
const tokens = new Map<string, { issue: string; expires: number }>();

/** Issue a single-use token bound to one issue filename. */
export function issueDispatchToken(issue: string): string {
  const token = randomUUID();
  tokens.set(token, { issue, expires: Date.now() + TTL_MS });
  return token;
}

/** Consume a token; returns true iff it was valid, unexpired, and for `issue`.
 *  Single-use: a valid token is deleted on consumption. */
export function consumeDispatchToken(token: string, issue: string): boolean {
  const entry = tokens.get(token);
  if (!entry) return false;
  tokens.delete(token); // single-use regardless of outcome
  return entry.issue === issue && entry.expires > Date.now();
}
