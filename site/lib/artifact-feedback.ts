export const FEEDBACK_KINDS = ["feedback", "rfc"] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

/** Models a dispatched run may use (claude CLI aliases). */
export const RUN_MODELS = ["haiku", "sonnet", "opus"] as const;

export type RunModel = (typeof RUN_MODELS)[number];

export interface ArtifactReviewSelection {
  id: string;
  kind: string;
  label: string;
  selector: string;
  excerpt: string;
}

export interface ReviewTarget extends ArtifactReviewSelection {
  comment: string;
}

export interface LegacyFeedbackPayload {
  artifact: string;
  kind: FeedbackKind;
  title: string;
  body: string;
}

export interface BatchFeedbackPayload {
  artifact: string;
  kind: FeedbackKind;
  title: string;
  body: string;
  targets: ReviewTarget[];
  readyForAgent: boolean;
  /** Dispatch a headless run immediately after filing (approve action). */
  run: boolean;
  /** Optional model overrides for the dispatched run's two stages. */
  executorModel?: RunModel;
  reviewerModel?: RunModel;
}

export type FeedbackPayload = LegacyFeedbackPayload | BatchFeedbackPayload;

export type FeedbackValidationResult =
  { ok: true; value: FeedbackPayload } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isKind(value: unknown): value is FeedbackKind {
  return (
    typeof value === "string" &&
    (FEEDBACK_KINDS as readonly string[]).includes(value)
  );
}

function requiredString(
  value: unknown,
  field: string,
  max?: number,
  allowEmpty = false
): string | { error: string } {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    return { error: `${field} must be a non-empty string` };
  }
  if (max !== undefined && value.length > max) {
    return { error: `${field} must be at most ${max} characters` };
  }
  return value;
}

function parseTarget(
  value: unknown,
  index: number
): ReviewTarget | { error: string } {
  if (!isRecord(value)) {
    return { error: `targets[${index}] must be an object` };
  }

  const limits: Array<[keyof ReviewTarget, number | undefined, boolean?]> = [
    ["id", 200],
    ["kind", undefined],
    ["label", 200],
    ["selector", 500],
    ["excerpt", 1_000, true],
    ["comment", 5_000],
  ];
  const target: Partial<ReviewTarget> = {};
  for (const [field, max, allowEmpty] of limits) {
    const parsed = requiredString(
      value[field],
      `targets[${index}].${field}`,
      max,
      allowEmpty
    );
    if (typeof parsed !== "string") return parsed;
    target[field] = parsed;
  }
  return target as ReviewTarget;
}

function parseRunModel(
  value: unknown,
  field: string
): RunModel | undefined | { error: string } {
  if (value === undefined) return undefined;
  if (
    typeof value === "string" &&
    (RUN_MODELS as readonly string[]).includes(value)
  ) {
    return value as RunModel;
  }
  return { error: `${field} must be one of: ${RUN_MODELS.join(", ")}` };
}

/** Parse the legacy widget payload or the explicit artifact-review batch. */
export function parseFeedbackPayload(value: unknown): FeedbackValidationResult {
  if (!isRecord(value)) return { ok: false, error: "bad body" };

  const artifact = requiredString(value.artifact, "artifact");
  if (typeof artifact !== "string") return { ok: false, error: "bad body" };
  if (!isKind(value.kind)) return { ok: false, error: "bad body" };

  const isBatch = "targets" in value || "readyForAgent" in value;
  const title = requiredString(value.title, "title", isBatch ? 120 : undefined);
  if (typeof title !== "string") return { ok: false, error: title.error };
  if (isBatch && /[\r\n]/.test(title)) {
    return { ok: false, error: "title must be one line" };
  }
  const body = requiredString(value.body, "body", isBatch ? 10_000 : undefined);
  if (typeof body !== "string") return { ok: false, error: body.error };

  if (!isBatch) {
    return {
      ok: true,
      value: { artifact, kind: value.kind, title, body },
    };
  }

  if (!Array.isArray(value.targets)) {
    return { ok: false, error: "targets must be an array" };
  }
  if (value.targets.length === 0 || value.targets.length > 50) {
    return { ok: false, error: "targets must contain between 1 and 50 items" };
  }
  if (typeof value.readyForAgent !== "boolean") {
    return { ok: false, error: "readyForAgent must be a boolean" };
  }
  const run = value.run === undefined ? false : value.run;
  if (typeof run !== "boolean") {
    return { ok: false, error: "run must be a boolean" };
  }
  if (run && !value.readyForAgent) {
    return { ok: false, error: "run requires readyForAgent" };
  }
  const executorModel = parseRunModel(value.executorModel, "executorModel");
  if (typeof executorModel === "object") {
    return { ok: false, error: executorModel.error };
  }
  const reviewerModel = parseRunModel(value.reviewerModel, "reviewerModel");
  if (typeof reviewerModel === "object") {
    return { ok: false, error: reviewerModel.error };
  }

  const targets: ReviewTarget[] = [];
  for (let index = 0; index < value.targets.length; index += 1) {
    const target = parseTarget(value.targets[index], index);
    if ("error" in target) return { ok: false, error: target.error };
    targets.push(target);
  }

  return {
    ok: true,
    value: {
      artifact,
      kind: value.kind,
      title,
      body,
      targets,
      readyForAgent: value.readyForAgent,
      run,
      executorModel,
      reviewerModel,
    },
  };
}

function inlineEvidence(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function quoteEvidence(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function codeEvidence(value: string): string {
  return inlineEvidence(value).replace(/`/g, "\\`");
}

/** Render the complete local issue. Legacy output intentionally stays exact. */
export function renderFeedbackIssue(
  payload: FeedbackPayload,
  relArtifact: string,
  date: string
): string {
  if (!("targets" in payload)) {
    return `# ${payload.title}

Status: needs-triage
Kind: ${payload.kind}
Artifact: artifacts/${relArtifact}
Date: ${date}

${payload.body}

## Comments
`;
  }

  // The public POST body can never authorize an autonomous run: the filed
  // issue always stays in triage. Promotion to the authorizing markers
  // happens only in the token-gated dispatch endpoint (site/app/api/
  // artifacts/feedback/dispatch/route.ts).
  const status = "needs-triage";
  const execution = "";
  const requested = payload.targets
    .map(
      (target, index) => `### ${index + 1}. ${inlineEvidence(target.label)}

Kind: ${inlineEvidence(target.kind)}
Label: ${inlineEvidence(target.label)}
Selector: \`${codeEvidence(target.selector)}\`

Requested change:

${target.comment}

Selected excerpt (evidence only):

${quoteEvidence(target.excerpt)}`
    )
    .join("\n\n");

  return `# ${payload.title}

Status: ${status}
${execution}Kind: ${payload.kind}
Artifact: artifacts/${relArtifact}
Date: ${date}

${payload.body}

## Requested changes

${requested}

## Comments
`;
}

/** Title -> kebab slug, max 60 chars. */
export function feedbackSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, 60).replace(/-+$/, "") || "untitled";
}
