---
title: Align pending cancel semantics and plan-store canonical record persistence
status: Accepted
date: 2026-04-05
owners:
  - apps/api
  - packages/@dvt/run-domain
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/run-domain/src/transitionPolicy.ts
  - packages/@dvt/run-domain/test/applyRunEvent.test.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.mappers.ts
  - apps/api/test/integration/protectedRuntime.integration.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/run-domain test -- test/applyRunEvent.test.ts
    - DATABASE_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter dvt-api test -- test/integration/protectedRuntime.integration.test.ts
    - pnpm verify:prepush
---

## Summary

This slice closes three integration failures observed in protected runtime:

1. `cancel` from `PENDING` failed with invalid transition.
2. planner-backed `/runs/start` with `graphSource` returned `400`.
3. planner-backed `/runs/start` with `manifestRef` returned `400`.

## Root Cause

- Transition policy hardened `RunCancelRequested` to `RUNNING|PAUSED` only.
- `PlanRecordSchema` hardened `canonicalPlanJson` validation to require a full
  `ExecutionPlan`, but plan-store persisted planner canonical core JSON.

## Resolution

- Allow `RunCancelRequested` from `PENDING|RUNNING|PAUSED`.
- Persist a plan-store canonical JSON compatible with `ExecutionPlanSchema`
  while keeping stable metadata needed for dedupe and contract checks.
- Revalidate API protected-runtime integration tests with live Postgres.
