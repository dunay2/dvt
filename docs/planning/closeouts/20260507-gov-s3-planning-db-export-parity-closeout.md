---
title: Closeout - GOV-S3 planning DB export parity
status: Review
owner: Product / Architecture / Docs / Delivery
last_reviewed: 2026-05-07
planning_type: closeout
slice: 20260507-gov-s3-planning-db-export-parity
---

# Closeout: GOV-S3 Planning DB Export Parity

## Think-First Analysis

### Problem Summary

The planning/governance query store could import and check repository state, but
it still could not prove that Postgres can drive any existing generated planning
surface. That left the database useful for queries while the daily generation
path still depended entirely on local YAML reads.

### Root Cause

The query-store work intentionally kept Git-tracked files canonical. That was
the correct authority boundary, but it meant W2-W6 stopped before the first
DB-to-generated-output parity proof. Without that proof, replacing or deriving
bulky generated surfaces would be architectural assertion rather than evidence.

### Constraints And Invariants

- `AGENTS.md`: no hidden debt, no stubs, no skipped checks, and closeout evidence
  is required.
- `docs/planning/status/governance-document-rule-inventory.md`: generated
  planning/status surfaces are derived and must be validated by their owning
  commands.
- `docs/guides/ai-work-protocol.md`: non-trivial tooling changes need
  think-first planning, declared command/query rail impact, TDD, and final
  governance refresh.
- `docs/architecture/command-query-rail-governance.md`: the export behavior must
  reuse the existing planning query-store rails instead of adding a parallel
  command semantic.
- `docs/architecture/fowler-opportunity-planning-governance.md`: the slice
  addresses hidden query model and generated artifact churn without widening
  runtime product scope.
- `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md`:
  Postgres remains a derived local query store until export parity proves it can
  reproduce current generated files.

### Options Considered

1. Generate workboard Markdown directly from Postgres in a new renderer.
   Rejected because it would duplicate `scripts/generate-workboard.cjs` and
   create two formatting authorities.
2. Export full lane YAML files from Postgres and ask contributors to compare
   them manually.
   Rejected because it would add another large file surface without proving the
   generated views match.
3. Reconstruct temporary lane YAML from imported DB rows and delegate rendering
   to the existing workboard generator.
   Selected because it proves DB parity while preserving the current renderer as
   the single formatting authority.

### Selected Option And Rationale

`planning:db:export` now reads imported Postgres lane and task rows,
reconstructs temporary lane YAML, and runs the existing workboard generator.
`planning:db:export:check` compares the DB-rendered `execution-workboard.md` and
`open-task-route.md` against the current generated files and fails closed on
drift.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - declare W7 in the GOV-S3 query-store plan;
  - add a planning DB export runner and package scripts;
  - wire DB export parity into `governance:refresh`;
  - add unit and live DB integration coverage;
  - refresh generated governance/status outputs.
- Touched files or paths:
  - `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md`
  - `docs/planning/closeouts/20260507-gov-s3-planning-db-export-parity-closeout.md`
  - `package.json`
  - `scripts/planning-db-export.cjs`
  - `scripts/planning-db-export.test.cjs`
  - `scripts/planning-db-content.integration.test.cjs`
  - `scripts/governance-refresh.cjs`
  - `scripts/governance-refresh.test.cjs`
  - generated governance/status files under `docs/planning/status/**`
- Expected outcome:
  - Postgres can regenerate the current planning workboard and open-task route
    through the canonical renderer;
  - `governance:refresh` proves that parity after import and planning drift
    checks;
  - Git/YAML remain canonical for repository review in this slice.
- Risks and mitigations:
  - risk: duplicate workboard semantics
    mitigation: export uses `scripts/generate-workboard.cjs`;
  - risk: task order drift in `open-task-route.md`
    mitigation: DB export preserves original raw lane task order while taking
    task content from normalized DB rows;
  - risk: DB treated as authority
    mitigation: export check compares DB-rendered output against current
    generated files and does not mutate canonical lane YAML.
- Out-of-scope items:
  - making Postgres the repository authority;
  - removing generated `system-governance-*` files;
  - adding a governance DB exporter;
  - changing product runtime packages, API, web, contracts, or adapters.
- Validation plan:
  - `pnpm docs:feature-mechanization -- --feature GOV-S3-PLANNING-STATE-QUERY-STORE`
  - red/green `pnpm test:planning:db`
  - red/green `pnpm test:governance:refresh`
  - `pnpm planning:db:up`
  - `pnpm planning:db:import`
  - `pnpm docs:workboard:generate`
  - `pnpm planning:db:export:check`
  - `pnpm test:planning:db:integration`
  - `pnpm governance:refresh`
  - `pnpm ci:docs`
  - `pnpm verify:prepush`
- Test coverage plan:
  - unit tests for lane reconstruction, missing lane rejection, and artifact
    comparison drift;
  - governance refresh unit test for the new DB export check stage;
  - live DB integration test for exporting generated planning views after
    import.
- Libraries evaluated:
  - None evaluated - no new external library needed.
- Command/query rail impact:
  - reused `ExportPlanningStateSnapshot` for `planning:db:export`;
  - reused `GeneratePlanningDerivedSurfaces` by delegating to the existing
    generator;
  - reused `RefreshGovernanceDerivedSurfaces` by adding
    `planning:db:export:check` to `governance:refresh`.

## Final Closeout

### Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md`
- `package.json`
- `scripts/governance-refresh.cjs`
- `scripts/planning-db-import.cjs`
- `scripts/generate-workboard.cjs`

### Real Work Performed

- Added W7 to the GOV-S3 plan and moved `planning:db:export` out of future work.
- Added `scripts/planning-db-export.cjs` as the DB-to-generator export command.
- Added `planning:db:export` and `planning:db:export:check` scripts.
- Added `planning:db:export:check` to `governance:refresh` after import and
  planning drift check.
- Added unit tests for export reconstruction, negative lane references, and
  artifact drift comparison.
- Added live DB integration coverage proving imported Postgres rows can produce
  both planning generated views.
- Refreshed generated governance status outputs for the new scripts and docs.

### Validation Evidence

- `pnpm docs:feature-mechanization -- --feature GOV-S3-PLANNING-STATE-QUERY-STORE`
  - passed.
- `pnpm test:planning:db`
  - expected red failure: missing `scripts/planning-db-export.cjs`.
- `pnpm test:governance:refresh`
  - expected red failure: `planning:db:export:check` missing from database
    stages.
- `pnpm test:planning:db`
  - expected red failure after root-cause test: DB export sorted tasks by
    `task_id` instead of preserving source lane order.
- `pnpm test:planning:db`
  - passed after preserving raw lane task order.
- `pnpm planning:db:up`
  - passed; shared local Postgres container was running.
- `pnpm planning:db:import`
  - passed; imported 5 lanes, 329 tasks, and governance rows.
- `pnpm docs:workboard:generate`
  - passed.
- `pnpm planning:db:export:check`
  - first live run failed on `open-task-route.md` order drift; passed after the
    source-order fix.
- `pnpm test:planning:db:integration`
  - passed; 3/3 live DB integration tests.
- `pnpm governance:refresh`
  - passed; stabilized after 3 generation passes and ran import, planning drift
    check, planning export parity check, and governance drift check.
- `pnpm ci:docs`
  - passed.
- `pnpm verify:prepush`
  - passed.

### No-Debt Evidence

- No debt entry was created.
- No rule, hook, lint, type, test, docs, or quality gate was disabled or
  relaxed.
- No `--no-verify` or equivalent bypass was used.
- Git/YAML remain the canonical repository review boundary for this slice.

### No-Stub Evidence

- No stubs, placeholders, fake adapters, fake success paths, TODO/FIXME markers,
  or unfinished branches were added.
- `planning:db:export:check` runs in the canonical refresh path and fails closed
  on generated artifact drift.

### Residual Scope

- `governance:db:export` remains a later GOV-S3 slice.
- Removing or untracking bulky `system-governance-*` outputs remains out of
  scope until DB export parity exists for those surfaces.
