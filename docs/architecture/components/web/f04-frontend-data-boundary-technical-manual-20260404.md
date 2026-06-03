---
title: F-04 Frontend Data Boundary Technical Manual
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-04
planning_type: architecture
---

# F-04 Frontend Data Boundary Technical Manual

## Goal

Define the technical boundary for frontend data access in the web app using composition-root wiring, explicit ports, and store slices.

## Runtime Model

- Composition root resolves mode and wires services once.
- UI modules consume ports/hooks, not transport-specific clients.
- State is split by concern (`session`, `uiLayout`, `execution`, `canvasInteraction`).

```mermaid
flowchart TB
  A["AppServicesProvider (composition root)"] --> B["Ports: workspace/runs/plans"]
  B --> C["Views + hooks"]
  C --> D["Sliced stores"]
  D --> E["UI state + execution state + session state"]
```

## Ownership Rules

1. `resolveDataSource()` is allowed only in composition-root/config ownership modules.
2. Runtime query keys must come from `queryKeys.ts`.
3. Runtime modules must not import removed aggregate store surfaces.
4. Feature views must depend on ports (`app/ports/*`) and shared services from context.

## Current Technical Invariants

- `queryKey` inline arrays are blocked by architecture test.
- direct import of removed aggregate store surfaces in runtime source is blocked
  by architecture test.
- mode-resolution leakage outside owner modules is blocked by architecture test.
- `startRun` must use `ExecutionPlan.planRef`; runtime start is rejected in UI when `planRef` is missing.

## Query-Key Ownership And Invalidation Baseline

All runtime query keys are defined in `apps/web/src/app/queries/queryKeys.ts`.

| Domain                | Query-key owner                                     | Read keys                                                                                                                                                   | Invalidation owner                      | Invalidation rule                                                                                    |
| --------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| platform health       | shell capability (`usePlatformHealthSnapshotQuery`) | `queryKeys.shell.platformHealthSnapshot()`                                                                                                                  | shell health capability only            | passive polling; no cross-feature manual invalidation                                                |
| runs list + detail    | runs route hooks/facade                             | `queryKeys.runs.summaries(workspaceLayoutKey)`, `queryKeys.runs.workspace(workspaceLayoutKey, runId)`, `queryKeys.runs.snapshot(workspaceLayoutKey, runId)` | runs domain hooks and run-start actions | invalidate affected workspace-scoped runs keys after successful run-start or explicit refresh action |
| workspace graph reads | canvas and analysis workbench hooks                 | `queryKeys.workspace.graph(workspaceLayoutKey)`, `queryKeys.workspace.graphForView(viewId)`                                                                 | workspace graph owner hooks/services    | invalidate workspace graph keys only when graph-mutating actions complete                            |

## StartRun PlanRef Boundary

`ExecutionPlan` in the web app now carries optional `planRef` metadata for
run-start.

On the API path, `planRef` is backend-owned:

- `POST /plans/preview` returns `{ plan, planRef }` after successful preview and
  persistence.
- `POST /plans/import` returns `{ plan, planRef }` for a readable persisted
  plan.
- `plansService.api` maps `planRef` directly from that envelope and rejects
  payloads that omit it.

The runtime boundary is fail-closed:

1. `useCanvasExecutionActions` resolves `planRef` from `currentPlan`.
2. If `planRef` is absent, the hook must:
   - not call `runsService.startRun`,
   - emit an explicit user error,
   - reopen the plan modal.
3. If `planRef` exists, start-run continues through `IRunsPort`.

Mock mode may still use deterministic fixture data, but the API path must never
reconstruct `uri`, `sha256`, or version fields client-side.

This keeps runtime behavior aligned with the engine contract boundary where run
execution is `PlanRef`-driven.

## Required Test Layers

- `unit`: service adapters, selectors, mappers.
- `integration`: view + hook behavior per route.
- `architecture`: boundary checks for imports/query keys/mode ownership.

## Refactor Guidance (>200 line files)

When a file exceeds policy target, split by responsibility:

1. view shell layout
2. state selectors/actions
3. domain transforms/mappers
4. presentational fragments

Avoid extracting only to move complexity; each split must reduce boundary width and improve testability.

## Aggregate Store Removal Status

- `stores/appStore.ts` has been removed.
- `stores/index.ts` has been removed.
- active runtime state is owned by `sessionStore`, `uiLayoutStore`,
  `executionStore`, and `canvasInteractionStore`.
- new state concerns must extend a named slice or introduce a new bounded slice;
  do not recreate an aggregate shell store or store barrel.
