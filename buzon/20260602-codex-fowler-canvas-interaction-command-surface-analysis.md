---
title: Fowler analysis - Canvas interaction command surface
status: Accepted
date: 2026-06-02
owner: Frontend / Architecture
planning_type: analysis
---

# Fowler analysis - Canvas interaction command surface

## Fowler Reading

The Canvas workbench had accumulated real execution rails and stronger node
authoring seams, but the interaction surface still behaved like a prototype in
several places. Node cards had a contextual menu, while the pane delegated to
the browser and edges had no contextual command. Toolbar insertion, empty-state
creation, imported source creation, and edge mutation were all near each other
but not semantically grouped as one interaction command surface.

Root cause: gesture handling was treated as widget wiring instead of a local
application boundary. React Flow callbacks were present for drag/drop/connect,
but context-menu intent had no read model and no command/query catalog entry.

## Mature-System Comparison

Mature graph tools such as dbt Cloud lineage, Dagster asset graphs, Airflow DAG
views, NiFi, and modern node editors separate four concerns:

- graph gesture target detection;
- contextual action read model;
- command admission;
- persistence/execution authority.

DVT had the latter two for several flows, but the first two were incomplete.
The mature posture is not a large context-menu component. It is a small
presentation model that names the target and available actions, then calls the
same graph lifecycle commands as toolbar or keyboard paths.

## Improved Patterns

- **Presentation Model**: `CanvasContextMenuModel` expresses pane and edge
  actions without rendering concerns.
- **Command Gateway**: create-node and remove-edge actions enter existing
  graph command seams.
- **Replace Primitive With Object**: contextual target data is a discriminated
  union instead of loose event coordinates and optional edge IDs.
- **Semantic Fitness Function**: architecture test proves docs, stories,
  mailbox, rails, and owned modules stay aligned.

## Antipatterns Detected

- **Boundary drift**: the browser menu owned pane right-click behavior.
- **Duplicate semantics**: node creation existed in empty-state and toolbar
  paths without a position-aware contextual variant.
- **Primitive obsession**: pointer coordinates were not represented as part of
  a command request.
- **Hidden authority**: an edge gesture could have been patched directly in the
  viewport, bypassing edge lifecycle semantics.
- **Documentation drift**: the command/query catalog described toolbar and
  workbench rails but not contextual graph interaction.

## Component Grouping

The grouping now used for this slice:

- `canvasInteractionCommandSurface.ts`: contextual action semantics.
- `CanvasViewport.tsx`: React Flow gesture adapter and rendered menu.
- `canvasAuthoringNodeCommand.ts`: canonical node command construction.
- `useCanvasAuthoringNodeCreationHandlers.ts`: admission command execution.
- `canvasGraphLifecycle.edge.ts`: edge mutation semantics.

The broader E2E still has separate component groups for source import,
Inspector authoring, plan preview, run status, artifacts, and Code parity. Those
should not be folded into this component.

## Repetitions Fixed

- Node creation now has one command signature with an optional caller-owned
  position instead of forcing every caller into the catalog default slot.
- Edge deletion from context menu is expressed as the existing edge-change
  lifecycle input instead of a second direct edge mutation.
- Contextual actions are derived by one pure model instead of ad hoc UI checks.

## Code And Documentation Drift

Fixed in this slice:

- Added `ResolveCanvasContextMenu`, `CreateCanvasAuthoringNode`, and
  `RemoveCanvasEdgeFromContext` to the Canvas workbench C&Q catalog.
- Added a local component guide with public API, invariants, transitions,
  consumers, and diagrams.
- Added user stories and a semantic architecture test.
- Updated the empty authoring component API to reflect optional contextual
  positioning.

Residual drift intentionally not hidden:

- Source connection is still ADR-0058 catalog/import authority, not interactive
  credential login.
- The toolbar dropdown clipping and broader modal/right-panel styling are
  adjacent UX debts already represented by the E2E usability plan.
- A full unseeded user-created E2E manual still requires source connection,
  artifact, plan, run, and verification proof across the real stack.

## Opportunities

1. Add a server-owned `TestWarehouseConnection` command if interactive source
   login becomes part of the product.
2. Promote context-menu visual proof into Cypress once the local stack is
   stable enough for the full E2E manual.
3. Extract toolbar popover positioning into the same overlay posture so Insert
   cannot be clipped by workbench chrome overflow.
4. Extend contextual edge actions with inspect-dependency only after the
   read-model owner is documented.

## Teachings For Future Work

- Gesture code is not harmless UI glue when it exposes product intent.
- If a user can invoke an action from more than one place, name one command and
  vary only the request object.
- Server-owned source authority must be explicit. A realistic source flow needs
  a backend connection/test rail, not a nicer frontend mock.
- Architecture tests should check semantic docs and ownership, not only that a
  file exports a thin barrel.

## ADR Decision

No new ADR is required for this slice.

Existing decisions govern it:

- ADR-0056 keeps executable authority server-projected.
- ADR-0058 keeps warehouse source import behind protected workspace rails.
- ADR-0059 distinguishes node identity from mutable labels and visual position.
