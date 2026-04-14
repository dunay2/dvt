---
title: Freeze TF-A1-B SQL-first compiler mapping
status: Accepted
date: 2026-04-14
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/TransformationFlowCompiler.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/TransformationFlowPreview.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/StepKindRegistry.v1.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/validation.ts
  - packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts
  - apps/api/src/entrypoints/http/planRoutes.ts
  - apps/web/src/app/views/canvas/previewGraphSource.ts
  - apps/web/src/app/views/canvas/useCanvasExecutionActions.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test -- validation.test.ts step-registry.test.ts
    - pnpm --filter dvt-api build
    - pnpm --filter dvt-api test -- planRoutes.test.ts
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web build
    - pnpm --filter @dvt/web test -- useCanvasExecutionActions.test.tsx plansService.test.ts
    - pnpm docs:workboard:check
    - pnpm docs:gov:links:changed
    - pnpm docs:gov:locations
    - pnpm docs:arc:evidence:check
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm docs:status:generate
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

## Summary

`TF-A1-B` freezes the first SQL-first compiler mapping as a shared contract
line instead of leaving it implicit in `web` and `api`.

The slice turns the first transformation preview profile into one governed
story:

1. `web` emits the canonical step chain and required `stepTypeConfig`
2. `@dvt/contracts` validates that compiler shape and publishes the shared
   vocabulary
3. `api` derives `planSummary` from the persisted immutable plan rather than
   from placeholder request-envelope assumptions

## What changed

1. Added `TransformationFlowCompiler.v1.ts` to publish the deterministic
   SQL-first mapping, step kinds, config schemas, and canonical summary
   derivation.
2. Extended the planner schema and validation composition layer so
   `transformation-sql-first-v1` requests and responses fail closed against the
   governed compiler shape.
3. Updated the Canvas preview flow to send the real SQL-first compiler graph
   source with SQL text, Git artifact refs, source binding, and sink
   materialization data.
4. Updated the preview API route to re-parse the request through shared
   contract validation and to summarize the stored plan through the canonical
   compiler summary helper.
5. Published the repo-local compiler contract reader and updated Lane A/status
   surfaces so the first transformation contract pack is recorded as shipped.

## Residual risk posture

Residual risk is downstream consumer drift while future executor modes and
remaining planner/runtime consumers adopt the frozen mapping. That residual is
tracked in the linked TF-A1-B quality-risk entry.
