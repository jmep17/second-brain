# Research: Summarizing documents for readers with ADHD

This file documents the research behind the `adhd-summarize` skill — why each
technique in SKILL.md exists. Read it when you need to adapt the format to an
unusual document type, justify a choice, or extend the skill.

## The core problem: working memory, not intelligence

Readers with ADHD frequently have reduced working memory capacity. They can
decode every word correctly but struggle to hold earlier sentences in mind long
enough to connect ideas across a paragraph, which makes it hard to build a
coherent mental model of a text ([Bedrock Learning](https://bedrocklearning.org/literacy-blogs/improving-reading-comprehension-for-students-with-adhd/),
[PMC: metacognitive interventions and working memory in ADHD](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6966739/)).

Two knock-on effects shape everything a summary should do:

1. **Long texts get skimmed, not read.** When overwhelmed by lengthy material,
   ADHD readers tend to skim and then can't remember what they read
   ([ADDitude](https://www.additudemag.com/reading-help-for-adhd-students/)).
   A summary that is itself long recreates the original problem.
2. **Losing your place is expensive.** Attention lapses mean re-entering the
   text often; dense blocks of prose are hard to re-enter because there is no
   visual anchor to return to. Structure (headings, bullets, white space) acts
   as an external working memory — the page holds the outline so the reader
   doesn't have to.

## What the evidence supports

### Front-load the conclusion (BLUF)

"Bottom Line Up Front", from U.S. military communication practice, puts the
essential conclusion first and detail after ([Wikipedia](https://en.wikipedia.org/wiki/BLUF_(communication)),
[Lexipol](https://www.lexipol.com/resources/blog/bluf-your-way-to-better-business-writing/)).
It serves short attention spans: the reader gets the payoff before attention
drifts, and everything after is optional depth. For ADHD readers this also
provides the *scaffold* — knowing the conclusion first makes each detail easier
to attach to something, reducing the working-memory cost of integration.

### Tell the reader whether it's worth their time

Accessible-documentation guidance recommends a short notice at the top saying
who the document is for and whether it is worth reading, plus putting action
items before background. Write as though briefing a smart, busy colleague with
fifteen seconds: what happened, what they must do, whether anything is on fire.
Directness is respectful; verbosity is not.

### Chunk aggressively; separate what / why / how

Cognitive-load research applied to instructional design says to segment
information into small, labeled chunks ([Chapman University](https://www.chapman.edu/faculty-staff/faculty/center-excellence-teaching-learning/reflect/reducing-cognitive-load-instructional-materials.aspx)).
Neurodiversity-focused UX guidance adds: chunk *by intent* — mixing "what",
"why", and "how" in one paragraph forces the reader to hold too much context at
once ([Welcoming Web](https://welcomingweb.com/learn/designing-for-neurodiversity-adhd-ux)).
Keep paragraphs to roughly three sentences; separate them with blank lines.

### Headings that state the point, not tease it

Headings should answer "what is this section about?" immediately — state what
the section says rather than teasing it. A reader who only reads the headings
should still get the argument. This supports the skim-first reading pattern
ADHD readers actually use, instead of fighting it.

### Lists externalize structure

Numbered lists for sequences, bullets for options. Lists reduce visual density,
aid comparison, and offload structure from working memory onto the page.
Understanding text structure (intro, summary, bold print, headings) is itself a
researched comprehension intervention for ADHD students
([ADDitude](https://www.additudemag.com/reading-help-for-adhd-students/)).

### Separate action items and assign them

Action items buried in paragraphs get lost. List them separately, one per line,
each with an owner and (if known) a deadline. "Many things were discussed"-style
summaries that summarize *that* content exists rather than delivering it are an
anti-pattern.

### Trim filler; concrete beats abstract

Extra words dilute signal and raise processing cost. Prefer short, direct,
active-voice sentences and plain language over jargon
([plain-language / BLUF guidance](https://en.wikipedia.org/wiki/BLUF_(communication))).
Concrete numbers, names, and examples give attention something to grip;
abstractions slide off.

### Support re-entry and re-reading

Re-reading is one of the few strategies shown to reliably encode information
for ADHD learners, and it works best in short chunks with breaks
([Pride Reading Program](https://pridereadingprogram.com/adhd-and-reading-strategies-for-focus-and-comprehension/)).
A layered summary (10-second TL;DR → 2-minute key points → optional depth)
lets the reader re-enter at any layer without starting over, and lets extended
reading happen in chunks.

### Consistency and restraint in emphasis

Predictable, consistent formatting across documents reduces cognitive effort —
the reader learns the template once. Bold is for the few load-bearing phrases
per section; if everything is emphasized, nothing is, and heavy markup becomes
its own distraction ([ATG Publishing](https://atgpublishing.com/adhd-publishing/),
[Welcoming Web](https://welcomingweb.com/learn/designing-for-neurodiversity-adhd-ux)).

## What deliberately did NOT make it into the skill

- **Font/typography prescriptions** (Lexend, sans-serif, etc.): rendering is
  controlled by the reader's viewer (terminal, Obsidian, browser), not by a
  markdown summary. Out of scope.
- **Emoji as section markers**: some guidance suggests icons as visual anchors.
  Left optional — useful anchors for some readers, visual noise for others and
  unprofessional in some contexts. The skill lets the requester's context decide.
- **Sub-vocalization, story maps, timers**: real reader-side strategies, but a
  summary can't perform them for the reader. The skill's job is to make the
  *text* cheap to process.

## Source list

- https://bedrocklearning.org/literacy-blogs/improving-reading-comprehension-for-students-with-adhd/
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6966739/
- https://www.additudemag.com/reading-help-for-adhd-students/
- https://pridereadingprogram.com/adhd-and-reading-strategies-for-focus-and-comprehension/
- https://www.chapman.edu/faculty-staff/faculty/center-excellence-teaching-learning/reflect/reducing-cognitive-load-instructional-materials.aspx
- https://welcomingweb.com/learn/designing-for-neurodiversity-adhd-ux
- https://atgpublishing.com/adhd-publishing/
- https://en.wikipedia.org/wiki/BLUF_(communication)
- https://www.lexipol.com/resources/blog/bluf-your-way-to-better-business-writing/
- https://www.iubenda.com/en/help/184233-adhd-font-2/
- https://writingcenter.unc.edu/tips-and-tools/adhd-and-graduate-writing/
