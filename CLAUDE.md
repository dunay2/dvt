# Claude Instructions

This file contains Claude Code-specific guidance only.

All repository-wide agent behavior, startup, planning, validation, commit, ARC,
and evidence rules live in `AGENTS.md` and the canonical surfaces it references.
Do not duplicate or reinterpret them here.

## Claude Code

1. Read and follow `AGENTS.md` first.
2. Respect the host/tool permissions actually available to the current Claude
   Code execution; this file does not grant additional permissions.
3. When a repository rule points to a command, policy, ADR, contract, GitHub
   issue, or Planning DB query, use that canonical source rather than maintaining
   a Claude-specific copy of the rule.
4. Report unavailable capabilities or permission failures instead of inventing a
   workaround that bypasses repository governance.
