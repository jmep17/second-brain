"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { ObsidianCallout } from "fumadocs-obsidian/ui";

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
  "in-sync": { label: "in sync", className: "bg-fd-success/20" },
  drifted: { label: "drifted", className: "bg-fd-warning/20" },
  "not-applied": { label: "not applied", className: "bg-fd-error/20" },
  meta: {
    label: "chezmoi meta",
    className: "bg-fd-muted text-fd-muted-foreground",
  },
  error: { label: "chezmoi error", className: "bg-fd-error/20" },
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
      <section className="text-fd-muted-foreground rounded-lg border bg-fd-card p-4 text-sm">
        {error ?? `Loading ${path}…`}
      </section>
    );
  }

  const badge = BADGE[status.state];
  const dirty = text !== status.content;

  return (
    <section className="rounded-lg border bg-fd-card">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <code className="text-sm font-medium">dotfiles/{status.path}</code>
        <span
          className={`text-fd-foreground rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
        {status.target && (
          <span className="text-fd-muted-foreground truncate text-xs">
            → {status.target}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {savedAt && !dirty && (
            <span className="text-fd-muted-foreground text-xs">saved</span>
          )}
          <button
            onClick={() => void save()}
            disabled={busy || !dirty}
            className={buttonVariants({ color: "primary", size: "sm" })}
          >
            Save
          </button>
        </span>
      </header>

      {status.state === "error" && (
        <div className="px-4">
          <ObsidianCallout type="error">
            chezmoi could not report this file&apos;s state:
            <pre className="mt-2 overflow-x-auto text-xs">{status.error}</pre>
          </ObsidianCallout>
        </div>
      )}

      {stale && (
        <div className="px-4">
          <ObsidianCallout type="warning">
            The file changed on disk since you opened it; this save was
            rejected.{" "}
            <button
              onClick={() => void load()}
              className="font-medium underline"
            >
              Reload
            </button>{" "}
            (your edits will be lost).
          </ObsidianCallout>
        </div>
      )}

      {applyError && (
        <div className="px-4">
          <ObsidianCallout type="error">
            Saved, but <code>chezmoi apply</code> failed — the file is not
            applied:
            <pre className="mt-2 overflow-x-auto text-xs">{applyError}</pre>
          </ObsidianCallout>
        </div>
      )}

      {status.state === "drifted" && (
        <div className="px-4">
          <ObsidianCallout type="warning">
            <p>
              {driftBlocked
                ? "Save refused: the applied file changed after you opened this page. Resolve the drift, then save again — your editor text is kept."
                : "The applied file differs from this source (edited directly in $HOME?)."}
            </p>
            {status.diff ? (
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-fd-muted p-2 text-xs">
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
                  className={buttonVariants({ color: "outline", size: "sm" })}
                >
                  Adopt $HOME version
                </button>
              )}
              <button
                onClick={() => void resolveDrift("overwrite")}
                disabled={busy}
                className={buttonVariants({ color: "outline", size: "sm" })}
              >
                Overwrite with source
              </button>
            </div>
          </ObsidianCallout>
        </div>
      )}

      {error && (
        <div className="px-4">
          <ObsidianCallout type="error">{error}</ObsidianCallout>
        </div>
      )}

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        className="focus-visible:ring-fd-ring block h-[28rem] w-full resize-y border-t bg-transparent p-4 font-mono text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset"
      />
    </section>
  );
}
