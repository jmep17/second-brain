---
title: Claude Code Memory and Plan File Locations
type: answer
created: 2026-08-25
updated: 2026-08-25
sources:
  [
    "https://code.claude.com/docs/en/memory.md",
    "https://code.claude.com/docs/en/settings-reference.md",
    "https://code.claude.com/docs/en/settings.md",
    "https://code.claude.com/docs/en/sessions.md",
    "https://code.claude.com/docs/en/permissions.md",
    "/Users/jorden/.local/share/claude/versions/2.1.245",
    "plans/README.md",
  ]
---

# Claude Code Memory and Plan File Locations

Question: can Claude Code's auto-memory files and plan-mode plan files be redirected into the `second-brain` repo?

Answer: yes for both, via two documented settings keys — `autoMemoryDirectory` and `plansDirectory`. They behave differently, and the plans key has a constraint that matters here.

Claims below are backed either by the official docs or by strings and code in the installed CLI bundle at `/Users/jorden/.local/share/claude/versions/2.1.245` (Claude Code v2.1.245, a single-file Bun binary; quoted strings come from `grep -a` over it).

## Two different memory systems

Do not confuse them ([memory docs](https://code.claude.com/docs/en/memory.md#claude-md-vs-auto-memory)):

- **CLAUDE.md files** — written by the human, loaded every session. Locations are fixed (`~/.claude/CLAUDE.md`, `./CLAUDE.md`, `./.claude/CLAUDE.md`, `./CLAUDE.local.md`). Not relocatable, but content can be pulled in from anywhere with `@path` imports.
- **Auto memory** — written by Claude (`MEMORY.md` index plus one file per fact). This is the thing with a configurable directory.

## Auto memory

### Default location

`~/.claude/projects/<project>/memory/`. The `<project>` segment is derived from the git repository, so "all worktrees and subdirectories within the same repo share one auto memory directory" ([memory docs, Storage location](https://code.claude.com/docs/en/memory.md#storage-location)). Auto memory is machine-local and is excluded from the `cleanupPeriodDays` retention sweep.

### `autoMemoryDirectory`

Documented and first-class:

> To store auto memory in a different location, set `autoMemoryDirectory` in your `settings.json`. It is read from any settings scope: user, project, local, policy, or `--settings`.
> The value must be an absolute path or start with `~/`.
> ([memory docs](https://code.claude.com/docs/en/memory.md#storage-location))

Constraint on project-scoped use, from the same section:

> When you set it in a project's `.claude/settings.json` or `.claude/settings.local.json`, Claude Code honors it under the same [workspace trust rule as hooks in settings files](https://code.claude.com/docs/en/permissions#what-runs-before-you-trust-a-folder).

The bundle's resolution order matches — policy, then `--settings` flag, then (only if the workspace is trusted) local settings, then project settings, then user settings:

```js
K("policySettings")?.autoMemoryDirectory ??
  K("flagSettings")?.autoMemoryDirectory ??
  (e
    ? (K("localSettings")?.autoMemoryDirectory ??
      K("projectSettings")?.autoMemoryDirectory)
    : void 0) ??
  K("userSettings")?.autoMemoryDirectory;
```

Note one contradiction: the bundle's JSON-schema description for the key still says "Ignored if set in projectSettings (checked-in `.claude/settings.json`) for security", while the docs and the code above say project settings are honored once the workspace is trusted. The code is newer than that description string. **To avoid depending on which is right, put the key in `.claude/settings.local.json` or `~/.claude/settings.json`.**

Related: `autoMemoryEnabled` (bool) turns auto memory off per project; `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` disables it by env var ([memory docs](https://code.claude.com/docs/en/memory.md#enable-or-disable-auto-memory)).

### Env-var alternative

`CLAUDE_CODE_PROJECT_DIR_NAME`, set beside `CLAUDE_CONFIG_DIR`, forces the `<project>` directory name:

> If you set `CLAUDE_CODE_PROJECT_DIR_NAME` beside `CLAUDE_CONFIG_DIR`, Claude Code uses that name as the `<project>` directory under `<config dir>/projects/` instead, whichever repository you launch it in, so projects launched with that config directory share one auto memory directory. Requires Claude Code v2.1.234 or later.
> ([memory docs](https://code.claude.com/docs/en/memory.md#storage-location))

Both names exist in the installed bundle. This moves _all_ session state (transcripts, projects tree), not just memory — heavier than `autoMemoryDirectory`, and it pools memory across unrelated repos. Only worth it if the goal is one shared memory across every project.

## Plan files

### Default location and the project-root constraint

The settings reference lists the key with no detail — "Choose where plan mode writes plan files", scope: any settings file ([settings reference](https://code.claude.com/docs/en/settings-reference.md)). The behavior is only spelled out inside the bundle:

> `plansDirectory`: "Custom directory for plan files, relative to project root. If not set, defaults to `~/.claude/plans/`"

and the resolver rejects anything outside the project root, falling back to the default:

```js
#n(){ let n = ce().plansDirectory;
      if (n) { let t = ie(), r = pe(t, n);
               if (qe(r, t)) return r;
               a(`plansDirectory must be within project root: ${n}`, {level:"error"}) }
      return x() }
```

So:

- The path is resolved **relative to the project root**, not the home directory.
- A path that lands outside the project root is **rejected** — it logs `plansDirectory must be within project root` and silently uses the default.
- An absolute or `~/`-prefixed path only works if it happens to resolve inside the project root.

This is the one place the earlier draft of this page was wrong: `"plansDirectory": "~/second-brain/plans"` works only when the project root _is_ `~/second-brain`. Launched from a worktree under `.claude/worktrees/<name>/`, the project root is the worktree, so that value is rejected and plans go back to `~/.claude/plans/`.

### Worktree caveat

Auto memory keys off the git repository, so worktrees share memory. Plans key off the project root, so **each worktree gets its own plans directory**. There is no setting that points plan files at the main checkout from inside a worktree — the within-root check forbids it. _(Verified from the code above; not stated in the docs.)_

### Name collision in this repo

`plans/` in this repo already holds hand-authored implementation plans from the `improve` skill, with a status table in `plans/README.md`. Plan-mode files written by Claude Code are a different artifact and would land in the same folder if `plansDirectory` is set to `plans`. Use a subdirectory (`plans/plan-mode`) to keep them apart.

## What is not configurable

- CLAUDE.md file locations — fixed set of paths ([memory docs](https://code.claude.com/docs/en/memory.md#choose-where-to-put-claude-md-files)). Use `@path` imports to pull content in from `second-brain` instead.
- Pointing a worktree's plans at the main checkout (see above).

## Workarounds (not needed, listed for completeness)

- **Symlink** `~/.claude/projects/<project>/memory` at a directory in the repo. Works in principle, but breaks whenever the project path changes, and `autoMemoryDirectory` does the same job supported. _(Unverified — not tested.)_
- **Hooks** (`SessionStart`/`SessionEnd`) that copy memory files into the repo. Adds a sync problem and races between parallel sessions. Not recommended.
- **`@` imports in CLAUDE.md** — genuinely useful, but they import instructions into context; they do not move the auto-memory directory.

## Recommendation

Two settings, both in files that are not checked in.

**1. Memory** — into `~/.claude/settings.json` (applies everywhere, including every `second-brain` worktree, which is what you want since worktrees share memory anyway):

```json
{
  "autoMemoryDirectory": "~/second-brain/memory"
}
```

Using the user-scope file sidesteps the trust rule and the stale "ignored in projectSettings" description. Downside: every project's memory then pools into `second-brain/memory`. If memory should stay per-repo and only `second-brain` should be redirected, put the same key in `~/second-brain/.claude/settings.local.json` instead (gitignore it) and accept the workspace-trust dependency.

Decide whether `memory/` gets committed. Committing it makes the notes part of the wiki repo and syncs them across machines — auto memory is otherwise machine-local. It also means Claude's self-written notes land in git history without review.

**2. Plans** — into `~/second-brain/.claude/settings.local.json`:

```json
{
  "plansDirectory": "plans/plan-mode"
}
```

Relative, inside the project root, and out of the way of the existing `plans/` convention. Repeat it per worktree if plan mode is used from worktrees — a worktree cannot write plans to the main checkout.

**3. Verify** — start a session, run `/memory` and pick "open the auto memory folder" to confirm the path; enter plan mode once and check that the file lands under `plans/plan-mode/`. If plans still appear in `~/.claude/plans/`, the path failed the within-root check.
