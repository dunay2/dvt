---
title: TF-E2-K-G Typed Canvas Preview-Run Proof Closeout
status: Accepted
date: 2026-04-24
owners:
  - Frontend
  - Architecture
---

# TF-E2-K-G Typed Canvas Preview-Run Proof Closeout

## Summary

`TF-E2-K-G` is now closed.

The Canvas route and execution seams now prove the missing continuation cycle:

1. create the typed canvas
2. add the first node
3. stay on the same typed host context
4. continue into preview
5. continue into run

This closes the drift where host-cycle proofs ended at `graph_ready` and left
preview/run continuity implied rather than evidenced.

## Governing sources

- [TF-E2-K playground complete-cycle stories 2026-04-24](../proposals/mandatory/frontend-and-ux/tf-e2-k-playground-complete-cycle-stories-20260424.md)
- [Canvas playground host component](../../architecture/components/web/graph/canvas-playground-host-component.md)
- [Canvas execution-selection component](../../architecture/components/web/graph/canvas-execution-selection-component.md)
- [AI work protocol](../../guides/ai-work-protocol.md)

## Real work performed

- Added a route-level continuation proof in
  [Canvas.routeStates.test.tsx](../../apps/web/src/app/views/Canvas.routeStates.test.tsx)
  that carries the typed transformation host cycle from `needs_canvas` to
  `typed_empty` to `graph_ready` and then into preview/run actions without
  losing the active tab context.
- Extracted the route host-cycle scenario builder into
  [Canvas.test.hostCycleScenario.ts](../../apps/web/src/app/views/Canvas.test.hostCycleScenario.ts)
  so the preview/run continuation proof no longer depends on the generic
  controller-defaults file.
- Kept the canonical execution proof in:
  - [useCanvasExecutionActions.planPreview.core.test.tsx](../../apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx)
  - [useCanvasExecutionActions.runStart.test.tsx](../../apps/web/src/app/views/canvas/useCanvasExecutionActions.runStart.test.tsx)

## Fowler reading

- The host-cycle scenario remains a DTO for route proof, not a new controller
  root.
- The route-level test proves continuity of the host context.
- The execution seam remains responsible for selection and preview/run payload
  semantics.

## Validation

- `pnpm --filter @dvt/web test -- src/app/views/Canvas.routeStates.test.tsx`
- `pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStart.test.tsx`
- `pnpm --filter @dvt/web typecheck`

## Outcome

The next active follow-up in `TF-E2-K` is authoritative first-canvas creation
proof at the lifecycle seam plus final blocked/read-only closure.
