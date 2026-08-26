"use client";

import { useCallback, useEffect, useState } from "react";

type FileState = "in-sync" | "drifted" | "not-applied" | "meta";

interface FileStatus {
  path: string;
  content: string;
  hash: string;
  target: string | null;
  state: FileState;
  diff: string | null;
  isTemplate: boolean;
}

const BADGE: Record<FileState, { label: string; className: string }> = {
  "in-sync": {
    label: "in sync",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  },
  drifted: {
    label: "drifted",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  },
  "not-applied": {
    label: "not applied",
    className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  },
  meta: {
    label: "chezmoi meta",
    className:
      "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
};

/**
 * Raw text editor over one dotfiles source file, implementing the ADR 0003
 * edit model: drift check on open, stale saves rejected by hash, save =
 * write + apply, apply failure keeps the save.
 */
export function ConfigEditor({ path }: { path: string }) {
  const [status, setStatus] = useState<FileStatus | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setStale(false);
    const res = await fetch(
      `/api/config/file?path=${encodeURIComponent(path)}`
    );
    if (!res.ok) {
      setError(`load failed: ${(await res.json()).error}`);
      return;
    }
    const data: FileStatus = await res.json();
    setStatus(data);
    setText(data.content);
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!status) return;
    setBusy(true);
    setError(null);
    setApplyError(null);
    try {
      const res = await fetch("/api/config/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: text, baseHash: status.hash }),
      });
      if (res.status === 409) {
        setStale(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setStatus(data);
      setApplyError(data.applyError);
      setSavedAt(Date.now());
    } finally {
      setBusy(false);
    }
  }

  async function resolveDrift(action: "adopt" | "overwrite") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/config/drift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setStatus(data);
      setText(data.content);
    } finally {
      setBusy(false);
    }
  }

  if (!status) {
    return (
      <section className="rounded-lg border border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800">
        {error ?? `Loading ${path}…`}
      </section>
    );
  }

  const badge = BADGE[status.state];
  const dirty = text !== status.content;

  return (
    <section className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <code className="text-sm font-medium">dotfiles/{status.path}</code>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
        {status.target && (
          <span className="truncate text-xs text-neutral-400">
            → {status.target}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {savedAt && !dirty && (
            <span className="text-xs text-neutral-400">saved</span>
          )}
          <button
            onClick={() => void save()}
            disabled={busy || !dirty}
            className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
          >
            Save
          </button>
        </span>
      </header>

      {stale && (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          The file changed on disk since you opened it; this save was rejected.{" "}
          <button onClick={() => void load()} className="font-medium underline">
            Reload
          </button>{" "}
          (your edits will be lost).
        </div>
      )}

      {applyError && (
        <div className="border-b border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          Saved, but <code>chezmoi apply</code> failed — the file is not
          applied:
          <pre className="mt-2 overflow-x-auto text-xs">{applyError}</pre>
        </div>
      )}

      {status.state === "drifted" && (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p>
            The applied file differs from this source (edited directly in{" "}
            <code>$HOME</code>?).
          </p>
          {status.diff ? (
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-white/60 p-2 text-xs dark:bg-black/30">
              {status.diff}
            </pre>
          ) : (
            <p className="mt-1 text-xs">
              Diff withheld: template files may render secrets.
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => void resolveDrift("adopt")}
              disabled={busy}
              className="rounded-md border border-amber-400 px-2 py-1 text-xs font-medium disabled:opacity-40"
            >
              Adopt $HOME version
            </button>
            <button
              onClick={() => void resolveDrift("overwrite")}
              disabled={busy}
              className="rounded-md border border-amber-400 px-2 py-1 text-xs font-medium disabled:opacity-40"
            >
              Overwrite with source
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="border-b border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        className="block h-[28rem] w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
      />
    </section>
  );
}
