"use client";

import { useCallback, useEffect, useState } from "react";

type FileState = "in-sync" | "drifted" | "not-applied" | "meta" | "error";

interface FileStatus {
  path: string;
  content: string;
  hash: string;
  target: string | null;
  state: FileState;
  diff: string | null;
  isTemplate: boolean;
  error: string | null;
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
  error: {
    label: "chezmoi error",
    className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  },
};

/** Parse a JSON body; error responses may be non-JSON (e.g. a bare 500). */
async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return await res.json();
  } catch {
    return { error: `${res.status} ${res.statusText}` };
  }
}

/**
 * Raw text editor over one dotfiles source file, implementing the ADR 0003
 * edit model: drift check on open and again at save time, stale saves
 * rejected by hash, save = write + apply, apply failure keeps the save.
 */
export function ConfigEditor({ path }: { path: string }) {
  const [status, setStatus] = useState<FileStatus | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [driftBlocked, setDriftBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setStale(false);
    setDriftBlocked(false);
    try {
      const res = await fetch(
        `/api/config/file?path=${encodeURIComponent(path)}`
      );
      const data = await parseJson(res);
      if (!res.ok) {
        setError(`load failed: ${data.error}`);
        return;
      }
      setStatus(data as unknown as FileStatus);
      setText((data as unknown as FileStatus).content);
    } catch (err) {
      setError(`load failed: ${String(err)}`);
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!status) return;
    setBusy(true);
    setError(null);
    setApplyError(null);
    setDriftBlocked(false);
    try {
      const res = await fetch("/api/config/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: text, baseHash: status.hash }),
      });
      const data = await parseJson(res);
      if (res.status === 409) {
        if (data.targetDrifted) {
          // The save was refused, the editor text is kept: show the fresh
          // drift so the user resolves it, then saves again.
          setStatus(data as unknown as FileStatus);
          setDriftBlocked(true);
        } else {
          setStale(true);
        }
        return;
      }
      if (!res.ok) {
        setError(String(data.error));
        return;
      }
      setStatus(data as unknown as FileStatus);
      setApplyError((data.applyError as string | null) ?? null);
      setSavedAt(Date.now());
    } catch (err) {
      setError(`save failed: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function resolveDrift(action: "adopt" | "overwrite") {
    if (
      status &&
      text !== status.content &&
      !window.confirm(
        "You have unsaved edits in the editor; resolving drift will replace " +
          "the editor content and discard them. Continue?"
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/config/drift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, action }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        setError(String(data.error));
        return;
      }
      setDriftBlocked(false);
      setStatus(data as unknown as FileStatus);
      setText((data as unknown as FileStatus).content);
    } catch (err) {
      setError(`${action} failed: ${String(err)}`);
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

      {status.state === "error" && (
        <div className="border-b border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          chezmoi could not report this file's state:
          <pre className="mt-2 overflow-x-auto text-xs">{status.error}</pre>
        </div>
      )}

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
            {driftBlocked
              ? "Save refused: the applied file changed after you opened this page. Resolve the drift, then save again — your editor text is kept."
              : "The applied file differs from this source (edited directly in $HOME?)."}
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
            {!status.isTemplate && (
              <button
                onClick={() => void resolveDrift("adopt")}
                disabled={busy}
                className="rounded-md border border-amber-400 px-2 py-1 text-xs font-medium disabled:opacity-40"
              >
                Adopt $HOME version
              </button>
            )}
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
