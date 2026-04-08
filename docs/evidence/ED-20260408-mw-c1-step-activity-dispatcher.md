---
title: MW-C1 step activity dispatcher by step kind in adapter-temporal
status: Accepted
date: 2026-04-08
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
  - packages/@dvt/adapter-temporal/test/activities.test.ts
  - packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal test -- test/activities.test.ts test/TemporalAdapter.startRun.test.ts test/workflow-literals.test.ts test/workflow-retry-policy.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/integration.time-skipping.test.ts -t "golden path: linear 3-step plan reaches COMPLETED with deterministic event order"
    - pnpm verify:prepush
---

## Summary

MW-C1 introduces a step-kind dispatcher in `adapter-temporal` so runtime step
execution no longer relies on a catch-all executor path.

## What changed

- Added `StepActivityDispatcher` to route runtime task steps by `step.kind`.
- Added dedicated `DbtStepActivity` for `DBT_MODEL`, `DBT_TEST`, and
  `DBT_SNAPSHOT`.
- Added `UnsupportedStepKindError` and non-retryable failure behavior for
  unregistered kinds.
- Kept test override executors as an optional layer for fault-injection tests.
- Updated adapter-temporal test plans to use canonical DBT kinds instead of
  legacy `noop` or generic `test`.

## Expected effect

- Adding support for a new `StepKind` requires registering a step activity
  implementation, not editing workflow logic.
- Unknown runtime `StepKind` now fails closed with explicit error semantics.
