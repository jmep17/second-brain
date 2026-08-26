---
title: Terminal emulators for Ubuntu on WSL2 (agent coding)
type: answer
created: 2026-08-26
updated: 2026-08-26
sources:
  - "https://learn.microsoft.com/en-us/windows/terminal/dynamic-profiles"
  - "https://learn.microsoft.com/en-us/windows/terminal/customize-settings/profile-advanced"
  - "https://learn.microsoft.com/en-us/windows/terminal/tutorials/shell-integration"
  - "https://devblogs.microsoft.com/commandline/windows-terminal-preview-1-22-release/"
  - "https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/"
  - "https://github.com/microsoft/terminal/pull/14425"
  - "https://github.com/microsoft/terminal/issues/8389"
  - "https://github.com/microsoft/terminal/pull/5823"
  - "https://github.com/microsoft/terminal/pull/17421"
  - "https://github.com/microsoft/terminal/releases/tag/v1.25.622.0"
  - "https://github.com/microsoft/wslg"
  - "https://learn.microsoft.com/en-us/windows/wsl/basic-commands"
  - "https://code.claude.com/docs/en/terminal-config"
  - "https://wezterm.org/escape-sequences.html"
  - "https://wezterm.org/multiplexing.html"
  - "https://wezterm.org/config/lua/config/wsl_domains.html"
  - "https://wezterm.org/faq.html"
  - "https://github.com/wezterm/wezterm/issues/1673"
  - "https://sw.kovidgoyal.net/kitty/graphics-protocol/"
  - "https://sw.kovidgoyal.net/kitty/conf/"
  - "https://sw.kovidgoyal.net/kitty/faq/"
  - "https://sw.kovidgoyal.net/kitty/performance/"
  - "https://sw.kovidgoyal.net/kitty/kittens/hints/"
  - "https://alacritty.org/config-alacritty.html"
  - "https://github.com/alacritty/alacritty/issues/910"
  - "https://github.com/alacritty/vtebench"
  - "https://ghostty.org/docs/features"
  - "https://github.com/ghostty-org/ghostty/discussions/2563"
  - "https://github.com/ghostty-org/ghostty/discussions/2496"
  - "https://rioterm.com/docs/install/windows"
  - "https://rioterm.com/docs/features"
  - "https://contour-terminal.org/release-notes/"
  - "https://github.com/contour-terminal/contour/discussions/1564"
  - "https://conemu.github.io/en/wsl.html"
  - "https://github.com/vercel/hyper/issues/5435"
  - "https://raw.githubusercontent.com/tmux/tmux/3.7c/tmux.1"
  - "https://github.com/tmux/tmux/wiki/FAQ"
  - "https://github.com/tmux/tmux/issues/4902"
  - "https://zellij.dev/documentation/compatibility.html"
  - "https://github.com/microsoft/intelligent-terminal"
  - "https://github.com/GNOME/vte/blob/master/meson_options.txt"
  - "https://github.com/GNOME/vte/blob/master/src/vteseq.cc"
  - "https://codeberg.org/dnkl/foot"
  - "https://github.com/KDE/konsole/blob/master/src/terminalDisplay/TerminalPainter.h"
  - "https://invent.kde.org/utilities/konsole"
  - "https://kde.org/announcements/gear/22.04.0/"
  - "https://docs.kde.org/stable_kf6/en/konsole/konsole/index.html"
---

# Terminal emulators for Ubuntu on WSL2 (agent coding)

Everything below was verified against primary sources on **2026-08-26**. Versions move fast in this space; every version number is stated explicitly so staleness is visible.

## Recommendation

**Use Windows Terminal (stable 1.24.x, or Preview 1.25.x) as the host, run Ubuntu in it, and put `tmux` inside Ubuntu.** This is the only combination where every layer is maintained by the party that owns the interface it depends on: Microsoft owns ConPTY, owns the `wsl.exe` launcher, and owns the terminal, so the three move together. Concretely it gives you sixel images ([Preview 1.22 release notes](https://devblogs.microsoft.com/commandline/windows-terminal-preview-1-22-release/)), grapheme-cluster-correct emoji and CJK (same post), OSC 8 hyperlinks ([PR #7251](https://github.com/microsoft/terminal/pull/7251)), OSC 52 clipboard writes ([PR #5823](https://github.com/microsoft/terminal/pull/5823)), OSC 133 prompt marks stable since 1.21 ([shell integration docs](https://learn.microsoft.com/en-us/windows/terminal/tutorials/shell-integration)), and — new in Preview 1.25.622.0, 2026-03-05 — the Kitty keyboard protocol ([release notes](https://github.com/microsoft/terminal/releases/tag/v1.25.622.0)). Latest builds as of today: stable **v1.24.11911.0** and Preview **v1.25.1912.0**, both 2026-07-16 ([releases](https://github.com/microsoft/terminal/releases)).

Two things you must accept with this pick, and both have workarounds:

1. **Windows Terminal cannot show a desktop notification.** The OSC 777 PR, open since 2022-11-22, was closed **unmerged** on 2025-04-25 with the maintainer writing *"Frankly, I still don't see the value in offering this support!"* ([PR #14425](https://github.com/microsoft/terminal/pull/14425)). Anthropic's own docs confirm the consequence: Claude Code sends a desktop notification *"only in Ghostty, Kitty, and iTerm2"* ([Claude Code terminal config](https://code.claude.com/docs/en/terminal-config)). Set `preferredNotifChannel: "terminal_bell"` plus a `Notification` hook.
2. **Scrollback is hard-capped.** `historySize` has a *"maximum history size"* of `32767` lines ([advanced profile settings](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/profile-advanced)). That is small for long agent transcripts, which is one of the reasons to run tmux underneath — and Claude Code's own `/tui fullscreen` mode sidesteps terminal scrollback entirely ([terminal config](https://code.claude.com/docs/en/terminal-config)).

**Runner-up: WezTerm (nightly).** It is the only Windows-side terminal with first-class, documented WSL integration — `wsl_domains` auto-enumerates distributions by parsing `wsl -l -v` ([docs](https://wezterm.org/config/lua/config/wsl_domains.html)) — plus built-in panes, Lua config-as-code, quick-select, and both OSC 9 and OSC 777 toast notifications ([escape sequence reference](https://wezterm.org/escape-sequences.html)). Caveats: the last *tagged* release is **20240203-110809-5046fc22**, from 2024-02-03 ([releases](https://github.com/wezterm/wezterm/releases)), even though `main` was committed to on 2026-08-26 — so "use WezTerm" in practice means "use a nightly". And Kitty-protocol images have never worked on Windows: [issue #1673](https://github.com/wezterm/wezterm/issues/1673) has been open since 2022-02-28 and was still being bumped on 2026-08-21.

**If you want inline images that always work and real "agent finished" desktop notifications instead:** run **kitty natively inside Ubuntu under WSLg** (Ghostty is the equivalent choice if you prefer it; it is packaged for Ubuntu 26.04+). Those are the only configurations on a Windows box where Claude Code's desktop notifications work with zero setup, and kitty's graphics protocol is the most capable image path of anything here. You pay for it with an unsupported configuration — neither kitty's nor Ghostty's docs mention WSL at all — plus the WSLg latency and integration tradeoffs described below.

**Do not use:** Hyper (no stable release since 2023-01-08, pinned to an end-of-life Electron 22, [status issue open since 2021](https://github.com/vercel/hyper/issues/5435)) or ConEmu/cmder (ConEmu's last release was 2023-07-24 and its last commit 2025-04-07; no sixel, no OSC 8, no OSC 52, no OSC 133).

## The two architectures

Every option on this page is one of two shapes, and the shape matters more than the product.

### A. Windows-side terminal talking to WSL over ConPTY

You run a Win32 terminal (`WindowsTerminal.exe`, `wezterm-gui.exe`, `alacritty.exe`, …). It spawns `wsl.exe`, which is a Windows console application. The terminal hosts it through **ConPTY**.

ConPTY is not a pipe. Microsoft's own introduction describes the mechanism precisely: the terminal creates pipes and calls the ConPTY API, which *"spins up a ConHost instance"*; ConHost then *"Renders changes in its Output Buffer as UTF-8 encoded text/VT and sends the resulting text to its Console"* ([ConPTY announcement, 2018-08-02](https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/)). In other words: ConHost maintains a text grid, and **re-synthesises** VT output from it. Anything ConHost does not model — an image, an exotic OSC — has historically been dropped on the floor.

That is exactly why sixel took so long on Windows. The conhost sixel parser landed in [PR #17421](https://github.com/microsoft/terminal/pull/17421) (merged 2024-07-01, by community contributor j4james) with the explicit note that *"This is a first step towards supporting Sixel graphics in Windows Terminal (#448), but that will first require us to have some form of ConPTY passthrough (#1173)."* [Issue #1173](https://github.com/microsoft/terminal/issues/1173), open since 2019-06-08, was closed by [PR #17510](https://github.com/microsoft/terminal/pull/17510) ("A minor ConPTY refactoring: Goodbye VtEngine Edition", merged 2024-08-01), and the seven-year-old sixel request [#448](https://github.com/microsoft/terminal/issues/448) closed a week later on 2024-08-09; the passthrough plus a full ConPTY rewrite shipped in Terminal 1.22, which *"replaces the old console hosting subsystem (ConPTY v1) with a completely new one that promises higher fidelity for VT applications, 2x the I/O speed for VT heavy workloads (SGR), up to 16x the I/O speed for plaintext workloads"* ([1.22 release notes](https://devblogs.microsoft.com/commandline/windows-terminal-preview-1-22-release/) — vendor-published numbers, no methodology given). Sixel reached the stable channel with Terminal 1.22 ([1.23 release notes, 2025-02-05](https://devblogs.microsoft.com/commandline/windows-terminal-preview-1-23-release/)).

Two consequences you can still observe today:

- **Third-party terminals need the *new* ConPTY, and must ship it themselves.** Rio's Windows install page is explicit: *"Terminal image protocols require a modern Windows pseudoconsole (ConPTY 1.22 or newer, from the Windows Terminal project)"*, and tells you to place `conpty.dll` and `OpenConsole.exe` next to `rio.exe` ([Rio Windows install](https://rioterm.com/docs/install/windows)). WezTerm does this automatically — it prefers *"a sideloaded conpty.dll and openconsole.exe host deployed alongside the application"* ([`pty/src/win/psuedocon.rs`](https://github.com/wezterm/wezterm/blob/main/pty/src/win/psuedocon.rs)) and its installer bundles both ([`ci/windows-installer.iss`](https://github.com/wezterm/wezterm/blob/main/ci/windows-installer.iss)); the bundled build was last refreshed on 2025-02-08.
- **ConPTY has historically normalised sequences it did not understand.** WezTerm's FAQ still states: *"on Windows, the ConPTY layer strips out the curly underline escape sequences. If you're missing this feature in your WSL instance, you will need to use either wezterm ssh or multiplexing to bypass ConPTY"* ([WezTerm FAQ](https://wezterm.org/faq.html)). That specific example has since been fixed on the Microsoft side ([undercurl issue #16097 / #16288](https://github.com/microsoft/terminal/issues/16288)), so treat the FAQ text as stale in its particulars but correct in its principle — and note the sources disagree here.

What this architecture buys you: instant startup, Start-menu and jump-list integration, "default terminal application" handoff, native Windows font stack and HiDPI, drag-and-drop path translation, and no extra graphics stack.

### B. Linux-native terminal under WSLg

You `apt install kitty` (or GNOME Terminal, Konsole, Contour, Rio…) inside Ubuntu and launch it as a GUI app. There is no ConPTY anywhere: the terminal opens a real Linux PTY and speaks to your shell directly, so **every escape sequence is exactly what the program emitted**.

The plumbing, from Microsoft's own README ([microsoft/wslg](https://github.com/microsoft/wslg)):

- A separate **system distro** (based on Azure Linux 3.0) runs *"the WSLg XServer, Wayland server and Pulse Audio server"*; `DISPLAY`, `WAYLAND_DISPLAY` and `PULSE_SERVER` are preconfigured in your user distro.
- `WSLGd` launches **Weston** (with **XWayland**) and *"establishes the RDP connection by launching mstsc.exe on the host in silent mode."*
- Window integration is RDP **RAIL/VAIL**: *"In VAIL, it is understood that the Server and Client are on the same physical system and can share memory across the Guest/Host VM boundary … To share memory between the Linux guest and Windows host we use virtio-fs."* Only VAIL is actually used for WSLg.
- Clipboard: Microsoft added *"clipboard integration for copy/paste"* to Weston's RDP backend, so Windows↔Linux copy/paste works across the boundary.
- GPU: OpenGL acceleration comes from the **d3d12 Gallium driver** upstreamed in Mesa 21.0. Microsoft flags a real cost: *"vGPU interops with the Weston compositor through system memory … At very high frame rates such as 600fps on a discrete GPU, that overhead can be as high as 50%. At lower frame rate or on integrated GPU, performance much closer to native can be achieved."*
- It can be switched off entirely with `guiApplications=false` in `.wslconfig`, and requires WSL 2 — *"a distro configured to run in WSL 1 mode will not be able to communicate with WSLg."*

So WSLg is genuinely a Wayland compositor (Weston), and X11 apps go through XWayland. Note the practical implication for **foot**, which is Wayland-only by design — it should in principle work against WSLg's Weston, but neither foot nor Microsoft documents this configuration, so treat it as untested (see Open questions).

The tradeoff: full escape-sequence fidelity, real desktop notifications, kitty graphics — at the cost of an RDP hop, an extra compositor, no Windows shell integration, and — importantly — **no upstream support**. kitty's maintainer has said only *"IIRC you can run kitty via WSL"* ([issue #640](https://github.com/kovidgoyal/kitty/issues/640#issuecomment-397661173)) and, more recently, *"Unfortunately, I dont know anything about WSL so I cant help you debug further"* ([issue #8896](https://github.com/kovidgoyal/kitty/issues/8896)). Ghostty's position is the same: a collaborator's answer is *"Ghostty does currently work in wsl2 but any issues wont be actively fixed"* ([discussion #5248](https://github.com/ghostty-org/ghostty/discussions/5248)).

One thing to check before you pick a Linux-native terminal is its OpenGL floor, because that is what WSLg's Mesa d3d12 driver has to satisfy. kitty **lowered** its Linux requirement from 3.3 to *"3.1 + extensions"* in 0.28.0 ([changelog](https://sw.kovidgoyal.net/kitty/changelog/)) — the most forgiving of the three. Contour requires *"at least OpenGL 3.3 hardware accelerated or as software rasterizer"* ([README](https://github.com/contour-terminal/contour)). Ghostty **raised** its floor to **OpenGL 4.3** in 1.2.0 ([release notes](https://ghostty.org/docs/install/release-notes/1-2-0)). None of the three publishes a statement about running on llvmpipe or under WSLg specifically, so whether a given floor is met on your machine is something to test, not something to read off a doc.

## Candidate comparison

| Terminal | Runs on | WSL launch | GPU backend | Images | Desktop notif. | Health (2026-08-26) |
| --- | --- | --- | --- | --- | --- | --- |
| Windows Terminal | Windows | Auto-generated WSL profiles | D3D11 (AtlasEngine) | sixel | **No** | Stable 1.24.11911.0, 2026-07-16 |
| WezTerm | Win/Lin | `wsl_domains`, documented | OpenGL (default) or WebGpu | iTerm2; kitty **broken on Win** | OSC 9 + 777 | No tag since 2024-02-03; `main` active |
| Alacritty | Win/Lin | Set `terminal.shell` to `wsl.exe` | OpenGL | **None** | No | 0.17.0, 2026-04-06 |
| kitty | Linux only | WSLg only | OpenGL 3.1+ | kitty protocol | OSC 9/99/777 | 0.48.2, 2026-07-30 |
| Ghostty | macOS/Linux | WSLg only (unsupported) | OpenGL 4.3 | kitty protocol | OSC 9 + 777 | 1.3.1, 2026-03-13 |
| Rio | Win/Lin | **Undocumented** | wgpu (WebGPU/Vulkan/Metal) | sixel + kitty + iTerm2 | **None found** | 0.5.26, 2026-08-23 |
| Contour | Win/Lin | Maintainer says SSH-to-localhost | OpenGL 3.3 | sixel + kitty + iTerm2 + ReGIS | OSC 99 | 0.7.0, 2026-08-17 |
| ConEmu / cmder | Windows | `wsl.exe` direct, documented | None claimed | **None** | No | Last release 2023-07-24 |
| Hyper | Win/Lin | Undocumented | xterm.js WebGL addon | **None** | Undocumented | 3.4.1, 2023-01-08 |
| GNOME Terminal (VTE) | Linux | WSLg only | Cairo/CPU | sixel off by default | OSC 9 + 777 | Distro-shipped |
| Konsole | Linux | WSLg only | **None** (QPainter/CPU) | sixel + kitty + iTerm2 | — | Distro-shipped |
| foot | Linux, **Wayland only** | WSLg only | CPU | sixel | OSC 9 + 777 | Codeberg, active |

### Windows Terminal

**WSL integration is the best of any candidate, and it is automatic.** Terminal *"automatically creates Windows Subsystem for Linux (WSL) and PowerShell profiles if you install these shells"*, tagging them with `source: "Windows.Terminal.Wsl"`; you can suppress the generator via `disabledProfileSources` ([dynamic profiles](https://learn.microsoft.com/en-us/windows/terminal/dynamic-profiles)). Preview adds `pathTranslationStyle`, where `"wsl"` *"will convert paths like `C:\` to `/mnt/c`"* on drag-and-drop ([advanced profile settings](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/profile-advanced)). Working-directory handoff works through OSC 7 / OSC 9;9 emitted by your shell, which is what powers "open new tabs in the same working directory" ([shell integration](https://learn.microsoft.com/en-us/windows/terminal/tutorials/shell-integration)).

**Rendering** is AtlasEngine. Its own README describes two backends: `BackendD3D` — *"Custom, performant text renderer with our own glyph cache"* — and `BackendD2D` — *"Pure Direct2D text renderer (for low latency remote desktop and older/no GPUs)"* ([AtlasEngine README](https://github.com/microsoft/terminal/blob/main/src/renderer/atlas/README.md)); the engine header includes `<d3d11_2.h>`, i.e. the fast path is Direct3D 11. WARP software rendering is available via `experimental.rendering.software`, which *"will use the software renderer (a.k.a. WARP) instead of the hardware one"* ([rendering settings](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/rendering)).

**Fonts and Unicode.** Terminal ships Cascadia Code, which *"includes programming ligatures"* and has `Cascadia (Code|Mono) NF` variants *"includes Nerd Font symbols"* and `PL` Powerline variants ([microsoft/cascadia-code](https://github.com/microsoft/cascadia-code)). 1.22 added grapheme cluster support so that e.g. *"the polar bear emoji '🐻‍❄️'"* renders as one character ([1.22 release notes](https://devblogs.microsoft.com/commandline/windows-terminal-preview-1-22-release/)).

**Images:** sixel only. Kitty graphics is [issue #8389](https://github.com/microsoft/terminal/issues/8389), open since 2020-11-24, labelled Priority-3 and parked in the Backlog milestone. Note also that sixel in Terminal is undocumented on Microsoft Learn — the only primary sources are the blog post and the PRs.

**Clipboard:** OSC 52 write only. The PR is explicit: *"We chose not to implement the clipboard querying functionality offered by OSC 52, as sending the clipboard text to an application without the user's knowledge or consent is an immense security hole"* ([PR #5823](https://github.com/microsoft/terminal/pull/5823), merged 2020-06-30, shipped in Preview 1.2). There is no documented setting on Learn to disable it.

**Notifications:** bell only — `bellStyle` accepts `"all"`, `"audible"`, `"window"`, `"taskbar"`, `"none"`, default `"audible"`, and *"When the terminal is not in focus, only the taskbar icon will flash"* ([advanced profile settings](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/profile-advanced)). No OSC 9/777 toasts, as above.

**Also worth knowing:** Microsoft now ships **Intelligent Terminal**, *"an experimental fork of Windows Terminal with native agent integration"* that installs alongside Terminal, works with any Agent Client Protocol agent CLI (Copilot, Claude, Codex, Gemini, OpenCode), and in 0.2 lets you *"Choose a Windows-hosted or distro-local WSL agent for each"* profile ([repo](https://github.com/microsoft/intelligent-terminal); [0.2 announcement, 2026-08-10](https://devblogs.microsoft.com/commandline/intelligent-terminal-0-2-is-here-with-local-model-support/)). It is explicitly experimental, but it is the only terminal here purpose-built for this workflow.

### WezTerm

Cross-platform, Lua-configured, with built-in tabs, panes, searchable scrollback (`Ctrl-Shift-F`), quick-select, and SSH/TLS/unix multiplexing ([features](https://wezterm.org/features.html)). `front_end` accepts `"OpenGL"`, `"Software"` and `"WebGpu"`; the default was flipped to WebGpu in 20240127 and **reverted to OpenGL** in 20240128, so OpenGL is current ([front_end docs](https://wezterm.org/config/lua/config/front_end.html)). It also *"will automatically select `Software` if it detects that it is being started in a Remote Desktop environment on Windows."* On Windows it goes through ConPTY and defaults `allow_win32_input_mode = true` ([key encoding](https://wezterm.org/config/key-encoding.html)).

Escape-sequence support is unusually well documented ([reference](https://wezterm.org/escape-sequences.html)): OSC 8 yes; OSC 52 *"Requests to query the clipboard are ignored. Allows setting or clearing the clipboard"*; OSC 133 FinalTerm semantic zones yes; OSC 9 *"Show a 'toast' notification"*; OSC 777 *"Only the notify extension is supported"*; OSC 1337 iTerm2 inline images yes; and sixel marked *"Support is preliminary and incomplete"*. Kitty graphics is enabled by default in current builds ([changelog](https://wezterm.org/changelog.html)) but the escape-sequence reference page does not list the APC protocol at all — an internal inconsistency in WezTerm's own docs.

**The WSL2 caveats are specific and important.** WezTerm's built-in multiplexer over unix domains carries the note *"this only works with WSL 1. WSL 2 doesn't support AF_UNIX interop"* ([multiplexing](https://wezterm.org/multiplexing.html#unix-domains)) — so if you want persistent sessions in WSL2 you are back to `wezterm-mux-server` invoked through `wsl` with `--daemonize`, or to tmux. And on Kitty images, the maintainer's own diagnosis in [issue #1673](https://github.com/wezterm/wezterm/issues/1673) was: *"We're waiting on some combination of \[microsoft/terminal#1173 and #448\] before this will work directly on ConPTY. In the meantime, you might consider using either wezterm's multiplexing feature or `wezterm ssh` to bypass conpty."* ConPTY passthrough has since shipped and WezTerm's bundled ConPTY was updated in Feb 2025, yet the issue is still open — most recently bumped 2026-08-21.

Scrollback default is `scrollback_lines = 3500` ([docs](https://wezterm.org/config/lua/config/scrollback_lines.html)).

### Alacritty

Deliberately minimal, and says so: *"You won't find things like tabs or splits (which are best left to a window manager or terminal multiplexer) nor niceties like a GUI config editor"* ([README](https://github.com/alacritty/alacritty)). OpenGL renderer; Windows requires ConPTY, *"version 1809 or higher"*. Latest release **0.17.0, 2026-04-06** ([releases](https://github.com/alacritty/alacritty/releases)).

There is **no image support of any kind**, and no sign of it coming: [issue #910](https://github.com/alacritty/alacritty/issues/910) ("Add support for libsixel") has been open since **2017-11-21**. Ligatures are not mentioned anywhere in the config reference. It has no built-in WSL concept; you set `terminal.shell` (default on Windows is `"powershell"`) to `wsl.exe` ([alacritty.5](https://github.com/alacritty/alacritty/blob/master/extra/man/alacritty.5.scd)).

What it does well: OSC 8 hyperlinks since 0.11.0, `hints` with `hyperlinks = true` by default so OSC 8 links are hintable, `scrolling.history` default `10000` and *"Limited to 100000"*, and a well-chosen OSC 52 default — `terminal.osc52` defaults to `"OnlyCopy"`, i.e. write allowed, paste/read denied ([config reference](https://alacritty.org/config-alacritty.html)). Note that Claude Code lists Alacritty among the terminals where Shift+Enter needs `/terminal-setup` run once ([terminal config](https://code.claude.com/docs/en/terminal-config)).

### kitty (Linux-native under WSLg)

Latest **0.48.2, 2026-07-30** ([changelog](https://sw.kovidgoyal.net/kitty/changelog/)). No Windows build exists and none is planned: *"As for making it a native windows executable, not somthing I am interested in, but contributions are welcome"* ([issue #640](https://github.com/kovidgoyal/kitty/issues/640#issuecomment-397661173)).

It is the strongest terminal here on the dimensions that matter for agents:

- **Graphics.** The [kitty graphics protocol](https://sw.kovidgoyal.net/kitty/graphics-protocol/) supports PNG / RGB / RGBA, zlib compression, transmission by escape payload, file, temp file or shared memory, sub-cell placement, animation, and z-index — *"Negative z-index values mean that the images will be drawn under the text."* There is **no sixel support at all** (zero occurrences in the entire repo).
- **Clipboard.** `clipboard_control` defaults to `write-clipboard write-primary read-clipboard-ask read-primary-ask` — writes silent, reads prompt. The docs warn that *"disabling the read confirmation is a security risk as it means that any program, even the ones running on a remote server via SSH can read your clipboard"* ([conf](https://sw.kovidgoyal.net/kitty/conf/#opt-kitty.clipboard_control)).
- **Scrollback.** `scrollback_lines` defaults to 2000 but *"Negative numbers are (effectively) infinite scrollback"*, and `scrollback_pager_history_size` gives a separate on-disk-ish pager buffer up to 4 GB ([conf](https://sw.kovidgoyal.net/kitty/conf/#opt-kitty.scrollback_lines)).
- **File paths from agent output.** The `hints` kitten's `--type linenum` matches *"anything that looks like a path or filename followed by a colon and a line number and open the file in your default editor at the specified line number"* — bound by default to `ctrl+shift+p > n` ([hints kitten](https://sw.kovidgoyal.net/kitty/kittens/hints/)). This is the single best "click the file:line in the agent's output" mechanism in any terminal here.
- **Notifications.** kitty's own OSC 99 protocol (buttons, icons, urgency, activation reporting), plus *"the legacy OSC 9 protocol developed by iTerm2"* and OSC 777 since 0.24.0 ([desktop notifications](https://sw.kovidgoyal.net/kitty/desktop-notifications/)).
- **Shell integration** is `enabled` by default and auto-injected, providing OSC 133 marks, jump-to-prompt, "open last command output in pager" (`ctrl+shift+g`), and *"Glitch free window resizing even with complex prompts"* ([shell integration](https://sw.kovidgoyal.net/kitty/shell-integration/)).
- **Nerd Fonts.** *"If you are trying to use a font patched with Nerd Fonts symbols, don't do that as patching destroys fonts. There is no need, kitty has a builtin NERD font"* ([FAQ](https://sw.kovidgoyal.net/kitty/faq/)).

kitty is also openly hostile to multiplexers — see the Multiplexers section.

### Ghostty

**There is still no Windows build, and it is still not planned.** The README roadmap marks *"Windows Terminals (including PowerShell, Cmd, WSL) ❌"* ([README](https://github.com/ghostty-org/ghostty)), and the 1.3.0 release notes (2026-03-09) say: *"To answer a common request, support for Microsoft Windows is still not planned. This still remains part of the long term roadmap, but I think that focusing on a capable and powerful libghostty will enable better Windows support in the long run. libghostty itself already supports Windows."* ([release notes](https://ghostty.org/docs/install/release-notes/1-3-0)). The live thread is [discussion #2563](https://github.com/ghostty-org/ghostty/discussions/2563), where a maintainer set the terms for any contribution on 2026-04-22: no GTK-on-Windows port, *"We'd like a Direct3D-based renderer with a similar performance and feature set as our Metal and OpenGL backends"*, Windows 10/11 only. A collaborator gave the timeline as *"There is no set timeline"* ([discussion #12290](https://github.com/ghostty-org/ghostty/discussions/12290)).

Latest release **1.3.1, 2026-03-13**; 1.4 planned for September 2026. Linux is GTK4 + libadwaita, requiring GTK 4.14 / libadwaita 1.5 and **OpenGL 4.3** since 1.2.0.

Feature-wise it is close to kitty: Kitty graphics yes; **sixel never** — *"Ghostty will not support sixels"* ([discussion #2496](https://github.com/ghostty-org/ghostty/discussions/2496), answered 2024-11-22 and locked); iTerm2 OSC 1337 is *"Parse (but do not implement)"* as of 1.3.0. OSC 52 read defaults to `ask` (`clipboard-read = ask`, `clipboard-write = allow`) ([config reference](https://ghostty.org/docs/config/reference#clipboard-read)). `desktop-notifications` is on by default for OSC 9 and OSC 777. Scrollback is **byte-based**: `scrollback-limit` defaults to 10 MB and *"It is not currently possible to set an unlimited scrollback buffer"* ([reference](https://ghostty.org/docs/config/reference#scrollback-limit)).

For WSL specifically: nothing in the docs, only [discussion #5248](https://github.com/ghostty-org/ghostty/discussions/5248) — *"Ghostty does currently work in wsl2 but any issues wont be actively fixed."*

### Rio

The most feature-complete Windows-side terminal on paper, and the most actively released — **v0.5.26, August 2026**, with commits the same week as this research ([releases](https://github.com/raphamorim/rio/releases)). It has **all three image protocols**: *"iTerm2 image protocol"*, *"Kitty graphics protocol"*, *"Sixel protocol"* ([features](https://rioterm.com/docs/features)), with per-image GPU textures. OSC 8 ([hyperlinks](https://rioterm.com/docs/features/hyperlinks)), OSC 52 (advertised in DA1 since 0.5.0), OSC 133 semantic zones with `ScrollToPrevPrompt`/`ScrollToNextPrompt` (0.4.12), OSC 9;4 progress, splits and tabs, `scrollback-history-limit` default 10000 ([config](https://rioterm.com/docs/config)). Renderer is Sugarloaf on wgpu — `Metal` on macOS, `Vulkan` on Linux, `Webgpu` elsewhere including Windows.

Two blockers for this use case. First, **WSL integration is entirely undocumented** — there is no WSL profile, no `wsl.exe` recipe, nothing on rioterm.com. You would be relying on the generic `[shell] program` override. Second, Windows image support requires you to hand-install ConPTY 1.22+ next to `rio.exe` ([Windows install](https://rioterm.com/docs/install/windows)). Rio's own changelog also documents a ConPTY-specific latency bug it had to work around in 0.5.5: *"Fixed typing echo in synchronized-output TUIs arriving ~150-200 ms late through Windows ConPTY"* ([changelog](https://rioterm.com/changelog)) — a concrete illustration of the architecture-A tax on TUIs like Claude Code. Its (vendor-published) throughput numbers are in the throughput subsection below.

### Contour

**0.7.0, 2026-08-17** — a very large release ([release notes](https://contour-terminal.org/release-notes/)). Historically the sixel flagship (*"Contour implements first-class Sixel image support"*, plus ReGIS vector graphics), 0.7.0 added *"the kitty graphics protocol (APC G)"* and *"iTerm2 OSC 1337 capabilities and inline images"*. It also has the most interesting agent-relevant feature of any terminal here: **output folding** driven by OSC 133 marks, letting you collapse a finished command's output to its prompt line (0.7.1, in development), and `history.hard_limit` for *"evicting complete commands rather than arbitrary lines"*.

Other highlights: OSC 52 read with an opt-in policy (0.7.0), kitty OSC 99 desktop notifications with a D-Bus backend, OSC 8 with hover tooltips, splits and tabs with named `layouts.yml`, and an experimental **daemon** — *"`contour daemon` hosts shell sessions in a background process"* that *"Speaks tmux control-mode protocol; `contour client --tmux` attaches to tmux server"*, on Linux, macOS and Windows.

The catch is the same as Rio's: no WSL profile type. The maintainer's own documented answer is to use Contour's built-in SSH client against `localhost` inside WSL ([discussion #1564](https://github.com/contour-terminal/contour/discussions/1564)). Scrollback `history.limit` defaults to a stingy 1000 (`-1` for unlimited).

### ConEmu / cmder

ConEmu documents WSL launching properly — for WSL2, run `wsl.exe` directly with no bridge (*"For the moment this is preferred solution"*), while the old WSL1 wslbridge path *"does not work properly with latest WSL version"* ([ConEmu WSL page](https://conemu.github.io/en/wsl.html)). Split panes are genuinely good ([split screen](https://conemu.github.io/en/SplitScreen.html)), and backscroll goes to 32766 lines.

Everything else disqualifies it for this workflow: no sixel, no kitty graphics, no OSC 8, no OSC 52, no OSC 133 in its escape-code reference ([ANSI escape codes](https://conemu.github.io/en/AnsiEscapeCodes.html)) — its only OSC 9 usage is the ConEmu progress/message extension that everyone else copied. No GPU acceleration is claimed anywhere; the font settings are GDI-era ClearType options. And it is dormant: last release **2023-07-24**, last commit **2025-04-07**, while the homepage still calls itself *"an active project"* under a © 2022 notice.

cmder is *"a software package … based on ConEmu with major config overhaul"* ([README](https://github.com/cmderdev/cmder)), so it inherits all of the above. Its commit stream looks alive but is almost entirely dependabot CI bumps; last release **v1.3.25, 2024-05-31**.

### Hyper

Electron + React + xterm.js 5.3.0 with the WebGL addon ([hyper.is](https://hyper.is/)). No image protocols, and OSC 8 / OSC 52 / OSC 133 / notifications are **not documented anywhere** by the project. Scrollback default 1000. Last stable **3.4.1, 2023-01-08**; last canary **4.0.0-canary.5, 2023-07-13**, which never became stable. The project's own status thread has been open since 2021-03-24: *"We are working with a potential new maintainer and will share more updates on this issue as things develop"* ([issue #5435](https://github.com/vercel/hyper/issues/5435)). It is pinned to Electron 22.3.25, which is past end-of-life. Avoid.

### WSLg-based Linux-native terminals: GNOME Terminal, Konsole, foot

Running these under WSLg is viable and it is what `apt` gives you for free. The family's strength is fidelity — no ConPTY in the path at all. Its weakness, for agent work specifically, is that the distro defaults are the *weakest* terminals in this whole survey.

**GNOME Terminal / VTE.** VTE is the origin of OSC 8, and its OSC table confirms it handles OSC 8 (`VTEHYPER`), OSC 133 (named `ITERM2_SHELL_INTEGRATION`), OSC 9 (`CONEMU_EXTENSION`) and OSC 777 (`URXVT_EXTENSION`) ([`src/parser-osc.hh`](https://github.com/GNOME/vte/blob/master/src/parser-osc.hh), [`src/vteseq.cc`](https://github.com/GNOME/vte/blob/master/src/vteseq.cc)). Two things it does **not** do, both visible in the same dispatch: `VTE_OSC_XTERM_SET_XSELECTION` (OSC 52) and `VTE_OSC_ITERM2_1337` sit in the explicitly-ignored branch — so **GNOME Terminal silently drops OSC 52 clipboard writes**, which is exactly the mechanism an agent on a remote box would use to copy for you. And sixel is a build-time option that is **off by default**: `option('sixel', type: 'boolean', value: false, description: 'Enable SIXEL support')` ([`meson_options.txt`](https://github.com/GNOME/vte/blob/master/meson_options.txt)) — whether your Ubuntu build has it depends on distro packaging, which I did not verify.

Claude Code's own compatibility table also puts `gnome-terminal` in the "Shift+Enter **Not available**; use Ctrl+J or `\` then Enter" column — the worst position of any terminal it lists ([terminal config](https://code.claude.com/docs/en/terminal-config)).

**Konsole.** Verified against a full clone of [invent.kde.org/utilities/konsole](https://invent.kde.org/utilities/konsole) at `master` = `ad4528a0`, 2026-08-25, `RELEASE_SERVICE_VERSION` 26.11.70. It is far better equipped than its documentation suggests, and the documentation is the problem.

- **All three image protocols.** `Screen.h` declares `enum source { Sixel, iTerm, Kitty }`; sixel enters via the DCS hook in `Vt102Emulation.cpp`, iTerm2 via OSC 1337, kitty via the APC `G` dispatch. Sixel is genuinely rendered, not merely parsed — `TerminalPainter` carries `drawImagesBelowText(... QRegion &sixelRegion)` / `drawImagesAboveText(...)` ([`TerminalPainter.h`](https://github.com/KDE/konsole/blob/master/src/terminalDisplay/TerminalPainter.h)). Sixel is **always on** — there is no profile key and no kcfg key for it, and Konsole advertises it unconditionally in its Device Attributes reply (`\033[?62;1;4c`). Landed in **KDE Gear 22.04**, the one version claim here with announcement-level confirmation: *"Konsole now supports Sixel images that can be displayed right inside the window"* ([Gear 22.04.0 announcement](https://kde.org/announcements/gear/22.04.0/), 2022-04-21).
- **OSC 8 hyperlinks: supported but OFF by default.** The profile property is `AllowEscapedLinks`, default `false` (`src/profile/Profile.cpp`), surfaced as the checkbox **"Allow escape sequences for links"** on the profile's Mouse page. A companion `EscapedLinksSchema` restricts accepted schemes to `http://;https://;file://` — the source comment says *"for security reason we can't accept some weird ones like git:// and ssh://"*. Do not confuse this with `UnderlineLinksEnabled` (default `true`), which is the plain-text URL regex filter, not OSC 8.
- **OSC 52: write-only, and gated by nothing.** The handler in `Vt102Emulation.cpp` base64-decodes straight into `QApplication::clipboard()->setText(...)` with no profile check anywhere on the path — there is no `AllowEscapeSequenceClipboard`-style key in the property table, the kcfg, or any `.ui` file. Read is deliberately unimplemented; the landing commit says *"I've intentionally omitted read access to the clipboard as that comes with several security concerns, which should be discussed first"* (2024-07-24, in-tree version 24.11.70 → the Gear 24.12 cycle). So Konsole is the **most permissive** terminal in this survey on clipboard writes: unlike Alacritty, kitty, Ghostty or Contour, there is no policy knob to tighten.
- **OSC 133 semantic prompts: supported and the only one of the four that is user-documented.** `A`/`N`/`P` → prompt, `B` → input, `C` → output, `D;<exit_code>` records the exit status. **Ctrl+Alt+]** pastes a ready-made bash `PS0`/`PS1`/`PS2` setup, and the profile has a **"Semantic Integration"** tab (`SemanticHints`, `SemanticUpDown`, `SemanticInputClick`). Covered in the handbook under [Semantic Shell Integration](https://docs.kde.org/stable_kf6/en/konsole/konsole/index.html). Landed in the Gear 22.08 cycle.
- **Tabs and splits, both detachable.** Split left/right (Ctrl+`(`) and top/bottom (Ctrl+`)`), expand/shrink/maximize/equalize, `Detach Current Tab` (Ctrl+Shift+L) and `Detach Current View` (Ctrl+Shift+H). Undocumented extras exist in `ViewManager.cpp`: "Split View Automatically", the "…from next tab" variants, and 2x2 / 2x1 layout presets.
- **No GPU path at all.** `TerminalDisplay` is a plain `QWidget` painted with `QPainter` in `paintEvent`; a grep for `QOpenGL|QGLWidget|OpenGL|RHI|QQuick` across `src/` returns **zero matches**. Compositing is queried only for translucency. Qt 6.5+ is mandatory (Qt 5 support was dropped). For a high-throughput agent transcript this is the weakest renderer here — kitty and Ghostty are GPU-rasterised, Konsole is not.
- **Wayland works; the docs deny it.** X11 is an opt-out build flag (`option(WITH_X11 ... ON)`, every call site `#if WITH_X11`-guarded), and there is explicit Wayland code — `KWindowSystem::isPlatformWayland()`, `KWaylandExtras::requestXdgActivationToken(...)`. That makes it WSLg-viable. But the handbook still opens with *"Konsole is an X terminal emulator"* and never mentions Wayland; the docbook's own revision stamp is **KDE Gear 24.05 / 2024-04-23**, ~2 years stale against master.

**Documentation health warning.** Sixel, OSC 8 and OSC 52 appear **nowhere** in Konsole's handbook or on [apps.kde.org/konsole](https://apps.kde.org/konsole); only OSC 133 is user-documented. The handbook also still claims splitting means *"Any output on one view is duplicated in the other view"*, which the source contradicts — `ViewManager::splitView()` calls `createSession()` and each split gets its own independent session. Everything above is read from source, not from docs.

**foot.** Wayland-native by design — *"The fast, lightweight and minimalistic Wayland terminal emulator"* — with no X11 backend at all ([README](https://codeberg.org/dnkl/foot)). Its feature list covers *"Sixel image support"*, OSC 8 hyperlinks, OSC 52 clipboard, OSC 133 shell integration (*"jumping between prompts, piping command output"*), desktop notifications via OSC 9 and OSC 777, and scrollback search. Ligatures are not listed. Because WSLg's compositor *is* Weston, foot should in principle run there — but see Open questions; nobody documents it.

**Bottom line for this family:** if you go Linux-native under WSLg, install kitty or Ghostty — both are GPU-rasterised and both document what they support. Konsole is a defensible third choice if you already run KDE (all three image protocols, OSC 8/52/133, real splits), with the caveats that it renders on the CPU and that you must turn OSC 8 on yourself. GNOME Terminal is the one to avoid: it silently drops OSC 52 and may not have sixel compiled in.

### Scrollback capacity at a glance

Relevant because agent transcripts are long. All values are project defaults from the config docs cited in each subsection above.

| Terminal | Default | Ceiling |
| --- | --- | --- |
| Windows Terminal | 9001 lines | **32767 lines (hard)** |
| WezTerm | 3500 lines | unbounded (config) |
| Alacritty | 10000 lines | 100000 lines |
| kitty | 2000 lines | negative = effectively infinite, + 4 GB pager buffer |
| Ghostty | 10 MB (**bytes, not lines**) | no unlimited option |
| Rio | 10000 lines | unbounded (config) |
| Contour | 1000 lines | `-1` = unlimited |
| ConEmu | not documented | 32766 lines |
| Hyper | 1000 lines | — |
| tmux | 2000 lines | `INT_MAX` |
| zellij | 10000 lines | — |

### Throughput and latency: what is actually known

Short version: **nothing reliable.** There is no neutral cross-terminal benchmark, and every number published is a vendor claim.

- The one widely-used harness is Alacritty's `vtebench`, and its README disclaims itself: *"This benchmark is not sufficient to get a general understanding of the performance of a terminal emulator. It lacks support for critical factors like frame rate or latency"* ([vtebench](https://github.com/alacritty/vtebench)).
- **kitty** publishes the only comparative table, claiming it is *"twice as fast as the next best"* ([performance](https://sw.kovidgoyal.net/kitty/performance/)). Read the caveats on the same page: the numbers are from **kitty 0.33** (current is 0.48.2), *"the benchmark kitten suppresses actual rendering, to better focus on parser speed"*, and by kitty's own admission *"konsole, gnome-terminal and xterm do not support the Synchronized update escape code"* — so those three are not measured on the same footing. Hardware was a single *"AMD Ryzen 7 PRO 5850U"* on Linux/X11.
- **Ghostty** publishes no numbers at all, only a positioning claim: it is *"generally in the same performance category as the other highest performing terminal emulators"*, and *"Ghostty and Alacritty are usually within a few percentage points of each other on various benchmarks, but are both something like 100x faster than Terminal.app and iTerm"* ([README](https://github.com/ghostty-org/ghostty)). No benchmark, hardware, or reproducible data backs this.
- **Microsoft** claims the 1.22 ConPTY rewrite delivers *"2x the I/O speed for VT heavy workloads (SGR), up to 16x the I/O speed for plaintext workloads"* ([1.22 release notes](https://devblogs.microsoft.com/commandline/windows-terminal-preview-1-22-release/)) — again with no methodology.
- **Rio** publishes the most specific figures, all self-measured ([changelog](https://rioterm.com/changelog)). 0.5.3 (2026-07-31): *"Plain text and scrolling-heavy output parse ~2.7x faster (865 → 2340 MiB/s on plain ASCII, 266 → 772 MiB/s on scroll-dominated streams)"* and *"CJK and emoji text 3x (243 → 726 MiB/s)"*. 0.5.21 (2026-08-12), on escape-sequence parsing: *"Measured on 4 MiB payloads: kitty APC 481 MiB/s to 29 GiB/s, OSC 628 MiB/s to 17 GiB/s, sixel DCS 824 MiB/s to 15 GiB/s"*. 0.5.26 (2026-08-24): *"An unthrottled full-screen truecolor benchmark went from ~340 fps to ~1900 fps"*.
- For **latency specifically** on WSL, the most useful data point is not a benchmark but a bug Rio had to work around, in 0.5.5 (2026-08-01): *"Fixed typing echo in synchronized-output TUIs arriving ~150-200 ms late through Windows ConPTY. ConPTY coalesces output, so a frame's begin/end synchronized-update pair (mode 2026) often arrives inside one chunk"* ([changelog](https://rioterm.com/changelog)). Claude Code is exactly such a synchronized-output TUI. The lesson: interactive latency in agent TUIs on Windows is shaped by the ConPTY layer, not mainly by which Win32 terminal you picked.


## Feature support matrix

Verified 2026-08-26. "—" means the project's own primary sources do not document the feature; that is not always the same as "absent".

| Terminal | sixel | kitty gfx | iTerm2 img | OSC 8 | OSC 52 write | OSC 52 read | OSC 133 | Desktop notif. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Windows Terminal 1.24/1.25 | Yes (1.22+) | No ([#8389](https://github.com/microsoft/terminal/issues/8389)) | No | Yes | Yes | **Refused by design** | Yes (stable 1.21+) | **No** ([#14425](https://github.com/microsoft/terminal/pull/14425)) |
| WezTerm (nightly) | *"preliminary and incomplete"* | Yes (broken on Windows, [#1673](https://github.com/wezterm/wezterm/issues/1673)) | Yes | Yes | Yes | Ignored | Yes | OSC 9 + OSC 777 |
| Alacritty 0.17 | No ([#910](https://github.com/alacritty/alacritty/issues/910)) | No | No | Yes (0.11+) | Yes (default `OnlyCopy`) | Off by default | — | No |
| kitty 0.48 | **Never** | Yes (native) | — | Yes | Yes | **Ask** by default | Yes | OSC 9 + 777 + **99** |
| Ghostty 1.3 | **Never** ([#2496](https://github.com/ghostty-org/ghostty/discussions/2496)) | Yes | Parsed, not implemented | Yes | Yes (`allow`) | **Ask** by default | Yes | OSC 9 + 777 |
| Rio 0.5 | Yes | Yes | Yes | Yes | Yes | — | Yes (changelog only) | — |
| Contour 0.7 | Yes (+ ReGIS) | Yes (0.7.0+) | Yes (0.7.0+) | Yes (+ tooltip) | Yes | Yes, opt-in policy | Yes (+ output folding) | OSC **99** |
| GNOME Terminal (VTE) | Build option, **off by default** | No | **Ignored** | Yes | **Ignored** | No | Yes | OSC 9 + 777 |
| Konsole 26.11 | Yes, always on | Yes (APC `G`) | Yes (OSC 1337) | Yes, **off by default** (`AllowEscapedLinks`) | Yes, **ungated** | Not implemented | Yes (+ Ctrl+Alt+] setup) | — |
| foot | Yes | No | — | Yes | Yes | — | Yes | OSC 9 + 777 |
| ConEmu / cmder | No | No | No | No | No | No | No | No |
| Hyper 3.4 | No | No | No | — | — | — | — | — |
| tmux 3.7 | Yes, if built `--enable-sixel` | **No** ([#4902](https://github.com/tmux/tmux/issues/4902)) | n/a | Yes (3.4+) | `set-clipboard` (default `external`) | `get-clipboard` (default `buffer`) | pass-through | pass-through only |
| zellij 0.45 | Yes (0.31+) | **Yes (0.45+)** | n/a | Yes (0.21+) | Yes | **Disabled by default** since 0.45 | pass-through | pass-through only |

Notes on the reads column: Windows Terminal's refusal is explicit — *"sending the clipboard text to an application without the user's knowledge or consent is an immense security hole"* ([PR #5823](https://github.com/microsoft/terminal/pull/5823)). kitty and Ghostty both prompt. zellij 0.45 changed the default: *"Reading the clipboard through `OSC 52` is disabled by default since `0.45.0`: programs asking for the clipboard contents receive an empty reply … once enabled, any program in any pane — including one running on a remote machine over SSH — can read the clipboard without prompting"* ([compatibility](https://zellij.dev/documentation/compatibility.html)).

## Multiplexers

### Why you still want one under WSL2

Windows Terminal's 32767-line scrollback cap, the lack of any session persistence when the Terminal window dies, and the fact that WSL's VM can be `wsl --shutdown`-ed out from under you all argue for a multiplexer. tmux sessions are *"persistent and will survive accidental disconnection … or intentional detaching"* ([tmux.1](https://raw.githubusercontent.com/tmux/tmux/3.7c/tmux.1)), and `history-limit` maxes out at `INT_MAX` lines against a default of 2000 ([options-table.c](https://github.com/tmux/tmux/blob/master/options-table.c)).

### The passthrough problem — the thing that actually bites

tmux states its policy plainly: *"tmux takes care not to send escape sequences to a terminal that it isn't going to understand because it can't predict how it will react"* ([FAQ](https://github.com/tmux/tmux/wiki/FAQ)). Anything it doesn't model is discarded. The escape hatch is a DCS wrapper, `\033Ptmux;<doubled ESCs>\033\\`, and since tmux 3.3 it is gated:

> **allow-passthrough** \[on | off | all\] — Allow programs in the pane to bypass tmux using a terminal escape sequence (`\ePtmux;...\e\\`). If set to **on**, passthrough sequences will be allowed only if the pane is visible. If set to **all**, they will be allowed even if the pane is invisible.
> — [tmux.1, 3.7c](https://raw.githubusercontent.com/tmux/tmux/3.7c/tmux.1)

**The default is `off`** — the man page does not say so, but `options-table.c` gives `allow-passthrough` `.default_num = 0` against a choice list of `{"off", "on", "all"}` ([options-table.c](https://github.com/tmux/tmux/blob/3.7c/options-table.c#L1086)). Anthropic's docs give the concrete consequence: inside tmux, *"desktop notifications and the progress bar never reach the outer terminal"* until you set `allow-passthrough on` ([Claude Code terminal config](https://code.claude.com/docs/en/terminal-config)). The FAQ also warns *"tmux isn't aware of any changes made to the terminal state by the passthrough escape sequence, it is possible for it to undo them."*

GNU Screen, by contrast, forwards DCS bodies unconditionally with no option — hence the different idiom (`\eP…\e\\` vs `\ePtmux;…\e\\`) ([Screen control sequences](https://www.gnu.org/software/screen/manual/html_node/Control-Sequences.html)).

Two clipboard defaults in the same file are worth knowing, since agents copy things: `set-clipboard` defaults to `external` (index 1 of `{"off", "external", "on"}`), meaning tmux will set the *system* clipboard but will **not** let applications create paste buffers — that needs `on`. And `get-clipboard` defaults to `buffer`, i.e. when an application asks to *read* the clipboard, tmux answers with *"the newest buffer"* rather than the real system clipboard ([options-table.c](https://github.com/tmux/tmux/blob/3.7c/options-table.c)). So an OSC 52 read inside tmux does not see your Windows clipboard by default.

Beyond passthrough, tmux also **gates capability advertisement** through terminfo extensions — `Ms` for OSC 52, `Hls` for OSC 8, `Sxl` for sixel, `Dseks`/`Eneks` for extended keys. Most "OSC X doesn't work in tmux" reports are this negotiation failing, not tmux stripping anything.

### tmux vs zellij vs built-in

| | tmux 3.7c (2026-08-17) | zellij 0.45.0 (2026-08-20) |
| --- | --- | --- |
| sixel | Yes, **only if built `--enable-sixel`** | Yes since 0.31.0 |
| kitty graphics | **No** — see below | **Yes**, implemented natively in 0.45.0 |
| OSC 8 | Yes since 3.4, stored per-cell | Yes since 0.21.0 |
| OSC 52 | `set-clipboard` default `external` | Write yes; read disabled by default since 0.45 |
| Scrollback default | 2000 (`history-limit`) | 10000 (`scroll_buffer_size`) |
| Persistence | Survives detach; dies with the server | **Serialised to disk**, survives reboot |
| Keyboard | CSI-u / modifyOtherKeys via `extended-keys` | — |
| Config | `.tmux.conf` | KDL |

- **tmux sixel is opt-in at build time.** *"Add basic support for SIXEL if built with --enable-sixel"* ([CHANGES, 3.4](https://github.com/tmux/tmux/blob/master/CHANGES)); `configure.ac` defaults it off. Debian's `debian/rules` does pass `--enable-sixel` for both 3.5a and 3.7b ([sources.debian.org](https://sources.debian.org/src/tmux/3.7b-1/debian/rules/)), and Ubuntu derives from Debian, so Ubuntu 26.04's `tmux 3.6a-2ubuntu0.1` ([packages.ubuntu.com](https://packages.ubuntu.com/search?keywords=tmux)) very likely has it — but I did not verify Ubuntu's build flags directly.
- **tmux has no kitty graphics support and none merged.** [Issue #4902](https://github.com/tmux/tmux/issues/4902), opened 2026-03-01 with a proof-of-concept branch, was closed 2026-08-06 with *"I'm going to close this in favour of @mgrant0's PRs"* — nothing is on `master`. The maintainer described what raw passthrough gets you: *"The image crosses over between multiple panes instead of being cropped to stay within one pane. `C-b r` does not redraw it."*
- **kitty's workaround for this is Unicode placeholders**, added in 0.28.0 explicitly because of tmux: *"we use a single Private Use Unicode character as a placeholder to indicate to the terminal that an image is supposed to be displayed at that cell … Unicode aware application will move it around as needed when they redraw their screens"* ([graphics protocol](https://sw.kovidgoyal.net/kitty/graphics-protocol/)). kitty's FAQ is blunt: *"terminal multiplexers are a bad idea, do not use them, if at all possible … \[advanced features\] may or may not work, depending on the whims of tmux's maintainer"* ([FAQ](https://sw.kovidgoyal.net/kitty/faq/)).
- **zellij takes the opposite approach — emulate rather than tunnel.** *"When Zellij starts, it queries the terminal it is running in for the features it supports, and only advertises those to the programs running inside panes"*, and for images it *"keeps track of image placements per pane, so images survive resizing, relayouts, scrolling through the scrollback, fullscreen, and floating or pinned panes"* ([compatibility](https://zellij.dev/documentation/compatibility.html)). There is no `allow-passthrough` equivalent because there is nothing to pass through. Kitty graphics can be turned off with `support_kitty_graphics_protocol`.
- **Built-in multiplexing** is a poor substitute under WSL2. WezTerm's unix domains *"only works with WSL 1"*; Contour's daemon is brand-new and experimental; kitty and Ghostty offer splits and sessions but no detach-and-reattach persistence (kitty's FAQ concedes it does what tmux does *"better, with the exception of remote persistence"*).
- **Multiplexers cost throughput.** kitty's own benchmark table includes an `alacritty+tmux` row specifically to show *"the effect of putting a terminal multiplexer into the mix (halving throughput)"* ([performance](https://sw.kovidgoyal.net/kitty/performance/)).

**Verdict:** use **tmux** if you want the mature, universally-supported option and are willing to configure passthrough (this is what Anthropic documents). Use **zellij** if inline images through the multiplexer matter more than ecosystem maturity — it is the only multiplexer that renders kitty-protocol images correctly today.

## Recommended setup for agent coding

Host: **Windows Terminal**, Ubuntu in WSL2, tmux inside.

**1. Windows Terminal `settings.json`** (`%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json`):

```jsonc
{
  "defaultProfile": "{<your-ubuntu-guid>}",
  "profiles": {
    "defaults": {
      // Cascadia Mono NF ships with Terminal and carries Nerd Font glyphs.
      // Use "Cascadia Code NF" instead if you want programming ligatures.
      "font": { "face": "Cascadia Mono NF", "size": 11 },
      "historySize": 32767,          // documented maximum
      "antialiasingMode": "grayscale",
      "showMarksOnScrollbar": true,  // OSC 133 marks in the scrollbar
      "autoMarkPrompts": true,
      "bellStyle": ["window", "taskbar"],  // flash instead of beeping
      "snapOnInput": true
    },
    "list": [
      {
        "source": "Windows.Terminal.Wsl",
        "name": "Ubuntu",
        // Microsoft's documented WSL form; backslashes must be escaped.
        "startingDirectory": "\\\\wsl$\\Ubuntu\\home\\<you>"
      }
    ]
  },
  "actions": [
    { "keys": "ctrl+up",   "command": { "action": "scrollToMark", "direction": "previous" } },
    { "keys": "ctrl+down", "command": { "action": "scrollToMark", "direction": "next" } },
    { "keys": "ctrl+g",    "command": { "action": "selectOutput", "direction": "prev" } }
  ]
}
```

Leave the WSL profile auto-generated (`source: "Windows.Terminal.Wsl"`) rather than hand-writing a `commandline` — that is what keeps `wsl.exe` invocation correct across WSL updates ([dynamic profiles](https://learn.microsoft.com/en-us/windows/terminal/dynamic-profiles)). The keybindings above only do anything once shell integration is on ([shell integration](https://learn.microsoft.com/en-us/windows/terminal/tutorials/shell-integration)).

**2. Shell integration in Ubuntu.** Microsoft publishes a complete bash recipe — source it from `~/.bashrc` verbatim rather than hand-rolling it, because `PS0`/`PS1`/`PS2` all have to be wrapped consistently or long commands corrupt ([shell integration tutorial](https://learn.microsoft.com/en-us/windows/terminal/tutorials/shell-integration)). The four sequences it installs are:

```text
OSC 133 ; A ST              # start of prompt
OSC 133 ; B ST              # end of prompt / start of commandline
OSC 133 ; C ST              # start of command output   (needs bash >= 4.4 for PS0)
OSC 133 ; D ; <ExitCode> ST # end of command; 0 = success, anything else = error
```

Add OSC 7 to the same prompt so "duplicate tab in the same directory" works:

```bash
PROMPT_COMMAND=${PROMPT_COMMAND:+$PROMPT_COMMAND$'\n'}'printf "\033]7;file://%s%s\033\\" "$HOSTNAME" "$PWD"'
```

**3. tmux** — `~/.tmux.conf`. The first three lines are Anthropic's documented requirement ([terminal config](https://code.claude.com/docs/en/terminal-config)):

```bash
set -g  allow-passthrough on          # notifications + progress bar reach Windows Terminal
set -s  extended-keys on              # so Shift+Enter is distinguishable from Enter
set -as terminal-features 'xterm*:extkeys'

set -g  history-limit 200000          # long agent transcripts; default is 2000
set -g  set-clipboard on              # accept OSC 52 from apps AND forward to the terminal

# Tell tmux what the outer terminal can do, or it will not forward these.
set -as terminal-features 'xterm*:hyperlinks'    # OSC 8
set -as terminal-features 'xterm*:progressbar'   # OSC 9;4 - Claude Code's progress bar
set -as terminal-features 'xterm*:sixel'         # only if your tmux was built with sixel

set -g  mouse on
setw -g mode-keys vi
```

Check the last one actually applies before enabling it — tmux exposes `sixel_support`, *"1 if server has support for SIXEL"*:

```bash
tmux display -p '#{sixel_support}'
```

`set-clipboard on` rather than the default `external` is deliberate. Per the man page, `on` means tmux *"will both accept the escape sequence to create a buffer and attempt to set the terminal clipboard"*, whereas `external` *"will attempt to set the terminal clipboard but ignore attempts by applications to set \[tmux\] buffers"* ([tmux.1](https://raw.githubusercontent.com/tmux/tmux/3.7c/tmux.1)). Either way it only works if there is *"an `Ms` entry in the terminfo description"*, which is why the `terminal-features` lines above matter. tmux's own wiki flags the risk: *"if a command can write text to a tmux pane, it can set the clipboard. This means that with `set-clipboard` set to `on`, great care must be taken with untrusted commands run inside tmux"* ([Clipboard wiki](https://github.com/tmux/tmux/wiki/Clipboard)). With an agent running arbitrary tools, weigh that.

**4. Clipboard wiring.** Windows Terminal accepts OSC 52 writes, so `set-clipboard on` in tmux gives you agent-side "copy this to my clipboard" for free. For the shell, add the WSL-native bridges:

```bash
alias pbcopy='clip.exe'
alias pbpaste='powershell.exe -NoProfile -Command Get-Clipboard'
```

Under WSLg the Windows clipboard is shared with Linux GUI apps directly, because Microsoft added *"clipboard integration for copy/paste"* to WSLg's Weston RDP backend ([wslg README](https://github.com/microsoft/wslg)).

**5. Claude Code** — `~/.claude/settings.json`:

```json
{
  "preferredNotifChannel": "terminal_bell",
  "hooks": {
    "Notification": [
      { "hooks": [ { "type": "command",
        "command": "powershell.exe -NoProfile -Command \"[console]::beep(880,200)\"" } ] }
    ]
  }
}
```

Windows Terminal cannot receive a desktop notification, so the bell plus a hook is the substitute. Anthropic documents the hook mechanism and that hooks *"run alongside the built-in notification rather than replacing it"* ([terminal config](https://code.claude.com/docs/en/terminal-config)). If flicker or scroll-jumping bothers you during long agent runs, `/tui fullscreen` moves scrolling and search inside Claude Code and makes the 32767-line cap irrelevant.

**6. If you take the WSLg route instead**, the whole config collapses to `apt install kitty` and:

```conf
# ~/.config/kitty/kitty.conf
scrollback_lines            -1        # negative = effectively infinite
scrollback_pager_history_size 512     # MB, browsable in the pager
shell_integration           enabled
clipboard_control           write-clipboard write-primary read-clipboard-ask read-primary-ask
enabled_layouts             splits,stack
map ctrl+shift+n            kitten hints --type linenum --linenum-action=window nvim +{line} {path}
```

Everything else — kitty graphics, OSC 99 notifications, ligatures, the built-in Nerd Font — is on by default. Launch it from Windows via the Start-menu entry WSLg creates automatically, or `wsl -d Ubuntu --cd ~ kitty` (`--cd` was added in build 21286, [WSL release notes](https://github.com/MicrosoftDocs/WSL/blob/live/WSL/release-notes.md)).

## Open questions / unverified

- **foot under WSLg.** foot is Wayland-only, and WSLg's compositor is Weston, so it should work in principle. Neither foot's docs nor Microsoft's document this combination, and I found no primary source either way. Untested.
- **VTE's sixel flag in Ubuntu.** Upstream VTE defaults `sixel` to `false`; whether Ubuntu's `libvte-2.91` package enables it is unverified. Test with `img2sixel` before relying on it.
- **foot's rendering backend.** foot's README does not state whether it rasterises on CPU or GPU; I have listed it as CPU based on the absence of any GPU claim, which is weaker evidence than a positive statement.
- **Ubuntu's tmux build flags.** Debian passes `--enable-sixel`; Ubuntu derives from Debian, but I did not read an Ubuntu `debian/rules` or Launchpad build log. If sixel-in-tmux matters, check `tmux -V` and `tmux display -p '#{sixel_support}'` on the actual box.
- **WezTerm's Kitty-graphics-on-Windows status.** [Issue #1673](https://github.com/wezterm/wezterm/issues/1673) is open with a 2026-08-21 comment asking whether ConPTY passthrough fixed it. No maintainer answer since 2022. Whether current nightlies work is unverified.
- **WezTerm's own docs contradict themselves** on two points: the features page advertises "Kitty graphics support" and sixel "experimental", while the escape-sequence reference calls sixel *"preliminary and incomplete"* and omits the Kitty APC protocol entirely. Noted rather than resolved.
- **ConPTY's current fidelity.** WezTerm's FAQ says ConPTY strips undercurl; Microsoft shipped undercurl and a full ConPTY rewrite in 1.20–1.22. Which sequences the *current* ConPTY still normalises is not documented anywhere I could find, and there is no published list.
- **Throughput comparisons are not trustworthy.** No neutral, reproducible cross-terminal benchmark exists; the only common harness, Alacritty's `vtebench`, disclaims itself. Every number in this page — kitty's, Microsoft's, Rio's — is vendor-published. See the throughput subsection above for each claim and its caveats.
- **Rio and Contour under WSL.** Neither documents a WSL launch path. Setting `[shell] program = "wsl.exe"` (Rio) or `shell: wsl.exe` (Contour) is plausible but is inference, not documented behaviour; Contour's maintainer recommends SSH-to-localhost instead.
- **Rio desktop notifications.** No OSC 9 notification, OSC 777, or OSC 99 support appears anywhere in Rio's docs or changelog — only the OSC 9;4 *progress* sequence. Recorded as "not documented" rather than "absent".
- **Hyper's actual escape-sequence support.** Whatever xterm.js 5.3.0 does, Hyper documents none of it. Every OSC row for Hyper is unverifiable from its own sources.
- **Intelligent Terminal.** Microsoft's agent-focused Windows Terminal fork is genuinely relevant here but is explicitly *"experimental"*, and I evaluated it from its README and release blogs only, not by use.
