"use client";

import { useCallback, useEffect, useState } from "react";

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
    const res = await fetch("/api/config/git");
    if (res.ok) setDirty((await res.json()).dirty);
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setResult(data.output);
      setMessage("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Commit
      </h2>
      {dirty.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">
          No uncommitted changes under <code>dotfiles/</code>.
        </p>
      ) : (
        <>
          <ul className="mt-2 space-y-1 font-mono text-xs text-neutral-600 dark:text-neutral-300">
            {dirty.map((file) => (
              <li key={file.path}>
                <span className="mr-2 inline-block w-6 text-amber-600">
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
              className="flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
            />
            <button
              onClick={() => void commit()}
              disabled={busy || message.trim() === ""}
              className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-neutral-200 dark:text-neutral-900"
            >
              Commit
            </button>
          </div>
        </>
      )}
      {result && (
        <p className="mt-2 font-mono text-xs text-green-700 dark:text-green-400">
          {result}
        </p>
      )}
      {error && (
        <p className="mt-2 font-mono text-xs text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
