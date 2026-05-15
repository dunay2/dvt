---
title: Retire S08 lifecycle contract vocabulary
status: Accepted
date: 2026-05-15
owners:
  - packages/@dvt/contracts
  - packages/@dvt/artifacts
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/StoredPlanArtifactValidation.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/PlanValidationLifecycle.v1.ts
  - packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- plan-store-records.architecture.test.ts planner-private-ownership.architecture.test.ts
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/adapter-postgres typecheck
---

# Retire S08 Lifecycle Contract Vocabulary

## Summary

S08 now removes the active `PlanValidationLifecycle.v1.ts` contract source. The
remaining serializable validation DTO is renamed to
`StoredPlanArtifactValidationRecord`, which describes stored artifact validation
metadata rather than a plan-record lifecycle facade.

## Proof

The semantic architecture guard now asserts that:

- `PlanValidationLifecycle.v1.ts` is absent from active contracts;
- `IStoredPlanArtifactStore` returns `StoredPlanArtifactValidationRecord`;
- the contracts root barrel no longer exports `PlanValidationLifecycle.v1`.

## Risk Handling

The matching risk entry is
`docs/risk-register/quality/R-20260515-S08-LIFECYCLE-CONTRACT-RETIREMENT.yaml`.
