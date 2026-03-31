---
id: R-20260330-WS5-ENGINE-TEST-FIXTURE-DRIFT
title: WS5 engine fixture helpers can drift from engine constructor contract
status: Closed
date: 2026-03-30
owners:
  - '@dvt/engine'
severity: Low
probability: Medium
---

## Context

WS5 refactoring first centralized intent-log setup in
`WorkflowEngine.helpers.ts` and now closes the remaining helper-heavy engine
test slices through `test/helpers/workflowEngine.fixture.ts`.

## Risk

If helper defaults diverge from `WorkflowEngine` constructor expectations,
multiple tests can pass with misleading setup assumptions and hide contract
mismatches.

## Mitigation

1. Keep core, contract, security, and maintenance tests exercising
   helper-backed construction through real engine and core-service paths.
2. Run package-level tests and pre-push verification on every helper edit.
3. Keep infrastructure setup thin and localized to test helpers so domain
   semantics remain visible in the owning suites.

## Closure evidence

- `DHM-WS5-A` accepted the first helper-backed slice for
  `WorkflowEngine.intentLog.test.ts`.
- `DHM-WS5-B` migrated the remaining helper-heavy suites and removed inline
  `new WorkflowEngine(...)` / `new WorkflowEngineCoreService(...)` construction
  from `packages/@dvt/engine/test` outside the shared helper file.
- `pnpm --filter @dvt/engine build`, `pnpm --filter @dvt/engine test`, and
  `pnpm verify:prepush` all passed on 2026-03-31 after the shared helper
  migration.
