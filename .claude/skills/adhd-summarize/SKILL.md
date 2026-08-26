---
name: adhd-summarize
description: Summarize any document (article, paper, report, meeting notes, email thread, transcript, or long file) into an ADHD-friendly digest that is easy to scan, re-enter, and act on. Use this whenever the user asks for a summary, TL;DR, digest, or breakdown of a document and mentions ADHD, attention or focus difficulties, being overwhelmed by the length, "can't get through this", or wanting something scannable/skimmable — and whenever they ask to make an existing summary or document easier to read for someone with ADHD.
---

# ADHD-Friendly Document Summarization

Turn a long document into a summary that a reader with ADHD can actually get
through, understand, and act on.

## Why this format

ADHD is not a comprehension problem — it is primarily a working-memory and
attention-regulation problem. The reader can understand every sentence but may
not hold earlier ideas long enough to connect them, loses their place often,
and skims when overwhelmed. So the summary must do the holding for them:

- **Front-load the payoff** (BLUF — bottom line up front) so drifting attention
  still catches the point.
- **Externalize structure** — headings, bullets, and white space act as the
  reader's working memory; they make re-entry after a lapse cheap.
- **Layer the depth** so the reader chooses their investment: 10 seconds,
  2 minutes, or more. Every layer is complete on its own.
- **Separate actions from information** — buried action items are lost items.

The reasoning and sources behind each rule are in
[references/research.md](references/research.md); read it if you need to adapt
the format to an unusual document type or explain a choice.

## Workflow

1. **Read the entire document first.** Never summarize from a skim — the reader
   is trusting this summary to replace a full read.
2. **Extract before you write:** the single most important takeaway; any
   actions/decisions the reader must make; the 3–7 key points; concrete
   numbers, names, and dates worth keeping.
3. **Write using the template below.**
4. **Cut, then cut again.** Target roughly 10% of the source's prose, hard cap
   ~1 page for the layers above "Details". Verbatim code, commands, and tables
   the reader needs to act don't count against the budget — keeping them *is*
   "concrete beats abstract". Every sentence must earn its place — filler
   dilutes signal and raises processing cost.
5. **Self-check** against the checklist at the bottom before delivering.

## Output template

Use this structure. Omit a section only when it genuinely doesn't apply
(e.g., no action items in a physics paper); never pad one to fill it.

```markdown
# [Plain, informative title]

## TL;DR
[1–3 short sentences. The single most important conclusion, stated outright.
If the reader stops here, they have the point.]

**Worth reading further if:** [one line — who needs the depth and why. Be
honest; "you can skip the rest unless X" is a valid and respectful answer.]

## ⚡ Do / Decide  (only if the document implies actions)
- [ ] [Action — owner — deadline]
[Include owner/deadline only when the source names them; for tutorials and
how-tos, plain checklist steps are fine.]

## Key points
### [Heading that states the point, e.g. "The migration saves $40k/yr but blocks Q3 launches"]
[≤3 short sentences of support. One idea per paragraph. Concrete numbers and
names, not abstractions.]

### [Next point-as-heading]
[...]

## Details (optional — only for long/complex sources)
[Deeper layer for readers who want it: methodology, caveats, minority views,
section-by-section map. Still chunked, still scannable.]

## Skipped
[One or two lines: what the source contains that this summary left out, so the
reader can trust nothing important is hidden. E.g. "Omitted: vendor comparison
appendix, 2019–2021 background history."]
```

## Writing rules

- **Headings carry the argument.** Someone reading only the headings gets the
  whole story. State conclusions ("Caching cut latency 60%"), never labels
  ("Results") or teasers ("An interesting finding").
- **Paragraphs: 3 sentences max**, blank line between. Dense blocks are
  impossible to re-enter after an attention lapse.
- **One idea per bullet.** Numbered lists for sequences, bullets for unordered
  points. Don't nest more than one level deep.
- **Sentences: short, active, plain.** Prefer "The team chose Postgres" over
  "A decision was made regarding database selection". No jargon the source
  didn't force on you; define it in-line if unavoidable.
- **Don't mix what/why/how** in one chunk — it forces the reader to juggle
  context. Give each its own bullet or paragraph.
- **Bold only load-bearing phrases** — a few per section at most. If everything
  is bold, nothing is, and heavy markup becomes its own distraction.
- **Concrete beats abstract.** Keep the numbers, names, dates, and one vivid
  example; drop generalities. "$40k/yr" grips attention; "significant savings"
  slides off.
- **Never write summaries that merely point at content** ("the report discusses
  several challenges..."). Deliver the content itself.
- Emoji as section anchors (as in "⚡ Do / Decide") are optional. Default to
  keeping them; drop them when the user asks for a formal register or the
  summary is going into an external/professional document.

## Length calibration

| Source | Summary target |
|---|---|
| Email / short article (<2 pages) | TL;DR + 3–5 key-point bullets, no Details section |
| Report / paper (2–30 pages) | Full template, ≤1 page before Details |
| Book / very long transcript | Full template + Details as a chapter/section map |

When the user asks for "more detail", expand the **Details** layer — never
inflate the TL;DR or Key points layers.

## Example

**Source:** a 12-page vendor security assessment.

**Bad (typical) summary:** "This document provides a comprehensive security
assessment of Acme Corp, covering their infrastructure, policies, and
compliance posture. Several strengths and weaknesses were identified across
multiple domains..." *(points at content, front-loads nothing, wall of text)*

**Good (this skill):**

```markdown
# Acme Corp security assessment — conditional pass

## TL;DR
Acme passes for non-sensitive workloads only. Two critical gaps — no SSO
enforcement and 90-day-old unpatched CVEs — block them from handling customer
PII until fixed. They've committed to remediation by Oct 15.

**Worth reading further if:** you own the contract renewal or need the gap
list for the risk register.

## ⚡ Do / Decide
- [ ] Decide: delay PII migration or accept risk with compensating controls — Jordan — before Sep 1
- [ ] Add the two critical findings to the risk register — security team

## Key points
### SSO isn't enforced — 40% of staff use password-only logins
Acme has Okta but enforcement is opt-in per team. Their IT lead committed to
org-wide enforcement by Oct 15.

### Patch latency is the second blocker
Three critical CVEs on internet-facing systems are 90+ days old. Their SLA
says 30 days; the auditor flagged this as systemic, not a one-off.

### Everything else passed
Encryption at rest/in transit, backups, incident response, and SOC 2 scope
were all satisfactory.

## Skipped
Omitted: the compliance framework crosswalk (appendix B) and the full asset
inventory — nothing in them changes the verdict.
```

## Self-check before delivering

- Could the reader stop after the TL;DR and still have the main point?
- Do the headings alone tell the whole story?
- Is any paragraph longer than 3 sentences?
- Are all actions in the Do/Decide list rather than buried in prose?
- Is anything bold that isn't load-bearing?
- Is the summary ≤ ~10% of the source (before Details)?
