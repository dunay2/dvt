---
title: Close TF-E2-K-A first-canvas playground host
status: Accepted
date: 2026-04-23
owners:
  - apps/web
  - packages/@dvt/contracts
  - docs
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts
  - apps/web/src/app/views/canvas/CanvasPlaygroundHost.tsx
  - apps/web/src/app/views/canvas/canvasCenterSurfaceWorkbench.tsx
  - apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts
  - apps/web/src/app/plugins/registry.ts
  - docs/architecture/components/web/graph/canvas-playground-host-component.md
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- workspace-graph-authoring-draft.contract.test.ts validation.test.ts
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/web test
    - pnpm --filter @dvt/web typecheck
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:gov:manifest
    - pnpm verify:prepush
---

# Summary

This evidence records ARC-2 closure for `TF-E2-K-A`, the first-canvas
playground host slice over the current single-draft workspace boundary.

# What changed

- Added required `canvas` document identity to
  `WorkspaceGraphAuthoringDraft.v1`.
- Added a host-owned `needs_canvas` route posture with a real create-canvas
  command surface.
- Routed typed empty-canvas authoring through plugin-owned
  `CanvasKindRegistration` instead of a hardcoded transformation-only catalog.
- Updated the central controller test harness to model the new registry
  boundary and reduced brittle `Pick<>` transport defaults in the controller
  fixtures.

# Validation

- `pnpm --filter @dvt/contracts test -- workspace-graph-authoring-draft.contract.test.ts validation.test.ts`
- `pnpm --filter @dvt/contracts build`
- `pnpm --filter @dvt/web test`
- `pnpm --filter @dvt/web typecheck`
- `pnpm docs:status:generate`
- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm docs:gov:manifest`
- `pnpm verify:prepush`
