#!/usr/bin/env bash
# PostToolUse hook: when the agent has just WRITTEN a plan/spec markdown file
# (plans/, .scratch/, specs/, tickets/), remind it to also render the document
# as a diagram artifact page in the browser via the diagram-plans skill.
# Stdout is appended to the model's context. Must always exit 0.
set -uo pipefail

path="$(python3 -c '
import json, re, sys
try:
    d = json.loads(sys.stdin.read())
except Exception:
    sys.exit(0)
tool = str(d.get("tool_name") or d.get("tool") or "")
if tool.lower() not in ("write", "write_file", "create_file"):
    sys.exit(0)
ti = d.get("tool_input") or {}
p = str(ti.get("file_path") or ti.get("path") or "")
base = p.rsplit("/", 1)[-1].lower()
if base in ("readme.md", "index.md"):
    sys.exit(0)
if re.search(r"(^|/)(plans|\.scratch|specs?|tickets?)/[^\0]*\.md$", p):
    sys.stdout.write(p)
' 2>/dev/null || true)"

if [ -n "${path:-}" ]; then
  echo "diagram-plans: a plan/spec document was just written (${path}). Present it as an artifact — invoke the plan-pages skill (decision/RFC documents: decision-pages; if neither plugin is installed, diagram-plans) on that document and open the page in the browser. The markdown stays the source of truth. Reply per the artifact reply contract: path + at most one open question. Skip only if the user explicitly asked for prose."
fi
exit 0
