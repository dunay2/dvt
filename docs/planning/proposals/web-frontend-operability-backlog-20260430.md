---
title: Web Frontend Operability Backlog
status: Proposed
owner: Product / Web
last_reviewed: 2026-04-30
planning_type: proposal
---

# Web Frontend Operability Backlog

This backlog converts the current frontend operability findings into user
stories. It is proposed planning material, not a shipped product promise.

## User Stories

### US-FRONT-OPERABILITY-001 - Preserve Admin route position

As a platform operator, I want the selected Admin tab to survive browser refresh
so I do not lose investigation context while checking platform state.

Acceptance:

- Selecting Audit Log writes `/admin?tab=audit`.
- Loading `/admin?tab=audit` opens Audit Log.
- Invalid tab values fall back safely.

Negative scenarios:

- Invalid `?tab=unknown`.
- Refresh while capability queries are still loading.

### US-FRONT-OPERABILITY-002 - Preserve Canvas card layout

As a data engineer, I want moved Canvas cards to remain where I left them after
F5 so the authoring surface is stable during long sessions.

Acceptance:

- Local card positions override remote draft coordinates after local layout has
  been persisted.
- Bootstrap and reload both preserve local positions.
- Remote positions seed layout only when no local positions exist.

Negative scenarios:

- Remote draft reload with different node positions.
- Late autosave resolves after reload.
- Graph query pending while drag events fire.

### US-FRONT-OPERABILITY-003 - Refresh expired local protected-runtime token

As a local protected-runtime user, I want the frontend to request a fresh token
before a protected API call so an expired dev token does not look like a draft
permission failure.

Acceptance:

- Expired configured token is refreshed when refresh URL exists.
- Safe requests retry once after `401`.
- Expired token is omitted when refresh is unavailable.

Negative scenarios:

- Refresh endpoint returns expired token.
- Request body is not retryable.
- Refresh endpoint is missing.

### US-FRONT-OPERABILITY-004 - Tell the truth for missing backend routes

As an operator, I want routes with absent backend contracts to show honest
unavailable states so I can distinguish product gaps from broken UI.

Acceptance:

- Code, Diff and Artifacts do not claim success when backend returns 404.
- Each unavailable state names the missing capability or endpoint family.
- Product backlog marks the route as blocked by backend contract.

Negative scenarios:

- `/workspace/files` returns 404.
- `/diff/changes` returns 404.
- Capability says a plugin is unavailable.

### US-FRONT-OPERABILITY-005 - Browser proof for Canvas layout refresh

As a release reviewer, I want an automated browser test for moving a Canvas card
and refreshing the page so the regression cannot return behind unit tests.

Acceptance:

- Test drags a real card through the browser surface.
- Test reloads the page.
- Test asserts the same rendered card position after reload.

Negative scenarios:

- Backend draft has stale coordinates.
- Local storage/session state is empty.
- Reload occurs while a save is in flight.

### US-FRONT-OPERABILITY-006 - Web-to-API endpoint contract matrix

As a technical lead, I want CI to compare web API-service calls with registered
API routes so frontend screens do not silently depend on nonexistent endpoints.

Acceptance:

- Matrix lists every `apps/web` API endpoint family.
- Matrix maps endpoint families to `apps/api` registered routes or explicit
  accepted gaps.
- CI fails on new unclassified endpoint drift.

Negative scenarios:

- New web service calls an unregistered API route.
- Existing accepted gap is removed from the risk register without implementation.
- Backend route exists but method or parameter shape differs.

### US-FRONT-OPERABILITY-007 - Place new Canvas nodes in view

As a data engineer, I want newly created Canvas nodes to appear inside the
visible viewport so I can continue authoring without hunting for off-screen
cards.

Acceptance:

- Node creation resolves the current viewport bounds before assigning an
  initial position.
- When there is enough empty space, the new node appears near the current focus
  area without overlapping the toolbar or fixed panels.
- When the viewport is crowded, placement falls back to a deterministic nearby
  offset that remains inside the pannable Canvas area.
- The initial position is recorded as route-local layout state, not as
  authoritative graph meaning.

Negative scenarios:

- Empty Canvas with a zoomed or panned viewport.
- Crowded Canvas where the focus area is occupied.
- Node creation while layout hydration is still pending.

### US-FRONT-OPERABILITY-008 - Keep auto-layout movable

As a data engineer, I want auto-layout to reorganize the Canvas without locking
node dragging so I can use layout as a starting point and still fine-tune the
graph manually.

Acceptance:

- Clicking the layout action repositions nodes but does not disable drag
  gestures for editable graphs.
- Layout output is persisted through the route-local layout rail.
- Any graph-edit gate that disables dragging is explicit and independent from
  the layout action.

Negative scenarios:

- Layout action on a read-only or gated graph.
- Layout action followed by dragging a moved node.
- Layout action while node-position persistence is hydrating.

### US-FRONT-OPERABILITY-009 - Control Canvas grid visibility and color

As a data engineer, I want to show, hide, and recolor the Canvas grid so the
authoring surface can match my contrast needs and the density of the graph.

Acceptance:

- A Canvas-owned view setting toggles the background grid on and off.
- A Canvas-owned view setting selects the grid color from governed theme tokens
  or approved semantic swatches.
- Grid settings are route-local presentation preferences and do not mutate the
  protected graph draft.
- Disabled or unavailable grid settings explain the current surface state.

Negative scenarios:

- High-contrast theme with insufficient grid contrast.
- Browser reload after changing grid settings.
- Read-only graph where visual preferences remain allowed but graph edits do
  not.

### US-FRONT-OPERABILITY-010 - Snap Canvas nodes to grid

As a data engineer, I want an optional snap-to-grid mode so I can align nodes
cleanly without losing free-form placement when precision is not useful.

Acceptance:

- A Canvas-owned view setting enables or disables snap-to-grid.
- Dragged and newly created node positions snap only when the mode is enabled.
- Snapped positions are persisted through the route-local layout rail.
- Disabling the mode preserves existing positions and allows free-form moves.

Negative scenarios:

- Snap mode enabled while grid visibility is off.
- Dragging at non-default zoom.
- Hydrating previously persisted free-form positions after enabling snap mode.

## Scenario Coverage Matrix

| Story                    | Current coverage                                                                                 | Remaining coverage                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| US-FRONT-OPERABILITY-001 | `AdminView.test.tsx`, `AdminView.architecture.test.ts`                                           | Invalid-tab test can be added when route parser is extracted. |
| US-FRONT-OPERABILITY-002 | `useCanvasController.persistence.test.tsx`, `useCanvasController.reloadHydrationGuards.test.tsx` | Browser drag-refresh proof.                                   |
| US-FRONT-OPERABILITY-003 | `createApiClient.test.ts`, `canvasStartupAndDraftRecovery.architecture.test.ts`                  | Full local protected-runtime browser proof.                   |
| US-FRONT-OPERABILITY-004 | Existing unavailable UI states and documented gaps                                               | Endpoint contract matrix.                                     |
| US-FRONT-OPERABILITY-005 | Not yet implemented                                                                              | Cypress/Playwright route proof.                               |
| US-FRONT-OPERABILITY-006 | Not yet implemented                                                                              | CI guard and risk-register alignment.                         |
| US-FRONT-OPERABILITY-007 | Not yet implemented                                                                              | Viewport-aware node placement unit and browser proof.         |
| US-FRONT-OPERABILITY-008 | `useCanvasGraphHandlers.layout.test.tsx` covers layout apply path                                | Regression for drag after layout action.                      |
| US-FRONT-OPERABILITY-009 | Not yet implemented                                                                              | Canvas view-settings model plus accessibility contrast proof. |
| US-FRONT-OPERABILITY-010 | Not yet implemented                                                                              | Snap-to-grid policy tests at default and non-default zoom.    |

## TDD Traceability

| Slice                      | Red test                                                                       | Green implementation                                                      |
| -------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Admin route position       | Admin test expected `?tab=audit` after tab click.                              | `AdminView` writes tab to React Router search params.                     |
| Canvas layout refresh      | Persistence/reload tests expected local positions to survive remote hydration. | `shouldSeedCanvasLayoutFromRemoteDraft(...)` gates remote layout seeding. |
| Auth refresh               | API client tests expected fresh token after expiry and `401`.                  | `apiAuthConfig` refresh policy plus bounded `createApiClient` retry.      |
| Architecture documentation | `AdminView.architecture.test.ts` expected review, guide and backlog docs.      | This backlog, Admin component guide, and mailbox analysis.                |
| New-node placement         | Test expects created nodes to land inside the active viewport.                 | Canvas placement policy resolves viewport-aware initial positions.        |
| Layout remains draggable   | Test expects drag callbacks to remain enabled after layout action.             | Layout action persists positions without mutating edit permissions.       |
| Grid presentation settings | Test expects grid visibility and color settings to stay route-local.           | Canvas view settings own grid preference projection.                      |
| Snap-to-grid               | Test expects snapped coordinates only when snap mode is enabled.               | Snap policy applies to creation and drag before layout persistence.       |
