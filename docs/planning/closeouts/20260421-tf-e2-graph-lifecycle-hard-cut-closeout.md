---
slice: tf-e2-graph-lifecycle-hard-cut
date: 2026-04-21
lane: E
task_id: TF-E2-B, TF-E2-C
mode: Slim
status: In progress
author: AI (Codex)
last_reviewed: 2026-04-21
---

# TF-E2 graph lifecycle hard cut closeout

## Phase 1. Think-First Analysis

### Problem summary

The Canvas route already has a governed draft aggregate and a real persistence
boundary, but graph lifecycle semantics are still split across adapter-facing
hooks and one flat helper file.

Today the active product path still spreads graph lifecycle behavior across:

- `useCanvasNodeChangeHandlers.ts`
- `useCanvasNodeRemovalHandlers.ts`
- `useCanvasEdgeChangeHandlers.ts`
- `useCanvasEdgeAuthoringHandlers.ts`
- `useCanvasNodeDropHandlers.ts`
- `useCanvasSourceImportHandlers.ts`
- `canvasInteractionCommands.ts`

That makes node and edge lifecycle closure harder to reason about, keeps the
semantic API implicit, and preserves a compatibility-style flat command surface
instead of a component boundary.

### Root cause

Earlier TF-E2 work correctly established the draft aggregate, repository, and
controller/query seams first, but stopped at a transitional command catalog.

That transitional shape improved local ownership but did not complete the
hard-cut componentization:

- the aggregate exists
- the persistence boundary exists
- the lifecycle API is still flat and partially adapter-owned

This leaves the graph lifecycle with only partial semantic encapsulation.

### Constraints and invariants

- `AGENTS.md`: docs, code, tests, and planning surfaces must stay aligned; no
  compatibility shims or hidden debt.
- `docs/guides/ai-work-protocol.md`: this slice requires Phase 1 and Phase 2
  documentation before code changes.
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`:
  application layers compose contexts; adapter-local policy drift is rejected.
- `docs/architecture/components/web/graph/graph-frontend-architecture.md`:
  Graph is the bounded frontend authoring context and must keep command/query
  seams explicit.
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`:
  `CanvasDraftSession` remains the authoritative route-local draft aggregate,
  React Flow stays projection-only, and command seams must not regress into
  widget-local truth.
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-production-node-authoring-and-persistence-plan-20260416.md`:
  `TF-E2-B` and `TF-E2-C` must close node and edge lifecycle persistence around
  the canonical draft boundary instead of visual-only success.

### Options considered

- keep `canvasInteractionCommands.ts` and continue adding lifecycle helpers to
  the flat catalog
- convert the full graph lifecycle into one monolithic state machine
- hard-cut the flat catalog into a local component API with namespaced node and
  edge sub-surfaces, while keeping sync-state transitions in the existing draft
  session machine

### Selected option and rationale

Hard-cut the flat catalog into a `canvasGraphLifecycle` component API with
explicit `node` and `edge` sub-surfaces, and keep sync-state ownership inside
`canvasDraftSession.machine`.

This matches the existing Fowler and DDD posture of the slice:

- `CanvasDraftSession` remains the aggregate for draft sync lifecycle
- `canvasGraphLifecycle` becomes the semantic command surface for graph
  mutations
- React Flow hooks remain thin adapters
- persistence and reload stay on the draft boundary instead of leaking back
  into widget handlers

This option removes compatibility noise without forcing graph topology mutation
into an oversized state machine.

### Rejected alternatives

- keep the flat helper catalog:
  it preserves a transitional API and keeps semantic ownership diffuse
- move every graph mutation into one state machine:
  node deletion, edge reconnection, and viewport-level changes are commands over
  an aggregate, not long-lived route states

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/canvas/canvasGraphLifecycle.ts`
  - `apps/web/src/app/views/canvas/canvasGraphLifecycle.*.ts`
  - `apps/web/src/app/views/canvas/canvasGraphLifecycle*.test.ts`
  - `apps/web/src/app/views/canvas/useCanvasNodeChangeHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasEdgeChangeHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasNodeRemovalHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasNodeDropHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasEdgeAuthoringHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasSourceImportHandlers.ts`
  - `apps/web/src/app/views/canvas/canvasGraphLifecycleFallout.ts`
  - `docs/architecture/components/web/graph/*.md`
  - `docs/planning/state/agent-lane-e.yaml`
  - this closeout
- Expected outcome:
  - the graph lifecycle is exposed through one local component API instead of a
    flat helper file
  - node and edge adapters call the component API rather than scattered legacy
    helpers
  - the flat `canvasInteractionCommands.ts` surface is removed
  - architecture tests prove semantic encapsulation, not only seam thinness
- Risks and mitigations:
  - risk: graph mutation fallout diverges from current UI behavior
    mitigation: preserve focused unit tests for removal, edge replacement, and
    adapter fallout
  - risk: component hard cut regresses handler-local timing behavior
    mitigation: keep `setTimeout` ownership only in the adapter that needs the
    click/delete race guard and prove it with hook tests
  - risk: docs overclaim closure of duplicate, reconnect, or reload behavior
    mitigation: document the shipped hard cut separately from remaining
    lifecycle backlog
- Out of scope:
  - Inspector-backed property editing under `TF-E2-D`
  - backend contract changes
  - route bootstrap redesign
  - any compatibility path that preserves the flat command surface
- Validation plan:
  - `pnpm docs:status:generate`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate` if planning state changes
  - `pnpm --filter @dvt/web typecheck`
  - focused Vitest for the new graph lifecycle component and touched Canvas
    handlers
  - focused ESLint over touched `apps/web/src/app/views/canvas` files
  - `pnpm verify:prepush`
- Test coverage plan:
  - node removal still clears selection and inspector consistently
  - node position-only changes stay local and do not emit unrelated fallout
  - edge changes update visible edge truth through the new component API
  - source import and drop flows still admit explicit nodes through the
    aggregate
  - architecture tests prove handlers depend on the namespaced component API
    instead of flat helper exports
- Libraries evaluated:
  - None adopted. Existing local state-machine ownership in
    `canvasDraftSession.machine` remains sufficient for sync lifecycle; this
    slice addresses command encapsulation, not a new third-party state-machine
    runtime.

## Implementation Summary

- Added the namespaced `canvasGraphLifecycle` component under:
  - `apps/web/src/app/views/canvas/canvasGraphLifecycle.ts`
  - `apps/web/src/app/views/canvas/canvasGraphLifecycle.types.ts`
  - `apps/web/src/app/views/canvas/canvasGraphLifecycle.node.ts`
  - `apps/web/src/app/views/canvas/canvasGraphLifecycle.edge.ts`
- Removed the flat transitional command catalog:
  - `apps/web/src/app/views/canvas/canvasInteractionCommands.ts`
  - `apps/web/src/app/views/canvas/canvasInteractionCommands.test.ts`
- Renamed the fallout helper to the same component vocabulary:
  - `apps/web/src/app/views/canvas/canvasGraphLifecycleFallout.ts`
  - `apps/web/src/app/views/canvas/canvasGraphLifecycleFallout.test.ts`
- Hard-cut the adapter seams to the new component API:
  - `useCanvasNodeChangeHandlers.ts`
  - `useCanvasNodeRemovalHandlers.ts`
  - `useCanvasNodeDropHandlers.ts`
  - `useCanvasEdgeChangeHandlers.ts`
  - `useCanvasEdgeAuthoringHandlers.ts`
  - `useCanvasSourceImportHandlers.ts`
  - `useCanvasGraphChangeHandlers.ts`
- Added semantic architecture coverage:
  - `canvasGraphLifecycle.architecture.test.ts`
  - `useCanvasNodeChangeHandlers.architecture.test.ts`
  - `useCanvasEdgeChangeHandlers.architecture.test.ts`
- Added focused behavior coverage for the new edge-change seam:
  - `useCanvasEdgeChangeHandlers.test.tsx`
- Added the local component architecture guide:
  - `docs/architecture/components/web/graph/canvas-graph-lifecycle-component.md`

## Validation

Current validation evidence for the hard cut:

```bash
pnpm docs:status:generate
pnpm docs:sync
pnpm docs:workboard:generate
pnpm --filter @dvt/web typecheck
pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/canvasGraphLifecycle.test.ts src/app/views/canvas/canvasGraphLifecycle.architecture.test.ts src/app/views/canvas/canvasGraphLifecycleFallout.test.ts src/app/views/canvas/useCanvasNodeChangeHandlers.test.tsx src/app/views/canvas/useCanvasNodeChangeHandlers.architecture.test.ts src/app/views/canvas/useCanvasEdgeChangeHandlers.test.tsx src/app/views/canvas/useCanvasEdgeChangeHandlers.architecture.test.ts src/app/views/canvas/useCanvasGraphHandlers.nodeRemoval.test.tsx src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx
pnpm exec eslint apps/web/src/app/views/canvas/canvasGraphLifecycle.ts apps/web/src/app/views/canvas/canvasGraphLifecycle.types.ts apps/web/src/app/views/canvas/canvasGraphLifecycle.node.ts apps/web/src/app/views/canvas/canvasGraphLifecycle.edge.ts apps/web/src/app/views/canvas/canvasGraphLifecycle.test.ts apps/web/src/app/views/canvas/canvasGraphLifecycle.architecture.test.ts apps/web/src/app/views/canvas/canvasGraphLifecycleFallout.ts apps/web/src/app/views/canvas/canvasGraphLifecycleFallout.test.ts apps/web/src/app/views/canvas/useCanvasNodeChangeHandlers.ts apps/web/src/app/views/canvas/useCanvasNodeChangeHandlers.test.tsx apps/web/src/app/views/canvas/useCanvasNodeChangeHandlers.architecture.test.ts apps/web/src/app/views/canvas/useCanvasNodeRemovalHandlers.ts apps/web/src/app/views/canvas/useCanvasNodeDropHandlers.ts apps/web/src/app/views/canvas/useCanvasEdgeChangeHandlers.ts apps/web/src/app/views/canvas/useCanvasEdgeChangeHandlers.test.tsx apps/web/src/app/views/canvas/useCanvasEdgeChangeHandlers.architecture.test.ts apps/web/src/app/views/canvas/useCanvasEdgeAuthoringHandlers.ts apps/web/src/app/views/canvas/useCanvasSourceImportHandlers.ts apps/web/src/app/views/canvas/useCanvasGraphChangeHandlers.ts apps/web/src/app/views/canvas/useCanvasGraphHandlers.nodeRemoval.test.tsx apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx
pnpm verify:prepush
```

Result so far:

- `docs:status:generate`, `docs:sync`, and `docs:workboard:generate` passed
- `@dvt/web typecheck` passed
- the focused Vitest suite passed
- the focused ESLint pass required one harness typing correction and then passed
- `verify:prepush` passed, but the repository pre-push script reported `No changed files detected`
  for its staged-file checks because this slice has not been staged yet in the current workspace

## Residuals

- this hard cut removes the flat compatibility surface and clarifies the
  component boundary, but it does not finish the remaining `TF-E2-B/C` product
  backlog for duplicate, reconnect, reload-proof closure, or Cypress proof
- selection and inspect intent are still adapter-local and remain candidates for
  a later adjacent command surface under `TF-E2-D`
