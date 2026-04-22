---
slice: tf-e2-canvas-source-import-capability-hardening
date: 2026-04-22
lane: E
task_id: TF-E2-C
mode: Full
status: In progress
author: AI (Codex)
last_reviewed: 2026-04-22
---

# TF-E2 canvas source-import capability hardening closeout

## Purpose

Record the follow-up slice that makes Canvas runtime truth honest about source
import availability after the protected-draft hard-cut.

This closeout exists because the route had already removed legacy authoring
truth, but parts of the UI and docs still implied that `Add data` remained a
normal Canvas affordance even when the active runtime could not support it.

## Problem summary

The branch had two conflicting truths at the route edge:

- the `api` workspace adapter already failed source import explicitly because
  the backend endpoint does not exist yet
- the Canvas shell and empty-state copy could still suggest `Add data` as an
  available next step

That is product drift, not a cosmetic issue. Under the hard-cut posture, the
route must not advertise a mutation path that the active runtime cannot
complete.

## Root cause

The route had no explicit capability seam for source import.

Behavior was implicit and therefore drifted across three places:

- service adapters knew whether import existed
- the Canvas shell decided whether to show import affordances
- docs still described `mock` and `api` as if Canvas authoring behaved the
  same way in both modes

## Governing sources

- `AGENTS.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/reviews/architecture-and-governance/20260422-canvas-runtime-truth-hardcut-review.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md`
- `docs/architecture/components/web/appshell/data-source-service-boundary.md`
- `docs/architecture/components/web/frontend-runtime-modes-user-manual.md`
- `docs/architecture/components/web/graph/graph-frontend-architecture.md`

## Scope

- `apps/web/src/app/services/workspace/workspaceService.ts`
- `apps/web/src/app/services/workspace/workspaceService.api.ts`
- `apps/web/src/app/services/workspace/workspaceService.mock.ts`
- `apps/web/src/app/services/workspace/workspaceService.imports.test.ts`
- `apps/web/src/app/views/Canvas.tsx`
- `apps/web/src/app/views/Canvas.routeStates.test.tsx`
- `apps/web/src/app/views/Canvas.test.controller.defaults.ts`
- `apps/web/src/app/views/canvas/CanvasCenterSurface.tsx`
- `apps/web/src/app/views/canvas/CanvasShell.tsx`
- `apps/web/src/app/views/canvas/CanvasShell.test.tsx`
- `apps/web/src/app/views/canvas/canvasControllerViewModel.ts`
- `apps/web/src/app/views/canvas/canvasCopy.types.ts`
- `apps/web/src/app/views/canvas/canvasCopyCatalog.route.ts`
- `apps/web/src/app/views/canvas/canvasCopyCatalog.route.es.ts`
- `apps/web/src/app/views/canvas/canvasShell.types.ts`
- `apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts`
- the affected web runtime and graph architecture docs

## Decision

Make source import availability explicit and fail closed in the route.

That means:

- the workspace service family exposes an explicit
  `WorkspaceServiceCapabilities` seam
- Canvas decides import affordances from an explicit capability value instead
  of hidden adapter behavior
- empty-state copy must not suggest `Add data` when the active runtime cannot
  perform source import
- blocked Canvas startup states must keep import affordances closed

## Implementation summary

- introduced `resolveWorkspaceServiceCapabilities(mode)` with an explicit
  `sourceImportAvailable` flag
- declared current adapter truth:
  - `mock`: `sourceImportAvailable = true`
  - `api`: `sourceImportAvailable = false`
- carried that capability through `useCanvasControllerEnvironment()` and
  `canvasControllerViewModel.ts`
- taught `CanvasShell` to hide explorer import affordances when source import
  is unavailable
- taught `CanvasCenterSurface` to render truthful empty-state copy for the
  "editable but import unavailable" posture
- added route and shell tests to keep blocked or unavailable states from
  reintroducing `Add data`
- aligned runtime and boundary documentation so `mock` and `api` are no longer
  described as equivalent Canvas authoring paths

## Validation

- RED then GREEN targeted suite:
  - `pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspaceService.imports.test.ts src/app/views/canvas/CanvasShell.test.tsx src/app/views/Canvas.routeStates.test.tsx`
- Additional scoped validation and repo-level baseline are recorded in the task
  closeout report once the branch slice finishes.

## No-debt record

- no compatibility fallback was reintroduced
- no mock path was promoted as product truth
- no stub, placeholder, or fake success path was added
- documentation was updated in the same slice to avoid code/doc drift
