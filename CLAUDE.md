# Claude Instructions

This file is Claude Code-specific. All general agent rules are in `AGENTS.md` —
read and follow that file first, without exception.

The active design and delivery rule is in `DELIVERY_CONTROL.md`. It is mandatory
and governs how canonical documentation, the Planning DB, implementation work,
and control cycles are updated without preserving intermediate states as new
authorities.

## Startup

Before any analysis, code, git action, or planning:

1. Read `AGENTS.md` fully.
2. Read `DELIVERY_CONTROL.md` fully.
3. Read `docs/planning/status/governance-document-rule-inventory.md`.
4. Identify the governing sources for the task.
5. Start the first user-visible update with:

`Plan-driven. Outcome-agnostic.`

Then immediately list the governing sources being used.

## Commits

Use `pnpm commit` — never `git commit -m` directly. See `AGENTS.md` for the
full format rule and valid types/scopes.