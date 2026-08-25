---
title: tmux Pane Keybindings
type: answer
created: 2026-08-25
updated: 2026-08-25
sources:
  [
    "man tmux (local, tmux 3.7b)",
    "https://man.openbsd.org/tmux",
    "https://github.com/tmux/tmux/wiki",
  ]
---

# tmux Pane Keybindings

**Question:** How to set up tmux keybindings, especially making all panes equal size in horizontal or vertical layouts.

**Answer:** Use `select-layout even-horizontal` for equal columns, `select-layout even-vertical` for equal rows, `tiled` for an even grid, and `select-layout -E` to spread only the current pane and its neighbours. All are already bound by default (`M-1`/`M-2`/`M-5`/`E`); bind friendlier keys if the Alt combos are awkward.

Verified against the man page shipped with tmux 3.7b (`tmux -V`, 2026-08-25). Section names refer to `man tmux`; same text at https://man.openbsd.org/tmux.

The existing config at `~/.config/tmux/tmux.conf` already implements everything below (splits with `|`/`-`, vim navigation, `-r` resize on `H/J/K/L`, layouts on `\`/`_`/`m`/`M`/`e`, reload on `r`). Nothing to change; this page documents why it works.

## Which layout equalizes which split

| Split you made                            | Layout that evens it | Default key  |
| ----------------------------------------- | -------------------- | ------------ |
| `split-window -h` (side by side, columns) | `even-horizontal`    | `prefix M-1` |
| `split-window -v` (stacked, rows)         | `even-vertical`      | `prefix M-2` |
| mixed / many panes                        | `tiled`              | `prefix M-5` |
| only the current pane + its neighbours    | `select-layout -E`   | `prefix E`   |

- `even-horizontal`: "Panes are spread out evenly from left to right across the window." `even-vertical`: "spread evenly from top to bottom." `tiled`: "spread out as evenly as possible over the window in both rows and columns." (WINDOWS AND PANES, "The following layouts are supported")
- `select-layout [-Enop] [-t target-pane] [layout-name]`: "-E spreads the current pane and any panes next to it out evenly." Without a name it reapplies the last preset; `-o` undoes the most recent layout change; `-n`/`-p` equal `next-layout`/`previous-layout`. (WINDOWS AND PANES, select-layout)
- `next-layout`: "Move a window to the next layout and rearrange the panes to fit." Bound to `Space` by default. (WINDOWS AND PANES, next-layout)
- Default keys: "M-1 to M-7 Arrange panes in one of the seven preset layouts: even-horizontal, even-vertical, main-horizontal, main-horizontal-mirrored, main-vertical, main-vertical-mirrored, or tiled." (DEFAULT KEY BINDINGS). `E` -> `select-layout -E` confirmed by `tmux list-keys -T prefix`.
- `main-horizontal`: big pane on top, rest spread left to right below; size via `main-pane-height`. `main-vertical`: big pane on left, rest stacked on the right; size via `main-pane-width`. `*-mirrored` variants put the main pane at bottom/right. (WINDOWS AND PANES)

Naming gotcha: in tmux, "horizontal" split (`-h`) puts panes side by side, and `even-horizontal` evens panes left to right. So `-h` pairs with `even-horizontal`, `-v` with `even-vertical`.

## bind-key / unbind-key

- Syntax: `bind-key [-nr] [-N note] [-T key-table] key [command [argument ...]]` (alias `bind`). Keys go in the `prefix` table unless `-T` is given. `-n` is an alias for `-T root` (no prefix; man page says binding plain letters there is "not recommended"). `-r` marks the key repeatable, governed by `repeat-time` (default 500 ms) and `initial-repeat-time`. `-N` attaches a note shown by `list-keys -N`. Custom tables are entered with `switch-client -T`. (KEY BINDINGS, bind-key)
- `unbind-key [-anq] [-T key-table] key`: `-a` removes all bindings, `-q` suppresses errors. (KEY BINDINGS, unbind-key)
- `repeat-time time`: "Allow multiple commands to be entered without pressing the prefix key again in the specified time milliseconds (the default is 500)." (OPTIONS, server/session options)

## split-window

`split-window [-bdefhIkPvZ] [-c start-directory] ... [-l size] [-p percentage] [-t target-pane] [shell-command]`. In 3.7 the man page says it "Shares behavior with new-pane"; the flags are documented under `new-pane`:

- `-h` horizontal split, `-v` vertical split; `-v` is the default.
- `-l size` sets the new pane size in lines/columns, or with `%` a percentage; `-p` is shorthand.
- `-b` creates the new pane to the left of or above the target.
- `-f` creates a pane spanning the full window height (`-h`) or width (`-v`) instead of splitting the active pane.
- `-c start-directory` sets the start directory; `-c "#{pane_current_path}"` keeps the current pane's cwd (format from FORMATS). tmux's own default binding for `-` already uses it.
- `-d` does not make the new pane current; `-Z` zooms.
  (WINDOWS AND PANES, new-pane / split-window)

## resize-pane

`resize-pane [-DLMRTUZ] [-t target-pane] [-x width] [-y height] [adjustment]`: resize by `adjustment` cells with `-U/-D/-L/-R` (default 1), or to an absolute size with `-x`/`-y`, which accept `%` (e.g. `-x 10%`). `-Z` toggles zoom (pane fills the window). `-M` starts mouse resizing. (WINDOWS AND PANES, resize-pane)

Defaults: `C-Up/Down/Left/Right` resize by one cell, `M-Up/Down/Left/Right` by five, all with `-r`. `z` toggles zoom. (DEFAULT KEY BINDINGS)

## select-pane

`select-pane [-DdeLlMmRUZ] ...`: `-D/-L/-R/-U` select the pane below/left/right/above; `-l` = last pane; `-Z` keeps zoom; `-m`/`-M` set/clear the marked pane used as default source for `swap-pane`, `join-pane`. (WINDOWS AND PANES, select-pane)

## Reload and feedback

- `source-file [-Fnqv] [-t target-pane] path ...`: runs commands from a file; `-q` no error if missing; `-n` parse only; `-v` show parsed commands. (COMMANDS, source-file)
- `display-message [-aCIlNpv] ... [message]` (alias `display`): shows a message in the status line for `display-time` ms; `-p` prints to stdout instead. (STATUS LINE, display-message)
- Commands chain with `\;`.

## Related options

- `pane-base-index index`: "Like base-index, but set the starting index for pane numbers."
- `main-pane-width` / `main-pane-height`: size of the main pane in `main-*` layouts; `%` suffix allowed.
- `other-pane-height` / `other-pane-width`: size of the non-main panes; default 0 = no effect; if both main and other are set, the main pane grows but never shrinks to satisfy it.
  (OPTIONS, window options)

## Recommended snippet

```tmux
# Panes count from 1 (OPTIONS: pane-base-index)
set -g base-index 1
set -g pane-base-index 1

# Splits: | side-by-side, - stacked, keep cwd (new-pane: -h/-v/-c)
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
# Full-width/height variants (new-pane: -f)
bind '"' split-window -fv -c "#{pane_current_path}"
bind %   split-window -fh -c "#{pane_current_path}"

# Vim navigation (select-pane -L/-D/-U/-R)
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# Repeatable resize, 5 cells (bind-key -r, resize-pane -L/-D/-U/-R)
bind -r H resize-pane -L 5
bind -r J resize-pane -D 5
bind -r K resize-pane -U 5
bind -r L resize-pane -R 5
bind z resize-pane -Z                      # zoom toggle

# Equalize panes (select-layout presets)
bind '\' select-layout even-horizontal \; display "equal columns"
bind _   select-layout even-vertical   \; display "equal rows"
bind e   select-layout tiled           \; display "tiled"
bind E   select-layout -E              \; display "spread neighbours"
bind Space next-layout                 # default; cycles presets

# Main-pane layouts; % sizes need tmux >= 3.2 (OPTIONS: main-pane-*)
set -g main-pane-width 60%
set -g main-pane-height 60%
bind m select-layout main-vertical   \; swap-pane -s "{top-left}"
bind M select-layout main-horizontal \; swap-pane -s "{top-left}"

# Reload (source-file, display-message)
bind r source-file ~/.config/tmux/tmux.conf \; display "config reloaded"
```

Check what is bound: `tmux list-keys -T prefix`.
