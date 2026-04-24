---
title: Temporal plan-ref execution contract hard cut
status: Accepted
date: 2026-04-24
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts
  - packages/@dvt/contracts/test/provider-adapter.architecture.test.ts
  - packages/@dvt/engine/src/adapters/IProviderAdapter.ts
  - packages/@dvt/engine/src/services/startRun/StartRunExecutionService.ts
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/adapter-temporal/src/activities/activityFactory.ts
  - packages/@dvt/adapter-temporal/test/activities.test.ts
  - apps/api/src/application/services/protectedRuntimeTenantAuthorizer.ts
  - apps/api/src/modules/protectedRuntime/buildProtectedExecutionRuntime.ts
  - apps/web/src/app/views/canvas/canvasShellLayoutBuilder.tsx
  - tools/docs/check-filenames.ts
  - docs/adr/ADR-0012-plan-integrity-ownership.md
  - docs/adr/ADR-0014-run-driven-adapter-model.md
  - docs/risk-register/quality/R-20260424-TEMPORAL-PLAN-REF-CONTRACT.yaml
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- provider-adapter.architecture.test.ts
    - pnpm --filter @dvt/adapter-temporal test -- activities.test.ts TemporalAdapter.startRun.test.ts
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter dvt-api typecheck
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter dvt-api test -- test/application/services/WorkflowEngineFactory.test.ts test/integration/plannerEngineContract.test.ts
    - pnpm --filter @dvt/web test
    - pnpm lint
    - pnpm docs:gov:filenames:changed
    - pnpm docs:gov:links:changed
    - pnpm docs:quality:check
    - pnpm docs:doctor
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# Summary

This evidence covers the hard cut that makes provider adapter start execution
pointer-backed. The engine remains the authoritative pre-dispatch plan
integrity gate, but `IProviderAdapter.startRun()` now receives only the
engine-approved immutable `PlanRef` and resolved run context.

# What this evidence closes

1. The provider adapter contract no longer accepts a decorative
   `ExecutionPlan` parameter.
2. ADR-0012 and ADR-0014 now describe the actual Temporal production posture:
   engine pre-verification plus activity-time `PlanRef.sha256` revalidation.
3. Temporal start payloads remain bounded because workflows start with
   `PlanRef`, not full plan bytes.
4. Runtime segment resolution has a regression test proving mutated fetched
   bytes are rejected before an execution segment is returned.

# What remains open

1. The broader provider vocabulary still includes non-production provider
   surfaces outside this slice.
2. A future second provider must prove the same `PlanRef` revalidation posture
   through conformance tests before being advertised as production-ready.
