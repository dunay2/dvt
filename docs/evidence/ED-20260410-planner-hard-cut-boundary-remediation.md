---
title: Hard-cut planner-backed runtime ingress to canonical graphSource
status: Accepted
date: 2026-04-10
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - apps/api
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/validation.ts
  - packages/@dvt/planner/src/application/PlannerFacade.ts
  - packages/@dvt/planner/src/application/PlannerEnvelopeMapper.ts
  - apps/api/src/application/services/resolveCanonicalPlannerInputEnvelope.ts
  - apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
  - apps/api/src/entrypoints/http/startRunRoutePlanSourcePolicy.ts
  - apps/api/src/entrypoints/http/startRunRoutePlannerEnvelopeMapper.ts
  - apps/api/src/entrypoints/http/planRoutes.ts
  - apps/api/src/modules/buildProtectedRuntimeModule.ts
  - docs/planning/proposals/mandatory/runtime-and-contracts/planner-hard-cut-boundary-remediation-20260410.md
  - docs/planning/closeouts/20260410-mw-a6-planner-hard-cut-boundary-remediation-closeout.md
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/planner test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test -- --run test/entrypoints/http/startRunRoutePlanSourcePolicy.test.ts test/entrypoints/http/startRunRouteParserHelpers.test.ts test/entrypoints/http/startRunRoute.test.ts test/entrypoints/http/planRoutes.test.ts test/application/services/PlannerBackedStartRunUseCase.test.ts test/modules.test.ts
    - pnpm --filter dvt-api test -- --run test/infrastructure/planner/ManifestArtifactResolver.test.ts test/integration/plannerEngineContract.test.ts
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/protectedRuntime.integration.test.ts
    - pnpm docs:status:generate
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

This slice finishes the planner ingress migration with a hard cut.

`PlannerInputEnvelopeV1` remains canonical `graphSource` only, and the
protected runtime now matches that contract:

- planner-backed `run:start` admits only canonical `graphSource`
- planner-backed preview admits only canonical `graphSource`
- `manifestRef` is rejected at the protected runtime HTTP boundary
- `targetProfile` no longer participates in the planner-backed runtime command
  shape
- `IPlannerCompatibilityResolver` no longer sits in the protected runtime path

## Scope

1. Removed `DbtManifestRef`, `PlannerInputEnvelopeV1.manifestRef`, and
   DBT-specific `targetProfile` meaning from the shared planner contract.
2. Simplified `PlannerFacade` so it validates canonical planner ingress only
   and no longer owns manifest resolution or graph-source caching.
3. Hard-cut the protected runtime so planner-backed start-run and preview share
   one fail-closed source-admission policy.
4. Removed `IPlannerCompatibilityResolver` from the protected runtime module
   path and from `PlannerBackedStartRunUseCase`.
5. Kept `ManifestArtifactResolver` only as an explicit infrastructure utility,
   with no decorative compatibility alias or dead runtime ingress fields, and
   not as a live runtime compatibility boundary inside protected planner-backed
   routes.
6. Updated validation, planning, and closeout artifacts so the branch records
   the breaking hard-cut architecture truthfully.

## Residual Considerations

1. The retained manifest utility is no longer part of the protected runtime
   planner-backed flow; if product still requires DBT-native ingestion later,
   it must return as a separate explicit boundary.
2. Temporal workflow helper narrowing around `compiledCodeRef` remains a
   separate follow-up slice and was intentionally not mixed into this hard cut.
