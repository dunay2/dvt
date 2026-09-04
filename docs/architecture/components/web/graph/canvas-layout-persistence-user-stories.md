---
title: Canvas Layout Persistence User Stories
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-04
planning_type: architecture
---

# Canvas Layout Persistence User Stories

## Purpose

These stories define the route-local layout and viewport preference scenarios
for Canvas. They keep layout behavior separate from protected authoring draft
authority.

Use with:

- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/architecture/components/web/graph/canvas-layout-persistence-component.md`
- `buzon/20260504-codex-fowler-canvas-workbench-tabs-and-layout-analysis-and-remediation.md`

## User Stories

### US-CANVAS-LAYOUT-001 - Viewport Persistence

As a Canvas user, I want pan and zoom state to persist after hydration so my
workbench returns to the same viewport without changing graph meaning.

Acceptance:

- viewport writes execute `PersistCanvasLayout`;
- viewport reads execute `GetCanvasLayout`;
- pending graph queries block viewport persistence.

### US-CANVAS-LAYOUT-002 - Node Drag Persistence

As a Canvas user, I want dragged node positions to persist after drag frames and
drag stop events.

Acceptance:

- active drag frames can persist current positions after hydration;
- drag-stop trusts the dragged node event payload;
- stale React Flow `allNodes` snapshots cannot overwrite the dragged node.

### US-CANVAS-LAYOUT-003 - Remote Draft Seeding

As a returning Canvas user, I want remote draft coordinates to seed local
layout only when no local layout exists.

Acceptance:

- `shouldSeedCanvasLayoutFromRemoteDraft(...)` returns true only for empty
  local positions;
- local operator-owned positions survive reload;
- protected draft coordinates remain graph bootstrap input, not local layout
  authority after user persistence.

### US-CANVAS-LAYOUT-004 - Grid Visibility

As a Canvas user, I want to show or hide the grid without changing graph
authority or disabling gestures.

Acceptance:

- grid visibility executes `ConfigureCanvasViewportPreferences`;
- hidden grid keeps node dragging and edge editing available when permissions
  allow;
- hidden grid is not persisted into the protected draft.

### US-CANVAS-LAYOUT-005 - Grid Color

As a Canvas user, I want to set the grid color from the Canvas toolbar so the
workbench remains readable with different backgrounds.

Acceptance:

- grid color executes `ConfigureCanvasViewportPreferences`;
- invalid colors normalize or fall back through the palette policy;
- grid color is a route-local visual preference.

### US-CANVAS-LAYOUT-006 - Snap To Grid

As a Canvas user, I want optional snap-to-grid behavior for drag and layout
coordinates.

Acceptance:

- snap-to-grid executes `ConfigureCanvasViewportPreferences`;
- snapped coordinates affect renderer layout projection only;
- node identity, node kind, edges, and protected draft authority are unchanged.

### US-CANVAS-LAYOUT-008 - Auto-Layout Keeps Dragging

As a Canvas user, I want auto-layout to reposition nodes without making them
immovable.

Acceptance:

- auto-layout is coordinate projection;
- React Flow node type and data survive the projection;
- node drag handles remain available when edit permissions allow.

### US-CANVAS-LAYOUT-009 - Visible Initial Node Placement

As a Canvas user adding a new node, I want the new node to appear inside the
visible viewport.

Acceptance:

- this scenario is a tracked future rail unless implemented in the current
  slice;
- likely rail: `ResolveCanvasNodeInitialPosition`;
- the command must use viewport bounds without mutating graph meaning.

## Scenario Matrix

| Story                | Rail                                      | DDD owner                      | Primary proof                              | Negative proof                             |
| -------------------- | ----------------------------------------- | ------------------------------ | ------------------------------------------ | ------------------------------------------ |
| US-CANVAS-LAYOUT-001 | `PersistCanvasLayout`, `GetCanvasLayout`  | `CanvasLayoutProjection`       | `useCanvasController.persistence.test.tsx` | pending query blocks viewport persistence  |
| US-CANVAS-LAYOUT-002 | `PersistCanvasLayout`                     | `CanvasLayoutProjection`       | `useCanvasController.persistence.test.tsx` | stale `allNodes` cannot win                |
| US-CANVAS-LAYOUT-003 | `GetCanvasLayout`                         | `CanvasLayoutProjection`       | `canvasDraftLayoutHydrationPolicy` tests   | local positions are not overwritten        |
| US-CANVAS-LAYOUT-004 | `ConfigureCanvasViewportPreferences`      | `CanvasViewportPreferences`    | `CanvasViewport.test.tsx`                  | hidden grid keeps dragging enabled         |
| US-CANVAS-LAYOUT-005 | `ConfigureCanvasViewportPreferences`      | `CanvasViewportPreferences`    | toolbar/store tests                        | invalid colors normalize                   |
| US-CANVAS-LAYOUT-006 | `ConfigureCanvasViewportPreferences`      | `CanvasViewportPreferences`    | viewport/layout tests                      | snap does not mutate graph identity        |
| US-CANVAS-LAYOUT-007 | `ConfigureCanvasViewportPreferences`      | `CanvasViewportPreferences`    | store, route, toolbar tests                | hidden guide keeps node creation available |
| US-CANVAS-LAYOUT-008 | `PersistCanvasLayout`                     | `CanvasLayoutProjection`       | `CanvasViewport.test.tsx`                  | auto-layout cannot strip node data/type    |
| US-CANVAS-LAYOUT-009 | future `ResolveCanvasNodeInitialPosition` | future initial-position policy | future Cypress/unit proof                  | node cannot spawn outside visible viewport |

## TDD Traceability

- Existing persistence tests prove hydration, drag, viewport, and remote seeding
  behavior.
- This story document adds semantic coverage so future changes cannot hide
  layout preferences in protected draft semantics.
- A future implementation of `ResolveCanvasNodeInitialPosition` must start with
  a failing test for off-screen node creation.
