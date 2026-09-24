---
title: MW-A2 policy unbounded precedence hardening
status: Accepted
date: 2026-04-05
owners:
  - '@dvt/planner'
  - 'dvt-api'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts
  - packages/@dvt/planner/test/unit/dbt-step-factory.test.ts
  - apps/api/test/application/services/PlannerBackedStartRunUseCase.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/planner test
    - pnpm --filter dvt-api test -- PlannerBackedStartRunUseCase
    - pnpm verify:prepush
---

# Context

`dbtStepFactory` merged `node.stepTypeConfig` and resolved policy config through object spread.  
When policy class set resolved `timeout.unbounded` or `concurrency.unbounded`, those fields were omitted from resolved config, so node-level bounded values leaked through.

# Implemented

- Step config merge now applies policy-owned fields with explicit overwrite/delete semantics.
- `stepTimeoutMs` and `concurrency` are removed from step config when resolved policy is unbounded.
- Added regression coverage at two boundaries:
  - planner unit test (`dbtStepFactory`)
  - planner-backed API start-run use case

# Result

- Policy-first precedence now holds for bounded and unbounded policy classes.
- Node-level caps cannot survive when policy explicitly sets unbounded.
- QA and ARC surfaces for this planner/contracts slice are aligned with executable evidence.
