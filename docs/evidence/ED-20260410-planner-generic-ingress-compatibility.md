---
title: Extract DBT-native planner ingress from the shared kernel
status: Accepted
date: 2026-04-10
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/validation.ts
  - packages/@dvt/planner/src/application/PlannerFacade.ts
  - packages/@dvt/planner/src/application/PlannerEnvelopeMapper.ts
  - apps/api/src/application/services/resolveCanonicalPlannerInputEnvelope.ts
  - apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
  - apps/api/src/entrypoints/http/startRunRoutePlannerEnvelopeMapper.ts
  - apps/api/src/entrypoints/http/planRoutes.ts
  - apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts
  - docs/planning/proposals/mandatory/runtime-and-contracts/planner-generic-ingress-compatibility-slice-20260410.md
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/planner test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test -- --run test/infrastructure/planner/ManifestArtifactResolver.test.ts test/application/services/PlannerBackedStartRunUseCase.test.ts test/entrypoints/http/planRoutes.test.ts test/modules.test.ts
    - pnpm --filter dvt-api test:integration -- --run test/integration/plannerEngineContract.test.ts test/integration/protectedRuntime.integration.test.ts
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

This slice removes DBT-native ingress from the shared planner contract and
keeps compatibility explicit at the API boundary.

`PlannerInputEnvelopeV1` now admits only canonical `graphSource` input.
Source-native ingress such as `manifestRef` remains available only through the
API compatibility boundary, which resolves it to `GenericGraphSourceV1` before
planner admission.

## Scope

1. Removed `DbtManifestRef`, `PlannerInputEnvelopeV1.manifestRef`, and
   DBT-specific `targetProfile` meaning from the shared planner contract.
2. Simplified `PlannerFacade` so it validates canonical planner ingress only
   and no longer owns manifest resolution or graph-source caching.
3. Introduced `IPlannerCompatibilityResolver` and
   `resolveCanonicalPlannerInputEnvelope()` at the API/application boundary.
4. Kept `ManifestArtifactResolver` as the DBT-native compatibility translator
   that resolves a manifest reference into canonical `GenericGraphSourceV1`.
5. Updated route parsing, preview planning, and planner-backed start-run flow
   so compatibility translation happens before planner admission.
6. Removed obsolete planner ports and cache artifacts tied to manifest-based
   ingress inside the kernel.

## Residual Considerations

1. The DBT compatibility path still exists in the API surface by design and
   should be deprecated only after callers migrate to canonical `graphSource`.
2. Temporal workflow helper narrowing around `compiledCodeRef` remains a
   follow-up slice and was intentionally not mixed into this ingress move.
