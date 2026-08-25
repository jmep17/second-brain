# What content must stay off the work machine

Type: grilling
Status: open
Blocked by: —

## Question

Define the classes of content in the monorepo and which are excluded on the work laptop. Candidates: personal wiki pages (`wiki/`, `raw/`), secrets, personal Claude Code skills/memory, personal git identity. Is exclusion a _directory_ boundary (easy: sparse checkout / separate clone) or _per-file_ (harder: needs a tool with ignore rules)? Also: does the work machine push changes back (two-way) or only pull?

Output: a written list of content classes with an in/out flag per machine, and the granularity of exclusion.
