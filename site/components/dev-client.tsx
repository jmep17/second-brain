"use client";
import { DevClient } from "@fumadocs/local-content/dev/ws/react";

/** Refreshes the page when the vault watcher reports a change (dev only). */
export function VaultDevClient() {
  if (process.env.NODE_ENV !== "development") return null;
  return <DevClient />;
}
