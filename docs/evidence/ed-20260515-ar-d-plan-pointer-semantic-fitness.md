---
title: AR-D PlanRef semantic fitness hardening
status: Accepted
date: 2026-05-15
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
  - packages/@dvt/adapter-temporal/test/helpers/workflowComponentGuideSupport.ts
  - packages/@dvt/adapter-temporal/test/runPlanWorkflow.layers.order.test.ts
  - docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md
  - docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary-user-stories.md
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/workflow-component-semantics.architecture.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/runPlanWorkflow.layers.order.test.ts
    - pnpm verify:changed
    - pnpm verify:prepush
---

## Summary

This slice hardens AR-D PlanRef workflow semantics against documentation drift
and fragile architecture assertions. Component ownership is now read from the
component guide, verified against real component modules, and tied to exact
module `@ownedConcern` declarations.

## Runtime safety evidence

`US-TPW-007` now names the PlanRef hash mismatch scenario explicitly. The
runtime ordering test proves that an initial segment integrity failure prevents
workflow layer execution, while the activity test continues to prove that
mutated plan bytes fail as `PLAN_INTEGRITY_VALIDATION_FAILED`.

## Architecture evidence

The architecture test rejects stale component-map entries, missing workflow
modules, duplicate component rows, and incomplete PlanRef workflow story
coverage.
