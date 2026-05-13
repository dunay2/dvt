---
title: EA-20260429-01 plan schema-version admission
status: Accepted
date: 2026-05-13
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/contracts/PlanSchemaVersionPolicy.ts
  - packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts
  - packages/@dvt/engine/test/contracts/PlanSchemaVersionPolicy.test.ts
  - packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts
evidence:
  tests:
    - pnpm docs:feature-mechanization -- --feature EA-20260429-01-PLAN-SCHEMA-VERSION-ADMISSION
    - pnpm --filter @dvt/engine test -- test/contracts/PlanSchemaVersionPolicy.test.ts test/architecture/planSchemaVersionAdmission.architecture.test.ts
    - pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.test.ts
    - pnpm --filter @dvt/engine typecheck
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm docs:sync
    - pnpm docs:status:generate
    - pnpm governance:refresh
    - pnpm docs:feature-mechanization:implementation
    - pnpm verify:prepush
---

# EA-20260429-01 plan schema-version admission evidence

EA-20260429-01 adds a semantic engine policy facade for strict plan
schema-version admission. The facade delegates to the existing plan admission
matrix and keeps a single compatibility authority.

## Scope

- `PlanSchemaVersionPolicy` owns schema-version admission language at engine
  ingress.
- `StartRunValidationPolicy` uses the schema-version policy before run-id
  duplication checks, plan fetch, bootstrap, or provider dispatch.
- Component docs, user stories, and mailbox analysis document the public API,
  invariants, transitions, consumers, and Fowler rationale.

## Result

- Current `(planVersion, schemaVersion)` pair remains admitted.
- Blank, future, and unsupported major schema versions reject.
- Unknown plan versions reject even with the current schema.
- Existing engine workflow tests continue proving unsupported schema rejection
  does not call provider adapters or persist events.
