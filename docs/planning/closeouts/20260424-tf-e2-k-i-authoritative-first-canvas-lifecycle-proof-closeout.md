---
title: TF-E2-K-I Authoritative First-Canvas Lifecycle Proof Closeout
status: Accepted
date: 2026-04-24
owners:
  - Frontend
  - Architecture
---

# TF-E2-K-I Authoritative First-Canvas Lifecycle Proof Closeout

## Summary

`TF-E2-K-I` is now closed.

The first-canvas save path is no longer an inline branch inside
`useCanvasDraftLifecycle.ts`. It is now a dedicated lifecycle-local command
seam with focused behavior tests for:

- authoritative save success
- authoritative conflict truth
- fail-closed no-op posture when transport is gated, pending, errored, or
  already authoritative
- fail-closed error handling when the save throws

This closes the architectural drift where the route host had story-shaped proof
but the underlying create-canvas command still hid its authority logic inside a
larger hook.

## Governing sources

- [TF-E2-K playground complete-cycle stories 2026-04-24](../proposals/mandatory/frontend-and-ux/tf-e2-k-playground-complete-cycle-stories-20260424.md)
- [Canvas playground host component](../../architecture/components/web/graph/canvas-playground-host-component.md)
- [Canvas authoring runtime component](../../architecture/components/web/graph/canvas-authoring-runtime-component.md)
- [AI work protocol](../../guides/ai-work-protocol.md)

## Real work performed

- Added
  [canvasCreateCanvasDocumentCommand.ts](../../apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.ts)
  as the dedicated authoritative first-canvas creation seam.
- Added
  [canvasCreateCanvasDocumentCommand.test.ts](../../apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts)
  to prove save, conflict, no-op, and thrown-error behavior.
- Updated
  [useCanvasDraftLifecycle.ts](../../apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts)
  so the hook composes the command seam instead of keeping inline save policy.
- Updated architecture fitness tests:
  - [useCanvasDraftLifecycle.architecture.test.ts](../../apps/web/src/app/views/canvas/useCanvasDraftLifecycle.architecture.test.ts)
  - [canvasAuthoringRuntimeComponent.architecture.test.ts](../../apps/web/src/app/views/canvas/canvasAuthoringRuntimeComponent.architecture.test.ts)

## Fowler reading

- The new command seam is a narrow application service, not a new aggregate.
- `useCanvasDraftLifecycle.ts` remains a composition seam.
- Authoritative draft truth still owns success/failure; the browser does not
  claim first-canvas success ahead of that boundary.

## Validation

- `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts src/app/views/canvas/useCanvasDraftLifecycle.architecture.test.ts src/app/views/canvas/canvasAuthoringRuntimeComponent.architecture.test.ts`
- `pnpm --filter @dvt/web typecheck`

## Outcome

The `TF-E2-K` host family now has both story-shaped route proof and
authoritative first-canvas lifecycle proof.
