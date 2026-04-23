---
title: Canvas Empty Authoring Entrypoint Component
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-23
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

The visible authoring catalog is the governed `CanvasKindRegistration.nodeKinds`
catalog for the active `canvasDocument.kind`. UI surfaces must not define a
second ad hoc node-kind list. For the `transformation` canvas kind, that
catalog currently resolves to `DVT_AUTHORING_NODE_KINDS`.

## Invariants

- Empty Canvas is a productive authoring state when mutations are allowed.
- Empty Canvas is read-only when mutations are denied.
- Empty authoring is only reachable after the host persists a canvas document.
- The empty catalog must resolve from the active `canvasDocument.kind`.
- Node creation must pass through the existing draft graph lifecycle.
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
  Workbench --> Catalog["CanvasKindRegistration.nodeKinds"]
  Catalog --> Command["handleCreateAuthoringNode"]
  Command --> Builder["canvasAuthoringNodeCommand"]
  Builder --> Drop["dropCanonicalNode"]
  Drop --> Lifecycle["canvasGraphLifecycle.node.admitExplicit"]
  Lifecycle --> Projection["Canvas viewport projection"]
  Projection --> Autosave["protected authoring draft save"]
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
canonical authoring node and delegates to the same aggregate lifecycle used by
drop operations.

Mature graph systems such as NiFi, Dagster, and dbt editors do not require a
whole project or a compile-valid graph before the first node can exist. They
allow partial authoring state, then validate execution on the selected runnable
unit. This component follows that split, but now does so behind a host-owned
canvas document identity rather than a route-global transformation default.

## Drift To Prevent

- Do not route first-node creation through project setup.
- Do not create another catalog beside the plugin-owned `CanvasKindRegistration`
  node kinds.
- Do not bypass `dropCanonicalNode` or `canvasGraphLifecycle`.
- Do not make `CanvasCenterSurface.tsx` own transport, workbench, and empty
  authoring decisions in one large method again.
- Do not skip the `needs_canvas` host posture by inventing a default document
  client-side.
- Do not make import capability the only path out of empty Canvas.
