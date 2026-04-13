---
title: Freeze TF-A1-A SQL-first preview and design-graph contract
status: Accepted
date: 2026-04-13
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/TransformationFlowDesignGraph.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/TransformationFlowPreview.v1.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/validation.ts
  - apps/api/src/entrypoints/http/previewProfilePolicy.ts
  - apps/api/src/entrypoints/http/previewProvenanceParser.ts
  - apps/web/src/app/ports/plans.ts
  - apps/web/src/app/services/plans/plansService.api.ts
  - apps/web/src/app/views/canvas/previewGraphSource.ts
  - docs/planning/closeouts/20260413-tf-a1-a-preview-contract-freeze-closeout.md
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api build
    - pnpm --filter dvt-api test -- test/entrypoints/http/planRoutes.test.ts
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web build
    - pnpm --filter @dvt/web test -- src/app/services/plans/plansService.test.ts src/app/views/canvas/useCanvasExecutionActions.test.tsx
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm docs:status:generate
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

## Summary

`TF-A1-A` freezes the first SQL-first transformation design-graph and
preview-persist boundary in the shared contract pack.

The slice removes route-local duplication across `web` and `api` by publishing:

1. `DesignGraphDraft` with governed `source -> sql_transform -> sink` invariants
2. `GitArtifactRef` and `PlanPreviewProvenance` as caller-visible Git-first provenance
3. explicit `previewProfile` request and persisted response envelopes
4. shared runtime validation and negative-path checks for the SQL-first preview profile

## What changed

1. `@dvt/contracts` now owns the SQL-first authoring graph and preview-persist
   boundary in dedicated planner contract files instead of burying all new
   invariants inside `schemas.ts`.
2. `schemas.ts` remains the composition layer for the preview request and
   response envelopes, while the domain-specific graph and provenance contracts
   live in their own files.
3. `apps/api` now imports preview profile and provenance validation from the
   shared contract pack instead of maintaining route-local DTO logic.
4. `apps/web` now consumes the shared preview request and response shapes and no
   longer keeps a private copy of the design-graph draft vocabulary.
5. Planner contract docs, Lane A planning state, and the explicit `F-22`
   handoff closure now point to the shipped shared boundary.

## Residual risk posture

The remaining risk is downstream drift while `TF-A1-B` and `TF-C1` are still
open: planner compiler code or additional consumers can still assume older
preview payload shapes until those follow-up slices finish adoption. That
residual is tracked in the linked quality-risk entry.
