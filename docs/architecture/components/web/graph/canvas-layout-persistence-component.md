---
title: Canvas Layout Persistence Component
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-29
planning_type: architecture
---

# Canvas Layout Persistence Component

## Purpose

This guide defines the local component that persists route-local Canvas layout
observations: viewport position and node coordinates. It does not own
authoritative graph draft state.

This distinction matters because Canvas has two truths:

- graph meaning and draft persistence belong to the protected authoring draft;
- viewport and card coordinates belong to route-local layout state.

## Public API

| API                                | Owner                            | Responsibility                                                      |
| ---------------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| `useCanvasLayoutPersistence(...)`  | `useCanvasLayoutPersistence.ts`  | Return node-position, node-drag, and viewport persistence handlers. |
| `handleNodePositionsSave`          | `useCanvasLayoutPersistence.ts`  | Persist a complete node-position map for the active layout key.     |
| `handleNodeDragStop`               | `useCanvasLayoutPersistence.ts`  | Persist the drag-stop event payload over stale React Flow arrays.   |
| `handleViewportChange`             | `useCanvasLayoutPersistence.ts`  | Persist viewport only after hydration and graph readiness.          |
| `useCanvasViewportGraphModel(...)` | `useCanvasViewportGraphModel.ts` | Project canonical graph nodes into live React Flow viewport nodes.  |
| `CanvasViewport` callbacks         | `CanvasViewport.tsx`             | Forward governed React Flow gesture callbacks only.                 |

## Invariants

- Layout persistence only runs after hydration and after the graph query is no
  longer pending.
- Drag-stop persistence trusts the `draggedNode` event payload over the stale
  `allNodes` snapshot supplied by React Flow.
- Settled live drag frames may persist observed viewport-model positions.
- Active drag frames must not rewrite persisted coordinates until the gesture
  settles.
- The component must not import draft-authoring ports, API clients, or
  protected draft save functions.
- The controller must pass both `graphModel.nodes` and
  `store.persistedNodePositions`; layout persistence must not reconstruct graph
  truth itself.

## Transitions

### Drag persistence

```mermaid
sequenceDiagram
  participant Operator
  participant Viewport as CanvasViewport
  participant Layout as useCanvasLayoutPersistence
  participant Store as canvasInteractionStore

  Operator->>Viewport: drag card from governed handle
  Viewport->>Layout: onNodeDragStop(event, draggedNode, allNodes)
  Layout->>Layout: mergeDraggedNodePosition(allNodes, draggedNode)
  Layout->>Store: setCanvasNodePositions(layoutKey, positions)
```

### Settled live viewport persistence

```mermaid
stateDiagram-v2
  [*] --> ObserveNodes
  ObserveNodes --> ActiveDrag: any node dragging=true
  ActiveDrag --> SettledCandidate: drag frame settles
  ObserveNodes --> SettledCandidate: positions changed without active drag
  SettledCandidate --> Noop: same as persistedNodePositions
  SettledCandidate --> Persist: changed and route can persist
  Persist --> ObserveNodes
```

## Consumers

Direct consumers:

- `useCanvasController.ts`
- `CanvasViewport.tsx`
- `useCanvasViewportGraphModel.ts`
- `canvasInteractionStore`

Indirect consumers:

- Canvas browser operability flows
- route-level persistence tests
- selected-closure live proof scripts

## Fowler Reading

| Pattern                       | Local expression                   | Maturity rule                                              |
| ----------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| Presentation Model            | viewport graph model               | Keep renderer coordinates separate from graph semantics.   |
| Application Controller seam   | `useCanvasLayoutPersistence()`     | Coordinate layout effects without owning draft authority.  |
| Intention-Revealing Interface | `handleNodeDragStop` payload merge | Name the stale snapshot hazard directly.                   |
| Policy Object                 | readiness and equality guards      | Persist only when hydrated, ready, and materially changed. |

## Negative Coverage

Primary tests:

- `apps/web/src/app/views/canvas/useCanvasController.persistence.test.tsx`
- `apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx`
- `apps/web/src/app/views/canvas/CanvasViewport.test.tsx`
- `apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.test.ts`

The tests cover pending-query denial, stale drag-stop payload replacement,
settled live drag persistence, and semantic boundary rules.

## Drift To Watch

- Do not persist layout by calling the protected draft authoring port.
- Do not infer graph meaning from stored coordinates.
- Do not allow React Flow's stale `allNodes` array to overwrite the event
  payload for the dragged card.
- Do not re-enable drag gestures outside `CanvasViewport` permission policy.
