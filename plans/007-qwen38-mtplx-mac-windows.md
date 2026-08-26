# Plan 007: Run independently switchable Qwen3.8 backends on Windows and Mac

> **Executor instructions**: Execute the shared configuration steps in this
> repository, the Windows steps on the personal Windows workstation, and the
> Mac steps on the employer-issued M4 Pro Mac. Each device must work with the
> other powered off and unreachable. Run every verification gate. A STOP on
> one device does not authorize substituting a different model/runtime and
> does not prevent completing the other device's independent path. When done,
> update plan 007's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e573964..HEAD -- CONTEXT.md dotfiles plans/007-qwen38-mtplx-mac-windows.md plans/README.md`
> If an in-scope path changed, compare the live state with “Current state”
> before proceeding. Treat an overlapping semantic change as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH — a 27B model is a tight, slow fit on the 24 GB Windows host,
  and installing third-party inference software on the Work Mac requires
  employer approval
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `e573964`, revised 2026-08-26

## Why this matters

The owner has two different machines: a personal Windows workstation with
24 GB RAM and an employer-issued M4 Pro Mac with 48 GB unified memory. MTPLX
is Apple-Silicon-only, so forcing both machines through it would make Windows
depend on the Mac. Instead, each machine gets its own local Qwen3.8-27B
runtime: native Windows Ollama with a 13.1 GB Q3 GGUF, and MTPLX with its
20.4 GB optimized 4-bit pack on the Mac.

The checked-in interface is identical on both machines. `qwen-backend local`
and `qwen-backend cloud` update an untracked, machine-local mode file;
`qwen-claude` and `qwen-codex` honor that device's mode and never contact the
other device. Plain `claude` and `codex` remain untouched as reliable cloud
entry points.

## Target topology

```text
Personal Windows 11 workstation (24 GB RAM; self-contained)
  Windows host: Ollama + Qwen3.8-27B UD-Q3_K_XL
  127.0.0.1:11434
       ├── WSL qwen-claude ── Anthropic /v1/messages
       └── WSL qwen-codex  ── OpenAI /v1/responses

Work Mac M4 Pro (48 GB unified memory; self-contained)
  127.0.0.1:8000  MTPLX + Qwen3.8-27B Optimized Speed
       ├── qwen-claude ────── Anthropic /v1/messages
       └── 127.0.0.1:4000 LiteLLM Responses bridge
                                  └── qwen-codex

Shared git source: launchers and profiles only
Per-device, untracked state: ~/.config/qwen/mode = local | cloud
No device-to-device API, SSH tunnel, model sharing, or runtime dependency
```

## Current state

- The current personal workstation is Windows with 24 GB host RAM
  (user-confirmed 2026-08-26), an AMD Ryzen 5 5600H and NVIDIA GTX 1650. Its
  WSL2 guest currently sees only about 9.6 GiB RAM and 3 GiB swap. Run the
  model in native Windows Ollama, never inside WSL.
- The Work Mac is employer-owned, Apple M4 Pro, with 48 GB unified memory
  (user-confirmed 2026-08-26). It can use MTPLX if employer policy permits.
- `CONTEXT.md:3-15` incorrectly calls both devices Macs. Correcting that
  vocabulary is part of this plan; do not preserve the false machine map.
- The repository's chezmoi source directory is `dotfiles/`. ADR 0003 requires
  editing source there and applying it with chezmoi rather than hand-editing
  managed targets under `$HOME`.
- ADR 0002 forbids credentials in git. These loopback-only APIs do not need a
  real credential; literal non-secret placeholders such as `ollama` and
  `local-mtplx` are acceptable. Do not copy Claude/Codex cloud tokens.
- Codex 0.149.1, Claude Code 2.1.246, and chezmoi 2.72.0 were found in WSL.
  Re-check both machines at execution time.
- MTPLX officially requires Apple Silicon and macOS 14+. Its Qwen3.8-27B
  Optimized Speed pack is the coding-oriented 4-bit pack for modern Macs with
  at least 32 GB:
  <https://github.com/youssofal/MTPLX>.
- MTPLX exposes Anthropic `/v1/messages` and OpenAI chat completions but not
  the Responses endpoint Codex requires. The gap is still tracked at
  <https://github.com/youssofal/MTPLX/issues/193>.
- Codex custom providers use `wire_api = "responses"`; user-level named
  profiles are separate `$CODEX_HOME/<profile>.config.toml` files on current
  Codex releases:
  <https://learn.chatgpt.com/docs/config-file/config-reference> and
  <https://learn.chatgpt.com/docs/config-file/config-advanced>.
- LiteLLM documents `use_chat_completions_api: true` as the opt-in bridge from
  Responses clients such as Codex to an OpenAI-compatible chat-completions
  backend:
  <https://github.com/BerriAI/litellm-docs/blob/main/docs/response_api.md#opt-in-bridge-for-openai-models-with-custom-api_base>.
- Ollama 0.13.3+ implements both Anthropic Messages for Claude Code and
  OpenAI Responses for Codex:
  <https://docs.ollama.com/api/anthropic-compatibility> and
  <https://docs.ollama.com/api/openai-compatibility>.
- The Windows quant is
  `hf.co/unsloth/Qwen3.8-27B-GGUF:UD-Q3_K_XL`. Its published GGUF is 13.1 GB;
  Q4 alternatives are 15.4–17.6 GB and leave too little predictable headroom
  for the OS, KV cache, and agent tools on a 24 GB host:
  <https://huggingface.co/unsloth/Qwen3.8-27B-GGUF/tree/main>.
- Windows 11 mirrored WSL networking permits Linux and Windows to connect
  through `127.0.0.1` without exposing Ollama on the LAN:
  <https://learn.microsoft.com/windows/wsl/networking>.
- Existing changes in `log.md`, `wiki/**`, and plans 006/008 belong to another
  workflow. Preserve them exactly.

## Commands you will need

| Purpose         | Device                | Command                                                                        | Expected on success                                 |
| --------------- | --------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------- |
| Windows facts   | PowerShell            | `Get-CimInstance Win32_OperatingSystem; Get-CimInstance Win32_VideoController` | Windows 11, about 24 GB RAM, GTX 1650 listed        |
| WSL facts       | WSL                   | `uname -a; free -h; systemd-detect-virt`                                       | WSL2; do not require enough guest RAM for the model |
| Windows runtime | PowerShell            | `winget install --id Ollama.Ollama -e`                                         | official Ollama installed                           |
| Windows model   | PowerShell            | `ollama run hf.co/unsloth/Qwen3.8-27B-GGUF:UD-Q3_K_XL`                         | model downloads and answers once                    |
| Mac facts       | Mac                   | `uname -s; uname -m; sysctl -n hw.memsize`                                     | `Darwin`, `arm64`, at least `51539607552` bytes     |
| Mac runtime     | Mac                   | `brew install youssofal/mtplx/mtplx`                                           | MTPLX 2.9.2+                                        |
| Mac bridge      | Mac                   | `uv tool install 'litellm[proxy]==1.97.0'`                                     | LiteLLM 1.97.0                                      |
| Mac model       | Mac                   | `mtplx pull Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed`                       | complete model in `mtplx models`                    |
| Apply config    | Each Unix environment | `chezmoi --source "$PWD/dotfiles" apply --no-tty --force --parent-dirs`        | exit 0                                              |
| Script syntax   | Either                | `find dotfiles/dot_local/bin -type f -name 'executable_*' -exec sh -n {} \;`   | exit 0                                              |
| Plan format     | Either                | `bunx prettier --check plans/007-qwen38-mtplx-mac-windows.md plans/README.md`  | exit 0                                              |
| Repo integrity  | Either                | `git diff --check`                                                             | exit 0                                              |

## Suggested executor toolkit

- Use `openai-docs`, if available, before writing Codex provider/profile
  fields. Confirm the live CLI's profile location with `codex --help`.
- Use only official MTPLX, Ollama, Microsoft WSL, OpenAI Codex, LiteLLM, and
  model-publisher documentation for runtime or protocol details.
- Treat the Windows and Mac setup as separate work streams. Do not introduce
  remote access to make one stream pass.

## Scope

**Repository files in scope** (the only source files to create/modify):

- `CONTEXT.md` (machine vocabulary only)
- `dotfiles/dot_config/qwen/windows.Modelfile` (create)
- `dotfiles/dot_config/litellm/mtplx.yaml` (create)
- `dotfiles/dot_codex/qwen-mtplx.config.toml` (create)
- `dotfiles/dot_codex/qwen-ollama.config.toml` (create)
- `dotfiles/dot_local/bin/executable_mtplx-qwen` (create)
- `dotfiles/dot_local/bin/executable_mtplx-codex-proxy` (create)
- `dotfiles/dot_local/bin/executable_qwen-backend` (create)
- `dotfiles/dot_local/bin/executable_qwen-claude` (create)
- `dotfiles/dot_local/bin/executable_qwen-codex` (create)
- `plans/README.md` (plan 007 status/note only)

**Machine state in scope**:

- Windows host: approved Ollama install, Qwen GGUF cache, local model alias,
  and `%UserProfile%\.wslconfig` mirrored-networking setting
- Windows WSL: chezmoi-applied launchers/profiles and the untracked mode file
- Work Mac: approved MTPLX/LiteLLM installs, Qwen model cache,
  chezmoi-applied launchers/profiles, and the untracked mode file

**Out of scope**:

- Any connection, tunnel, runtime fallback, shared port, or model-weight copy
  between the two devices
- Installing MTPLX on Windows or installing the Windows model inside WSL
- Binding ports 11434, 8000, or 4000 to `0.0.0.0`; firewall bypasses; router
  changes; Remote Login; Tailscale; public ingress; or automatic startup work
- Changing WSL's RAM/swap limit. Native Windows owns inference; WSL is only a
  client.
- Substituting Qwen3.8 with Qwen3.5, Qwen3-Coder, a cloud Ollama model, or a
  smaller parameter count without a new owner decision
- Sending personal repository content to the Work Mac or work content to the
  personal workstation
- Editing Claude/Codex default auth, `~/.claude/settings.json`, or
  `~/.codex/config.toml`; plain `claude` and `codex` must remain cloud routes
- Committing the generated `~/.config/qwen/mode`, tokens, model weights,
  hostnames, IP addresses, or logs containing prompts
- launchd, Windows service customization, fan control, Docker, LM Studio,
  llama.cpp, or source files outside the scope list

## Git workflow

- Branch: `advisor/007-independent-qwen38-backends`
- Use one repository commit after both device-independent verification gates
  pass; message example: `config-system: add independent qwen backends`.
- Stage only the repository files listed in scope. Do not stage machine-local
  mode state, model files, or unrelated dirty files.
- Do not push or open a PR unless the operator explicitly requests it.

## Steps

### Step 1: Correct the repository's machine vocabulary

Edit only the opening description and `### Machines` portion of `CONTEXT.md`:

- Rename **Personal Mac** to **Personal Windows workstation**.
- State that it runs Windows 11 with WSL2, is owner-controlled, is the source
  of truth, and is the only machine that pushes to the main repo.
- Keep **Work Mac**, but state that it is the employer-issued M4 Pro Mac and
  pulls from the main repo without pushing.
- Change the opening sentence from “deployed to a personal Mac and a work Mac”
  to “deployed to a personal Windows workstation and a work Mac”.
- Do not change content-class rules or reinterpret which data may reach work.

The Secret definition and ADR 0002 remain macOS-centric and need a separate
cross-platform secrets decision. This plan commits no real secret and must not
invent that decision.

**Verify**:

```bash
grep -F "Personal Windows workstation" CONTEXT.md
! grep -F "**Personal Mac**" CONTEXT.md
git diff -- CONTEXT.md
```

Expected: the grep succeeds, the negative grep exits 0, and the diff changes
only the opening/machine vocabulary described above.

### Step 2: Preflight each device without coupling their outcomes

On Windows, use a native PowerShell terminal:

```powershell
$os = Get-CimInstance Win32_OperatingSystem
$gpu = Get-CimInstance Win32_VideoController
$os | Select-Object Caption, Version, BuildNumber,
  @{N='RAM_GiB';E={[math]::Round($_.TotalVisibleMemorySize/1MB,1)}}
$gpu | Select-Object Name, AdapterRAM, DriverVersion
Get-Volume -DriveLetter C | Select-Object DriveLetter, SizeRemaining
winget --version
wsl --version
```

Require Windows 11, at least 22 GiB visible RAM, 30 GiB free disk, WSL2, and
the NVIDIA GPU to be present. The 4 GB GTX 1650 is only a partial accelerator;
system RAM will hold most weights.

Inside WSL:

```bash
uname -a
free -h
systemd-detect-virt
command -v curl
claude --version
codex --version
chezmoi --version
```

Require WSL2 and working clients. Low WSL memory is expected and is not a
reason to move the model into WSL.

On the Work Mac:

```bash
uname -s
uname -m
sw_vers -productVersion
sysctl -n hw.memsize
df -h "$HOME"
command -v brew
command -v uv
command -v chezmoi
claude --version
codex --version
```

Require Darwin arm64, macOS 14+, at least 48 GiB unified memory, 45 GiB free
disk, Homebrew, uv, chezmoi, Claude Code, and Codex 0.134.0+.

Before changing the Work Mac, record confirmation that employer policy allows
MTPLX, LiteLLM, and the Qwen weights and name the data classes allowed in local
prompts. A missing answer blocks only the Mac path; do not route Mac work to
Windows or Windows work to Mac.

**Verify**: save the preflight outputs and policy answer in the execution
handoff, not in a repository file. Each device either meets its own gates or
is reported separately as blocked.

### Step 3: Create the Windows-native Qwen model profile

Create `dotfiles/dot_config/qwen/windows.Modelfile` with exactly this initial
shape:

```text
FROM hf.co/unsloth/Qwen3.8-27B-GGUF:UD-Q3_K_XL
PARAMETER num_ctx 16384
PARAMETER temperature 1.0
PARAMETER top_p 0.95
PARAMETER top_k 20
```

The 16,384-token context is deliberately below Ollama's 64k Claude Code
recommendation. The 24 GB host cannot predictably hold 64k KV cache alongside
this 27B model and developer tools. Do not describe Windows as suitable for
long, high-context agent sessions.

Apply the source in WSL, then use native PowerShell to install/update official
Ollama, pull the exact quant once, and create the stable alias:

```powershell
winget install --id Ollama.Ollama -e
ollama --version
ollama run hf.co/unsloth/Qwen3.8-27B-GGUF:UD-Q3_K_XL
ollama create qwen3.8-windows -f "\\wsl.localhost\<DISTRO>\home\<USER>\.config\qwen\windows.Modelfile"
ollama show qwen3.8-windows
```

Replace `<DISTRO>` and `<USER>` with values printed by `wsl -l -q` and
`whoami`; do not commit them. Exit the initial interactive `ollama run` after
one answer. Require Ollama 0.13.3+ because that is the first documented
Responses-compatible release.

**Verify** in PowerShell:

```powershell
ollama list
ollama show qwen3.8-windows --modelfile
```

Expected: `qwen3.8-windows` exists, its base is the exact Q3_K_XL repository
tag, and its Modelfile contains `num_ctx 16384`. If Ollama cannot resolve that
`FROM` reference, STOP the Windows model step and report the error; do not
silently choose Q2, Q4, or a different model.

### Step 4: Make Windows-hosted Ollama reachable only through WSL localhost

In PowerShell, inspect `%UserProfile%\.wslconfig`. Preserve every existing
setting. On Windows 11 22H2 or newer, ensure this section/key exists:

```ini
[wsl2]
networkingMode=mirrored
```

Do not put this file in the repository. Quit WSL processes cleanly, then run
`wsl --shutdown` and reopen the distro. Leave Ollama's default loopback bind
unchanged; do not set `OLLAMA_HOST=0.0.0.0`.

From WSL:

```bash
curl -fsS http://127.0.0.1:11434/api/version
curl -fsS http://127.0.0.1:11434/api/tags | grep -F qwen3.8-windows
curl -fsS http://127.0.0.1:11434/v1/messages \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen3.8-windows","max_tokens":32,"messages":[{"role":"user","content":"Reply with WINDOWS_ANTHROPIC_OK only."}]}' \
  | grep -F WINDOWS_ANTHROPIC_OK
curl -fsS http://127.0.0.1:11434/v1/responses \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen3.8-windows","input":"Reply with WINDOWS_LOCAL_OK only."}' \
  | grep -F WINDOWS_LOCAL_OK
```

**Verify**: all four commands exit 0. In PowerShell, `Get-NetTCPConnection
-LocalPort 11434` must show only loopback local addresses. If mirrored mode is
unavailable or corporate policy controls `.wslconfig`, STOP and report; do not
open Ollama to the LAN or commit a host IP.

### Step 5: Install and tune the Mac's MTPLX model

On the Work Mac only, after policy approval:

```bash
brew install youssofal/mtplx/mtplx
mtplx --version
mtplx doctor --summary
mtplx pull Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed
mtplx inspect Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed
mtplx tune --model Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed --retune
mtplx models
uv tool install 'litellm[proxy]==1.97.0'
litellm --version
```

If already installed, use the official update mechanism rather than a second
installation method. `inspect` must identify the exact pack as verified and
MTP-capable. Let tuning measure and save the fastest AR/MTP depth; do not
force a depth.

**Verify**: MTPLX is 2.9.2+, its doctor has no blocking error, the exact model
is complete/verified, and LiteLLM reports 1.97.0. No Windows outcome is a
precondition for this step.

### Step 6: Add loopback-only Mac launchers and the Codex bridge

Create `dotfiles/dot_local/bin/executable_mtplx-qwen` as a POSIX `sh` script.
It must use `set -eu`, reject anything except Darwin arm64, verify port 8000
is free or already serves the expected model, unset
`MTPLX_REQUEST_LOG_JSONL`, and execute in the foreground:

```bash
exec mtplx serve \
  --model Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed \
  --port 8000 \
  --context-window 65536 \
  --paged-kv-quantization q8 \
  --ssd-session-cache off \
  "$@"
```

Confirm all flags against `mtplx serve --help`; a renamed or missing flag is a
STOP condition. Never add a non-loopback host, request logging, fan control,
or forced MTP depth.

Create `dotfiles/dot_config/litellm/mtplx.yaml`:

```yaml
model_list:
  - model_name: mtplx-qwen
    litellm_params:
      model: openai/Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed
      api_base: http://127.0.0.1:8000/v1
      api_key: local-mtplx
      use_chat_completions_api: true
```

Create `dotfiles/dot_local/bin/executable_mtplx-codex-proxy` as a POSIX `sh`
script. It must reject non-Darwin systems, require a successful
`http://127.0.0.1:8000/v1/models` probe, refuse to replace an unrelated port
4000 listener, and execute:

```bash
exec litellm \
  --config "$HOME/.config/litellm/mtplx.yaml" \
  --host 127.0.0.1 \
  --port 4000 \
  "$@"
```

**Verify** after applying with chezmoi and running each launcher in its own
terminal:

```bash
curl -fsS http://127.0.0.1:8000/v1/models | grep -F Qwen3.8
curl -fsS http://127.0.0.1:8000/v1/messages \
  -H 'Content-Type: application/json' \
  -d '{"model":"Youssofal/Qwen3.8-27B-MTPLX-Optimized-Speed","max_tokens":32,"messages":[{"role":"user","content":"Reply with MAC_ANTHROPIC_OK only."}]}' \
  | grep -F MAC_ANTHROPIC_OK
curl -fsS http://127.0.0.1:4000/v1/models | grep -F mtplx-qwen
curl -fsS http://127.0.0.1:4000/v1/responses \
  -H 'Authorization: Bearer local-mtplx' \
  -H 'Content-Type: application/json' \
  -d '{"model":"mtplx-qwen","input":"Reply with MAC_LOCAL_OK only."}' \
  | grep -F MAC_LOCAL_OK
lsof -nP -iTCP:8000 -sTCP:LISTEN
lsof -nP -iTCP:4000 -sTCP:LISTEN
```

Expected: both response probes pass and both listeners show `127.0.0.1` or
`::1`, never `*` or a LAN address.

### Step 7: Add separate Codex profiles for the two local protocols

Create `dotfiles/dot_codex/qwen-ollama.config.toml`:

```toml
model = "qwen3.8-windows"
model_provider = "ollama_local"
model_context_window = 16384
model_reasoning_effort = "medium"

[model_providers.ollama_local]
name = "Local Windows Ollama"
base_url = "http://127.0.0.1:11434/v1"
wire_api = "responses"
requires_openai_auth = false
```

Use this explicit provider instead of Codex's built-in Ollama shortcut so the
profile's loopback endpoint and Responses wire protocol are reviewable in the
managed file. Do not edit the global config.

Create `dotfiles/dot_codex/qwen-mtplx.config.toml`:

```toml
model = "mtplx-qwen"
model_provider = "mtplx_litellm"
model_context_window = 65536
model_reasoning_effort = "medium"

[model_providers.mtplx_litellm]
name = "Local MTPLX through LiteLLM"
base_url = "http://127.0.0.1:4000/v1"
wire_api = "responses"
requires_openai_auth = false
```

Do not put either block into `~/.codex/config.toml`. On Codex 0.134.0+, the
applied files must be `~/.codex/qwen-ollama.config.toml` and
`~/.codex/qwen-mtplx.config.toml`, selected with `--profile qwen-ollama` or
`--profile qwen-mtplx`.

**Verify** on each device with its own local server running:

```bash
codex --profile qwen-ollama --version   # WSL only
codex --profile qwen-mtplx --version    # Mac only
```

Expected: each command parses its profile and exits 0. A warning about an
unknown provider/profile field is a failure.

### Step 8: Add one shared, machine-local mode switch

Create `dotfiles/dot_local/bin/executable_qwen-backend` as a POSIX `sh`
script with `set -eu` and these exact public operations:

```text
qwen-backend local
qwen-backend cloud
qwen-backend status
```

Requirements:

- Store only `local` or `cloud` in `${XDG_CONFIG_HOME:-$HOME/.config}/qwen/mode`.
- Create the parent directory with mode 700 and the state file with mode 600.
- Write through a temporary file in the same directory and `mv` it into place.
- Default to `cloud` when the file does not exist.
- Detect Mac only as `Darwin` + `arm64`; detect Windows only when Linux's
  `uname -r` contains `microsoft` or `WSL`, case-insensitively. Reject other
  hosts.
- `status` must print the mode, detected device backend (`mtplx` or `ollama`),
  expected model, and endpoint health without changing state.
- `local` must refuse to write the new mode until the device-local health
  endpoint and expected model both pass. On Mac, require both MTPLX port 8000
  and the LiteLLM bridge on port 4000; on WSL, require Ollama port 11434.
- `cloud` must not require network or inspect cloud credentials; it only
  selects the untouched normal CLI path.
- Allow a one-command override through `QWEN_MODE=local|cloud`; wrappers use
  it without rewriting the mode file.
- Never contain a hostname, non-loopback address, token, SSH command, or
  cross-device fallback.

**Verify** separately on each machine:

```bash
qwen-backend status
qwen-backend local
qwen-backend status
qwen-backend cloud
qwen-backend status
```

Expected: Mac status names MTPLX and ports 8000/4000; WSL status names Ollama
and port 11434. Mode transitions are independent and the file is mode 600.

### Step 9: Add fail-closed Claude Code and Codex launchers

Create `dotfiles/dot_local/bin/executable_qwen-claude` as POSIX `sh`:

- Resolve mode from valid `QWEN_MODE`, then the local state file, then
  `cloud` as the default.
- In cloud mode, `exec claude "$@"` without changing Claude environment.
- In local mode, detect the device as Step 8 does, probe its loopback endpoint
  and expected model, and exit with a startup instruction if unavailable.
- On WSL, execute Claude Code with `ANTHROPIC_BASE_URL=http://127.0.0.1:11434`,
  empty `ANTHROPIC_API_KEY`, ignored placeholder
  `ANTHROPIC_AUTH_TOKEN=ollama`, and model `qwen3.8-windows`.
- On Mac, use `http://127.0.0.1:8000`, placeholder
  `ANTHROPIC_AUTH_TOKEN=local-mtplx`, and the exact MTPLX model ID.
- Set Claude's default Opus/Sonnet/Haiku model variables to that same local
  model inside local mode so subsidiary requests cannot escape to cloud.
- Never fall back to cloud after local mode was selected.

Create `dotfiles/dot_local/bin/executable_qwen-codex` similarly:

- Cloud mode is exactly `exec codex "$@"`.
- Local WSL mode probes Ollama, then executes
  `codex --profile qwen-ollama "$@"`.
- Local Mac mode probes MTPLX and LiteLLM, then executes
  `codex --profile qwen-mtplx "$@"`.
- Put wrapper-supplied arguments before `"$@"` so an explicit caller flag is
  visible and reviewable, but fail if the caller tries to replace the local
  provider/base URL while mode is local.
- Do not create aliases named `claude` or `codex` and do not edit shell rc
  files; `~/.local/bin` must already be on PATH or be handled by the existing
  bootstrap process.

**Verify**:

```bash
sh -n dotfiles/dot_local/bin/executable_qwen-backend
sh -n dotfiles/dot_local/bin/executable_qwen-claude
sh -n dotfiles/dot_local/bin/executable_qwen-codex
grep -RInE 'ssh|tailscale|0\.0\.0\.0|https?://[^/]*(192\.168|10\.|172\.)' \
  dotfiles/dot_local/bin dotfiles/dot_codex dotfiles/dot_config/qwen \
  dotfiles/dot_config/litellm
```

Expected: syntax checks exit 0 and grep prints nothing. Manually compare the
device-detection blocks; factor them into a sourced managed file only if that
can be done without adding an unlisted scope path.

### Step 10: Prove Claude and Codex tool loops independently on each device

Apply configuration from that device's own clone. Start only its local
runtime(s), set `qwen-backend local`, and create a disposable directory with
`mktemp -d`. Do not use this repository for an agent write probe.

In the disposable directory, ask each CLI non-interactively to:

1. report its model/backend;
2. create `local-probe.txt` containing the device marker;
3. read the file back;
4. run a harmless shell command such as `wc -c local-probe.txt`;
5. return the marker.

Use `claude --help` and `codex exec --help` to select the current noninteractive
and permission flags; do not use a global dangerous-permission bypass. Expected
markers are `WINDOWS_QWEN38_OK` on WSL and `MAC_QWEN38_OK` on Mac.

During the Windows test, the Mac must be shut down, disconnected, or otherwise
confirmed unreachable. During the Mac test, the Windows Ollama process must be
stopped or the Windows device confirmed unreachable. This is an acceptance
test for the no-dependency requirement, not merely a topology claim.

After each test, inspect runtime evidence:

- Windows: `ollama ps` must list `qwen3.8-windows`; record its processor split,
  context and observed tokens/second. It is acceptable for most weights to be
  in CPU RAM, but paging/thrashing or an out-of-memory failure is not.
- Mac: MTPLX and LiteLLM logs must show the expected model and local requests,
  with no saved prompt/request-body log.

Switch to cloud and run only `qwen-claude --version` and
`qwen-codex --version`; these must behave like the corresponding plain CLIs.
Do not send repository content to a cloud provider as part of the test.

**Verify**: all four local tool loops produce their device marker, each while
the other device is unavailable. If Windows cannot complete at 16k without
heavy paging or repeatedly fails tool calls, report the measured limitation;
do not silently lower context or quantization.

### Step 11: Run repository gates and update the plan index

Run:

```bash
chezmoi --source "$PWD/dotfiles" execute-template \
  < dotfiles/dot_local/bin/executable_qwen-backend >/dev/null
find dotfiles/dot_local/bin -type f -name 'executable_*' -exec sh -n {} \;
git diff --check
bunx prettier --check plans/007-qwen38-mtplx-mac-windows.md plans/README.md
git status --short
```

Inspect `chezmoi diff` independently on both devices before apply. Update only
plan 007's row and explanatory note in `plans/README.md`: use `DONE` only if
both independent paths passed; otherwise use `BLOCKED` with separate Windows
and/or Mac reasons.

**Verify**: commands exit 0, only in-scope files are staged, and unrelated
working-tree changes remain byte-for-byte untouched.

## Test plan

- Static script tests: `sh -n` for all five launchers; grep rejects remote
  addresses, SSH, Tailscale, and wildcard binds.
- Mode tests on each device: missing state defaults to cloud; local refuses an
  unhealthy server; local succeeds for the expected model; cloud restores the
  normal CLI path; invalid modes fail; `QWEN_MODE` is one-shot and does not
  rewrite state.
- Protocol tests: Windows Ollama answers `/v1/messages` and `/v1/responses`;
  Mac MTPLX answers `/v1/messages` and LiteLLM answers `/v1/responses`.
- Agent tests: Claude Code and Codex each complete a write/read/shell loop in
  a disposable directory on each device.
- Independence tests: Windows passes with Mac unavailable; Mac passes with
  Windows unavailable; no checked-in config contains the other device's
  address or identity.
- Resource test: Windows records `ollama ps`, RAM use and tokens/second at 16k;
  Mac records selected MTPLX depth and memory use at 64k.
- Regression test: plain `claude` and `codex` configs/auth are unchanged, and
  cloud mode version commands still run.

## Done criteria

- [ ] `CONTEXT.md` correctly names the personal Windows workstation and Work
      Mac without altering their content boundaries.
- [ ] Windows runs the exact Qwen3.8-27B UD-Q3_K_XL alias in native Ollama at
      16,384 context and WSL reaches it only over mirrored localhost.
- [ ] Mac runs the exact MTPLX Qwen3.8-27B Optimized Speed pack at 65,536
      context and the LiteLLM Responses bridge, all on loopback.
- [ ] `qwen-backend local|cloud|status` works independently on both devices;
      mode state is untracked and machine-local.
- [ ] `qwen-claude` and `qwen-codex` fail closed in local mode and preserve the
      normal cloud commands in cloud mode.
- [ ] Claude Code and Codex complete tool loops on each device while the other
      device is unavailable.
- [ ] No repository file contains a device IP/hostname, credential, prompt
      log, remote tunnel, wildcard API bind, or cross-device fallback.
- [ ] Windows resource/latency measurements and Mac MTPLX tuning result are
      recorded in the handoff with limitations stated plainly.
- [ ] `git diff --check`, shell syntax checks, chezmoi rendering, and plan
      formatting pass.
- [ ] No file outside the in-scope list is modified by this plan, and plan
      007's status is updated in `plans/README.md`.

## STOP conditions

Stop the affected device's path and report; do not improvise if:

- Employer policy does not explicitly permit MTPLX, LiteLLM, or Qwen weights
  on the Work Mac, or the allowed prompt data classes are unknown.
- Windows is older than the mirrored-networking requirement, policy owns
  `.wslconfig`, or WSL cannot reach Windows loopback after one clean restart.
- Any solution appears to require a LAN bind, firewall bypass, SSH tunnel, or
  the other device to be reachable.
- The exact Windows Q3_K_XL artifact or Mac Optimized Speed pack is missing,
  corrupted, unverified, or no longer supported by the selected runtime.
- Windows cannot load the model and 16k context without out-of-memory or heavy
  paging, or either client repeatedly fails basic tool calls. Report this as a
  hardware-fit limit; the owner must choose a lower quant/context or model.
- MTPLX's server flags or API shape, LiteLLM's bridge key, Ollama's Responses
  support, or Codex's profile/provider schema no longer matches this plan.
- A local-mode wrapper attempts a cloud request, or a cloud-mode wrapper
  changes existing auth/config.
- An in-scope file has overlapping user changes, a verification fails twice,
  or implementation requires an unlisted repository path.

## Maintenance notes

- The Windows path trades quality and context for fitting the available 24 GB
  RAM. Q3_K_XL and 16k are a starting point, not a claim of parity with the
  48 GB Mac. Re-benchmark before increasing context or quantization.
- Ollama and MTPLX use different quantizations and inference engines, so
  outputs will not be bit-identical even though both are Qwen3.8-27B.
- Reconfirm Ollama's native Responses support before removing or adding any
  bridge. LiteLLM is intentionally Mac-only because MTPLX lacks Responses.
- Keep model/runtime versions and measured tokens/second in execution notes,
  not hard-coded into the mode file. Upgrade each device independently.
- Reviewers should scrutinize fail-closed behavior, empty Claude API-key
  handling, model alias resolution, listener addresses, and any accidental
  device identifier in committed files.
- Cross-platform secret storage remains a separate domain decision. This
  setup deliberately uses no real local API secret and does not revise ADR 0002.
