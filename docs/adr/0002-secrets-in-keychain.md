---
status: accepted
---

# Secrets live in macOS Keychain, referenced from chezmoi templates

Secrets must reach `$HOME` on both Macs but never enter git on either (CONTEXT.md "Secret"). chezmoi templates read them at apply time with `{{ keyring "service" "user" }}`, which on macOS is the login Keychain, so the repo stores only the reference. Keychain was chosen over 1Password because only the work Mac has 1Password (work account; `op` CLI would need IT approval) and the personal Mac has none; over `age`-encrypted files because those still put secret bytes in git. Personal-only secrets are wrapped in a hostname conditional so the work Mac never looks them up; a secret expected on both hosts that is missing fails `chezmoi apply` loudly. Only env-var style keys are managed; tools that own their credential files (gh, Claude Code) re-login per machine (config-system ticket 05, 2026-08-25).

## Consequences

- Each secret is entered once per machine with `security add-generic-password`; nothing syncs them.
- Bootstrap doc must list required secrets per host, entered before first apply.
- The web UI edits templates as-is and must never render templates or send rendered files to the browser.
- `~/.config/gh/hosts.yml` and Claude Code auth stay unmanaged.

Evidence: `.scratch/config-system/issues/05-secrets.md`, https://www.chezmoi.io/reference/templates/keyring-functions/keyring/.
