---
title: Plan compatibility admission hardening
status: Accepted
date: 2026-04-29
owners:
  - '@dvt/contracts'
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/PlanCompatibility.v1.ts
  - packages/@dvt/engine/src/contracts/PlanCompatibilityPolicy.ts
  - packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- plan-compatibility-matrix.contract.test.ts
    - pnpm --filter @dvt/engine test -- WorkflowEngine.test.ts
---

# Summary

This evidence records the ARC-2 proof for strict start-run admission over the
`ExecutionPlan` compatibility pair `(planVersion, schemaVersion)`.

# What changed

- Added an executable compatibility matrix in `@dvt/contracts`.
- Added an engine policy that fails closed when a `PlanRef` names an
  unsupported pair.
- Replaced the previous broad `v1.*` schema-prefix admission with matrix-backed
  admission.
- Added negative tests for `v1.future` on a supported `planVersion` and for
  no-dispatch behavior before provider execution.

# Validation

Targeted contracts and engine tests prove that only the current pair
`(1.0, v1.2)` is accepted and that unsupported schema versions are rejected
before adapter dispatch.
