"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArtifactReviewSelection } from "@/lib/artifact-feedback";

interface DecoratedState {
  tabIndex: string | null;
  ariaSelected: string | null;
  marker: string | null;
  outline: string;
  outlineOffset: string;
  cursor: string;
}

const SPECIAL_TARGETS: Array<[string, string]> = [
  [".step", "plan-step"],
  [".dependencies", "plan-dependencies"],
  [".context", "decision-context"],
  [".option", "decision-option"],
  [".recommendation", "decision-recommendation"],
  [".mermaid g.node", "diagram-node"],
  [".mermaid g.cluster", "diagram-group"],
  [".note", "note"],
];

const GENERIC_SELECTOR = [
  "header",
  "main > section:not(.feedback)",
  "article",
  "figure",
  "table",
  "pre",
  "blockquote",
  "h2",
  "h3",
  "p",
  "li",
].join(",");

const WRITING_TAGS = new Set(["H2", "H3", "P", "LI"]);
const EXCLUDED_SELECTOR = [
  ".feedback",
  "script",
  "style",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "[aria-hidden='true']",
].join(",");

function textExcerpt(element: Element): string {
  return (element.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1_000);
}

function targetLabel(element: Element, excerpt: string): string {
  const explicit = element.getAttribute("data-review-label");
  if (explicit?.trim()) return explicit.trim().slice(0, 200);
  const aria = element.getAttribute("aria-label");
  if (aria?.trim()) return aria.trim().slice(0, 200);
  const heading = element.matches("h1,h2,h3")
    ? element
    : element.querySelector("h1,h2,h3");
  const headingText = textExcerpt(heading ?? element);
  return (headingText || excerpt || "Untitled target").slice(0, 80);
}

function selectorFor(element: Element): string {
  const domId = element.getAttribute("id");
  if (domId && /^[A-Za-z][A-Za-z0-9_-]*$/.test(domId)) return `#${domId}`;

  const parts: string[] = [];
  let cursor: Element | null = element;
  while (cursor) {
    const tag = cursor.tagName.toLowerCase();
    const safeClasses = Array.from(cursor.classList)
      .filter((name) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(name))
      .filter((name) => name !== "artifact-review-target")
      .slice(0, 2)
      .map((name) => `.${name}`)
      .join("");
    let nth = "";
    if (cursor.parentElement) {
      const sameTag = Array.from(cursor.parentElement.children).filter(
        (child) => child.tagName === cursor?.tagName
      );
      if (sameTag.length > 1)
        nth = `:nth-of-type(${sameTag.indexOf(cursor) + 1})`;
    }
    parts.unshift(`${tag}${safeClasses}${nth}`);
    if (tag === "main") break;
    cursor = cursor.parentElement;
  }
  return parts.join(" > ").slice(0, 500);
}

function isExcluded(
  element: Element,
  decorated: WeakMap<Element, DecoratedState>
) {
  if (element.closest(EXCLUDED_SELECTOR)) return true;
  return (
    element.hasAttribute("data-artifact-review-target") &&
    !decorated.has(element)
  );
}

function discoverTargets(
  doc: Document,
  decorated: WeakMap<Element, DecoratedState>,
  idForElement: (element: Element, kind: string) => string
): Array<{
  element: HTMLElement | SVGElement;
  target: ArtifactReviewSelection;
}> {
  const explicit = Array.from(doc.querySelectorAll("[data-review-id]"));
  const special: Array<{ element: Element; kind: string }> = [];
  for (const [selector, kind] of SPECIAL_TARGETS) {
    for (const element of doc.querySelectorAll(selector)) {
      if (!explicit.includes(element)) special.push({ element, kind });
    }
  }
  const higherPriority = new Set([
    ...explicit,
    ...special.map(({ element }) => element),
  ]);

  const candidates: Array<{ element: Element; inferredKind: string }> = [
    ...explicit.map((element) => ({ element, inferredKind: "component" })),
    ...special.map(({ element, kind }) => ({ element, inferredKind: kind })),
  ];

  for (const element of doc.querySelectorAll(GENERIC_SELECTOR)) {
    if (higherPriority.has(element)) continue;
    const nestedInPriority = Array.from(higherPriority).some(
      (ancestor) => ancestor !== element && ancestor.contains(element)
    );
    if (nestedInPriority && !WRITING_TAGS.has(element.tagName)) continue;
    candidates.push({
      element,
      inferredKind: WRITING_TAGS.has(element.tagName) ? "writing" : "component",
    });
  }

  const seenElements = new Set<Element>();
  const result: Array<{
    element: HTMLElement | SVGElement;
    target: ArtifactReviewSelection;
  }> = [];

  for (const { element, inferredKind } of candidates) {
    if (
      seenElements.has(element) ||
      isExcluded(element, decorated) ||
      !(element instanceof doc.defaultView!.Element)
    ) {
      continue;
    }
    seenElements.add(element);
    const kind = (
      element.getAttribute("data-review-kind") || inferredKind
    ).slice(0, 200);
    const id = idForElement(element, kind);
    const excerpt = textExcerpt(element);
    result.push({
      element: element as HTMLElement | SVGElement,
      target: {
        id,
        kind,
        label: targetLabel(element, excerpt),
        selector: selectorFor(element),
        excerpt,
      },
    });
  }
  return result;
}

async function responseJson(
  response: Response
): Promise<Record<string, unknown>> {
  try {
    return await response.json();
  } catch {
    return { error: `${response.status} ${response.statusText}` };
  }
}

export function ArtifactReviewer({
  artifact,
  src,
}: {
  artifact: string;
  src: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeDocumentRef = useRef<Document | null>(null);
  const selectedRef = useRef<Record<string, ArtifactReviewSelection>>({});
  const ownedElementsRef = useRef<Set<HTMLElement | SVGElement>>(new Set());
  const [loadCount, setLoadCount] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [selected, setSelected] = useState<
    Record<string, ArtifactReviewSelection>
  >({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"feedback" | "rfc">("feedback");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const toggleTarget = useCallback((target: ArtifactReviewSelection) => {
    setSelected((current) => {
      if (current[target.id]) {
        const next = { ...current };
        delete next[target.id];
        return next;
      }
      return { ...current, [target.id]: target };
    });
    setStatus(null);
    setError(null);
  }, []);

  const recordIframeLoad = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || doc === iframeDocumentRef.current) return;
    iframeDocumentRef.current = doc;
    setLoadCount((count) => count + 1);
  }, []);

  useEffect(() => {
    if (!reviewMode) return;
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc?.documentElement) return;
    iframeDocumentRef.current = doc;

    const decorated = new WeakMap<Element, DecoratedState>();
    const decoratedElements = new Set<HTMLElement | SVGElement>();
    const idsByElement = new WeakMap<Element, string>();
    const assignedIds = new Set<string>();
    const fallbackCounters = new Map<string, number>();
    for (const element of doc.querySelectorAll(
      "[data-artifact-review-target]"
    )) {
      const foreignId = element.getAttribute("data-artifact-review-target");
      if (foreignId) assignedIds.add(foreignId);
    }
    ownedElementsRef.current = decoratedElements;
    let byElement = new Map<Element, ArtifactReviewSelection>();
    let frame = 0;

    const claimUniqueId = (base: string) => {
      const normalized = base.slice(0, 200) || "target";
      if (!assignedIds.has(normalized)) {
        assignedIds.add(normalized);
        return normalized;
      }
      let duplicate = 2;
      while (true) {
        const suffix = `-${duplicate}`;
        const candidate = `${normalized.slice(0, 200 - suffix.length)}${suffix}`;
        if (!assignedIds.has(candidate)) {
          assignedIds.add(candidate);
          return candidate;
        }
        duplicate += 1;
      }
    };

    const idForElement = (element: Element, kind: string) => {
      const existing = idsByElement.get(element);
      if (existing) return existing;
      const declaredId =
        element.getAttribute("data-review-id") || element.getAttribute("id");
      let base = declaredId;
      if (!base) {
        const next = (fallbackCounters.get(kind) ?? 0) + 1;
        fallbackCounters.set(kind, next);
        base = `${kind}-${next}`;
      }
      const id = claimUniqueId(base);
      idsByElement.set(element, id);
      return id;
    };

    const restoreElement = (element: HTMLElement | SVGElement) => {
      const original = decorated.get(element);
      if (!original) return;
      if (original.tabIndex === null) element.removeAttribute("tabindex");
      else element.setAttribute("tabindex", original.tabIndex);
      if (original.ariaSelected === null)
        element.removeAttribute("aria-selected");
      else element.setAttribute("aria-selected", original.ariaSelected);
      if (original.marker === null)
        element.removeAttribute("data-artifact-review-target");
      else element.setAttribute("data-artifact-review-target", original.marker);
      element.style.outline = original.outline;
      element.style.outlineOffset = original.outlineOffset;
      element.style.cursor = original.cursor;
      decoratedElements.delete(element);
    };

    const updateVisual = (
      element: HTMLElement | SVGElement,
      highlighted = false
    ) => {
      const target = byElement.get(element);
      if (!target) return;
      const isSelected = Boolean(selectedRef.current[target.id]);
      element.setAttribute("aria-selected", String(isSelected));
      element.style.outline = isSelected
        ? "3px solid rgb(0, 112, 243)"
        : highlighted
          ? "2px solid rgb(0, 112, 243)"
          : "";
      element.style.outlineOffset = isSelected || highlighted ? "3px" : "";
    };

    const refresh = () => {
      const discovered = discoverTargets(doc, decorated, idForElement);
      const nextElements = new Set(discovered.map(({ element }) => element));
      for (const element of Array.from(decoratedElements)) {
        if (!nextElements.has(element)) restoreElement(element);
      }
      byElement = new Map(
        discovered.map(({ element, target }) => [element, target])
      );
      setSelected((current) => {
        let next = current;
        for (const { target } of discovered) {
          const active = current[target.id];
          if (
            !active ||
            (active.kind === target.kind &&
              active.label === target.label &&
              active.selector === target.selector &&
              active.excerpt === target.excerpt)
          ) {
            continue;
          }
          if (next === current) next = { ...current };
          next[target.id] = target;
        }
        return next;
      });
      for (const { element, target } of discovered) {
        if (!decorated.has(element)) {
          decorated.set(element, {
            tabIndex: element.getAttribute("tabindex"),
            ariaSelected: element.getAttribute("aria-selected"),
            marker: element.getAttribute("data-artifact-review-target"),
            outline: element.style.outline,
            outlineOffset: element.style.outlineOffset,
            cursor: element.style.cursor,
          });
        }
        decoratedElements.add(element);
        element.setAttribute("data-artifact-review-target", target.id);
        element.setAttribute("tabindex", "0");
        element.style.cursor = "pointer";
        updateVisual(element);
      }
    };

    const scheduleRefresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refresh);
    };

    const eventTarget = (event: Event) => {
      const node = event.target;
      if (!(node instanceof doc.defaultView!.Element)) return null;
      return node.closest("[data-artifact-review-target]") as
        HTMLElement | SVGElement | null;
    };

    const onClick = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const element = eventTarget(event);
      if (!element) return;
      const target = byElement.get(element);
      if (target) toggleTarget(target);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const element = eventTarget(event);
      if (!element) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const target = byElement.get(element);
      if (target) toggleTarget(target);
    };
    const stopArtifactInteraction = (event: Event) => {
      event.stopImmediatePropagation();
    };
    const onHighlight = (event: Event) => {
      const element = eventTarget(event);
      if (element) updateVisual(element, true);
    };
    const onUnhighlight = (event: Event) => {
      const element = eventTarget(event);
      if (element) updateVisual(element, false);
    };

    const feedback = Array.from(doc.querySelectorAll<HTMLElement>(".feedback"));
    const feedbackDisplays = feedback.map((element) => element.style.display);
    feedback.forEach((element) => {
      element.style.display = "none";
    });

    refresh();
    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(doc.documentElement, { childList: true, subtree: true });
    doc.addEventListener("click", onClick, true);
    doc.addEventListener("keydown", onKeyDown, true);
    doc.addEventListener("pointerdown", stopArtifactInteraction, true);
    doc.addEventListener("pointermove", stopArtifactInteraction, true);
    doc.addEventListener("pointerup", stopArtifactInteraction, true);
    doc.addEventListener("pointercancel", stopArtifactInteraction, true);
    doc.addEventListener("dblclick", stopArtifactInteraction, true);
    doc.addEventListener("dragstart", stopArtifactInteraction, true);
    doc.addEventListener("wheel", stopArtifactInteraction, true);
    doc.addEventListener("mouseover", onHighlight, true);
    doc.addEventListener("mouseout", onUnhighlight, true);
    doc.addEventListener("focusin", onHighlight, true);
    doc.addEventListener("focusout", onUnhighlight, true);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      doc.removeEventListener("click", onClick, true);
      doc.removeEventListener("keydown", onKeyDown, true);
      doc.removeEventListener("pointerdown", stopArtifactInteraction, true);
      doc.removeEventListener("pointermove", stopArtifactInteraction, true);
      doc.removeEventListener("pointerup", stopArtifactInteraction, true);
      doc.removeEventListener("pointercancel", stopArtifactInteraction, true);
      doc.removeEventListener("dblclick", stopArtifactInteraction, true);
      doc.removeEventListener("dragstart", stopArtifactInteraction, true);
      doc.removeEventListener("wheel", stopArtifactInteraction, true);
      doc.removeEventListener("mouseover", onHighlight, true);
      doc.removeEventListener("mouseout", onUnhighlight, true);
      doc.removeEventListener("focusin", onHighlight, true);
      doc.removeEventListener("focusout", onUnhighlight, true);
      for (const element of Array.from(decoratedElements))
        restoreElement(element);
      feedback.forEach((element, index) => {
        element.style.display = feedbackDisplays[index];
      });
      if (ownedElementsRef.current === decoratedElements) {
        ownedElementsRef.current = new Set();
      }
    };
  }, [loadCount, reviewMode, toggleTarget]);

  useEffect(() => {
    for (const element of ownedElementsRef.current) {
      const id = element.getAttribute("data-artifact-review-target");
      if (!id) continue;
      const isSelected = Boolean(selected[id]);
      element.setAttribute("aria-selected", String(isSelected));
      element.style.outline = isSelected ? "3px solid rgb(0, 112, 243)" : "";
      element.style.outlineOffset = isSelected ? "3px" : "";
    }
  }, [selected]);

  const targets = Object.values(selected);
  const valid =
    targets.length > 0 &&
    title.trim() !== "" &&
    body.trim() !== "" &&
    targets.every((target) => comments[target.id]?.trim());

  async function submit(readyForAgent: boolean) {
    if (!valid) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/artifacts/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifact,
          kind,
          title,
          body,
          readyForAgent,
          targets: targets.map((target) => ({
            ...target,
            comment: comments[target.id],
          })),
        }),
      });
      const data = await responseJson(response);
      if (!response.ok) {
        setError(`Could not file feedback: ${String(data.error)}`);
        return;
      }
      setStatus(`Filed ${String(data.filed)}`);
      setSelected({});
      setComments({});
      setTitle("");
      setBody("");
      setKind("feedback");
      setReviewMode(false);
    } catch (cause) {
      setError(`Could not file feedback: ${String(cause)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col bg-fd-background lg:h-[calc(100dvh-4rem)] lg:flex-row">
      <section className="flex min-h-[65vh] min-w-0 flex-1 flex-col lg:min-h-0">
        <header className="flex items-center gap-3 border-b bg-fd-card px-4 py-3">
          <button
            type="button"
            aria-pressed={reviewMode}
            onClick={() => setReviewMode((enabled) => !enabled)}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-fd-accent disabled:opacity-50"
          >
            {reviewMode ? "Exit review mode" : "Start review mode"}
          </button>
          <span className="text-fd-muted-foreground text-sm">
            {reviewMode
              ? "Select components or writing in the artifact."
              : "The artifact is interactive until review mode starts."}
          </span>
        </header>
        <iframe
          ref={iframeRef}
          src={src}
          title="Artifact under review"
          onLoad={recordIframeLoad}
          className="min-h-0 w-full flex-1 border-0 bg-white"
        />
      </section>

      <aside
        aria-label="Artifact review tray"
        className="max-h-[60vh] overflow-y-auto border-t bg-fd-card p-4 lg:max-h-none lg:w-96 lg:shrink-0 lg:border-t-0 lg:border-l"
      >
        <h1 className="text-xl font-semibold">Review batch</h1>
        <p className="text-fd-muted-foreground mt-1 text-sm">
          Group feedback into one issue for triage or explicit agent execution.
        </p>

        <div className="mt-5 space-y-4">
          {targets.length === 0 ? (
            <p className="text-fd-muted-foreground rounded-md border border-dashed p-3 text-sm">
              Start review mode, then select one or more targets.
            </p>
          ) : (
            targets.map((target) => (
              <section
                key={target.id}
                data-selected-target={target.id}
                className="rounded-lg border bg-fd-background p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-medium">
                      {target.label}
                    </h2>
                    <p className="text-fd-muted-foreground text-xs">
                      {target.kind}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleTarget(target)}
                    className="text-fd-muted-foreground rounded px-2 py-1 text-xs underline"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-fd-muted-foreground mt-2 line-clamp-3 text-xs">
                  {target.excerpt}
                </p>
                <label className="mt-3 block text-xs font-medium">
                  Requested change
                  <textarea
                    required
                    maxLength={5_000}
                    value={comments[target.id] ?? ""}
                    onChange={(event) =>
                      setComments((current) => ({
                        ...current,
                        [target.id]: event.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-1 w-full rounded-md border bg-fd-card p-2 text-sm"
                  />
                </label>
              </section>
            ))
          )}

          <label className="block text-sm font-medium">
            Batch title
            <input
              required
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-md border bg-fd-background px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Overall instruction
            <textarea
              required
              maxLength={10_000}
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="mt-1 w-full rounded-md border bg-fd-background p-3"
            />
          </label>
          <fieldset>
            <legend className="text-sm font-medium">Issue kind</legend>
            <div className="mt-2 flex gap-4 text-sm">
              {(["feedback", "rfc"] as const).map((value) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="review-kind"
                    value={value}
                    checked={kind === value}
                    onChange={() => setKind(value)}
                  />
                  {value === "feedback" ? "Feedback" : "RFC"}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!valid || busy}
              onClick={() => void submit(true)}
              className="rounded-md bg-fd-primary px-3 py-2 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
            >
              Queue for agent
            </button>
            <button
              type="button"
              disabled={!valid || busy}
              onClick={() => void submit(false)}
              className="rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Save for triage
            </button>
          </div>
          {status && (
            <p role="status" className="text-fd-success text-sm">
              {status}
            </p>
          )}
          {error && (
            <p role="alert" className="text-fd-error text-sm">
              {error}
            </p>
          )}
        </div>
      </aside>
    </main>
  );
}
