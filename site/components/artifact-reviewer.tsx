"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RUN_MODELS,
  type ArtifactReviewSelection,
  type RunModel,
} from "@/lib/artifact-feedback";

interface DecoratedState {
  tabIndex: string | null;
  ariaSelected: string | null;
  marker: string | null;
  owner: string | null;
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

const WRITING_TAGS = new Set([
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "P",
  "LI",
  "SPAN",
  "STRONG",
  "EM",
  "CODE",
  "TD",
  "TH",
  "FIGCAPTION",
  "TEXT",
  "TSPAN",
]);
const ALL_ARTIFACT_SELECTOR = "body *";
const TEXT_CONTAINER_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "li",
  "td",
  "th",
  "figcaption",
  "blockquote",
  "pre",
  "code",
  "span",
  "text",
  "tspan",
].join(",");
const TEXT_RANGE_ID_PREFIX = "text-range-";
const TEXT_HIGHLIGHT_NAME = "artifact-review-text";
const REVIEW_OWNER_ATTRIBUTE = "data-artifact-review-owned";
const REVIEW_ACCENT = "rgb(99, 102, 241)";
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

function selectionExcerpt(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 1_000);
}

function selectionHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function elementForNode(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;
}

function textOffsetWithin(container: Element, node: Node, offset: number) {
  const probe = container.ownerDocument.createRange();
  probe.selectNodeContents(container);
  probe.setEnd(node, offset);
  return probe.toString().length;
}

interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): boolean;
}

interface HighlightConstructor {
  new (...ranges: Range[]): unknown;
}

function highlightApi(doc: Document) {
  const view = doc.defaultView as
    (Window & { Highlight?: HighlightConstructor }) | null;
  const css = (
    view as
      | (Window & { CSS?: typeof CSS & { highlights?: HighlightRegistry } })
      | null
  )?.CSS;
  return { registry: css?.highlights, Highlight: view?.Highlight };
}

function syncTextHighlights(doc: Document | null | undefined, ranges: Range[]) {
  if (!doc) return;
  const { registry, Highlight } = highlightApi(doc);
  if (!registry || !Highlight) return;
  if (ranges.length === 0) {
    registry.delete(TEXT_HIGHLIGHT_NAME);
    return;
  }
  registry.set(TEXT_HIGHLIGHT_NAME, new Highlight(...ranges));
}

function isTextSelection(target: ArtifactReviewSelection) {
  return target.id.startsWith(TEXT_RANGE_ID_PREFIX);
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
  const markedAncestor = element.closest("[data-artifact-review-target]");
  if (
    markedAncestor &&
    !decorated.has(markedAncestor) &&
    markedAncestor.getAttribute(REVIEW_OWNER_ATTRIBUTE) !== "true"
  ) {
    return true;
  }
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

  for (const element of doc.querySelectorAll(ALL_ARTIFACT_SELECTOR)) {
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
  const textRangesRef = useRef<Map<string, Range>>(new Map());
  const [loadCount, setLoadCount] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [selected, setSelected] = useState<
    Record<string, ArtifactReviewSelection>
  >({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"feedback" | "rfc">("feedback");
  const [executorModel, setExecutorModel] = useState<RunModel>("sonnet");
  const [reviewerModel, setReviewerModel] = useState<RunModel>("opus");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filedPath, setFiledPath] = useState<string | null>(null);
  const [watchIssue, setWatchIssue] = useState<string | null>(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // While a dispatched run is active, poll the batch's Execution state so
  // the tray shows claimed/resolved/blocked without a manual refresh.
  useEffect(() => {
    if (!watchIssue) return;
    let cancelled = false;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/artifacts/feedback/status?issue=${encodeURIComponent(watchIssue)}`
          );
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as {
            execution?: string;
            running?: boolean;
          };
          if (cancelled || !data.execution) return;
          const terminal =
            data.execution === "resolved" || data.execution === "blocked";
          if (terminal && !data.running) {
            setStatus(
              `Run ${data.execution}: ${watchIssue} — reload the artifact to see the result.`
            );
            setWatchIssue(null);
          } else if (terminal) {
            setStatus(
              `Executor ${data.execution}: ${watchIssue} — reviewer checking…`
            );
          } else {
            setStatus(`Agent ${data.execution}: ${watchIssue}…`);
          }
        } catch {
          // transient poll failures are fine; keep watching
        }
      })();
    }, 3_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [watchIssue]);

  const toggleTarget = useCallback((target: ArtifactReviewSelection) => {
    setSelected((current) => {
      if (current[target.id]) {
        const next = { ...current };
        delete next[target.id];
        if (target.id.startsWith(TEXT_RANGE_ID_PREFIX)) {
          textRangesRef.current.delete(target.id);
        }
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
    textRangesRef.current.clear();
    setSelected((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([id]) => !id.startsWith(TEXT_RANGE_ID_PREFIX)
        )
      )
    );
    setComments((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([id]) => !id.startsWith(TEXT_RANGE_ID_PREFIX)
        )
      )
    );
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
    const textIdsBySignature = new Map<string, string>();
    for (const [id, target] of Object.entries(selectedRef.current)) {
      if (!id.startsWith(TEXT_RANGE_ID_PREFIX)) continue;
      assignedIds.add(id);
      textIdsBySignature.set(`${target.selector}\u0000${target.excerpt}`, id);
    }
    for (const element of doc.querySelectorAll(
      "[data-artifact-review-target]"
    )) {
      const foreignId = element.getAttribute("data-artifact-review-target");
      if (foreignId) assignedIds.add(foreignId);
    }
    ownedElementsRef.current = decoratedElements;
    let byElement = new Map<Element, ArtifactReviewSelection>();
    let frame = 0;
    let capturedTextOnMouseUp = false;

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

    const addTextSelection = () => {
      const selection = doc.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return false;
      }
      const sourceRange = selection.getRangeAt(0);
      const startElement = elementForNode(sourceRange.startContainer);
      const endElement = elementForNode(sourceRange.endContainer);
      if (
        !startElement ||
        !endElement ||
        isExcluded(startElement, decorated) ||
        isExcluded(endElement, decorated)
      ) {
        return false;
      }
      const excerpt = selectionExcerpt(selection.toString());
      if (!excerpt) return false;

      const commonElement = elementForNode(sourceRange.commonAncestorContainer);
      if (!commonElement || !doc.body?.contains(commonElement)) return false;
      const container =
        commonElement.closest(TEXT_CONTAINER_SELECTOR) ?? commonElement;
      const start = textOffsetWithin(
        container,
        sourceRange.startContainer,
        sourceRange.startOffset
      );
      const end = textOffsetWithin(
        container,
        sourceRange.endContainer,
        sourceRange.endOffset
      );
      const locator = `${selectorFor(container)}::text(${start}-${end})`.slice(
        0,
        500
      );
      const signature = `${locator}\u0000${excerpt}`;
      const id =
        textIdsBySignature.get(signature) ||
        claimUniqueId(`${TEXT_RANGE_ID_PREFIX}${selectionHash(signature)}`);
      textIdsBySignature.set(signature, id);
      textRangesRef.current.set(id, sourceRange.cloneRange());
      const target: ArtifactReviewSelection = {
        id,
        kind: "writing",
        label: `Selected text: ${excerpt}`.slice(0, 200),
        selector: locator,
        excerpt,
      };
      setSelected((current) => ({ ...current, [id]: target }));
      setStatus(null);
      setError(null);
      selection.removeAllRanges();
      return true;
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
      if (original.owner === null)
        element.removeAttribute(REVIEW_OWNER_ATTRIBUTE);
      else element.setAttribute(REVIEW_OWNER_ATTRIBUTE, original.owner);
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
        ? `3px solid ${REVIEW_ACCENT}`
        : highlighted
          ? `2px solid ${REVIEW_ACCENT}`
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
            owner: element.getAttribute(REVIEW_OWNER_ATTRIBUTE),
            outline: element.style.outline,
            outlineOffset: element.style.outlineOffset,
            cursor: element.style.cursor,
          });
        }
        decoratedElements.add(element);
        element.setAttribute(REVIEW_OWNER_ATTRIBUTE, "true");
        element.setAttribute("data-artifact-review-target", target.id);
        element.setAttribute("tabindex", "0");
        element.style.cursor = target.kind === "writing" ? "text" : "pointer";
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
      const diagramTarget = node.closest(".mermaid g.node, .mermaid g.cluster");
      if (
        diagramTarget?.getAttribute(REVIEW_OWNER_ATTRIBUTE) === "true" &&
        byElement.has(diagramTarget)
      ) {
        return diagramTarget as SVGElement;
      }
      return node.closest("[data-artifact-review-target]") as
        HTMLElement | SVGElement | null;
    };

    const onClick = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (capturedTextOnMouseUp) {
        capturedTextOnMouseUp = false;
        return;
      }
      if (addTextSelection()) return;
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
    const onMouseDown = (event: MouseEvent) => {
      capturedTextOnMouseUp = false;
      event.stopImmediatePropagation();
    };
    const onMouseUp = (event: MouseEvent) => {
      event.stopImmediatePropagation();
      capturedTextOnMouseUp = addTextSelection();
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
    const highlightStyle = doc.createElement("style");
    highlightStyle.setAttribute("data-artifact-review-highlight", "true");
    highlightStyle.textContent = `
      ::selection {
        background: rgba(99, 102, 241, .32);
        color: inherit;
      }
      ::highlight(${TEXT_HIGHLIGHT_NAME}) {
        background: rgba(99, 102, 241, .24);
        color: inherit;
        text-decoration-line: underline;
        text-decoration-color: ${REVIEW_ACCENT};
        text-decoration-thickness: 2px;
        text-underline-offset: 3px;
      }
    `;
    doc.head?.append(highlightStyle);
    syncTextHighlights(
      doc,
      Array.from(textRangesRef.current.entries())
        .filter(([id]) => Boolean(selectedRef.current[id]))
        .map(([, range]) => range)
    );

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
    doc.addEventListener("mousedown", onMouseDown, true);
    doc.addEventListener("mousemove", stopArtifactInteraction, true);
    doc.addEventListener("mouseup", onMouseUp, true);
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
      doc.removeEventListener("mousedown", onMouseDown, true);
      doc.removeEventListener("mousemove", stopArtifactInteraction, true);
      doc.removeEventListener("mouseup", onMouseUp, true);
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
      highlightApi(doc).registry?.delete(TEXT_HIGHLIGHT_NAME);
      highlightStyle.remove();
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
      element.style.outline = isSelected ? `3px solid ${REVIEW_ACCENT}` : "";
      element.style.outlineOffset = isSelected ? "3px" : "";
    }
    syncTextHighlights(
      iframeRef.current?.contentDocument,
      Array.from(textRangesRef.current.entries())
        .filter(([id]) => Boolean(selected[id]))
        .map(([, range]) => range)
    );
  }, [selected]);

  const targets = Object.values(selected);
  const valid =
    targets.length > 0 &&
    title.trim() !== "" &&
    body.trim() !== "" &&
    targets.every((target) => comments[target.id]?.trim());

  async function submit(mode: "triage" | "queue" | "run") {
    if (!valid) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    setFiledPath(null);
    try {
      const response = await fetch("/api/artifacts/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifact,
          kind,
          title,
          body,
          // The public POST body can no longer authorize anything — the
          // server always files needs-triage. "queue" and "run" promote
          // via a separate token-gated dispatch call below.
          readyForAgent: false,
          run: false,
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
      const filed = typeof data.filed === "string" ? data.filed : null;
      const issueName = typeof data.issue === "string" ? data.issue : null;
      if (filed) setFiledPath(filed);

      if (mode === "triage" || !issueName) {
        setStatus(`Filed ${String(filed)}`);
      } else {
        // "queue" and "run" both cross the authorization boundary (a
        // queued batch is fed to later autonomous sessions by the nudge
        // hook), so both go through the same same-origin token + dispatch
        // gate. Only "run" also starts a run right now.
        try {
          const tokenRes = await fetch(
            `/api/artifacts/feedback/dispatch-token?issue=${encodeURIComponent(issueName)}`
          );
          const tokenData = await responseJson(tokenRes);
          if (!tokenRes.ok || typeof tokenData.token !== "string") {
            setStatus(
              `Filed ${String(filed)} — could not authorize: ${String(tokenData.error ?? "unknown")}`
            );
          } else {
            const dispatchRes = await fetch("/api/artifacts/feedback/dispatch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                issue: issueName,
                token: tokenData.token,
                run: mode === "run",
                executorModel,
                reviewerModel,
              }),
            });
            const dispatchData = await responseJson(dispatchRes);
            if (!dispatchRes.ok) {
              setStatus(
                `Filed ${String(filed)} — could not queue: ${String(dispatchData.error ?? "unknown")}`
              );
            } else if (mode === "queue") {
              setStatus(`Filed ${String(filed)}`);
            } else {
              const run = (dispatchData.run ?? null) as {
                started?: boolean;
                error?: string;
              } | null;
              if (run?.started) {
                setStatus(`Filed ${String(filed)} — agent starting…`);
                setWatchIssue(issueName);
              } else {
                setStatus(
                  `Filed ${String(filed)} — run not started: ${String(run?.error ?? "unknown")}`
                );
              }
            }
          }
        } catch (cause) {
          setStatus(`Filed ${String(filed)} — could not queue: ${String(cause)}`);
        }
      }

      textRangesRef.current.clear();
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
    <main className="flex min-h-[calc(var(--fd-docs-height)-var(--fd-header-height))] min-w-0 flex-col bg-fd-background [grid-area:main] lg:h-(--fd-docs-height) lg:flex-row">
      <section className="isolate flex min-h-[65vh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
        <header
          data-review-toolbar
          className={`relative shrink-0 border-b px-4 py-3 transition-[color,background-color,border-color,margin] sm:px-5 md:[[data-sidebar-collapsed=true]_&]:mt-14 ${
            reviewMode
              ? "border-indigo-500/30 bg-indigo-500/[0.06]"
              : "bg-fd-card"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className={`grid size-8 shrink-0 place-items-center rounded-full border ${
                  reviewMode
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                    : "text-fd-muted-foreground bg-fd-background"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="size-4"
                >
                  <path d="m4 19 4.3-1 9.9-9.9a2.1 2.1 0 0 0-3-3L5.3 15Z" />
                  <path d="m13.7 6.6 3 3M4 19l1.2-4" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-medium tracking-[0.12em] text-indigo-600 uppercase dark:text-indigo-300">
                  {reviewMode ? "Review mode active" : "Artifact preview"}
                </p>
                <p className="text-fd-muted-foreground truncate text-sm">
                  {reviewMode
                    ? "Drag over exact words, or click any element."
                    : "Read and interact normally until review mode starts."}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span
                aria-live="polite"
                className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide uppercase ${
                  targets.length > 0
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200"
                    : "text-fd-muted-foreground bg-fd-background"
                }`}
              >
                {targets.length} selected
              </span>
              <button
                type="button"
                aria-pressed={reviewMode}
                onClick={() => setReviewMode((enabled) => !enabled)}
                className={`rounded-lg border px-3.5 py-2 text-sm font-medium shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none ${
                  reviewMode
                    ? "border-fd-border bg-fd-background text-fd-foreground hover:bg-fd-accent"
                    : "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500"
                }`}
              >
                {reviewMode ? "Exit review mode" : "Start review mode"}
              </button>
            </div>
          </div>
        </header>
        <iframe
          ref={iframeRef}
          src={src}
          title="Artifact under review"
          onLoad={recordIframeLoad}
          className="block min-h-0 w-full flex-1 border-0 bg-white"
        />
      </section>

      <aside
        aria-label="Artifact review tray"
        className="flex max-h-[60vh] flex-col overflow-hidden border-t bg-fd-card lg:max-h-none lg:w-[26rem] lg:shrink-0 lg:border-t-0 lg:border-l"
      >
        <header className="shrink-0 border-b px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-fd-muted-foreground font-mono text-[10px] font-medium tracking-[0.12em] uppercase">
              Review batch
            </h1>
            <span className="bg-fd-background text-fd-muted-foreground rounded-full border px-2.5 py-1 font-mono text-[10px]">
              {targets.length} {targets.length === 1 ? "target" : "targets"}
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          {targets.length === 0 ? (
            <p className="text-fd-muted-foreground rounded-xl border border-dashed p-4 text-sm leading-6">
              Start review mode, then click an element or drag across words.
              Your marks collect here.
            </p>
          ) : (
            <div className="space-y-3">
              {targets.map((target) => {
                const textSelection = isTextSelection(target);
                return (
                  <section
                    key={target.id}
                    data-selected-target={target.id}
                    className={`overflow-hidden rounded-xl border shadow-sm ${
                      textSelection
                        ? "border-indigo-500/30 bg-indigo-500/[0.04]"
                        : "bg-fd-background"
                    }`}
                  >
                    <div className="p-3.5">
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={`mt-1 block size-2 shrink-0 rounded-full ${
                            textSelection
                              ? "bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.12)]"
                              : "bg-fd-muted-foreground/50"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-mono text-[10px] font-medium tracking-[0.1em] uppercase ${
                              textSelection
                                ? "text-indigo-600 dark:text-indigo-300"
                                : "text-fd-muted-foreground"
                            }`}
                          >
                            {textSelection ? "Text selection" : target.kind}
                          </p>
                          <h2
                            className={
                              textSelection
                                ? "sr-only"
                                : "mt-1 line-clamp-2 text-sm font-medium leading-5"
                            }
                          >
                            {target.label}
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleTarget(target)}
                          className="text-fd-muted-foreground hover:text-fd-foreground rounded-md px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none"
                        >
                          Remove
                        </button>
                      </div>

                      {target.excerpt &&
                        (textSelection ? (
                          <blockquote className="mt-3 border-l-2 border-indigo-500 bg-indigo-500/[0.06] px-3 py-2 text-sm leading-5">
                            “{target.excerpt}”
                          </blockquote>
                        ) : (
                          <p className="text-fd-muted-foreground mt-3 line-clamp-3 text-xs leading-5">
                            {target.excerpt}
                          </p>
                        ))}

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
                          placeholder="Describe the change you want…"
                          className="bg-fd-card mt-1.5 w-full resize-y rounded-lg border p-2.5 text-sm leading-5 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:outline-none"
                        />
                      </label>
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {targets.length > 0 && (
            <div className="space-y-4 border-t pt-5">
              <label className="block text-sm font-medium">
                Batch title
                <input
                  required
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Summarize this review"
                  className="bg-fd-background mt-1.5 w-full rounded-lg border px-3 py-2.5 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:outline-none"
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
                  placeholder="Explain how these changes should work together…"
                  className="bg-fd-background mt-1.5 w-full resize-y rounded-lg border p-3 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:outline-none"
                />
              </label>
              <fieldset>
                <legend className="text-xs font-medium">Kind</legend>
                <div className="mt-2 flex gap-2">
                  {(["feedback", "rfc"] as const).map((value) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        kind === value
                          ? "border-indigo-500/40 bg-indigo-500/[0.07]"
                          : "bg-fd-background hover:bg-fd-accent"
                      }`}
                    >
                      <input
                        type="radio"
                        name="review-kind"
                        value={value}
                        checked={kind === value}
                        onChange={() => setKind(value)}
                        className="accent-indigo-600"
                      />
                      {value === "feedback" ? "Feedback" : "RFC"}
                    </label>
                  ))}
                </div>
              </fieldset>

              <details>
                <summary className="text-fd-muted-foreground hover:text-fd-foreground cursor-pointer text-xs font-medium select-none">
                  Run models · {executorModel} → {reviewerModel}
                </summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="block text-xs font-medium">
                    Executor
                    <select
                      value={executorModel}
                      onChange={(event) =>
                        setExecutorModel(event.target.value as RunModel)
                      }
                      className="bg-fd-background mt-1.5 w-full rounded-lg border px-2.5 py-2 text-sm focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:outline-none"
                    >
                      {RUN_MODELS.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium">
                    Reviewer
                    <select
                      value={reviewerModel}
                      onChange={(event) =>
                        setReviewerModel(event.target.value as RunModel)
                      }
                      className="bg-fd-background mt-1.5 w-full rounded-lg border px-2.5 py-2 text-sm focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:outline-none"
                    >
                      {RUN_MODELS.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </details>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={!valid || busy}
                  onClick={() => void submit("run")}
                  className="w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Approve · run now
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!valid || busy}
                    onClick={() => void submit("queue")}
                    className="bg-fd-background rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-fd-accent focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Queue for agent
                  </button>
                  <button
                    type="button"
                    disabled={!valid || busy}
                    onClick={() => void submit("triage")}
                    className="bg-fd-background rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-fd-accent focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save for triage
                  </button>
                </div>
              </div>
            </div>
          )}
          {status && (
            <p
              role="status"
              className="text-fd-success rounded-lg border border-current/20 p-3 text-sm"
            >
              {status}
            </p>
          )}
          {filedPath && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(
                    `Read the artifact feedback issue at ${filedPath} and act on it per docs/agents/issue-tracker.md.`
                  )
                  .then(() =>
                    setStatus(
                      "Prompt copied — paste it into any Claude session."
                    )
                  )
                  .catch(() => setError("Could not copy to clipboard."));
              }}
              className="bg-fd-background w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-fd-accent focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none"
            >
              Copy prompt for a new session
            </button>
          )}
          {error && (
            <p
              role="alert"
              className="text-fd-error rounded-lg border border-current/20 p-3 text-sm"
            >
              {error}
            </p>
          )}
        </div>
      </aside>
    </main>
  );
}
