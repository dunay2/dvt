---
title: Planning DB component coherence prompt
status: Working
date: 2026-06-15
owner: Codex
planning_type: working-note
---

# Planning DB Component Coherence Prompt

Objective: make the Planning DB the coherent, governed, and queryable source of
truth for the DVT component map.

Constraints:

- Do not create parallel inventories, alternate formats, or shortcuts outside
  the database.
- Writes must use `pnpm planning:db:operate`.
- Reads must use `pnpm planning:db:query`.
- Permanent invariants must be covered by CI once stable.
- Component work must account for files, children, commands, queries, ports,
  adapters, contracts, tests, docs, relations, Fowler/DDD basis, and maturity.

Execution loop:

1. Audit the current database and filesystem projections.
2. Correct the database through governed rails.
3. Validate with global and component-specific queries.
4. Run aggressive QA against this prompt.
5. Fix remaining gaps and repeat.

Exit criteria:

- No tracked file lacks component ownership.
- No component has a nonexistent path without explicit justification.
- No active command/query is missing bounded context and DDD/read-model owner.
- No active semantic duplicate rail remains.
- No observed relation lacks a declared relation.
- No implemented component lacks minimum tests/docs evidence.
- No obsolete rail remains active without deprecation or retirement.
- No permanent invariant remains outside CI.

QA stance: fail the slice on incomplete relations, false components, duplicate
names, parallel rails, unmapped filesystem, disconnected tests, untraced
contracts or adapters, missing Fowler/DDD basis, or missing CI coverage for new
invariants.
