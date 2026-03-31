---
title: ExecutionPlan canonical identity unification across planner, engine, and API
status: Accepted
date: 2026-04-01
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - packages/@dvt/engine
  - apps/api
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/validation.ts
  - packages/@dvt/planner/src/domain/PlanAssembler.ts
  - packages/@dvt/engine/src/contracts/executionPlan.ts
  - packages/@dvt/engine/src/adapters/mock/MockAdapter.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - apps/api/src/application/services/storedExecutablePlan.ts
  - apps/api/src/modules/buildProtectedRuntimeModule.ts
evidence:
  tests:
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/engine test
    - pnpm --filter dvt-api test
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

This evidence note records the migration from a split public `ExecutionPlan`
identity to one canonical contract in `@dvt/contracts`, with planner emission,
API persistence, and engine consumption all converging on the same public type.

## What changed

- `@dvt/contracts` now publishes the canonical `ExecutionPlan`,
  `ExecutionPlanSchema`, `parseExecutionPlan`, and the current schema and
  contract version constants.
- `IRunStateStore.v1.ts` no longer declares an independent engine-visible
  `ExecutionPlan`; it aliases the canonical contract.
- `packages/@dvt/engine/src/contracts/executionPlan.ts` is now a pure
  compatibility re-export, not a second public interface.
- Planner emission now includes canonical `schemaVersion`,
  `contractVersion`, and `createdAtIso` metadata while preserving the existing
  `planId` and `canonicalPlanJson` hashing rules.
- API storage and reload paths now persist the planner-emitted plan directly
  and parse it through `parseExecutionPlan`.
- Adapter-temporal and engine contract tests were aligned to the governed
  shared step shape rather than an engine-local widened record.

## TDD evidence

- Contracts and API tests were first tightened to fail on the previous drift:
  missing canonical metadata, missing `ExecutionPlanSchema`, and planner-to-
  engine bridge assumptions.
- Implementation then converged planner, contracts, engine, adapter, and API
  paths until those stricter tests passed.
- Planner determinism coverage was extended so volatile metadata fields still do
  not affect `canonicalPlanJson` or `planId`.

## Drift prevented by this slice

- Planner output can no longer evolve separately from the engine-visible public
  type without failing compile-time or runtime contract checks.
- API code no longer silently rewrites planner plans into a second engine-only
  shape.
- Engine adapter consumers now inherit the governed shared step contract rather
  than an open local record.
