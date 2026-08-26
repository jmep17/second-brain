# artifacts

Generated output, one folder per artifact type, tracked in git.

| Type         | Status  | What it holds                                     | Plugin      |
| ------------ | ------- | ------------------------------------------------- | ----------- |
| `diagrams/`  | shipped | Brainstorms, architectures, roadmaps, option maps | `diagrams`  |
| `plans/`     | shipped | Plan/spec documents as pages                      | `plans`     |
| `decisions/` | shipped | Decision/RFC pages                                | `decisions` |

All types follow `plugins/DESIGN.md`. Feedback on any artifact is filed in
the issue tracker (plan 012).

`diagrams/` is written by the `diagrams` plugin (`plugins/diagrams/`); a
standalone Geist-styled HTML page per plan/brainstorm, path controlled by
`DIAGRAMS_DIR` (default `artifacts/diagrams`).

This directory is the intended input for a future site Artifacts section.
