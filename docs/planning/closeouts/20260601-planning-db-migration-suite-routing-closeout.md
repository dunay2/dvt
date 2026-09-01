---
title: Planning DB Migration Suite Routing Closeout
status: Draft
owner: ci
last_reviewed: 2026-06-01
planning_type: closeout
---

# Planning DB Migration Suite Routing Closeout

## Think-First Analysis

- Problem summary: after the AI-targeted governance report routing pass,
  migration-only planning DB edits still pulled toward the full
  `pnpm test:planning:db` suite. That is expensive for agent iteration because
  a single SQL migration change does not need import/export, operate, report,
  workboard, and governance refresh tests before the first feedback cycle.
- Root cause: `verify:changed` treated every `tools/planning-db/**` change as a
  full planning DB suite change. The router did not distinguish SQL migration
  files from query-store knowledge helpers, governance DB tools, or DB test
  files.
- Selected option: split a focused root command,
  `pnpm test:planning:db:migrations`, and route
  `tools/planning-db/migrations/*.sql` changes to that command while keeping
  broader planning DB surfaces on `pnpm test:planning:db`.
- Command/query rail impact: none. This changes repository validation
  orchestration only; no product command, query, adapter, or DB write/read
  semantics changed.

## Closeout Evidence

### Implementation

- Added `test:planning:db:migrations` to the root command registry, pointing at
  `node --test scripts/planning-db-migrate.test.cjs`.
- Updated `verify:changed` planning DB routing so migration-only SQL changes
  run the migration suite without escalating to the full planning DB suite.
- Kept full planning DB suite routing for DB test files, governance DB tools,
  planning DB knowledge helpers, and infra planning DB changes.
- Updated the planning DB surface inventory contract to assert the focused
  migration command remains present.
- Updated the Testing and CI Capabilities guide with the migration-focused
  command and measured AI-iteration impact.

### Measurement

- Previous local baseline observed during this optimization pass:
  `pnpm test:planning:db` covered 250 tests and took 83.929 seconds in the
  final control run.
- Focused command measurement:
  `pnpm test:planning:db:migrations` covered 60 migration tests with Node test
  `duration_ms` 558.3258 ms.
- Router proof:
  a migration-only changed-file plan includes
  `pnpm test:planning:db:migrations` and does not include
  `pnpm test:planning:db`.

### Validation

- `node --test scripts/verify-changed.test.cjs`
  - First run failed as expected because migration-only changes were not routed
    to `pnpm test:planning:db:migrations`.
  - Final targeted run passed, 12/12 tests.
- `node --test scripts/planning-db-surface-inventory-check.test.cjs`
  - First run failed as expected because the root command registry did not yet
    expose `test:planning:db:migrations`.
  - Final targeted run passed, 4/4 tests.
- `pnpm test:planning:db:migrations` passed, 60/60 tests.
- `node --test tools/ci/repository-command-catalog.test.mjs` passed, 7/7
  tests.
- `pnpm test:planning:db` passed with exit code 0 in 83.929 seconds.
- `pnpm verify:prepush`
  - First post-commit run failed because the feature mechanization
    implementation gate required the new `hasPlanningDbMigrationChange` symbol
    to be declared in the owning CI scope optimization manifest.
- `pnpm docs:feature-mechanization:implementation` passed after declaring the
  symbol in `CI-SCOPE-OPTIMIZATION-20260508`, 169 manifests checked.
- `pnpm governance:refresh` passed: generated surfaces stabilized after 2
  passes, planning DB check/export passed, `governance:db:import` imported
  5216 governance files and 58 components, `governance:db:check` passed, and
  `governance:db:export:check` passed.
- Final `pnpm verify:prepush` passed. The changed-slice plan ran docs gates,
  feature mechanization implementation, `pnpm test:planning:db` at 250/250
  tests with Node test `duration_ms` 81807.0956, verifier self-tests at 12/12
  and 20/20, changed-file checks, and forbidden-file checks.

### No-Debt / No-Stub Evidence

- No validation command, hook, or governance check was removed or relaxed.
- No stub, placeholder, fake success path, TODO, or debt entry was added.
- No product command/query rail changed; this is local validation routing only.
- The AGENTS-cited Lane C AI efficiency review path
  `docs/planning/reviews/ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md` was
  not present in this checkout, so the active governance inventory and testing
  guide governed this slice.
