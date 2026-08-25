# Research: keeping personal content off the work Mac while it stays in the same git repo

Ticket: [02-work-exclusions](../issues/02-work-exclusions.md). Date: 2026-08-25.
Versions checked: git 2.55.0 (`git --version`, local). chezmoi not installed locally (`which chezmoi` empty); chezmoi claims are from chezmoi.io docs. Builds on [01-dotfiles-tool.md](01-dotfiles-tool.md) and `wiki/dotfiles-management.md`.
Remote: `https://github.com/jmep17/second-brain.git`, private (`gh api repos/jmep17/second-brain --jq .private` returns `true`).

User's two asks, restated:

1. Personal notes (`wiki/`, `raw/`, Claude auto-memory) must not be on the work disk, but must still be backed up in git.
2. Work machine pulls the repo (for dotfiles) and never pushes anything back.

## Summary

- **Sparse checkout alone does not keep personal content off the work disk.** It only empties the working tree; every blob is still fetched into `.git`. Verified: cone-mode clone with only `dotfiles/` checked out still had all 9 objects locally (`git count-objects`), and `git ls-files` still listed `wiki/personal.md`. Source: [git-sparse-checkout](https://git-scm.com/docs/git-sparse-checkout) ("change the working tree from having all tracked files present to only having a subset"; internals: "uses the skip-worktree bit ... Git will avoid populating the contents of those files").
- **Cone mode can exclude a top-level directory** — by listing only the directories you want. `git sparse-checkout set --cone dotfiles` produced a tree with `README.md` + `dotfiles/` and no `wiki/`, `raw/`. Cone mode is directory-only; per-file exclusion needs deprecated non-cone mode (`set --no-cone '/*' '!/wiki/' '!/raw/'`, also verified). Source: [git-sparse-checkout](https://git-scm.com/docs/git-sparse-checkout) ("In cone mode, only directories are accepted"; "non-cone mode is deprecated").
- **Partial clone + sparse checkout gets personal blobs off the work disk, but only lazily and only until any command touches them.** Verified with `--filter=blob:none`: 2 blobs missing after checkout; `git log -p -- wiki/personal.md` and `git grep p main -- wiki` each silently fetched one. Git docs: blobs "can later be 'demand fetched' if/when needed"; requires being online. This is a performance feature, not an access control ([partial-clone](https://git-scm.com/docs/partial-clone)). GitHub supports `blob:none` ([GitHub blog](https://github.blog/open-source/git/get-up-to-speed-with-partial-clone-and-shallow-clone/)).
- **The only mechanism that truly keeps content off disk is a separate repository**: a private `notes` repo referenced as a git submodule (left uninitialised on work) or pulled by chezmoi `.chezmoiexternal` only on the personal host. Verified: cloning a superproject with an un-initialised submodule left no `notes/` files, no `.git/modules`, and no object containing the note text.
- **Pull-only work machine**: server-side enforcement = a read-only deploy key or a fine-grained PAT with `Contents: Read-only` scoped to this one repo. Client-side belt-and-braces = `git remote set-url --push origin no_push` (verified: push fails with `'no_push' does not appear to be a git repository`). Branch protection on a private personal repo needs GitHub Pro ([GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)).
- **Encryption (git-crypt / transcrypt / chezmoi `encrypted_`)** leaves ciphertext on the work disk and leaks file names and sizes; it does not meet "off disk". Useful only as a secondary layer.
- **Claude auto-memory is not in the repo** — it lives at `~/.claude/projects/<project>/memory/` and is "machine-local ... not shared across machines" ([Claude Code memory docs](https://code.claude.com/docs/en/memory)). Backing it up means either `autoMemoryDirectory` pointing into the personal notes repo, or disabling it on work (`autoMemoryEnabled: false` / `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`).

## Content classes (answer to the ticket's map question)

| Class              | Example paths                                                        | Personal Mac                       | Work Mac                    | Granularity                                                    |
| ------------------ | -------------------------------------------------------------------- | ---------------------------------- | --------------------------- | -------------------------------------------------------------- |
| Personal notes     | `wiki/`, `raw/`, `log.md`, `site/` (renders wiki)                    | in                                 | **out, off disk**           | directory                                                      |
| Dotfiles           | `dotfiles/` (zsh, fish, nvim, tmux, ghostty, git, gh, Claude config) | in                                 | in                          | directory, with per-file templating inside via chezmoi         |
| Work-only config   | proxies, work git identity/email                                     | out                                | in                          | per-file via `.chezmoiignore` / templates (not a git boundary) |
| Secrets            | SSH keys, tokens                                                     | never in git                       | never in git                | n/a (password manager / `encrypted_`)                          |
| Claude auto-memory | `~/.claude/projects/<project>/memory/`                               | in (if redirected into notes repo) | out                         | directory; outside repo by default                             |
| Repo scaffolding   | `CLAUDE.md`, `docs/`, `.scratch/`, `plans/`                          | in                                 | in unless moved under notes | per-file today; decide per ticket                              |

The clean split is a directory boundary. Anything that must be per-file on work (identity, proxies) is a chezmoi template/ignore concern, not a "keep off disk" concern.

## Part 1 — keeping personal content off the work disk

### A. git sparse-checkout (cone mode)

- Commands (work machine):
  ```sh
  git clone --no-checkout git@github.com:jmep17/second-brain.git ~/second-brain
  cd ~/second-brain
  git sparse-checkout set --cone dotfiles     # top-level files + dotfiles/ only
  git checkout main
  ```
  Or in one go: `git clone --sparse ...` then `git sparse-checkout add dotfiles` ("`--sparse`: Employ a sparse-checkout, with only files in the toplevel directory initially being present", `git help clone`).
- Verified result: working tree = `README.md`, `dotfiles/zshrc`; `wiki/`, `raw/` absent from the tree. But `git ls-files` still lists them and `git count-objects` shows all blobs local (test repo: 9/9 objects).
- Exclusion granularity: directory only in cone mode ("only directories are accepted"). Top-level files are always included ("cone mode always includes files at the toplevel", pattern `/*` + `!/*/`). So `log.md` at the root would land on work unless moved into a directory.
- Non-cone mode allows negative per-file patterns (`git sparse-checkout set --no-cone '/*' '!/wiki/' '!/raw/'` verified) but the man page says "non-cone mode is deprecated. Please switch to using cone mode." The whole command is marked "THIS COMMAND IS EXPERIMENTAL".
- Cost: zero extra infrastructure.
- Risk: **fails the requirement.** Every personal page is readable on the work disk via `git show main:wiki/x.md`, `git log -p`, `git grep`, backups, forensics.

### B. Partial clone (`--filter=blob:none`) + sparse checkout

- Commands:
  ```sh
  git clone --filter=blob:none --no-checkout git@github.com:jmep17/second-brain.git ~/second-brain
  cd ~/second-brain
  git sparse-checkout set --cone dotfiles
  git checkout main
  ```
- Verified: after checkout, `git rev-list --objects --all --missing=print` listed the two `wiki/`/`raw/` blobs as missing (`?<oid>`), so the content is not on disk at that moment. Trees and commits are still downloaded ("only blobs are filtered"; [partial-clone](https://git-scm.com/docs/partial-clone)). Server must advertise the `filter` capability; GitHub does ("git clone --filter=blob:none", [GitHub blog](https://github.blog/open-source/git/get-up-to-speed-with-partial-clone-and-shallow-clone/)).
- Verified leak: `git log -p -- wiki/personal.md` fetched the blob (missing count 2 -> 1); `git grep p main -- wiki` fetched the other (-> 0 for that path). Git docs: "a fallback mechanism is added to allow Git to attempt to dynamically fetch missing objects from promisor remotes" ([partial-clone](https://git-scm.com/docs/partial-clone)). Any tool that walks history (an IDE, `git blame`, a wiki search across refs) pulls personal content in.
- Also note: file names, directory structure, and commit messages are always present (trees/commits are not filtered).
- Cost: same as A.
- Risk: "off disk by default, on disk on first accident." Acceptable only if the threat model is "casual" not "must not exist".

### C. Separate private repo, wired in as a git submodule

- Layout: `jmep17/second-brain` (dotfiles + scaffolding) + `jmep17/notes` (private; `wiki/`, `raw/`, `log.md`, optional Claude memory). Superproject records a gitlink:
  ```sh
  # personal Mac, once
  git submodule add git@github.com:jmep17/notes.git notes
  git commit -m "notes as submodule"
  # personal Mac, daily
  git -C notes add -A && git -C notes commit -m ... && git -C notes push
  git add notes && git commit -m "bump notes" && git push   # optional pin
  # work Mac
  git clone git@github.com:jmep17/second-brain.git          # do NOT --recurse-submodules
  ```
- Docs: a fresh clone leaves submodule directories "uninitialized and empty"; population needs `git clone --recurse-submodules` or `git submodule update --init`; content is stored separately in `.git/modules` ([git-submodule](https://git-scm.com/docs/git-submodule)).
- Verified: work-style clone had an empty `notes/` (0 entries), no `.git/modules`, and no superproject object containing the note text. Only the commit SHA and the URL in `.gitmodules` are visible.
- Server side: the work machine's credential (deploy key / PAT, Part 2) is scoped to `second-brain` only, so even `git submodule update --init` on work fails to fetch `notes`. Deploy keys "only grant access to a single repository" ([deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)).
- Granularity: directory (the submodule path). Per-file inside is not possible; move personal root files (`log.md`) into the submodule.
- Cost: two repos, two pushes, the well-known submodule pin dance. The site (`site/lib/source.ts`, `dir` = repo root) keeps working because the submodule checks out at `notes/` in the same tree on the personal Mac; only the `include` globs change (`notes/wiki/**`).
- Risk: low. Forgetting to push the submodule leaves the pointer dangling, but nothing leaks.

### D. Separate private repo, pulled by chezmoi `.chezmoiexternal` (no submodule)

- Same two repos as C, no gitlink. In the dotfiles source state:
  ```toml
  # .chezmoiexternal.toml  (is a template)
  {{ if ne .chezmoi.hostname "work-mbp" }}
  ["second-brain/notes"]
      type = "git-repo"
      url = "git@github.com:jmep17/notes.git"
      refreshPeriod = "1h"
  {{ end }}
  ```
- Docs: ".chezmoiexternal.$FORMAT is interpreted as a template"; `git-repo` type: "chezmoi will run `git clone $URL $TARGET_NAME`... If the target exists, then chezmoi will run`git pull`" ([chezmoiexternal](https://www.chezmoi.io/reference/special-files/chezmoiexternal-format/)).
- Cost: lowest ongoing friction if chezmoi is adopted (ticket 01 recommends it). No submodule pin; the notes repo is an ordinary clone you commit to directly.
- Risk: the personal-notes location is only "inside the monorepo tree" by convention; the superproject does not version the link. Fine for a single user.

### E. git worktree tricks

- A linked worktree "shar[es] everything except per-worktree files such as HEAD, index" with the main repo, i.e. one object database ([git-worktree](https://git-scm.com/docs/git-worktree)). Sparse-checkout can be per-worktree with `extensions.worktreeConfig`, but that is still option A: the objects are all there. Not a solution.

### F. Two repos, site reads both

- This is C/D from the site's angle. `site/lib/source.ts` already takes an absolute `dir` and `include` globs (research 03), so pointing it at `notes/wiki/**` is a one-line change. No further mechanism needed.

### Verdict for Part 1

Only C or D meet "not on the work disk." A and B are working-tree/perf features, not access control. Pick D if chezmoi is adopted; C if you want the personal Mac's monorepo to record which notes commit it saw.

## Part 2 — making the work machine pull-only

| Mechanism                                                               | Enforced where | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Deploy key (SSH), read-only**                                         | server         | "Deploy keys are read-only by default, but you can give them write access"; "only grant access to a single repository" ([GitHub deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)). Generate on work: `ssh-keygen -t ed25519 -f ~/.ssh/second-brain-deploy`; add under repo Settings > Deploy keys, leave "Allow write access" unchecked; `~/.ssh/config` `Host github-sb` -> `IdentityFile ~/.ssh/second-brain-deploy`; clone `git@github-sb:jmep17/second-brain.git`. Docs caveat: deploy keys "are usually not protected by a passphrase" — add one.                                                                                                               |
| **Fine-grained PAT, `Contents: Read-only`, "Only select repositories"** | server         | Token limited to "specific repositories"; per-permission access levels, "choose the minimal permissions necessary"; used as the HTTPS password ([PAT docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)). Contents read covers fetching; write is required for pushes/refs updates ([fine-grained permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)). Expires; store in macOS keychain via `gh auth login` or git credential helper. Prefer the deploy key: no expiry, no HTTPS credential helper.                                                                             |
| `git remote set-url --push origin no_push`                              | client         | `remote.<name>.pushurl`: "If a pushurl option is present in a configured remote, it is used for pushing instead of remote.<name>.url" (`git help config`). Verified: `git push` -> `fatal: 'no_push' does not appear to be a git repository`. Trivially undone; prevents accidents only.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pre-push` hook `exit 1`                                                | client         | "If this hook exits with a non-zero status, git push will abort" ([githooks](https://git-scm.com/docs/githooks)). Hooks live in `$GIT_DIR/hooks`, not versioned; must be installed per clone (chezmoi `run_once_` script could do it). Same strength as pushurl, more moving parts.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Branch protection / rulesets                                            | server         | Personal-account private repos need GitHub Pro for protected branches ([GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans): Pro lists "Protected branches" under private-repo tools). Rulesets docs speak of "GitHub Team and GitHub Enterprise plans" ([about rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)). Also: they don't distinguish machines, only users, and admins bypass by default ([about protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)). Wrong tool here. |

Recommended combination: read-only deploy key (server) + `pushurl no_push` (client, so the error is local and instant). Do not sign in to `gh` with the personal account on work; the deploy key is the only credential that touches the repo.

## Part 3 — if work-made config edits must flow back later (note only)

- Cheapest: keep the read-only key and export patches: `git format-patch origin/main` on work, move the `.patch` files by hand (AirDrop/email), `git am` on personal. Zero server changes.
- Next: add a **second** deploy key with write access, or a fine-grained PAT with `Contents: Read and write`, and push to a `work/*` branch; merge on personal. Server-side "write" is then all-or-nothing for the repo (deploy-key write cannot be limited to a branch without Pro-tier branch protection).
- Alternative: a work-owned fork + PR. Fine-grained PATs "cannot access repositories as an outside or repository collaborator", so the fork would live under the same personal account; no gain over a branch.

## Part 4 — what chezmoi's per-machine exclusion does and does not do

- `.chezmoiignore` "is interpreted as a template, whether or not it has a .tmpl extension. This allows different files to be ignored on different machines." Patterns match the **target** path; `!` negates ([chezmoiignore](https://www.chezmoi.io/reference/special-files/chezmoiignore/)). Docs example:
  ```
  {{- if ne .chezmoi.hostname "work-laptop" }}
  .work # only manage .work on work-laptop
  {{- end }}
  ```
  ([machine-to-machine differences](https://www.chezmoi.io/user-guide/manage-machine-to-machine-differences/)). Custom data (`[data] work = true` in `~/.config/chezmoi/chezmoi.toml`, set via `promptBoolOnce`) works the same way (research 01).
- What it solves: per-file, per-host exclusion **from `$HOME`** (work git identity, proxies, personal aliases). Granularity: any glob.
- What it does not solve: the chezmoi source directory is a normal git clone; `.chezmoiignore` controls apply, not what git fetches. The docs contain no mechanism to partially clone the source repo (checked the ignore page and the machine-differences page; none mentions clone scope). So personal `wiki/` inside the same repo would still be on the work disk. Combine with C/D above.

## Part 5 — encrypting personal directories instead

| Tool                               | Mechanism                                                                                                                                                                                                                                                                                                                                               | Tradeoffs                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| git-crypt                          | gitattributes clean/smudge filter, AES-256-CTR; `secretdir/** filter=git-crypt diff=git-crypt`; `git-crypt unlock` with GPG or exported symmetric key ([README](https://github.com/AGWA/git-crypt/blob/master/README.md))                                                                                                                               | README: "does not encrypt file names, commit messages, symlink targets, gitlinks, or other metadata"; "does not hide when a file does or doesn't change, the length of a file"; "not the best tool for encrypting most or all of the files in a repository"; no key revocation; "has not yet reached maturity". Ciphertext is on the work disk. |
| transcrypt                         | same filter model, Bash + OpenSSL, per-file HMAC salt; no compile; can be uninstalled after setup ([README](https://github.com/elasticdog/transcrypt/blob/main/README.md))                                                                                                                                                                              | Password stored plaintext in `.git/config` on unlocked machines; forks OpenSSL per file; rekey loses historical diffs. Same metadata leaks as git-crypt.                                                                                                                                                                                        |
| chezmoi `encrypted_` (age/gpg)     | files "stored in ASCII-armored format in the source directory with the `encrypted_` attribute and are automatically decrypted when needed"; config `encryption = "age"`, `[age] identity`, `recipient`; `chezmoi add --encrypt` ([encryption](https://www.chezmoi.io/user-guide/encryption/), [age](https://www.chezmoi.io/user-guide/encryption/age/)) | Only for files chezmoi manages into `$HOME`; wiki pages are not `$HOME` targets. Ciphertext on disk; the personal Mac holds the identity file. Good fit for the few private dotfile fragments, not for `wiki/`.                                                                                                                                 |
| git-secret                         | GPG-encrypts listed files into `*.secret`, plaintext gitignored                                                                                                                                                                                                                                                                                         | Not evaluated against primary docs here; same shape as git-crypt with worse ergonomics (explicit `git secret hide/reveal`).                                                                                                                                                                                                                     |
| Raw `filter.<driver>.clean/smudge` | Git's generic hook: "the `clean` command is used to convert the contents of worktree file upon checkin", `smudge` on checkout; `filter.<driver>.required=true` for content that is "unusable" without the filter ([gitattributes](https://git-scm.com/docs/gitattributes))                                                                              | The driver definition lives in git config, not in the repo, so it must be installed per clone. This is what git-crypt/transcrypt wrap.                                                                                                                                                                                                          |

Verdict: encryption keeps content unreadable, not absent. File names, tree structure, sizes and change frequency stay visible, and a mis-installed filter commits plaintext. Use it, if at all, for a handful of dotfile fragments, not as the answer to "keep notes off the work PC."

## Recommendation

1. Split into two private repos: `second-brain` (dotfiles, scaffolding, site) and `notes` (`wiki/`, `raw/`, `log.md`, and the Claude auto-memory dir via `autoMemoryDirectory`). Pull `notes` only on the personal Mac, via chezmoi `.chezmoiexternal` under a hostname condition (D), or a submodule left uninitialised on work (C). Nothing else researched keeps the bytes off the work disk.
2. Work Mac credential = one read-only deploy key scoped to `second-brain`. Add `git remote set-url --push origin no_push` locally. No `gh auth login` on work. This makes pull-only a server fact, not a habit.
3. Use chezmoi `.chezmoiignore` templates only for per-file `$HOME` differences (work identity, proxies), not for exclusion from the repo.
4. Skip git-crypt/transcrypt for notes. Reconsider chezmoi `encrypted_` for individual private dotfile fragments if any turn up.
5. Site: change `include` globs in `site/lib/source.ts` to the `notes/` path; no runtime change.

## Open questions surfaced

- Does anything in `docs/`, `plans/`, `.scratch/` count as personal? Today they are root-level and would land on work with the dotfiles. Decide per directory before the split.
- Should work-made config edits ever flow back (Part 3)? If yes, choose "write deploy key + `work/*` branch" up front so the key is created once.
- Ticket 01 assumed one repo; this changes the chezmoi source-dir layout (`second-brain/dotfiles` as source, `notes` external). Ticket 01's recommendation still holds.

## Sources

- git sparse-checkout: https://git-scm.com/docs/git-sparse-checkout (and `git help sparse-checkout`, 2.55.0)
- git partial clone: https://git-scm.com/docs/partial-clone
- git clone `--sparse` / `--filter`: `git help clone` (2.55.0); https://git-scm.com/docs/git-clone
- git config `remote.<name>.pushurl`: `git help config` (2.55.0); https://git-scm.com/docs/git-config
- git submodule: https://git-scm.com/docs/git-submodule
- git worktree: https://git-scm.com/docs/git-worktree
- githooks (pre-push): https://git-scm.com/docs/githooks
- gitattributes (filter/clean/smudge/required): https://git-scm.com/docs/gitattributes
- GitHub partial clone support: https://github.blog/open-source/git/get-up-to-speed-with-partial-clone-and-shallow-clone/
- GitHub deploy keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys
- GitHub fine-grained PATs: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub fine-grained PAT permissions: https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens
- GitHub protected branches: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- GitHub plans: https://docs.github.com/en/get-started/learning-about-github/githubs-plans
- chezmoi `.chezmoiignore`: https://www.chezmoi.io/reference/special-files/chezmoiignore/
- chezmoi machine differences: https://www.chezmoi.io/user-guide/manage-machine-to-machine-differences/
- chezmoi `.chezmoiexternal`: https://www.chezmoi.io/reference/special-files/chezmoiexternal-format/
- chezmoi encryption: https://www.chezmoi.io/user-guide/encryption/ , https://www.chezmoi.io/user-guide/encryption/age/
- git-crypt README: https://github.com/AGWA/git-crypt/blob/master/README.md
- transcrypt README: https://github.com/elasticdog/transcrypt/blob/main/README.md
- Claude Code memory (auto-memory location, `autoMemoryDirectory`, `autoMemoryEnabled`): https://code.claude.com/docs/en/memory
- Local experiments (throwaway repos in the session scratchpad, git 2.55.0): cone/non-cone sparse checkout object counts; `--filter=blob:none` missing-blob counts before/after `git log -p` and `git grep`; `pushurl no_push` push failure; uninitialised-submodule clone contents.
