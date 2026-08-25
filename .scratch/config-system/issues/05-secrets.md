# Secrets strategy

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

Where do secrets (API keys, tokens in shell rc, gh auth) live so they never enter git but still reach `$HOME` on each machine? Options depend on the tool chosen in 01 (chezmoi password-manager integration, age encryption, plain `.local` untracked files). Decide one and how the web UI treats secret-bearing files (hidden, masked, read-only).

## Comments

### 2026-08-25 grilling rounds 1–2

- Facts: shell rc files export no secrets today (only `PATH`, `EDITOR`, `VISUAL`); `~/.config/gh/hosts.yml` holds the gh OAuth token; no `op`/`age`/`gpg`/`chezmoi` installed; personal Mac has only macOS Keychain; user has 1Password at work only.
- Q1 scope: manage env-var style keys only; tool-owned credential files (gh, Claude Code OAuth) left to the tools' own login. Accepted.
- Q2/Q5 store: macOS Keychain on both Macs via chezmoi `keyring`; 1Password not used (work-only, `op` CLI would need IT). Accepted.
- Q3 missing secret: personal-only secrets wrapped in a hostname conditional so the work Mac never references them; keys expected on both fail loud. Accepted.
- Q4 UI: source files hold only `{{ keyring ... }}` references, shown editable as-is; UI never renders templates to the browser. Accepted.
- Q6 adding a secret: CLI only (`security add-generic-password`), documented in bootstrap doc. Accepted.
- Q7 bootstrap: enter required secrets before first `chezmoi apply`; missing shared secret fails apply. Accepted.

## Answer

Secrets live in macOS Keychain on each Mac and are pulled into `$HOME` at apply time by chezmoi templates: `{{ keyring "<service>" "<user>" }}` ([docs](https://www.chezmoi.io/reference/templates/keyring-functions/keyring/)). Git holds only the reference, never the value. ADR: `docs/adr/0002-secrets-in-keychain.md`.

Rules:

- Scope: env-var style keys (API keys, tokens exported in shell rc). Tool-owned credential files (`~/.config/gh/hosts.yml`, Claude Code OAuth) are not managed; re-login per machine.
- Personal-only secrets sit inside `{{ if eq .chezmoi.hostname "<personal>" }}` so the work Mac never looks them up. Secrets expected on both hosts are unguarded; a missing one fails `chezmoi apply` loudly.
- Add a secret: `security add-generic-password -s <service> -a <user> -w` (per machine). No UI path for this.
- Bootstrap order: install chezmoi, `chezmoi init`, add required secrets to Keychain (list per host in bootstrap doc), `chezmoi apply`.
- Web UI: shows and edits source templates as-is (no secret bytes present); never renders templates or ships rendered `$HOME` files to the browser.
- 1Password rejected: work-only account, `op` CLI on work Mac needs IT, personal Mac has none.

Feeds: 06 (UI must not render templates), 08 (bootstrap doc, secret list per host).
