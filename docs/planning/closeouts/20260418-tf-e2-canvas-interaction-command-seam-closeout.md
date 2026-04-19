---
slice: tf-e2-canvas-interaction-command-seam
date: 2026-04-18
lane: E
task_id: TF-E2
mode: Slim
status: In progress
author: AI (Codex)
last_reviewed: 2026-04-18
---

# TF-E2 canvas interaction command seam closeout

## Phase 1. Think-First Analysis

### Problem summary

The Canvas authoring slice already has a real route-local aggregate in
`CanvasDraftSession`, but write-side mutation policy is still distributed across
several adapter-facing hooks.

Today the same working-set concerns are expressed in more than one place:

- `useCanvasGraphHandlers`
- `useCanvasNodeChangeHandlers`
- `useCanvasEdgeChangeHandlers`
- `useCanvasSourceImportHandlers`

That keeps command ownership implicit, duplicates mutation fallout, and leaves
React Flow adapters too close to domain mutation policy.

### Root cause

Earlier TF-E2 work extracted draft session, scope, lifecycle, and repository
seams first, but did not yet centralize the local command catalog.

The result is a half-finished DDD split:

- the aggregate exists
- the query and projection seams exist
- the adapters still own too much write-side orchestration

This is what surfaced again in the recent race-hardening rescue work around
stale clicks and click/delete timing.

### Constraints and invariants

- `AGENTS.md`: architecture, code, tests, docs, and planning surfaces must stay
  aligned; no temporary compatibility shims or hidden debt.
- `docs/guides/ai-work-protocol.md`: even Slim refactors require doc-first
  analysis and a pre-implementation brief when ownership changes.
- `docs/architecture/reference-architecture.md`: hexagonal architecture keeps
  domain logic behind seams and treats adapters as non-authoritative.
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`:
  application layers compose contexts; ports are for domain-to-infrastructure
  relationships; peer-domain coupling by implementation import is rejected.
- `docs/architecture/components/web/graph/graph-frontend-architecture.md`:
  Graph is one bounded frontend authoring context and must not become execution
  truth.
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`:
  `CanvasDraftSession` remains the authoritative route-local draft aggregate,
  command ownership must converge on one local command authority, and no
  retrocompatibility path should preserve duplicated adapter-local mutations.

### Options considered

- keep the existing hooks and patch each one locally when new races appear
- extract only the remove-node command and leave other mutations distributed
- introduce one local command catalog and migrate all current adapter-owned
  working-set mutations to it

### Selected option and rationale

Introduce one local command catalog in `canvasInteractionCommands.ts` and route
the current adapter-owned mutations through it.

That gives the slice the minimum tactical DDD/CQRS/hexagonal shape that the
current docs already target:

- `CanvasDraftSession` stays the write authority
- query and projection seams remain read-only
- adapters become thin translators from widget or route events into commands

The slice is a hard cut. The previous adapter-local write paths are not kept as
compatibility fallbacks.

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/canvas/canvasInteractionCommands.ts`
  - `apps/web/src/app/views/canvas/canvasInteractionCommands.test.ts`
  - `apps/web/src/app/views/canvas/useCanvasGraphHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasGraphHandlers.types.ts`
  - `apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.tsx`
  - `apps/web/src/app/views/canvas/useCanvasNodeChangeHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasNodeChangeHandlers.test.tsx`
  - `apps/web/src/app/views/canvas/useCanvasEdgeChangeHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasSourceImportHandlers.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.ts`
  - `docs/architecture/components/web/graph/graph-frontend-architecture.md`
  - `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
  - `docs/planning/state/agent-lane-e.yaml`
  - this closeout
- Expected outcome:
  - one local command catalog owns current working-set mutation semantics
  - graph and node handlers stop duplicating remove-node logic
  - edge replacement, explicit admission, and source-import queueing stop
    bypassing the centralized command owner
  - no retrocompatibility callbacks remain inside `useCanvasGraphHandlers`
- Risks and mitigations:
  - risk: changing command ownership may drift visible graph and draft session
    mitigation: add pure command tests plus focused hook tests for graph and
    node handlers
  - risk: widget timing regressions reappear during remove-node extraction
    mitigation: keep timing behavior in the adapter and prove it with hook
    tests
  - risk: docs claim broader CQRS adoption than code actually ships
    mitigation: document only the shipped command catalog and tactical layer
    ownership
- Out of scope:
  - Inspector property editing
  - plan or run contract changes
  - backend draft contract changes
  - route bootstrap redesign

## Implementation Summary

- Added [canvasInteractionCommands.ts](../../../../apps/web/src/app/views/canvas/canvasInteractionCommands.ts)
  as the centralized local command catalog for:
  - remove-node from working set
  - visible-edge replacement
  - explicit-node admission
  - source-import queueing
- Added
  [canvasInteractionCommands.test.ts](../../../../apps/web/src/app/views/canvas/canvasInteractionCommands.test.ts)
  to prove command behavior without React Flow.
- Hard-cut the old compatibility-style write callbacks out of
  [useCanvasGraphHandlers.ts](../../../../apps/web/src/app/views/canvas/useCanvasGraphHandlers.ts).
  The hook now receives `draftSession` plus `setDraftSession` directly and
  invokes the command catalog instead of delegating through
  `onVisibleEdgesChanged` or node-admission callbacks.
- Propagated `draftSession` through the mutation seam in
  [canvasMutationHandlers.types.ts](../../../../apps/web/src/app/views/canvas/canvasMutationHandlers.types.ts),
  [useCanvasGraphChangeHandlers.ts](../../../../apps/web/src/app/views/canvas/useCanvasGraphChangeHandlers.ts),
  and [useCanvasController.ts](../../../../apps/web/src/app/views/canvas/useCanvasController.ts)
  so node-removal logic no longer tries to recover aggregate state through a
  setter callback.
- Reworked
  [useCanvasNodeChangeHandlers.ts](../../../../apps/web/src/app/views/canvas/useCanvasNodeChangeHandlers.ts)
  to delegate remove-node semantics to the centralized command catalog and
  apply the resulting graph, selection, inspector, and draft fallout as one
  coordinated result.
- Reworked
  [useCanvasEdgeChangeHandlers.ts](../../../../apps/web/src/app/views/canvas/useCanvasEdgeChangeHandlers.ts)
  and
  [useCanvasSourceImportHandlers.ts](../../../../apps/web/src/app/views/canvas/useCanvasSourceImportHandlers.ts)
  to use the same command owner for edge replacement and imported-node queueing.
- Removed the dead alternate adapter
  `apps/web/src/app/views/canvas/useCanvasExplicitNodeAdmission.ts`. After the
  hard cut, that path was no longer part of the runtime system and would have
  been a second authority path.
- Added focused hook tests in
  [useCanvasGraphHandlers.test.tsx](../../../../apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.tsx)
  and
  [useCanvasNodeChangeHandlers.test.tsx](../../../../apps/web/src/app/views/canvas/useCanvasNodeChangeHandlers.test.tsx)
  to prove:
  - stale node clicks fail closed
  - remove-node still defers to avoid click/delete races
  - graph, inspector, selection, and aggregate fallout stay aligned

## Validation

Commands run:

```bash
pnpm --filter @dvt/web typecheck
pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/canvasInteractionCommands.test.ts src/app/views/canvas/useCanvasGraphHandlers.test.tsx src/app/views/canvas/useCanvasNodeChangeHandlers.test.tsx src/app/views/canvas/useCanvasGraphChangeHandlers.architecture.test.ts src/app/views/canvas/useCanvasMutationHandlers.architecture.test.ts src/app/views/canvas/useCanvasController.core.test.tsx
```

Result:

- both commands passed on 2026-04-18
- test execution required repairing the workspace install first because the
  local `node_modules` state was missing a transitive jsdom dependency; after
  `CI=true pnpm install --frozen-lockfile`, the governed test commands passed
  without code changes to the slice

## Residuals

- This slice centralizes current working-set commands, but it does not yet
  finish the broader TF-E2 productization work for node CRUD, edge lifecycle,
  Inspector editing, or Cypress-backed end-to-end closure.
- Selection and inspector commands are still route-local UI adapter logic. If
  they gain shared authoring semantics, they should move into a narrow
  adjacent command seam instead of re-expanding the handlers.
