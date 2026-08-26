"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { ObsidianCallout } from "fumadocs-obsidian/ui";

interface DirtyFile {
  status: string;
  path: string;
}

/**
 * The separate "Commit" action from ADR 0003: one commit for all dirty
 * dotfiles/** files. Push is out of scope for the prototype.
 */
export function CommitBox() {
  const [dirty, setDirty] = useState<DirtyFile[]>([]);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/config/git");
      const data = await res.json();
      if (!res.ok) {
        setError(String(data.error));
        return;
      }
      setDirty(data.dirty);
    } catch (err) {
      setError(`git status failed: ${String(err)}`);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function commit() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/config/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      let data: { error?: string; output?: string };
      try {
        data = await res.json();
      } catch {
        data = { error: `${res.status} ${res.statusText}` };
      }
      if (!res.ok) {
        setError(String(data.error));
        return;
      }
      setResult(data.output ?? "");
      setMessage("");
      await refresh();
    } catch (err) {
      setError(`commit failed: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border bg-fd-card p-4">
      <h2 className="text-fd-muted-foreground text-sm font-semibold tracking-wide uppercase">
        Commit
      </h2>
      {dirty.length === 0 ? (
        <p className="text-fd-muted-foreground mt-2 text-sm">
          No uncommitted changes under <code>dotfiles/</code>.
        </p>
      ) : (
        <>
          <ul className="text-fd-muted-foreground mt-2 space-y-1 font-mono text-xs">
            {dirty.map((file) => (
              <li key={file.path}>
                <span className="text-fd-foreground mr-2 inline-block w-6 font-medium">
                  {file.status || "·"}
                </span>
                {file.path}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Commit message"
              className="focus-visible:ring-fd-ring flex-1 rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-2"
            />
            <button
              onClick={() => void commit()}
              disabled={busy || message.trim() === ""}
              className={buttonVariants({ color: "primary", size: "sm" })}
            >
              Commit
            </button>
          </div>
        </>
      )}
      {result && (
        <ObsidianCallout type="success">
          <pre className="overflow-x-auto font-mono text-xs">{result}</pre>
        </ObsidianCallout>
      )}
      {error && (
        <ObsidianCallout type="error">
          <pre className="overflow-x-auto font-mono text-xs">{error}</pre>
        </ObsidianCallout>
      )}
    </section>
  );
}
