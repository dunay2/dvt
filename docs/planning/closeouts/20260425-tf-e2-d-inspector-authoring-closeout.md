---
title: TF-E2-D Inspector Authoring Closeout
status: Accepted
date: 2026-04-25
owners:
  - Frontend
  - Architecture
---

# TF-E2-D Inspector Authoring Closeout

## Summary

`TF-E2-D` is now closed.

Canvas now has a route-owned Inspector authoring component for governed node
details. The critical architectural fix was not the form itself; it was the
semantic override path behind it. Local authoring truth can now overlay
protected-draft nodes that already exist remotely, so Inspector edits mutate
the same canonical route aggregate consumed by viewport rendering, draft
payload generation, preview, and run handoff.

## Governing sources

- [TF-E2 production node authoring and persistence plan 2026-04-16](../proposals/mandatory/frontend-and-ux/tf-e2-production-node-authoring-and-persistence-plan-20260416.md)
- [TF-E2 Canvas target architecture execution plan 2026-04-17](../proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md)
- [TF-E2 Inspector authoring and lifecycle closure plan 2026-04-25](../proposals/mandatory/frontend-and-ux/tf-e2-inspector-authoring-and-lifecycle-closure-plan-20260425.md)
- [Graph Canvas Runtime Model](../../architecture/components/web/graph/graph-canvas-runtime-model.md)
- [Canvas component map and modernization review](../../architecture/components/web/graph/canvas-component-map-and-modernization-review.md)
- [Canvas Inspector Authoring Component](../../architecture/components/web/graph/canvas-inspector-authoring-component.md)

## Real work performed

- Added the route-owned Inspector authoring seam:
  - [canvasInspectorAuthoring.types.ts](../../../apps/web/src/app/views/canvas/canvasInspectorAuthoring.types.ts)
  - [canvasInspectorAuthoringModel.ts](../../../apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts)
  - [canvasInspectorAuthoringCommand.ts](../../../apps/web/src/app/views/canvas/canvasInspectorAuthoringCommand.ts)
  - [useCanvasInspectorCommands.ts](../../../apps/web/src/app/views/canvas/useCanvasInspectorCommands.ts)
  - [CanvasInspectorAuthoringSection.tsx](../../../apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx)
  - [CanvasInspectorPanel.tsx](../../../apps/web/src/app/views/canvas/CanvasInspectorPanel.tsx)
- Hardened semantic authoring truth so local overrides can replace persisted
  node details:
  - [canvasDraftSessionWorkingSet.ts](../../../apps/web/src/app/views/canvas/canvasDraftSessionWorkingSet.ts)
  - [canvasAuthoringGraphProjection.ts](../../../apps/web/src/app/views/canvas/canvasAuthoringGraphProjection.ts)
  - [canvasNodeMapper.ts](../../../apps/web/src/app/views/canvas/canvasNodeMapper.ts)
  - [useCanvasViewportGraphModel.ts](../../../apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts)
- Hardened autosave dirty detection so Inspector-only node detail edits change
  the same semantic authoring signature used by draft persistence:
  - [canvasDraftAuthoring.ts](../../../apps/web/src/app/views/canvas/canvasDraftAuthoring.ts)
  - [useCanvasCurrentDraftPayload.ts](../../../apps/web/src/app/views/canvas/useCanvasCurrentDraftPayload.ts)
  - [useCanvasDraftInitialBootstrap.ts](../../../apps/web/src/app/views/canvas/useCanvasDraftInitialBootstrap.ts)
  - [useCanvasDraftReloadHydration.ts](../../../apps/web/src/app/views/canvas/useCanvasDraftReloadHydration.ts)
- Kept the generic passive view passive and moved write semantics into the
  route-owned wrapper:
  - [InspectorPanel.tsx](../../../apps/web/src/app/components/InspectorPanel.tsx)
  - [CanvasShell.tsx](../../../apps/web/src/app/views/canvas/CanvasShell.tsx)
  - [canvasShell.types.ts](../../../apps/web/src/app/views/canvas/canvasShell.types.ts)
  - [canvasShellPanelsBuilder.ts](../../../apps/web/src/app/views/canvas/canvasShellPanelsBuilder.ts)
  - [useCanvasController.ts](../../../apps/web/src/app/views/canvas/useCanvasController.ts)

## Fowler reading

- `CanvasDraftSession` remains the aggregate-like owner of local authoring
  truth.
- `canvasInspectorAuthoringModel.ts` is a real DTO/model seam, not a bag of
  handler props.
- `canvasInspectorAuthoringCommand.ts` is a narrow application command.
- `CanvasInspectorPanel.tsx` is the route-owned composition seam.
- `InspectorPanel.tsx` remains a passive view and does not own mutation
  semantics.
- `serializeCanvasDraftAuthoringSignature(...)` is the persistence dirty-check
  boundary; it intentionally includes canonical node and edge semantics while
  excluding layout-only node positions.
- `serializeCanvasDraftAuthoringBaselineSignature(...)` is the shared
  bootstrap/reload baseline policy. It prevents initial load and reload from
  drifting away from the semantic signature used by autosave.
- `canvasDraftStructuralSignature.ts` owns the structural fallback signature so
  semantic authoring code does not depend back on the `CanvasDraftSession`
  facade.
- `canvasAuthoringMetadata.ts` owns the JSON-compatible authoring metadata DTO.
  It preserves JSON-like plugin metadata and removes circular or
  non-serializable values before signatures, duplicate commands, local saved
  draft cache, or persistence can observe them.
- `plugins/graphStrategyContracts.ts` owns the plugin-neutral
  `CanvasGraphStrategy` contract. Canvas application code no longer imports
  strategy types from the concrete DBT adapter.
- Edge transport order is canonicalized inside the authoring signature so
  unordered graph-edge payloads do not create false dirty state.

## Validation

- `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasAuthoringGraphProjection.test.ts src/app/views/canvas/canvasDraftSession.test.ts src/app/views/canvas/canvasInspectorAuthoringModel.test.ts src/app/views/canvas/useCanvasViewportGraphModel.test.tsx src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/CanvasInspectorPanel.test.tsx src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts`
- `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftAuthoring.test.ts src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts src/app/views/canvas/useCanvasController.activeDraftMutations.test.tsx`
- `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftAuthoringComponent.architecture.test.ts src/app/views/canvas/canvasDuplicateNodeCommand.test.ts`
- `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftAuthoring.test.ts src/app/views/canvas/canvasDuplicateNodeCommand.test.ts src/app/views/canvas/canvasDraftAuthoringComponent.architecture.test.ts`
- `pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasShell.test.tsx src/app/views/Canvas.routeStates.test.tsx`
- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter @dvt/web test`
- `pnpm docs:status:generate`
- `pnpm docs:workboard:generate`
- `pnpm docs:sync`
- `pnpm docs:gov:manifest`
- `pnpm verify:prepush`

## Outcome

The Inspector is now the canonical property-editing surface for governed node
metadata, and the form writes into the same route-local semantic draft truth
that drives preview and run. Plugin-owned panels remain read-only in this
slice, and route-level write semantics no longer hide inside the generic
passive Inspector view.
