---
title: ExecutionPlan pre-alpha schema version hard-cut
status: Accepted
date: 2026-06-01
owners:
  - '@dvt/contracts'
  - '@dvt/adapter-temporal'
  - '@dvt/adapter-postgres'
  - '@dvt/engine'
  - '@dvt/plan-verifier'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/PlanAdmission.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.schema.json
  - contracts/compat/plan-compat.json
  - contracts/compat/plan-compat.schema.json
  - packages/@dvt/adapter-temporal/src/versioning.ts
evidence:
  tests:
    - pnpm --filter @dvt/plan-verifier test -- planVersionAdmission.test.ts verify.test.ts
    - pnpm --filter @dvt/contracts test -- plan-admission-matrix.contract.test.ts plan-version.contract.test.ts planner.contract.test.ts
    - pnpm --filter @dvt/engine test -- PlanSchemaVersionPolicy.test.ts WorkflowEngine.test.ts
    - pnpm --filter @dvt/adapter-postgres test -- PostgresPlanStore.records-core.integration.test.ts PostgresPlanStore.records-guards.integration.test.ts
    - pnpm docs:feature-mechanization:implementation -- --feature RUNTIME-EXECUTION-PLAN-PREALPHA-SCHEMA-HARDCUT-20260601
---

# Summary

This evidence records the ARC-2 proof for hard-cutting the active pre-alpha
`ExecutionPlan` admission pair to:

- `planVersion = 1.0`
- `schemaVersion = 1.0`
- `contractVersion = 1.0.0`

The previous `schemaVersion = v1.2` value is not retained as a legacy alias.

# Scope

- Shared contracts publish `CURRENT_EXECUTION_PLAN_SCHEMA_VERSION = "1.0"`.
- The persisted `PlanRecord` schema accepts only `schemaVersion = "1.0"`.
- The root compatibility matrix uses the same `major.minor` schema literal.
- Runtime, adapter, API, web, and persisted plan-store fixtures are aligned to
  the active pair.
- Plan-verifier and contracts tests include negative coverage proving
  `schemaVersion = "v1.2"` rejects.

# Validation

The commands listed in frontmatter are the required targeted validation set for
the cut. The final closeout records the actual pass/fail result for each run.
