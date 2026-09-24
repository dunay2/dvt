---
title: Execution plan definition and run execution policy separation
status: Accepted
date: 2026-04-07
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts
  - packages/@dvt/contracts/src/contracts/engine/RunExecutionPolicy.v1.ts
  - packages/@dvt/contracts/src/types/contracts.ts
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - packages/@dvt/planner/src/domain/PlanAssembler.ts
  - packages/@dvt/engine/src/security/planIntegrity.ts
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts
  - packages/@dvt/engine/src/services/startRun/RunExecutionContextAdmissionPolicy.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.mappers.ts
  - apps/api/src/application/services/StoredPlanExecutabilityValidator.ts
  - apps/api/src/application/services/StoredExecutablePlanResolver.ts
  - apps/api/src/application/services/engineStartRunUseCase.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/planner build
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/adapter-postgres build
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm exec tsc -p apps/api/tsconfig.json --noEmit
    - pnpm --filter dvt-api test
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

This slice removes runtime admission policy from the canonical
`ExecutionPlan` metadata and publishes it separately as
`RunExecutionPolicy`.

The planner now returns:

- `plan`
- `executionPolicy`
- `canonicalPlanCoreJson`
- persisted `PlanRecord` artifacts keep `canonicalPlanJson` for the full
  `ExecutionPlan` serialized as `JCS(canonical ExecutionPlan)` with
  `canonicalHash = sha256(canonicalPlanJson)`
  - `canonicalPlanJson` preserves planner-emitted metadata, including
    `createdAtIso`; store determinism comes from JCS canonicalization, not
    mapper-side metadata rewriting

The engine and API now consume execution policy from stored-plan sidecar
metadata rather than from `PlanRef` or `ExecutionPlan.metadata`.

## What changed

- `ExecutionPlan.metadata` no longer carries:
  - `pluginCompatibilityFingerprint`
  - `requiresCapabilities`
  - `fallbackBehavior`
  - `targetAdapter`
- New governed contract:
  - `RunExecutionPolicy.v1`
- `PlanRef` is now identity and integrity only.
- Stored-plan fetch and integrity ports now return `StoredPlanArtifact`
  with:
  - `bytes`
  - `executionPolicy`
- Planner build results expose `executionPolicy` separately from `plan`.
- Engine admission validates capabilities and compatibility from
  `RunExecutionPolicy`.
- Adapter-postgres persists and reloads execution policy as sidecar data.
- API stored-plan resolution and executability validation follow the same
  split.

## Expected operational effect

- Plan identity remains stable when execution policy changes.
- Planner-owned definition and engine-owned admission policy have explicit
  ownership boundaries.
- Start-run admission no longer depends on policy fields leaking through
  `PlanRef`.
- Stored-plan verification still validates a single canonical plan artifact
  while loading execution policy as sidecar metadata.
