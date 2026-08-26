# artifacts

Generated output, one folder per artifact type, tracked in git.

- `diagrams/` — written by the `diagrams` plugin (`plugins/diagrams/`); a
  standalone Geist-styled HTML page per plan/brainstorm, path controlled by
  `DIAGRAMS_DIR` (default `artifacts/diagrams`).

More artifact types (e.g. `plans/`) land here as their plugins ship. This
directory is the intended input for a future site Artifacts section.
