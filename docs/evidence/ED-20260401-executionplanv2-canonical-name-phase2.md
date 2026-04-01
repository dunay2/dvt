---
title: ExecutionPlan canonical naming and public alias retirement
status: Accepted
date: 2026-04-01
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
  - apps/api
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts
  - packages/@dvt/contracts/src/index.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/validation.ts
  - packages/@dvt/planner/src/index.ts
  - packages/@dvt/engine/src/contracts/executionPlan.ts
  - packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
  - apps/api/src/application/services/storedExecutablePlan.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/planner build
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter dvt-api build
    - pnpm --filter @dvt/contracts test -- planner.contract.test.ts
    - pnpm --filter @dvt/engine test -- test/contracts/engine.test.ts test/contracts/executionPlan.contract.test.ts
    - pnpm --filter @dvt/adapter-temporal test -- test/activities.test.ts test/workflow-dag-scheduler.test.ts
    - pnpm --filter dvt-api test -- test/integration/plannerEngineContract.test.ts
    - pnpm verify:prepush
---

## Summary

This slice finalizes F2 naming unification by making `ExecutionPlan` the only
public canonical plan type and removing the public `ExecutionPlanV2` alias from
contracts, planner, and engine-facing bridges.

## What changed

- Removed public `ExecutionPlanV2` type export from `@dvt/contracts`.
- Removed planner and engine use of `ExecutionPlanV2` as public symbol.
- Switched engine bridge exports and dependent consumers to `ExecutionPlan`.
- Switched API and temporal adapter code paths to `ExecutionPlan` and
  `parseExecutionPlan`.
- Removed compatibility parser/schema aliases:
  `parseExecutionPlanV2` and `ExecutionPlanV2Schema`.
- Updated ADR-0042 language to match the canonical symbol after this change.

## Compatibility

- Shape compatibility is unchanged.
- Name compatibility is intentionally breaking for consumers importing the
  legacy alias `ExecutionPlanV2` from package public barrels.
- `planVersion` and runtime compatibility policy remain governed by ADR-0036.
