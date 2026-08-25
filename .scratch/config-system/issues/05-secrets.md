# Secrets strategy

Type: grilling
Status: open
Blocked by: 01, 02

## Question

Where do secrets (API keys, tokens in shell rc, gh auth) live so they never enter git but still reach `$HOME` on each machine? Options depend on the tool chosen in 01 (chezmoi password-manager integration, age encryption, plain `.local` untracked files). Decide one and how the web UI treats secret-bearing files (hidden, masked, read-only).
