---
title: Govern step-level retry policy in canonical execution plans
status: Accepted
date: 2026-04-12
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/PlannerPolicyVocabulary.v2.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/planner/src/domain/policies.ts
  - packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts schema:verify
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter @dvt/web test
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:planning:generated:check
    - pnpm docs:arc:evidence:check
    - pnpm exec markdownlint-cli2 "docs/architecture/components/planner/index.md" "docs/architecture/components/planner/planner-constraints.md" "docs/architecture/components/planner/planner-functional.md" "docs/architecture/components/engine/adapters/temporal/EnginePolicies.md" "docs/architecture/components/engine/adapters/temporal/TemporalAdapter.spec.md" "docs/architecture/system-delivery-status.md" "docs/planning/state/agent-lane-a.yaml" "docs/evidence/ED-20260412-ar-a11-step-retry-policy-governance.md" "docs/risk-register/quality/R-20260412-AR-A11-STEP-RETRY-POLICY-DRIFT.yaml"
    - pnpm verify:prepush
---

## Summary

`AR-A11` moves retry/backoff ownership out of static Temporal workflow code and
into the canonical planner-owned execution plan.

`ExecutionStep.retryPolicy` is now the governed per-step retry profile.
`@dvt/planner` materializes that profile from planner policy classes, and
`@dvt/adapter-temporal` translates it into Temporal activity retry settings at
execution time.

## What changed

1. Added `ExecutionStepRetryPolicyV1` and optional `ExecutionStep.retryPolicy`
   to the canonical planner contract.
2. Added shared schema validation so invalid retry bounds or unsupported retry
   shapes fail closed before runtime consumption.
3. Changed planner policy resolution to materialize retry/backoff onto
   top-level execution steps instead of hiding it inside `stepTypeConfig`.
4. Updated the Temporal workflow to resolve per-step activity retry settings
   from the canonical plan only; retry metadata under
   `stepTypeConfig.retries` is ignored by the runtime retry mapper instead of
   being treated as adapter-owned policy.
5. Aligned API integration tests and web preview mapping with the new
   canonical step-level retry ownership.
6. Removed `retries` from the typed built-in DBT `stepTypeConfig` contract and
   stripped it in `dbtStepFactory`, so canonical DBT plans no longer carry dead
   retry metadata that can perturb `canonicalPlanCoreJson` / `planId`.

## Residual risk posture

The primary retry-governance drift is now materially reduced because:

- the canonical `ExecutionPlan` contract owns the per-step retry/backoff shape
- shared schemas reject invalid canonical retry metadata before adapter execution
- built-in DBT step config no longer admits `retries`, so canonical DBT plans
  do not hash dead retry metadata into `canonicalPlanCoreJson` / `planId`
- planner tests pin deterministic plan identity after retry metadata enters the
  canonical plan core
- Temporal adapter tests cover explicit plan-owned retry policy, governed
  defaults, and non-interpretation of retry metadata in non-canonical locations
- active docs now describe the canonical ownership split instead of claiming
  static adapter-only retry behavior

The remaining residual risk is regression through future reintroduction of
adapter-local retry ownership or a second retry metadata location,
captured as a closed ARC quality entry.
