---
title: TF-E2-B/C Node And Edge Lifecycle Closure Closeout
status: Accepted
date: 2026-04-25
owners:
  - Frontend
  - Architecture
---

# TF-E2-B/C Node And Edge Lifecycle Closure Closeout

## Summary

`TF-E2-B` and `TF-E2-C` are now closed.

Canvas now closes the remaining node and edge interaction gaps under the same
canonical draft boundary already used by reload, preview, and run:

- duplicate-node is a governed adjacent command, not an adapter-side copy hack
- reconnect-edge is a governed adjacent command, not an inline React Flow
  mutation
- `canvasGraphLifecycle` remains the working-set mutation owner instead of
  becoming a god component
- existing move and reload proof lanes stayed green after the new seams landed

## Governing sources

- [TF-E2 Canvas target architecture execution plan 2026-04-17](../proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md)
- [TF-E2 node and edge lifecycle closure plan 2026-04-25](../proposals/mandatory/frontend-and-ux/tf-e2-node-and-edge-lifecycle-closure-plan-20260425.md)
- [Canvas graph lifecycle component](../../architecture/components/web/graph/canvas-graph-lifecycle-component.md)
- [Graph Canvas runtime model](../../architecture/components/web/graph/graph-canvas-runtime-model.md)
- [Canvas handler contracts component](../../architecture/components/web/graph/canvas-handler-contracts-component.md)

## Real work performed

- Added the duplicate-node command seam:
  - [canvasDuplicateNodeCommand.ts](../../../apps/web/src/app/views/canvas/canvasDuplicateNodeCommand.ts)
  - [canvasDuplicateNodeCommand.test.ts](../../../apps/web/src/app/views/canvas/canvasDuplicateNodeCommand.test.ts)
  - [useCanvasNodeDuplicateHandlers.ts](../../../apps/web/src/app/views/canvas/useCanvasNodeDuplicateHandlers.ts)
  - [useCanvasGraphHandlers.nodeDuplicate.test.tsx](../../../apps/web/src/app/views/canvas/useCanvasGraphHandlers.nodeDuplicate.test.tsx)
- Added the reconnect-edge command seam:
  - [canvasConnectionAggregate.ts](../../../apps/web/src/app/views/canvas/canvasConnectionAggregate.ts)
  - [canvasConnectionAggregate.test.ts](../../../apps/web/src/app/views/canvas/canvasConnectionAggregate.test.ts)
  - [useCanvasGraphHandlers.edgeReconnect.test.tsx](../../../apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeReconnect.test.tsx)
- Wired passive adapters to those seams without moving authority into them:
  - [DbtNodeComponent.tsx](../../../apps/web/src/app/components/canvas/DbtNodeComponent.tsx)
  - [CanvasViewport.tsx](../../../apps/web/src/app/views/canvas/CanvasViewport.tsx)
  - [CanvasShellMainPanel.tsx](../../../apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx)
  - [canvasControllerViewModel.ts](../../../apps/web/src/app/views/canvas/canvasControllerViewModel.ts)
  - [canvasShellGraphCommandsBuilder.ts](../../../apps/web/src/app/views/canvas/canvasShellGraphCommandsBuilder.ts)
- Updated architecture and runtime documentation to show the final ownership
  boundary instead of leaving duplicate/reconnect as future work:
  - [canvas-graph-lifecycle-component.md](../../architecture/components/web/graph/canvas-graph-lifecycle-component.md)
  - [graph-canvas-runtime-model.md](../../architecture/components/web/graph/graph-canvas-runtime-model.md)
  - [agent-lane-e.yaml](../state/agent-lane-e.yaml)
  - [canonical-doc-code-matrix.md](../status/canonical-doc-code-matrix.md)

## Fowler reading

- `CanvasDraftSession` remains the aggregate-like owner of route-local draft
  truth.
- `canvasGraphLifecycle` stays narrow: it owns working-set mutation semantics,
  not duplicate naming or reconnect validation policy.
- `canvasDuplicateNodeCommand.ts` is a real application command seam with
  deterministic identity and placement policy.
- `confirmReconnect(...)` in `canvasConnectionAggregate.ts` is a real
  application command seam for reconnect validation while preserving edge
  identity.
- `useCanvasNodeDuplicateHandlers.ts` and
  [useCanvasEdgeAuthoringHandlers.ts](../../../apps/web/src/app/views/canvas/useCanvasEdgeAuthoringHandlers.ts)
  remain composition seams.
- [DbtNodeComponent.tsx](../../../apps/web/src/app/components/canvas/DbtNodeComponent.tsx)
  and [CanvasViewport.tsx](../../../apps/web/src/app/views/canvas/CanvasViewport.tsx)
  remain passive adapters.

## Validation

- `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasConnectionAggregate.test.ts src/app/views/canvas/canvasDuplicateNodeCommand.test.ts src/app/views/canvas/useCanvasGraphHandlers.nodeDuplicate.test.tsx src/app/views/canvas/useCanvasGraphHandlers.edgeReconnect.test.tsx src/app/views/canvas/useCanvasNodeAuthoringHandlers.architecture.test.ts src/app/views/canvas/useCanvasEdgeAuthoringHandlers.architecture.test.ts src/app/views/canvas/CanvasViewport.test.tsx src/app/views/canvas/CanvasShell.test.tsx`
- `pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.persistence.test.tsx src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.tsx src/app/views/canvas/useCanvasGraphHandlers.layout.test.tsx`
- `pnpm --filter @dvt/web typecheck`
- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm docs:gov:manifest`
- `pnpm verify:prepush`

## Outcome

The node and edge lifecycle route is now materially cleaner.

Duplicate and reconnect behavior are both implemented as explicit command seams
beside the aggregate instead of being smeared across adapter callbacks. The
result is easier to reason about, easier to test, and less likely to collapse
into controller or React Flow transport drift the next time Canvas changes.
