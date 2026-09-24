---
title: Close TF-A2-C3 and TF-A2-C4 API and web adoption
status: Accepted
date: 2026-04-23
owners:
  - apps/api
  - apps/web
  - docs
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/application/services/resolveAuthorizedExecutableSubgraph.ts
  - apps/api/src/application/services/PreviewPlanUseCase.ts
  - apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
  - apps/api/test/application/services/resolveAuthorizedExecutableSubgraph.test.ts
  - apps/api/test/application/services/executableSubgraphResolutionComponent.architecture.test.ts
  - apps/web/src/app/views/canvas/canvasRunSelection.ts
  - apps/web/src/app/views/canvas/canvasPlanAction.ts
  - apps/web/src/app/views/canvas/canvasRunStartAction.ts
  - apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts
  - docs/architecture/components/web/graph/canvas-execution-selection-component.md
  - apps/api/docs/executable-subgraph-resolution-component.md
evidence:
  tests:
    - pnpm --filter dvt-api test -- resolveAuthorizedExecutableSubgraph.test.ts executableSubgraphResolutionComponent.architecture.test.ts PlannerBackedStartRunUseCase.test.ts previewPlanRoute.inputPolicy.test.ts previewPlanRoute.outcomes.test.ts startRunRoute.validation.test.ts startRunRoute.authAndSuccess.test.ts startRunRoute.planSourcePolicy.test.ts startRunRouteCommandBuilder.test.ts app.test.ts
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter @dvt/web test -- canvasExecutionSelection.architecture.test.ts canvasRunStartIdentity.architecture.test.ts useCanvasExecutionActions.planPreview.core.test.tsx useCanvasExecutionActions.runStart.test.tsx plansService.test.ts runsService.test.ts
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web test
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:status:generate
    - pnpm docs:gov:manifest
    - pnpm verify:prepush
---

# Summary

This evidence records the hard-cut closure of `TF-A2-C3` and `TF-A2-C4`.

# What changed

- Added one API-local resolver seam that reads the protected
  `WorkspaceGraphAuthoringDraft`, delegates selected-closure derivation to the
  planner, and fails closed on non-executable or mismatched selections.
- Updated preview and planner-backed start-run to depend on that resolver
  instead of whole-draft compile assumptions.
- Updated Canvas preview and run actions to emit canonical
  `ExecutionSelection` through one browser-local seam.
- Added local component guides and semantic architecture tests for both the API
  resolver seam and the Canvas execution-selection seam.

# Validation

- `pnpm --filter dvt-api test -- resolveAuthorizedExecutableSubgraph.test.ts executableSubgraphResolutionComponent.architecture.test.ts PlannerBackedStartRunUseCase.test.ts previewPlanRoute.inputPolicy.test.ts previewPlanRoute.outcomes.test.ts startRunRoute.validation.test.ts startRunRoute.authAndSuccess.test.ts startRunRoute.planSourcePolicy.test.ts startRunRouteCommandBuilder.test.ts app.test.ts`
- `pnpm --filter dvt-api typecheck`
- `pnpm --filter dvt-api test`
- `pnpm --filter @dvt/web test -- canvasExecutionSelection.architecture.test.ts canvasRunStartIdentity.architecture.test.ts useCanvasExecutionActions.planPreview.core.test.tsx useCanvasExecutionActions.runStart.test.tsx plansService.test.ts runsService.test.ts`
- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter @dvt/web test`
- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm docs:status:generate`
- `pnpm docs:gov:manifest`
- `pnpm verify:prepush`
