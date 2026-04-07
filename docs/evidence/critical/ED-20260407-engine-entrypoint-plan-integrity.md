---
title: Engine entry-point plan integrity centralization
status: Accepted
date: 2026-04-07
owners:
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
  - apps/api
arc_level: ARC-2
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunExecutionService.ts
  - packages/@dvt/engine/src/adapters/IProviderAdapter.ts
  - packages/@dvt/engine/src/security/planIntegrity.ts
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - apps/api/src/application/services/StoredExecutablePlanResolver.ts
  - apps/api/src/application/services/WorkflowEngineFactory.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm docs:sync
    - pnpm verify:prepush
---

# Summary

This evidence note records the ownership move from adapter/runtime plan
verification to engine entry-point verification before adapter dispatch.

# Intended proof

- The engine fetches the executable plan before dispatch.
- The engine recomputes planner identity from the resolved plan and verifies it
  against `planId`.
- The adapter receives the verified plan object instead of owning fetch and
  verification itself.
- Temporal workflow execution no longer depends on runtime plan fetch for the
  authoritative integrity check.

# Validation

- `pnpm --filter @dvt/contracts build` passed after aligning the versioned
  adapter contract import with the canonical `ExecutionPlan` surface.
- `pnpm --filter @dvt/engine test` passed with centralized plan verification
  before adapter dispatch.
- `pnpm --filter @dvt/adapter-temporal test` passed with workflow execution
  consuming the engine-verified `ExecutionPlan` payload.
- `pnpm --filter dvt-api test` passed with `planFetcher` wired into the engine
  entry point.
- `pnpm docs:sync` passed and updated governed documentation indexes.
- `pnpm verify:prepush` passed. Its `--changed-only` subchecks reported
  `No changed files detected` in this environment, so slice-specific behavior
  is evidenced by the package-level build and test commands above.
