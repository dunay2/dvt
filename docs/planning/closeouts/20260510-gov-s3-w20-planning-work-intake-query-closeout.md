---
title: Closeout - GOV-S3 W20 planning work intake query
status: Review
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-05-10
planning_type: closeout
slice: 20260510-gov-s3-w20-planning-work-intake-query
---

# Closeout: GOV-S3 W20 Planning Work Intake Query

## Think-First Analysis

### Problem Summary

The planning DB can answer narrow questions through `next`, `task-gaps`,
`docs-disposition`, `remediation`, and `pr-readiness`. It still does not answer
the operator question that selects work: what deserves attention next, and which
canonical query explains why?

### Root Cause

W17 through W19 created useful read models, but the first-step intake decision
remained outside the database. Agents had to run several queues, compare
priority labels by hand, and then decide whether a row was product work,
documentation cleanup, governance remediation, or CI readiness. That kept the
same manual selection cost the query store is meant to reduce.

### Constraints And Invariants

- `AGENTS.md`: work must start from governance, preserve no-debt/no-stub rules,
  and close with concrete validation evidence.
- `docs/planning/status/governance-document-rule-inventory.md`: planning and
  governance query work routes through canonical planning and architecture
  sources.
- `docs/guides/ai-work-protocol.md`: non-trivial planning DB behavior must be
  doc-driven first, command/query-rail aware, and TDD-led.
- `docs/planning/state/planning-control-tower.md`: daily planning inspection
  uses DB query rails, not lane YAML rereads.
- `docs/architecture/command-query-rail-governance.md`: operator-visible query
  behavior needs a named query rail and DDD owner before implementation.
- `docs/adr/adr-0055-planning-db-canonical-operational-source.md`: local
  Postgres is the operational planning DB while Git remains review/bootstrap.
- `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md`:
  GOV-S3 owns the planning/governance query-store design and mechanization
  manifest.

### Options Considered

1. Add a static "recommended next tasks" status document.
   Rejected because it would become another stale workboard.
2. Extend `planning:db:query next` to include docs, governance, and PR
   readiness rows.
   Rejected because `next` already has a precise contract: dependency-satisfied
   queued planning tasks.
3. Add a new DB-owned `planning_work_intake_query` view and expose it through
   `planning:db:query focus`.
   Selected because it composes existing query views without changing their
   contracts or creating another write surface.

### Selected Option And Rationale

W20 adds `QueryPlanningWorkIntake`, a read-model query that ranks rows from
`planning_next_tasks`, `planning_task_gap_query`,
`doc_disposition_action_query`, `governance_remediation_query`, and blocking
`pr_readiness_query` rows. The CLI adapter exposes `focus` with `--kind`,
`--lane`, `--priority`, `--task`, `--path`, and `--limit` filters.

The specialized queues remain canonical for details. The focus query is the
entrypoint for choosing where to look first.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - update the GOV-S3 proposal with W20 design, query rail, symbols, and tests;
  - add migration 019 with `planning_work_intake_query`;
  - add `planning:db:query focus` and focused row formatting;
  - add migration and query tests before implementation;
  - run planning DB migration/import/query validation and governance closeout
    gates.
- Touched files or paths:
  - `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md`
  - `docs/planning/closeouts/20260510-gov-s3-w20-planning-work-intake-query-closeout.md`
  - `tools/planning-db/migrations/019_planning_work_intake_query.sql`
  - `scripts/planning-db-migrate.test.cjs`
  - `scripts/planning-db-query.cjs`
  - `scripts/planning-db-query.test.cjs`
- Expected outcome:
  - `planning:db:query focus --limit 20` gives a ranked, cross-source work
    intake queue;
  - `focus --kind task_gap`, `focus --lane C`, and equivalent filters keep
    intake targeted without opening every queue;
  - every row points back to the specialized query that owns detailed evidence.
- Risks and mitigations:
  - Risk: focus becomes a parallel planning board.
    Mitigation: the view is read-only, has no state columns, and emits
    `source_view` plus `suggested_query` for detail ownership.
  - Risk: ranking hides urgent blockers.
    Mitigation: priority rank is explicit in SQL and blocking PR readiness rows
    are included as `P0`.
  - Risk: source queue semantics diverge.
    Mitigation: the view selects from existing query views instead of
    recomputing their internals in JavaScript.
- Out of scope:
  - creating or closing tasks;
  - resolving docs disposition actions;
  - changing ARC readiness policy;
  - altering product runtime code.
- Validation plan:
  - `pnpm docs:feature-mechanization -- --feature GOV-S3-PLANNING-STATE-QUERY-STORE`
  - `node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-query.test.cjs`
  - `pnpm planning:db:migrate`
  - `pnpm planning:db:import`
  - `pnpm planning:db:query focus --limit 20`
  - `pnpm planning:db:query focus --kind task_gap --limit 10`
  - `pnpm test:planning:db`
  - `pnpm docs:sync`
  - `pnpm governance:refresh`
  - `pnpm docs:feature-mechanization:implementation`
  - `pnpm verify:prepush`

## Final Closeout

### Real Work Performed

- Added W20 design, rail, acceptance, failure-mode, red/green, and symbol
  coverage to the GOV-S3 query-store proposal.
- Added `planning_work_intake_query` through migration 019, composing existing
  DB-owned queues into a ranked read model.
- Added migration 020 to harden `suggested_query` arguments with SQL quoting so
  task IDs or paths containing spaces remain copyable.
- Added `planning:db:query focus` with `--kind`, `--lane`, `--priority`,
  `--task`, `--path`, and `--limit` filters.
- Added focused parser, reader, formatter, and migration tests for the new work
  intake query.

### Validation Evidence

- `pnpm docs:feature-mechanization -- --feature GOV-S3-PLANNING-STATE-QUERY-STORE`
  - passed before implementation after the W20 rail and symbols were declared.
- `node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-query.test.cjs`
  - first run failed as expected before implementation: missing migration,
    missing `focus`, and missing `readFocusRows`/`buildFocusRows`.
- `node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-query.test.cjs`
  - passed after the first implementation; 58/58 tests.
- `pnpm planning:db:health`
  - passed; local Postgres accepted connections.
- `pnpm planning:db:migrate`
  - passed for migration 019; `applied=1 skipped=18`.
- `pnpm planning:db:import`
  - passed; imported 5 lanes, 336 tasks, 4340 governance files, 342 repository
    commands, 1 PR readiness check, and 1260 docs disposition actions.
- `pnpm planning:db:query focus --limit 20`
  - passed and returned next tasks plus task-gap intake rows.
- `pnpm planning:db:query focus --kind task_gap --limit 10`
  - passed and returned active review/task-link gap rows.
- `pnpm planning:db:query focus --kind next_task --limit 10`
  - passed and exposed a task ID with a space, which drove the suggestion
    hardening migration.
- `node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-query.test.cjs`
  - hardening red run failed as expected before migration 020 existed.
- `node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-query.test.cjs`
  - passed after migration 020; 59/59 tests.
- `pnpm planning:db:migrate`
  - passed for migration 020; `applied=1 skipped=19`.
- `pnpm planning:db:query focus --kind next_task --limit 10`
  - passed and returned quoted `--task` suggestions, including
    `'run_events partitioning'`.
- `pnpm planning:db:query focus --kind task_gap --limit 5`
  - passed and returned quoted `--path` suggestions.
- `pnpm test:planning:db`
  - passed; 132/132 tests.
- `pnpm docs:sync`
  - passed; docs indexes and lane docs were up to date.
- `pnpm governance:refresh`
  - passed; generated surfaces stabilized after 2 passes and planning/governance
    DB check/export-check gates passed.
- `pnpm docs:feature-mechanization:implementation`
  - first run failed because `taskScope` was an undeclared code symbol.
- `pnpm docs:feature-mechanization:implementation`
  - passed after declaring `taskScope`.
- `pnpm verify:prepush`
  - passed after the final governance refresh; changed-file governance,
    mechanization, closeout, architecture, docs ARC, QA artifact, markdown,
    ESLint, forbidden-file, and type-check gates reported 0 errors.

### No-Debt And No-Stub Evidence

- No product runtime code was changed.
- No task status, review status, proposal disposition, ARC policy, or
  governance rule was relaxed.
- No hook or validation command was bypassed.
- No stub, placeholder, fake implementation, TODO marker, or unfinished branch
  was added.
