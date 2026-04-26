---
title: Canvas Empty Authoring Entrypoint Component
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-26
---

# Canvas Empty Authoring Entrypoint Component

## Purpose

This component owns the graph-first entrypoint that lets an operator create the
first Canvas node from an empty protected authoring draft.

It is intentionally not a project-creation flow and not a source-import
fallback. Project/resource inventory may enrich later authoring, but the empty
Canvas state must be productive when the workspace has no nodes yet.

## Public API

The public API is the route/shell command seam:

```ts
type CreateCanvasAuthoringNode = (registration: NodeKindRegistration) => void;
```

The command is exposed through:

- `canvasGraphHandlerContracts.ts`
- `useCanvasAuthoringNodeCreationHandlers.ts`
- `canvasShellGraphCommandsBuilder.ts`
- `canvasShellLayoutBuilder.tsx`
- `CanvasCenterSurface.tsx`

The visible authoring catalog is the governed
`CanvasRuntimeRegistration.nodeKinds` catalog for the active
`canvasDocument.kind`. UI surfaces must not define a second ad hoc node-kind
list. Runtime admission is enforced by `CanvasRuntimePolicy`, not by the
visible list alone. For the `transformation` canvas kind, that catalog
currently resolves to `DVT_AUTHORING_NODE_KINDS`.

The visible editable empty-state copy is also governed by the active
`CanvasRuntimeRegistration.emptyState`. The host may still own blocked or
read-only messages, but it must not flatten typed editable empty-state copy
back into one route-global fallback once the canvas kind is known.

## Invariants

- Empty Canvas is a productive authoring state when mutations are allowed.
- Empty Canvas is read-only when mutations are denied.
- Empty authoring is only reachable after the host persists a canvas document.
- The empty catalog must resolve from the active `canvasDocument.kind`.
- The empty catalog, empty copy, graph strategy, and execution posture must
  resolve from the same `CanvasRuntimeRegistration`.
- First-node admission must call `CanvasRuntimePolicy.admission` before
  `CanvasGraphLifecycle` mutates the draft session.
- A node whose `kind`, `pluginId`, or role is not owned by the active runtime
  catalog must be rejected before any viewport or draft effect runs.
- The typed editable empty-state title and first-node copy must resolve from
  `CanvasRuntimeRegistration.emptyState`.
- First-node authoring remains available when source import is unavailable;
  source import is an optional capability, not the only route out of empty
  Canvas.
- Read-only empty posture keeps typed copy visible but removes mutating node
  choices and commands.
- Node creation must pass through the existing draft graph lifecycle.
- Consecutive node creation or drop commands in the same event turn must
  preserve every admitted node in both viewport state and the draft session.
- The first-node path must not fabricate startup nodes or local-only success.
- React Flow nodes are projection state; they are not semantic authority.
- `Import sources` remains a separate capability-gated command.
- Loose or disconnected authoring nodes are valid draft state.
- Run/preview must later depend on explicit execution selection, not whole-draft
  compile-by-default behavior.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> NeedsCanvas: no persisted canvas document
  NeedsCanvas --> EmptyReadonly: save canvas + mutation denied
  NeedsCanvas --> EmptyAuthorable: save canvas + mutation allowed
  EmptyReadonly --> EmptyReadonly: show read-only copy
  EmptyAuthorable --> CreatingNode: choose governed node kind
  CreatingNode --> DraftLifecycle: build canonical authoring node
  DraftLifecycle --> ViewportProjection: admit explicit node
  ViewportProjection --> DraftAutosave: existing draft persistence flow
  DraftAutosave --> EmptyAuthorable: save rejected or gated
  DraftAutosave --> GraphReady: authoritative draft refresh/projection
```

## Component Flow

```mermaid
flowchart LR
  Host["CanvasPlaygroundHost"] --> Draft["Persist canvas document"]
  Draft --> Center["CanvasCenterSurface"]
  Center --> Workbench["canvasCenterSurfaceWorkbench"]
  Workbench --> Runtime["CanvasRuntimeRegistration"]
  Runtime --> Copy["emptyState"]
  Runtime --> Catalog["nodeKinds"]
  Runtime --> Execution["executionStrategy"]
  Runtime --> Policy["CanvasRuntimePolicy"]
  Copy --> Catalog
  Catalog --> Command["handleCreateAuthoringNode"]
  Command --> Builder["canvasAuthoringNodeCommand"]
  Builder --> Runner["useCanvasNodeAdmissionCommandRunner"]
  Policy --> Runner
  Runner --> Transaction["resolveCanvasNodeAdmissionTransaction"]
  Transaction --> Admission["admitCanonicalNodeToCanvas"]
  Transaction --> Lifecycle["canvasGraphLifecycle.node.admitExplicit"]
  Transaction --> Projection["mapDroppedCanonicalNodeToCanvasNode"]
  Projection --> Viewport["Canvas viewport projection"]
  Lifecycle --> Autosave["protected authoring draft save"]
```

## Sequence

```mermaid
sequenceDiagram
  participant Route as Canvas route
  participant Runtime as CanvasRuntimeRegistration
  participant Policy as CanvasRuntimePolicy
  participant Empty as Empty entrypoint
  participant Handler as Node creation handler
  participant Runner as Node admission command runner
  participant Tx as Node admission transaction
  participant Draft as Draft lifecycle
  participant View as Viewport projection

  Route->>Runtime: active canvasDocument.kind
  Runtime->>Policy: nodeKinds and execution posture
  Runtime-->>Empty: emptyState and nodeKinds
  Empty->>Handler: create NodeKindRegistration
  Handler->>Runner: canonical node + viewport position
  Runner->>Policy: allowsCanonicalNode
  Runner->>Tx: latest nodes + latest draft session
  Tx->>Draft: compute next semantic draft session
  Tx->>View: compute next React Flow node projection
  Runner-->>Route: apply draft and viewport effects once
  Handler-->>Route: apply selection, inspector, and notification effects once
```

## Consumers

- `CanvasCenterSurface.tsx` renders the empty authoring surface from canonical
  route posture.
- `CanvasStateViews.tsx` renders the governed node-kind choices.
- `CanvasShell.tsx` and `CanvasShellMainPanel.tsx` carry shell composition.
- `useCanvasNodeAuthoringHandlers.ts` composes drop, creation, and removal
  authoring commands.
- `canvasControllerViewModel.ts` exposes the command to route composition.

## Fowler / DDD Reading

This is an application-service entrypoint over an aggregate mutation. The UI
selects a governed node kind and invokes a command. The command builds a
canonical authoring node, then delegates admission to a local command runner.
The runner calls the pure transaction over its latest local nodes and draft
session snapshot before applying React effects once. This keeps the same
aggregate lifecycle used by drop operations while avoiding stale-handler drift
between rapid commands.

Mature graph systems such as NiFi, Dagster, and dbt editors do not require a
whole project or a compile-valid graph before the first node can exist. They
allow partial authoring state, then validate execution on the selected runnable
unit. This component follows that split, but now does so behind a host-owned
canvas document identity rather than a route-global transformation default.

## Drift To Prevent

- Do not route first-node creation through project setup.
- Do not create another catalog beside the plugin-owned `CanvasKindRegistration`
  node kinds.
- Do not flatten typed editable empty-state copy back into one route-global
  fallback once `canvasDocument.kind` is known.
- Do not bypass `admitCanonicalNodeToCanvas` or `canvasGraphLifecycle`.
- Do not bypass `useCanvasNodeAdmissionCommandRunner` when a handler needs to
  mutate both viewport nodes and the draft session.
- Do not bypass `CanvasRuntimePolicy.admission` for catalog-created nodes;
  visible catalog membership is not enough unless the command also validates
  the active runtime policy.
- Do not move viewport projection back into the canonical admission aggregate.
- Do not make `CanvasCenterSurface.tsx` own transport, workbench, and empty
  authoring decisions in one large method again.
- Do not skip the `needs_canvas` host posture by inventing a default document
  client-side.
- Do not make import capability the only path out of empty Canvas.
- Do not split empty copy, first-node catalog, graph strategy, and execution
  posture into separate route-level truth sources.
