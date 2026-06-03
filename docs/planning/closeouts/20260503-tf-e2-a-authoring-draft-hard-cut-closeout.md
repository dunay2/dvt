---
title: TF-E2-A Authoring Draft Hard Cut Closeout
status: Accepted
date: 2026-05-03
owners:
  - Frontend
  - Architecture
planning_type: closeout
---

# TF-E2-A Authoring Draft Hard Cut Closeout

## Summary

`TF-E2-A` is closed.

Canvas now treats `WorkspaceGraphAuthoringDraft` as the active editable draft
truth for protected draft saves. The former web-local `WorkspaceGraphDraft`
projection no longer acts as the save payload or session record authority.
`DesignGraphDraft` remains a derived preview/run artifact only.

## Governing Sources

- [TF-E2-A implementation plan](../proposals/mandatory/frontend-and-ux/tf-e2-a-authoring-draft-hard-cut-implementation-plan-20260503.md)
- [Canvas authoring draft boundary component](../../architecture/components/web/graph/canvas-authoring-draft-boundary-component.md)
- [Workspace authoring draft aggregate](../../architecture/components/planner/workspace-authoring-draft-aggregate.md)
- [Workspace graph draft persistence v1](../../contracts/planner/workspace-graph-draft-persistence-v1.md)
- [Command and query rail governance](../../architecture/command-query-rail-governance.md)
- [Fowler opportunity planning governance](../../architecture/fowler-opportunity-planning-governance.md)
- [AI work protocol](../../guides/ai-work-protocol.md)

## Real Work Verified

- `apps/web/src/app/ports/workspace.ts` no longer exports route-local
  `WorkspaceGraphDraft`, `WorkspaceGraphDraftRecord`,
  `SaveWorkspaceGraphDraftInput`, or `SaveWorkspaceGraphDraftResult`.
- `apps/web/src/app/services/workspace/workspaceService.ts` no longer
  re-exports those route-local draft DTO names.
- `apps/web/src/app/views/canvas/canvasDraftReadModel.ts` owns
  `CanvasAuthoringDraftRecord`, `CanvasAuthoringDraftReadModel`, and the
  Canvas-facing semantic graph handoff.
- `apps/web/src/app/views/canvas/canvasDraftRepository.ts` saves
  `WorkspaceGraphAuthoringDraft` directly through
  `IWorkspaceGraphDraftAuthoringPort`.
- `apps/web/src/app/views/canvas/canvasDraftAuthoring.ts` builds and validates
  authoring aggregate payloads without accepting a projected draft save input.
- `apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.test.ts`
  guards the hard cut, including generic workspace-port export removal,
  projected save-payload removal, and `DesignGraphDraft` confinement.
- `apps/web/cypress/support/workspaceSession.ts` now stubs the protected
  `GET /session` query used by `AuthRouteGate`, so native Cypress posture specs
  can reach Canvas before exercising draft-access outcomes.

## Command And Query Rails

| Rail                                  | Type    | Owner                       | Outcome verified                                                                |
| ------------------------------------- | ------- | --------------------------- | ------------------------------------------------------------------------------- |
| `GetWorkspaceGraphDraft`              | query   | Workspace authoring         | Canvas read model preserves capability, format, revision, and authoring record. |
| `SaveWorkspaceGraphDraft`             | command | Workspace authoring         | Canvas repository sends `WorkspaceGraphAuthoringDraft` directly.                |
| `ApplyWorkspaceGraphAuthoringCommand` | command | Canvas authoring            | Create-canvas and controller tests stay aggregate-native.                       |
| `ProjectCanvasAuthoringViewportGraph` | query   | Canvas presentation         | React Flow remains a projection, not persistence truth.                         |
| `ProjectSelectedExecutableSubgraph`   | query   | Planner execution selection | Preview/run tests keep compile projection separate from draft persistence.      |

## Fowler Reading

- Hidden authority removed: the route-local `WorkspaceGraphDraft` DTO is not the
  active save model.
- Data clump reduced: active saves no longer require projected draft plus
  side-channel canonical node and edge arrays.
- Boundary drift guarded: workspace protected read/write envelopes remain behind
  `IWorkspaceGraphDraftAuthoringPort`.
- Test-only confidence reduced: architecture, read-model, repository,
  controller, create-canvas, and preview tests all point at the same aggregate
  boundary.

## Validation Evidence

- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts canvasDraftReadModel.test.ts canvasDraftRepository.readWrite.test.ts canvasDraftRepository.conflict.test.ts canvasDraftAuthoring.test.ts`
  passed with 5 files and 34 tests.
- `pnpm --filter @dvt/web test -- canvasCreateCanvasDocumentCommand.test.ts useCanvasController.core.test.tsx useCanvasController.persistence.test.tsx useCanvasExecutionActions.planPreview.freshness.test.tsx useCanvasExecutionActions.planPreview.provenance.test.tsx`
  passed with 5 files and 36 tests.
- `pnpm --filter @dvt/web typecheck` passed.
- `pnpm docs:feature-mechanization:implementation` passed after the closeout and
  Cypress support surface were declared in the `TF-E2-A` manifest.
- `pnpm --filter @dvt/web test:e2e:first-authoring:live` passed with 2 Cypress
  tests.
- `pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-draft-access-posture.cy.ts`
  first failed because `GET /session` was not stubbed in the native bootstrap
  helper, then passed with 3 Cypress tests after the support fix.

## Debt And Stub Check

- No new debt entry is introduced by this closeout.
- No stubs, placeholders, fake adapters, TODO/FIXME markers, or hidden success
  paths are accepted by this closeout.
- No lint, type, test, docs, hook, or quality rule was disabled or relaxed.
- No backend route, contract version, API behavior, planner compile behavior, or
  visual redesign is claimed by this closeout.

## Outcome

The active Canvas draft persistence path is authoring-aggregate native. Future
Canvas draft work must extend `WorkspaceGraphAuthoringDraft` or its protected
read/write envelope instead of reintroducing route-local draft DTO authority.
