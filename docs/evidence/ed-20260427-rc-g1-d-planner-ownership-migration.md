---
title: RC-G1-D planner ownership migration
status: Accepted
date: 2026-04-27
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - packages/@dvt/adapter-postgres
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/ExecutionBindingVerification.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/PlanValidationLifecycle.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/CustomPolicyNamespaceRegistry.v1.ts
  - packages/@dvt/contracts/src/index.ts
  - packages/@dvt/planner/src/contracts/PlanExecutabilityValidation.ts
  - packages/@dvt/planner/src/contracts/ExecutionBindingVerification.ts
  - packages/@dvt/planner/src/contracts/PlanValidationLifecycle.ts
  - packages/@dvt/planner/src/contracts/CustomPolicyNamespaceRegistry.ts
  - packages/@dvt/planner/src/index.ts
  - packages/@dvt/planner/test/unit/planner-private-ownership.architecture.test.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts
  - apps/api/src/application/services/StoredPlanExecutabilityValidator.ts
  - apps/api/src/application/services/PreviewPlanUseCase.ts
  - apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
  - apps/api/src/modules/startRun/buildProtectedStartRunRuntime.ts
  - eslint.config.cjs
  - docs/architecture/components/planner/planner-private-behavior-ports-component.md
  - docs/planning/reviews/architecture-and-governance/20260427-rc-g1-d-fowler-architecture-review.md
  - docs/risk-register/quality/R-20260427-RC-G1-D-PLANNER-OWNERSHIP.yaml
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- planner-private-ownership.architecture.test.ts
    - pnpm --filter @dvt/planner test -- planner-private-ownership.architecture.test.ts
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/planner build
    - pnpm --filter @dvt/adapter-postgres build
    - pnpm --filter dvt-api build
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter dvt-api test
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# Summary

This ARC-2 evidence covers the `RC-G1-D` planner ownership migration. The slice
removes planner-private behavior ports from `@dvt/contracts` and republishes
them from `@dvt/planner`, while keeping shared serializable planner vocabulary
in the shared-kernel package.

# What This Evidence Closes

1. `IPlanExecutabilityValidator`, `IExecutionBindingVerifier`,
   `IPlanValidationLifecycleStore`, and `ICustomPolicyNamespaceRegistry` are no
   longer exported from `@dvt/contracts`.
2. `@dvt/planner` owns those behavior ports and exposes them from its root
   public boundary.
3. `apps/api` and `@dvt/adapter-postgres` import the moved ports from
   `@dvt/planner`.
4. Lint guards now reject reintroducing the moved ports through
   `@dvt/contracts` in governed runtime paths.
5. Architecture tests prove the shared vocabulary/behavior port split at the
   package boundary.
6. Planner-side semantic architecture tests now prove the moved modules declare
   their owned concern, publish through the planner root barrel as type-only
   exports, depend on shared DTO vocabulary by type-only imports, and avoid
   peer-domain or adapter imports.
7. The new local component guide records public API, invariants, transitions,
   consumers, and diagrams for the planner-private behavior-port component.

# Residual Risk

The residual risk is mechanical drift: future edits could try to re-export the
moved ports through `@dvt/contracts`, remove module-level owned-concern
documentation, or widen `@dvt/adapter-postgres` planner imports beyond the
lifecycle port implementation need. That risk is tracked in
`docs/risk-register/quality/R-20260427-RC-G1-D-PLANNER-OWNERSHIP.yaml`.
