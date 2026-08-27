# Plan 022: Vercel-identity lint for artifact pages and templates; re-format `plugins/DESIGN.md`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat c0ee11c..HEAD -- tools/check-plugins.sh plugins/DESIGN.md`
> Expected drift: plans 018/020 may have appended sections to `DESIGN.md`
> (artifact-meta, open-question banner) and 020 may have added its own lint
> to `check-plugins.sh` — both fine; this plan's lint is additive and its
> prettier step formats whatever `DESIGN.md` holds. STOP only if
> `check-plugins.sh` no longer has the `note()` helper / `fail` flag /
> final `if [ "$fail" -eq 0 ]` structure quoted below.

## At a glance

- **What**: Add a lint to `tools/check-plugins.sh` enforcing `plugins/DESIGN.md`'s rule against Vercel identity assets on artifact pages, and deliberately reflow the file to fix its unformatted state.
- **Why**: The rule is normative but currently unenforced, and the file already fails `prettier --check`, so the next unrelated commit would trigger a noisy whole-file reflow.
- **Next action**: Step 1 — Re-format `plugins/DESIGN.md`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (one additive lint section in a check script; one formatting-only file change)
- **Depends on**: none (independent of 017–021, 023)
- **Category**: dx
- **Planned at**: commit `c0ee11c`, 2026-08-27

## Why this matters

`plugins/DESIGN.md` §1 ("Tokens, not identity") is normative: the Vercel
wordmark, triangle, and brand assets MUST NOT appear on any artifact page —
the repo takes Geist's token values, not Vercel's identity. Plan 011
deferred the enforcement half: nothing checks it. This plan adds that lint
to the existing plugin gate. It also closes a reconcile finding from
2026-08-27: `plugins/DESIGN.md` fails `prettier --check` (plan 012's
feedback-widget snippet landed unformatted), so the next commit that
touches it will trigger a noisy whole-file reflow via lint-staged — better
to land the reflow deliberately and alone.

## Current state

All verified at commit `c0ee11c`, 2026-08-27.

- `plugins/DESIGN.md` (231 lines) — §1 (lines 7–13) reads:

  > Token values and structure come from Geist; the Vercel wordmark, triangle,
  > and brand assets are Vercel's identity and MUST NOT appear on any artifact
  > page … Plugins take the token values, not the identity.

  `bunx prettier --check plugins/DESIGN.md` → **fails** (`[warn]`). The diff
  is confined to §8's fenced `html`/`css`/`js` feedback-widget blocks
  (prettier reflows attributes one-per-line). The three templates that embed
  the same widget are already prettier-clean, so no byte-sync between them
  and DESIGN.md exists or breaks.

- `tools/check-plugins.sh` — the repo-wide gate (also exec'd by
  `plugins/diagrams/tools/check.sh` and `check-version-sync.sh`). Structure:
  `note() { printf '%-42s %s\n' "$1" "$2"; }`, a `fail=0` flag, a
  `for plugin in plugins/*` loop, then:

  ```bash
  if [ "$fail" -eq 0 ]; then
    echo "all checks passed"
  else
    echo "checks FAILED" >&2
  fi
  exit "$fail"
  ```

- Current violation count is **zero**: `grep -riE 'vercel|▲'` across
  `artifacts/**/*.html` and `plugins/*/skills/**` finds only
  `vercel.com/geist` documentation citations. The lint is preventive.
- `.prettierignore` covers `raw/` and (deliberately, with a comment)
  `plugins/diagrams/skills/diagram-plans/MERMAID.md`.
- 11 artifact pages exist under `artifacts/{diagrams,decisions,reviews}/`.
- Conventions: lint-staged runs `prettier --ignore-unknown --write` on every
  commit; `bash tools/check-plugins.sh` must end `all checks passed`.

## Commands you will need

| Purpose      | Command                                   | Expected on success         |
| ------------ | ----------------------------------------- | --------------------------- |
| Plugin gate  | `bash tools/check-plugins.sh`             | `all checks passed`, exit 0 |
| Format       | `bunx prettier --write plugins/DESIGN.md` | exit 0                      |
| Format check | `bunx prettier --check plugins/DESIGN.md` | exit 0                      |

## Scope

**In scope** (the only files you may modify):

- `tools/check-plugins.sh` (additive lint section)
- `plugins/DESIGN.md` (prettier formatting ONLY — zero content change)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch): plugin manifests and `marketplace.json`
(`tools/` is repo-level — no version bump), the templates, `artifacts/`,
`site/`, `wiki/`, `log.md`, `raw/`.

## Git workflow

- Branch: `advisor/022-vercel-identity-lint`
- Message style: `tools: <imperative>` / `docs: <imperative>`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Re-format `plugins/DESIGN.md`

Run `bunx prettier --write plugins/DESIGN.md`.

**Verify**: `bunx prettier --check plugins/DESIGN.md` → exit 0;
`git diff --stat plugins/DESIGN.md` → one file changed; and confirm the
diff is whitespace/reflow only:
`git diff -w plugins/DESIGN.md | grep -c '^[+-][^+-]'` → `0`.

### Step 2: Add the identity lint to `tools/check-plugins.sh`

Insert this block after the `for plugin in plugins/*; do … done` loop and
before the final `if [ "$fail" -eq 0 ]` block:

```bash
# Vercel identity lint (plugins/DESIGN.md, "Tokens, not identity"):
# artifact pages and skill templates must not carry Vercel's wordmark,
# triangle glyph, or brand references. vercel.com/geist doc citations are
# allowed. plugins/DESIGN.md itself (which names the ban) is not scanned.
note "identity" "checking"
identity_hits=0
while IFS= read -r f; do
  case "$f" in *.html | *.md) ;; *) continue ;; esac
  if grep -iE 'vercel|▲' "$f" | grep -qviF 'vercel.com/geist'; then
    note "  $f" "VERCEL IDENTITY MARK"
    identity_hits=1
    fail=1
  fi
done < <(git ls-files -co --exclude-standard -- 'artifacts/*.html' 'artifacts/**/*.html' 'plugins/*/skills/**')
if [ "$identity_hits" -eq 0 ]; then
  note "  artifacts + skill templates" "no identity marks"
fi
```

Notes for the executor: `git ls-files -co --exclude-standard` includes
untracked (but not ignored) files, so freshly generated artifact pages are
scanned before they are committed. Keep the block byte-for-byte unless a
STOP condition applies.

**Verify**: `bash -n tools/check-plugins.sh` → exit 0;
`bash tools/check-plugins.sh` → output contains
`no identity marks` and ends `all checks passed`, exit 0.

### Step 3: Probe the lint (seeded violation)

```bash
printf '<html><body>Deploy to Vercel ▲</body></html>\n' > artifacts/diagrams/tmp-identity-probe.html
bash tools/check-plugins.sh   # expect: "VERCEL IDENTITY MARK" line, "checks FAILED", exit 1
rm artifacts/diagrams/tmp-identity-probe.html
bash tools/check-plugins.sh   # expect: all checks passed, exit 0
```

**Verify**: both expectations above hold; `git status --porcelain` shows no
leftover probe file.

## Test plan

Step 3 is the behavioural test (fire and quiet). Step 1's `-w` diff count
is the no-content-change proof. No new test files.

## Done criteria

ALL must hold:

- [ ] `bunx prettier --check plugins/DESIGN.md` exits 0; `git diff -w` on it shows zero non-whitespace changes
- [ ] `tools/check-plugins.sh` contains the identity block; `bash -n` clean
- [ ] `bash tools/check-plugins.sh` → `no identity marks` + `all checks passed` on the clean tree
- [ ] Seeded probe makes the gate FAIL (exit 1) and is removed afterwards
- [ ] `git status --porcelain` shows only the three in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The lint FAILS on the clean tree: an identity mark (or a legitimate line
  the allowlist misses, e.g. a new "Vercel's Geist" citation) exists that
  this plan did not predict. Report the exact line; do not silently widen
  the allowlist.
- Step 1's `-w` diff count is non-zero (prettier changed content, not just
  whitespace — likely a prettier version change).
- `check-plugins.sh` no longer matches the structure quoted in Current
  state.

## Maintenance notes

- Plan 023 renames `--accents-*` tokens in the files this lint scans; the
  lint is name-agnostic and unaffected.
- Plan 014's four new templates land under `plugins/*/skills/**` and are
  scanned automatically — no lint change needed.
- If a future artifact legitimately needs the string "vercel" (e.g. a
  diagram _about_ Vercel), the allowlist in the block is the place to
  extend, with a comment citing the artifact.
