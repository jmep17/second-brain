---
title: Making Claude Write Memories Automatically
type: answer
created: 2026-08-25
updated: 2026-08-25
sources:
  [
    "https://code.claude.com/docs/en/memory.md",
    "https://code.claude.com/docs/en/settings-reference.md",
    "https://code.claude.com/docs/en/commands.md",
    "https://code.claude.com/docs/en/hooks.md",
    "https://code.claude.com/docs/en/sub-agents.md",
    "https://code.claude.com/docs/en/scheduled-tasks.md",
    "https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool",
    "/Users/jorden/.local/share/claude/versions/2.1.245",
    "/Users/jorden/.claude/settings.json",
    "/Users/jorden/.claude/projects/-Users-jorden-second-brain/memory/",
  ]
---

# Making Claude Write Memories Automatically

Question: what mechanisms make Claude record durable facts to memory files without being asked each time?

## Answer first

There is no single switch. Four layers, in descending order of how much they depend on the model's judgment:

| Layer | Mechanism                                                                                                            | Who decides                 | Deterministic? |
| ----- | -------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------- |
| 1     | **Auto memory** — Claude writes memory files mid-turn, driven by a Memory section injected into its system prompt    | Model                       | No             |
| 2     | **Memory extraction subagent** — a background fork re-reads the last N messages and writes what the main turn missed | Model (in a dedicated pass) | No             |
| 3     | **Auto-dream** — a periodic background consolidation pass over memory files + session logs                           | Model                       | No             |
| 4     | **Hooks** — shell commands the harness runs at fixed lifecycle events                                                | You (the script)            | **Yes**        |

Layers 1–3 ship on by default (subject to server-side feature flags, see below) and need no configuration. Layer 4 is the only one that writes a file regardless of what the model decides.

Related: [[claude-code-memory-plan-locations]] covers _where_ memory and plan files live and how to relocate them. This page covers _how writes get triggered_.

## Three different things — do not conflate

|                             | Written by                               | Loaded                                         | Location                               |
| --------------------------- | ---------------------------------------- | ---------------------------------------------- | -------------------------------------- |
| **CLAUDE.md**               | You                                      | Every session, in full (up to 4 MiB)           | Fixed set of paths                     |
| **Claude Code auto memory** | Claude                                   | `MEMORY.md` index only, first 200 lines / 25KB | `~/.claude/projects/<project>/memory/` |
| **API memory tool**         | Claude, via tool calls your app executes | Nothing automatic — Claude calls `view` first  | Wherever your handler puts it          |

- "Claude Code has two complementary memory systems… **CLAUDE.md files**: instructions you write… **Auto memory**: notes Claude writes itself based on your corrections and preferences" ([memory.md](https://code.claude.com/docs/en/memory.md))
- The API memory tool "operates client-side: Claude requests file operations, and your application executes them" ([memory-tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)). It is unrelated to Claude Code's auto memory.

---

## Layer 1 — Auto memory (the default)

### What it writes

One file per fact, plus an index.

```
~/.claude/projects/<project>/memory/
├── MEMORY.md           # Index, one line per memory, loaded into every session
├── user_role.md        # One memory
├── feedback_testing.md # One memory
```

([memory.md, Storage location](https://code.claude.com/docs/en/memory.md))

Each memory file's format, verbatim from the system prompt in the installed bundle (`/Users/jorden/.local/share/claude/versions/2.1.245`, byte ~232380637):

```markdown
---
name: <short-kebab-case-slug>
description: <one-line summary, used to decide relevance during recall>
metadata:
  type: user | feedback | project | reference
---

<the fact; for feedback/project, follow with **Why:** and **How to apply:** lines. Link related memories with [[their-name]].>
```

Claude Code also stamps a `modified` ISO 8601 timestamp into any memory file that already has frontmatter, from v2.1.214 on ([memory.md](https://code.claude.com/docs/en/memory.md)).

### Index rules

- The index entry format is `- [Title](file.md) — one-line hook`, "under ~150 characters", "no frontmatter", "Never put memory content there" (bundle, byte ~232380100).
- Only the first 200 lines or 25KB of `MEMORY.md` load at session start; over the limit, the write succeeds but Claude Code returns an error telling Claude to rewrite the index ([memory.md, How it works](https://code.claude.com/docs/en/memory.md)).
- Topic files are **not** loaded at startup. Claude reads them on demand ([memory.md](https://code.claude.com/docs/en/memory.md)).

### Turning it on/off

| Key                                 | Effect                                                                                                                  | Scope                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `autoMemoryEnabled` (bool)          | "When false, Claude will not read from or write to the auto-memory directory" (bundle settings schema, byte ~164580000) | Any settings file ([settings-reference.md](https://code.claude.com/docs/en/settings-reference.md)) |
| `autoMemoryDirectory` (string)      | Relocate the directory; absolute or `~/`                                                                                | Any settings file                                                                                  |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` | Env-var kill switch                                                                                                     | Process                                                                                            |

**On by default.** "Auto memory is on by default" ([memory.md, Enable or disable](https://code.claude.com/docs/en/memory.md)). The bundle's resolver agrees — it returns `true` when nothing is set (byte ~164580656):

```js
CLAUDE_CODE_DISABLE_AUTO_MEMORY; // explicit off/on wins
if (c.CLAUDE_CODE_SIMPLE) return !1;
if (
  c.CLAUDE_CODE_REMOTE &&
  !CLAUDE_CODE_REMOTE_MEMORY_DIR &&
  !CLAUDE_COWORK_MEMORY_PATH_OVERRIDE
)
  return !1;
let t = _e();
if (t.autoMemoryEnabled !== void 0) return t.autoMemoryEnabled;
return !0;
```

Toggle it interactively with `/memory` — "Edit `CLAUDE.md` files, enable or disable auto memory, and view auto memory entries" ([commands.md](https://code.claude.com/docs/en/commands.md)). The toggle writes `autoMemoryEnabled` to `~/.claude/settings.json` (bundle, byte ~323389948: `Ve("userSettings",{autoMemoryEnabled:e},...)`).

### What makes Claude decide to write

A `# Memory` section is injected into the system prompt whenever auto memory is on. Verbatim excerpts from the bundle (bytes ~233355000–233370000):

**Four types**, each with its own `<when_to_save>`:

- `user` — role, expertise, working preferences.
- `feedback` — "Any time the user corrects your approach ("no not that", "don't", "stop doing X") OR confirms a non-obvious approach worked ("yes exactly", "perfect, keep doing that", accepting an unusual choice without pushback). Corrections are easy to notice; confirmations are quieter — watch for them."
- `project` — "When you learn who is doing what, why, or by when… Always convert relative dates in user messages to absolute dates when saving."
- `reference` — "When you learn about resources in external systems and their purpose."

**What NOT to save in memory** (verbatim list):

- Code patterns, conventions, architecture, file paths, or project structure — these can be derived by reading the current project state.
- Git history, recent changes, or who-changed-what — `git log` / `git blame` are authoritative.
- Debugging solutions or fix recipes — the fix is in the code; the commit message has the context.
- Anything already documented in CLAUDE.md files.
- Ephemeral task details: in-progress work, temporary state, current conversation context.

And, importantly for anyone trying to force writes: **"These exclusions apply even when the user explicitly asks you to save. If they ask you to save a PR list or activity summary, ask what was _surprising_ or _non-obvious_ about it — that is the part worth keeping."**

The prompt also states the standing rule: **"If the user explicitly asks you to remember something, save it immediately as whichever type fits best. If they ask you to forget something, find and remove the relevant entry."**

The docs summarize the same behaviour: "Claude doesn't save something every session. It decides what's worth remembering based on whether the information would be useful in a future conversation" ([memory.md, Auto memory](https://code.claude.com/docs/en/memory.md)).

---

## Layer 2 — The memory extraction subagent

Not documented on the docs site. Found in the bundle at bytes ~211665000–211672000.

A background fork (`querySource: "extract_memories"`, `forkLabel: "extract_memories"`, `maxTurns: 5`, `skipTranscript: true`) that runs during the session and writes memory files the main turn didn't.

Its prompt opens: **"You are now acting as the memory extraction subagent. Analyze the most recent ~${e} messages above and use them to update your persistent memory systems."** It reuses the same criteria: "Apply the memory types, scope guidance, what-not-to-save criteria, and frontmatter format from the Memory section of your system prompt."

Its tools are locked down: Read/Grep/Glob, read-only shell, and `Write`/`Edit` **only inside the memory directory**. "All other tools — MCP, Agent, write-capable Bash, etc — will be denied."

**When it fires** (from `l(u,d)` and `a({...})`, byte ~211671000):

- Never inside a subagent (`if (u.toolUseContext.agentId) return`).
- Gated on server-side feature flag `tengu_passport_quail`, which defaults to **false** in code (`Me("tengu_passport_quail", !1)`).
- **Skipped if the conversation already wrote to memory files** this turn — log line: `[extractMemories] skipping — conversation already wrote to memory files`.
- **Skipped if there is no new user prose** since the last extraction — `[extractMemories] skipping — no user prose since last extraction`.
- Runs every N turns, where N comes from flag `tengu_bramble_lintel` and defaults to `1` (i.e. every turn).
- Coalesces: if one is already running, the newer context is stashed and a trailing run happens after.
- A `drainer` with a 60s default timeout flushes in-flight extractions.

Practical consequence: **the single biggest lever on whether memories get written automatically is whether you say something in prose.** No user prose, no extraction pass.

---

## Layer 3 — Auto-dream (background consolidation)

Also undocumented on the docs site. Bundle, bytes ~211670311 (prompt) and ~211681000 (scheduler).

A periodic reflective pass whose prompt begins: **"# Dream: Memory Consolidation — You are performing a dream — a reflective pass over your memory files. Synthesize what you've learned recently into durable, well-organized memories so that future sessions can orient quickly."**

Four phases: Orient (`ls` the memory dir, skim topic files, `ls -R logs/`) → Gather recent signal (session logs at `logs/YYYY/MM/DD/<id>-<title>.md`, then narrow greps of the JSONL transcripts) → Consolidate → Prune and index.

It also reconciles memory against CLAUDE.md, with an explicit rule: **"do NOT edit CLAUDE.md during a dream. Annotate the memory with 'contradicts CLAUDE.md — verify which is current' and list it in your summary so the user can update CLAUDE.md."**

**Gating and scheduling** (`OZo` / `$Zo` / `Jyl`, byte ~211681400):

- Feature flag `tengu_onyx_plover` must report `enabled` or `available`; it defaults to `null` (off).
- Setting **`autoDreamEnabled`** (bool) overrides the flag. Toggled from `/memory` — the UI row reads `Auto-dream: on/off`, and shows `Auto-dream: off while auto-memory is off` when auto memory is disabled (bundle, byte ~323390400).
- Two thresholds from the flag payload: `minHours` since last consolidation, and `minSessions` touched since then. Skips with `[autoDream] skip — N sessions since last consolidation, need M`.
- A `.consolidate-lock` file in the memory directory with a 1-hour TTL (`Z6n = 3600000`) prevents two machines/processes dreaming at once: `[autoDream] lock held by live PID N`.
- Runs as `querySource: "auto_dream"`, a `dream`-typed background task, same read-only-plus-memory-dir tool restrictions.
- On completion it queues a `pendingMemoryUpdates` entry: `consolidated N memory files`.

**`autoDreamEnabled` is absent from the published settings reference** — see Contradictions.

---

## Manual triggers

### `#` prefix — verified in the bundle, undocumented

Typing `#` at the prompt sends the rest of the line wrapped in a `<user-memory-input>` tag (bundle, byte ~85508049, listed alongside `<bash-input>` and `<local-command-stdout>`). The TUI renders a `#` badge in the `remember` colour on a `memoryBackgroundColor` background and prints one of `"Got it."`, `"Good to know."`, `"Noted."` (byte ~107884814 and ~105931900).

Syntax: `# always use pnpm, not npm`

Neither `memory.md` nor `commands.md` mentions the `#` prefix. Which file it lands in (auto memory vs CLAUDE.md) is **unverified** — see below.

### Plain prose

The documented path: "When you ask Claude to remember something, like 'always use pnpm, not npm' or 'remember that the API tests require a local Redis instance,' Claude saves it to auto memory. To add instructions to CLAUDE.md instead, ask Claude directly, like 'add this to CLAUDE.md'" ([memory.md, View and edit with /memory](https://code.claude.com/docs/en/memory.md)).

### `/memory`

Browse, open, and toggle. Does not itself write a memory ([commands.md](https://code.claude.com/docs/en/commands.md)).

### `/remember` — does not exist in Claude Code v2.1.245

Two strings in the bundle reference it:

- An analytics field description: `'Optional identifier for the source of this question (e.g. "remember" for /remember command). Used for analytics tracking.'` (byte ~212008456)
- The dream prompt: "Do not promote personal memories into `team/` during a dream — that's a deliberate choice the user makes via `/remember`" (byte ~211671200)

But there is **no command registration** for it: `grep -abo 'name:"remember"'` over the bundle returns zero hits. Every other `"remember"` occurrence is a TUI theme colour name (`color:"remember"`) or a Coq tactic keyword in a syntax-highlighting list. `/remember` is not in the published commands reference either. Conclusion: `/remember` exists in some other Claude surface (likely the desktop app / Cowork team-memory flow), **not** in the Claude Code CLI. Treat any advice telling you to run `/remember` in Claude Code as wrong for this version.

---

## Tuning the model-judgment layers

You cannot edit the injected Memory section, but you can bias it.

- **CLAUDE.md** — works, with a catch. The Memory prompt explicitly excludes "Anything already documented in CLAUDE.md files" from being saved. So a CLAUDE.md instruction like "save X to memory" competes with a system-prompt instruction not to duplicate CLAUDE.md. CLAUDE.md is also "delivered as a user message after the system prompt, not as part of the system prompt itself… there's no guarantee of strict compliance" ([memory.md, Troubleshoot](https://code.claude.com/docs/en/memory.md)).
- **`--append-system-prompt`** — closer to the right altitude. "For instructions you want at the system prompt level, use `--append-system-prompt`. This must be passed every invocation, so it's better suited to scripts and automation than interactive use" ([memory.md](https://code.claude.com/docs/en/memory.md)).
- **Managed `claudeMd`** — organization-wide instruction injection, honored only in managed/policy settings ([memory.md, Deploy organization-wide CLAUDE.md](https://code.claude.com/docs/en/memory.md)).
- **Skills** — load on demand, so a "how to record a decision" skill costs nothing until invoked. Doesn't fire on its own reliably.
- **Subagent memory** — the `memory:` frontmatter field on a subagent (`user` | `project` | `local`) gives it its own directory at `~/.claude/agent-memory/<name>/`, `.claude/agent-memory/<name>/`, or `.claude/agent-memory-local/<name>/`. "If you omit the `memory` field, the subagent launches without persistent memory." It is part of auto memory: turning auto memory off makes the field a no-op ([sub-agents.md](https://code.claude.com/docs/en/sub-agents.md)).

None of these make a write _happen_. They change what the model considers worth saving.

---

## Deterministic approaches (harness-enforced)

The docs state the principle plainly: "Both are loaded at the start of every conversation. Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead" ([memory.md](https://code.claude.com/docs/en/memory.md)). And: "If the instruction is something that must run at a specific point, such as before every commit or after each file edit, write it as a hook instead. Hooks execute as shell commands at fixed lifecycle events and apply regardless of what Claude decides."

### Hooks

Relevant events and what they can do ([hooks.md](https://code.claude.com/docs/en/hooks.md)):

| Event              | Fires                                                | Can block                                                         | Can inject context                                                              |
| ------------------ | ---------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `Stop`             | When Claude finishes responding                      | Yes — "Prevents Claude from stopping, continues the conversation" | Yes — `hookSpecificOutput.additionalContext`; receives `last_assistant_message` |
| `SessionEnd`       | When a session terminates                            | No — stderr shown to user only                                    | No — terminal event                                                             |
| `PreCompact`       | Before context compaction                            | Yes — blocks compaction                                           | No `additionalContext` documented                                               |
| `SubagentStop`     | When a subagent finishes                             | —                                                                 | —                                                                               |
| `UserPromptSubmit` | When you submit a prompt, before Claude processes it | —                                                                 | —                                                                               |

Two genuinely different things a hook can do:

1. **Write the file itself.** A `Stop` or `SessionEnd` hook is just a shell command. It can append to `MEMORY.md` or drop a topic file with no model involvement. Fully deterministic — and correspondingly dumb: a script cannot decide what was surprising in the conversation.
2. **Force another turn.** A `Stop` hook that blocks continues the conversation with a reason. That is the strongest available nudge: the harness guarantees Claude gets asked again; Claude still decides what (or whether) to write. Guard against a loop — the hook must detect that it already fired.

`SessionEnd` cannot do (2) at all: it's terminal and cannot inject context. Use `Stop`, not `SessionEnd`, if you want the model to act.

### `/loop` and cron

`/loop` runs a prompt on a repeating schedule while the session stays open ([scheduled-tasks.md](https://code.claude.com/docs/en/scheduled-tasks.md)). Constraints that matter here:

- "Tasks only fire while Claude Code is running and idle."
- Recurring tasks expire after 7 days.
- Minimum interval 1 minute; jitter of up to 30 minutes on recurring tasks.
- Session-scoped: "Starting a fresh conversation clears all session-scoped tasks."

`/loop 2h write anything durable from this session to memory` is a real option, but it is still a _prompt_ — the model decides. It fires the turn; it does not force the write.

Cloud Routines have "No (fresh clone)" access to local files, so they cannot touch a machine-local auto memory directory. Desktop scheduled tasks do have local file access.

### Ranking

| Approach                              | Forces a write?            | Failure mode                                                                                         |
| ------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Hook that writes the file             | Yes                        | Records noise; no judgment about what's worth keeping; duplicates                                    |
| Hook that blocks `Stop` with a reason | Forces a turn, not a write | Loop risk; model may reply "nothing to save"; latency on every turn                                  |
| `/loop` prompt                        | No                         | Only fires while session is open and idle; 7-day expiry; still model judgment                        |
| CLAUDE.md instruction                 | No                         | Competes with the "don't duplicate CLAUDE.md" exclusion; delivered as a user message, weak adherence |
| Auto memory as shipped                | No                         | Silent — Claude may simply judge nothing worth saving; gated by feature flags you can't see          |

---

## Current state for this machine

- `~/.claude/settings.json` (read 2026-08-25) contains **no** `autoMemoryEnabled`, `autoMemoryDirectory`, or `autoDreamEnabled` key. So auto memory is on at its default and writes to the default location; auto-dream falls through to whatever `tengu_onyx_plover` says.
- No `.claude/settings.json` or `settings.local.json` exists in `/Users/jorden/second-brain/` — only `commands/` and `worktrees/`.
- `/Users/jorden/.claude/projects/-Users-jorden-second-brain/memory/` exists but is **empty** (created 25 Aug 11:37). Thirteen other projects have a `memory/` directory too.
- Existing hooks are `SessionStart` (×4 matchers) and `PreCompact` — none of them touch memory. No `Stop` or `SessionEnd` hook.

So: auto memory is enabled and has written nothing for this repo yet. That is consistent with "Claude doesn't save something every session" plus the possibility that the extraction flag is off.

---

## Contradictions between bundle and docs

1. **`autoDreamEnabled` is missing from the docs.** The bundle defines it in the settings schema (byte ~260873074), exposes it in the `/memory` UI, and gates a whole background consolidation agent on it. The published settings reference lists `autoMemoryEnabled`, `autoMemoryDirectory`, `claudeMd`, and `claudeMdExcludes` under "Memory and context" but has **no** `autoDreamEnabled` row ([settings-reference.md](https://code.claude.com/docs/en/settings-reference.md)). The feature appears to be flag-gated and pre-announcement. Do not depend on it.

2. **The `#` prefix is undocumented.** It exists in the bundle as a first-class input tag with dedicated UI, but appears in neither `memory.md` nor `commands.md`.

3. **The extraction subagent is undocumented.** `memory.md` says only "Claude reads and writes memory files during your session. When you see messages like 'Saved 2 memories'…". It does not mention that a separate forked agent does part of that work, nor that the pass is skipped when there is no new user prose.

4. **`/remember` is referenced by the bundle but not implemented in it.** See above. Carried over from another Claude surface.

5. **`autoMemoryDirectory` project-scope description is stale** — the bundle's schema string says "Ignored if set in projectSettings… for security" while the docs and the bundle's own resolver honor project settings under the workspace-trust rule. Already recorded on [[claude-code-memory-plan-locations]]; not re-litigated here.

---

## The API memory tool (secondary)

Different product surface. One short section.

- Tool entry: `{"type": "memory_20250818", "name": "memory"}` — "the entire configuration: the `name` must be `memory`, and you don't define an input schema."
- Client-side: "Claude requests file operations, and your application executes them. You control where and how the data is stored."
- Commands your handler must implement: `view`, `create`, `str_replace`, `insert`, `delete`, `rename`.
- **The automatic behaviour is server-injected.** "When the memory tool is present in your request's `tools`, the API automatically adds this instruction to the system prompt. You don't need to send it yourself:"

  ```text
  IMPORTANT: ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE.
  MEMORY PROTOCOL:
  1. Use the `view` command of your `memory` tool to check for earlier progress.
  2. ... (work on the task) ...
     - As you make progress, record status / progress / thoughts etc in your memory.
  ASSUME INTERRUPTION: Your context window might be reset at any moment, so you risk losing any progress that is not recorded in your memory directory.
  ```

- You can bias it further: "You can also guide what Claude writes to memory. For example: 'Only write down information relevant to \<topic> in your memory system.'"
- Recommended pattern for multi-session work: an initializer session that sets up a progress log and feature checklist, then an end-of-session update before each session ends.

All quotes: [memory-tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool).

Note the structural difference: the API tool's automatic write behaviour is driven by an **injected system prompt you can read and extend**. Claude Code's is driven by a system prompt you cannot see or modify without `--append-system-prompt`.

---

## Practical recipe

If the goal is "Claude reliably records durable facts without me asking":

1. **Leave auto memory on.** It is the intended path and needs nothing.
2. **Talk in prose.** The extraction pass is skipped entirely when there's no new user prose since the last run (bundle, byte ~211671000). Terse tool-only turns produce nothing.
3. **Say "remember that…" when it matters.** The standing system-prompt rule is "save it immediately" — but note the exclusion list still applies.
4. **Do not put memory instructions in CLAUDE.md** expecting them to increase writes. The prompt explicitly excludes CLAUDE.md-documented content from memory.
5. **If you need a guarantee, use a `Stop` hook.** Either write the file yourself (deterministic, dumb) or block once per session with a reason (forces a turn, model still judges). `SessionEnd` cannot do the second.
6. **Check `/memory` periodically** to see what actually landed.

---

## Unverified / open questions

- **Where `#`-prefixed input lands.** The `<user-memory-input>` tag and its UI are verified in the bundle, but I did not trace the handler to a destination file. It may append to CLAUDE.md (the historical behaviour in older Claude Code versions) or write an auto-memory file. Untested.
- **Whether `tengu_passport_quail` (extraction) and `tengu_onyx_plover` (dream) are currently on for this account.** Both default to off in code and are fetched from a server-side flag service at runtime. No local cache of flag values was found under `~/.claude/`. Not determinable from disk.
- **The exact `minHours` / `minSessions` defaults for auto-dream.** The code reads them from the flag payload with a fallback constant `l3n` that I did not resolve. Unverified.
- **Whether a `Stop` hook can reliably force a memory write in practice.** The mechanism is documented (block + reason continues the conversation), but I did not build and run one. Untested.
- **Whether `MEMORY.md`'s absence for this repo means the extraction agent has never fired, or has fired and judged nothing worth saving.** Both are consistent with an empty directory. Distinguishing them needs the debug log (`[extractMemories]` lines), not the filesystem.
- **The `Gt` / `jt` / `Gn` prompt fragments** referenced in the Memory section builder (bundle, byte ~232380637) were not all resolved; the quoted excerpts above are the ones I read directly. Other guidance may exist in the injected section that this page does not cover.
