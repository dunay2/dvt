---
title: TF-E2-E-D Live Selected-Closure Browser Proof Closeout
status: Accepted
date: 2026-04-24
owners:
  - Frontend
  - Architecture
  - API
---

# TF-E2-E-D Live Selected-Closure Browser Proof Closeout

## Summary

`TF-E2-E-D` is now closed.

The selected-closure browser lane now has one governed live-runtime proof that
executes the real protected authoring and runtime seams:

1. read authoritative draft
2. persist selected-closure preview
3. reuse persisted `PlanRef`
4. start the run
5. read live run snapshot and events

This closure also fixed two real contract/boundary defects the live lane
exposed:

1. the web `startRun` adapter still expected an engine transport shape instead
   of a presentation receipt DTO
2. preview planning in `apps/api` was wired through the generic planner instead
   of the compile-boundary planner used by `CompilePlanUseCase`

## Governing sources

- [TF-E2-E selected-closure UX proof stories 2026-04-23](../proposals/mandatory/frontend-and-ux/tf-e2-e-selected-closure-ux-proof-stories-20260423.md)
- [Canvas execution selection component](../../architecture/components/web/graph/canvas-execution-selection-component.md)
- [Canvas playground host component](../../architecture/components/web/graph/canvas-playground-host-component.md)
- [Workspace authoring draft aggregate](../../architecture/components/planner/workspace-authoring-draft-aggregate.md)
- [Executable-subgraph resolution component](../../../apps/api/docs/executable-subgraph-resolution-component.md)
- [AI work protocol](../../guides/ai-work-protocol.md)

## Real work performed

- Added the governed live browser proof in:
  - [canvas-preview-run-live.cy.ts](../../apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts)
  - [liveProtectedRuntime.ts](../../apps/web/cypress/support/liveProtectedRuntime.ts)
  - [canvasExecutionSelection.ts](../../apps/web/cypress/support/canvasExecutionSelection.ts)
  - [canvasPreviewArtifacts.ts](../../apps/web/cypress/support/canvasPreviewArtifacts.ts)
  - [run-selected-closure-live-proof.cjs](../../../scripts/run-selected-closure-live-proof.cjs)
- Hardened the web run-start boundary so the presentation port returns a
  semantic acceptance receipt instead of a provider transport payload:
  - [runs.ts](../../apps/web/src/app/ports/runs.ts)
  - [runsService.api.ts](../../apps/web/src/app/services/runs/runsService.api.ts)
  - [runsService.mock.ts](../../apps/web/src/app/services/runs/runsService.mock.ts)
  - [canvasRunStartAction.ts](../../apps/web/src/app/views/canvas/canvasRunStartAction.ts)
- Fixed persisted-preview readiness so run dispatch is gated by persisted plan
  identity rather than a false hash-equivalence assumption:
  - [canvasPlanReadiness.ts](../../apps/web/src/app/views/canvas/canvasPlanReadiness.ts)
  - [canvasExecutionState.ts](../../apps/web/src/app/views/canvas/canvasExecutionState.ts)
- Corrected preview compilation ownership in `apps/api`:
  - [app.ts](../../../apps/api/src/app.ts)
  - [planCompileBoundary.ts](../../../apps/api/src/modules/planCompileBoundary.ts)
  - [planCompileBoundary.cases.ts](../../../apps/api/test/modules/planCompileBoundary.cases.ts)
  - [protectedRuntimeAndPlanCompileArchitecture.cases.ts](../../../apps/api/test/modules/protectedRuntimeAndPlanCompileArchitecture.cases.ts)
- Updated the intercepted Cypress lane so its `/runs/start` stub matches the
  live `RunStartReceipt` contract:
  - [canvas-preview-run-persisted.cy.ts](../../apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts)

## Root cause and rationale

The missing live lane was not just a proof gap.

It exposed three concrete boundary problems:

1. the browser route was still coupled to an engine-shaped start-run transport
   payload;
2. persisted preview/run readiness still treated canonical-plan hash equality
   as the truth condition, even though persisted canonical and executable plan
   hashes intentionally differ;
3. preview used the wrong planner seam, so transformation sql-first compile
   steps lost their compile-boundary step shaping when exercised through the
   protected route.

The chosen fix kept ownership narrow:

- browser receives only `RunStartReceipt`
- preview/run identity is checked by persisted plan identity, not transport hash
- compile-boundary step shaping stays in the compile planner, not in web or
  route glue

## Fowler reading

- `RunStartReceipt` is a legitimate presentation DTO. It removes transport
  leakage instead of creating another ad hoc state bag.
- `canvasPlanReadiness.ts` now behaves as an anti-corruption seam around
  persisted preview identity rather than a guess based on unrelated hashes.
- `buildPlanCompilePlanner()` now owns compile-time step shaping in one place;
  preview no longer reaches across the boundary into the generic start-run
  planner.
- The live Cypress lane is a hybrid end-to-end proof, not a fake system test:
  protected runtime seams are live, while `workspace/files` remains explicitly
  isolated on one governed support seam until the backend owns that surface.

## Validation

- `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasPlanReadiness.test.ts`
- `pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStart.test.tsx`
- `pnpm --filter @dvt/web test -- src/app/services/AppServicesContext.test.tsx src/app/services/composition/appServices.test.ts src/app/services/runs/runsService.test.ts src/app/views/CostView.test.tsx src/app/views/runs/useRunWorkspace.test.tsx src/app/views/canvas/canvasPlanReadiness.test.ts src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStart.test.tsx`
- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter dvt-api typecheck`
- `pnpm --filter dvt-api test -- test/modules.test.ts`
- `pnpm --filter @dvt/web build:e2e`
- `docker run --rm -t -v "F:/segundodvt/dvt:/repo" -w /repo/apps/web -e CYPRESS_baseUrl=http://host.docker.internal:4173 cypress/included:13.17.0 --project /repo/apps/web --config-file /repo/apps/web/cypress.config.ts --spec /repo/apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts`
- `pnpm --filter @dvt/web test:e2e:selected-closure:live`

## Outcome

`TF-E2-E-D` is closed and the selected-closure UX proof family now has:

- intercepted browser proof for visible posture and payload semantics
- one live protected-runtime browser lane
- one governed Cypress support kit
- corrected DTO and planner boundaries uncovered by the live proof

With this slice, `TF-E2-E` is also closed for the selected-closure route.
