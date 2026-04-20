---
title: Centralize Temporal workflow payload semantics and record adapter drift
status: Accepted
date: 2026-04-20
owners:
  - packages/@dvt/adapter-temporal
  - docs/architecture
  - docs/planning
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.lifecycle.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowRuntimePayloadHelpers.ts
  - docs/architecture/system-delivery-status.md
  - docs/planning/reviews/architecture-and-governance/20260420-dvt-plus-system-architecture-review.md
  - docs/risk-register/quality/R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING.yaml
evidence:
  tests:
    - pnpm docs:workboard:generate
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm exec eslint packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.lifecycle.ts packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts packages/@dvt/adapter-temporal/src/workflows/workflowRuntimePayloadHelpers.ts
    - pnpm --filter @dvt/adapter-temporal typecheck:test
    - pnpm --filter @dvt/adapter-temporal test
    - $env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

## Summary

This slice hardens the branch in two ways:

1. it removes repeated runtime payload-shaping logic from neighboring Temporal
   workflow modules and centralizes that policy in one helper seam; and
2. it aligns the canonical architecture and planning surfaces with the code that
   actually exists, including the open DBT built-in coupling that remains in
   `@dvt/adapter-temporal`.

The result is a more mature branch shape: better local SRP inside the workflow
runtime, less semantic repetition, and explicit documentation of the boundary
that is still not fully pluginized.

## What this evidence closes

1. `RunPlanWorkflow`, lifecycle handling, and layer-result shaping no longer
   each carry their own copy of optional runtime payload assembly.
2. `TransformationExecutor` typing is shared instead of re-declared across the
   same workflow slice.
3. The architectural review now records the real Fowler-style delta of this
   branch: meaningful extract-module progress plus a remaining adapter boundary
   smell.
4. The delivery-status, roadmap, lane, and domain status surfaces no longer
   overstate DBT separation.
5. The remaining DBT default-surface coupling is recorded as explicit quality
   risk, not left implicit in branch-local knowledge.

## What remains open

1. Full removal of DBT step activity and plugin-runner built-ins from the
   adapter default surface.
2. Stronger provider/plugin seams so `@dvt/adapter-temporal` can behave more
   like a mature host with replaceable execution capabilities rather than a
   partially bundled runtime.
3. Continued reduction of workflow input/runtime coupling beyond this payload
   helper consolidation.
