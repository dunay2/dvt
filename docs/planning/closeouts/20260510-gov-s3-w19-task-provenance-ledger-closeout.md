---
title: Closeout - GOV-S3 W19 task provenance ledger
status: Review
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-05-10
planning_type: closeout
slice: 20260510-gov-s3-w19-task-provenance-ledger
---

# Closeout: GOV-S3 W19 Task Provenance Ledger

## Think-First Analysis

### Problem Summary

The planning DB could answer which tasks are open, next, blocked, or in review,
and W18 made docs disposition queryable. It still could not answer a task-level
question such as: which review or proposal made this task exist, what evidence
supports its current state, and which unresolved task-governance gaps remain.

### Root Cause

Task state, dependencies, evidence refs, docs frontmatter, docs task-like
references, and docs disposition actions were already imported as DB rows, but
there was no task-provenance read model joining those rows. Agents therefore had
to reconstruct task provenance manually by reading lane YAML, reviews,
proposals, closeouts, and status docs.

### Constraints And Invariants

- `AGENTS.md`: work must start from governance, preserve no-debt/no-stub rules,
  and close with validation evidence.
- `docs/planning/status/governance-document-rule-inventory.md`: planning/query
  changes route through planning and governance sources.
- `docs/guides/ai-work-protocol.md`: planning DB work must be docs-first,
  command/query-rail aware, TDD-led, and validated.
- `docs/planning/state/planning-control-tower.md`: task lifecycle and planning
  views are DB-first operational rails.
- `docs/architecture/command-query-rail-governance.md`: operator-visible
  queries must have a named rail.
- `docs/adr/adr-0055-planning-db-canonical-operational-source.md`: local
  Postgres is the operational planning DB; Git remains review/bootstrap.

### Options Considered

1. Add another status document listing task provenance manually.
   Rejected because it would become a stale parallel queue.
2. Add source-document links directly into every lane task row.
   Rejected because it creates broad YAML churn and duplicates already imported
   evidence/doc reference data.
3. Derive DB query views from existing task, dependency, evidence, docs
   reference, and docs disposition rows.
   Selected because it preserves Git as source corpus while making task
   provenance repeatable and queryable.

### Selected Option And Rationale

W19 adds `planning_task_trace_query` and `planning_task_gap_query`, then exposes
them through `planning:db:query task-trace` and `planning:db:query task-gaps`.
The import path was also hardened so registered planning task IDs with short
forms such as `F-28` and `S08` are detected from the real planning task ID set,
not only from the generic task-like regex.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - update the GOV-S3 proposal with W19 design, rail, symbols, and validation;
  - add migration 018 for task trace and task gap read-model views;
  - add `planning:db:query task-trace` and `task-gaps`;
  - harden docs task-reference extraction for registered short task IDs;
  - add migration, import, and query coverage.
- Touched files or paths:
  - `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md`
  - `docs/planning/closeouts/20260510-gov-s3-w19-task-provenance-ledger-closeout.md`
  - `tools/planning-db/migrations/018_task_provenance_ledger.sql`
  - `scripts/planning-db-import.cjs`
  - `scripts/planning-db-import.test.cjs`
  - `scripts/planning-db-migrate.test.cjs`
  - `scripts/planning-db-query.cjs`
  - `scripts/planning-db-query.test.cjs`
  - `scripts/governance-refresh.cjs`
  - `scripts/governance-refresh.test.cjs`
- Expected outcome:
  - `task-trace` answers task provenance questions for one task;
  - `task-gaps` exposes task/review/proposal/evidence linkage gaps;
  - short registered task IDs no longer become hidden false negatives.
- Out of scope:
  - changing task statuses;
  - archiving reviews or proposals;
  - creating new lane tasks from the gap output;
  - changing product runtime code.

## Final Closeout

### Real Work Performed

- Added the W19 task provenance ledger design and mechanization declarations to
  the GOV-S3 proposal.
- Added migration 018 with `planning_task_trace_query` and
  `planning_task_gap_query`.
- Added `task-trace` and `task-gaps` to `planning:db:query`.
- Hardened documentation task-reference import so registered short task IDs are
  detected from the planning task ID set.
- Hardened `governance:refresh` stabilization so ignored generated governance
  status artifacts under `.generated-docs/planning/status` are included in the
  convergence fingerprint before DB drift checks run.
- Hardened DB-backed governance report refresh so `coverage-report` and
  `remediation-queue` use explicit `--source db` arguments and the final import
  reads those generated artifacts back into the query store.
- Added focused tests for the migration, query parser/output/readers, and short
  task ID import behavior.
- Added focused tests for ignored generated governance artifact fingerprinting,
  DB-backed governance report arguments, and generated-artifact import.

### Validation Evidence

- `node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-query.test.cjs`
  - first run failed as expected before implementation: missing migration and
    missing task provenance query functions.
- `node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-query.test.cjs`
  - passed after implementation; 54/54 tests.
- `node --test scripts/planning-db-import.test.cjs`
  - first run failed as expected before short task ID extraction was fixed.
- `node --test scripts/planning-db-import.test.cjs`
  - passed after the import hardening; 13/13 tests.
- `pnpm planning:db:health`
  - passed; local Postgres accepted connections.
- `pnpm planning:db:migrate`
  - passed; `applied=1 skipped=17`.
- `pnpm planning:db:import`
  - passed after migration; imported 5 lanes, 336 tasks, 4330 governance files,
    342 repository commands, and 1255 docs disposition actions.
- `pnpm planning:db:import`
  - passed after adding the closeout and migration file; imported 5 lanes, 336
    tasks, 4331 governance files, 342 repository commands, and 1255 docs
    disposition actions.
- `pnpm planning:db:query task-trace --task F-28-C --limit 30`
  - passed; returned task, parent, dependency, evidence refs, and source docs.
- `pnpm planning:db:query task-gaps --limit 20`
  - passed; returned task-governance gap rows.
- `pnpm planning:db:query task-gaps --kind mandatory_proposal_without_task_link --limit 20`
  - passed; confirmed short task ID false positives were reduced after import
    hardening.
- `pnpm planning:db:query task-references --kind registered_planning_task --prefix F --limit 10`
  - passed; confirmed short `F-*` task IDs are registered planning references.
- `pnpm planning:db:query task-trace F-28-C --limit 5`
  - passed; confirmed positional task shorthand works.
- `pnpm docs:feature-mechanization -- --feature GOV-S3-PLANNING-STATE-QUERY-STORE`
  - passed.
- `pnpm docs:feature-mechanization:implementation`
  - passed.
- `pnpm test:planning:db`
  - passed; 126/126 tests.
- `pnpm docs:sync`
  - passed; generated documentation indexes were up to date.
- `pnpm governance:db:check`
  - initially failed before the final import because the local query store still
    reflected the prior generated governance snapshot and did not include the
    two new files in this slice.
- `pnpm planning:db:import`
  - passed and refreshed the local query store with the current file set.
- `pnpm governance:db:check`
  - passed after the final import.
- `pnpm governance:refresh`
  - failed after the closeout content changed because ignored generated
    governance artifacts changed during the generation pass but were not part of
    the refresh stabilization fingerprint; `governance:db:check` then saw stale
    coverage rows.
- `node --test scripts/governance-refresh.test.cjs`
  - first run failed as expected before implementation because
    `readGeneratedGovernanceArtifactHashes` did not exist.
- `node --test scripts/governance-refresh.test.cjs`
  - passed after implementation; 7/7 tests.
- `node --test scripts/planning-db-import.test.cjs scripts/governance-refresh.test.cjs`
  - first focused run failed as expected while the import still ignored
    DB-backed generated coverage/remediation artifacts and refresh still used
    env-only source selection.
- `node --test scripts/planning-db-import.test.cjs scripts/governance-refresh.test.cjs`
  - passed after importing DB-backed generated artifacts and using explicit
    `--source db` refresh arguments; 21/21 tests.
- `pnpm governance:refresh`
  - passed after the stabilization fix; generation stabilized in two passes,
    then planning DB check, planning DB export check, governance DB check, and
    governance DB export check all passed.
- `pnpm docs:feature-mechanization:implementation`
  - passed after declaring the governance refresh stabilization symbols in the
    GOV-S3 mechanization manifest.

### No-Debt And No-Stub Evidence

- No product runtime code was changed.
- No task status, review status, or proposal disposition was silently changed.
- No generated planning or governance rule was relaxed.
- No hook or validation command was bypassed.
- No stub, placeholder, fake implementation, TODO, or unfinished branch was
  added.
