# Claude Instructions

This file is Claude Code-specific. All general agent rules are in `AGENTS.md` —
read and follow that file first, without exception.

## Startup

Before any analysis, code, git action, or planning:

1. Read `AGENTS.md` fully.
2. Read `docs/planning/status/governance-document-rule-inventory.md`.
3. Identify the governing sources for the task.
4. Start the first user-visible update with:

`ME ESTOY GUIANDO POR EL AGENT.`

Then immediately list the governing sources being used.

## Commits

Use `pnpm commit` — never `git commit -m` directly. See `AGENTS.md` for the
full format rule and valid types/scopes.
