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

## Scenario Coverage Matrix

| Story                    | Current coverage                                                                                 | Remaining coverage                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| US-FRONT-OPERABILITY-001 | `AdminView.test.tsx`, `AdminView.architecture.test.ts`                                           | Invalid-tab test can be added when route parser is extracted. |
| US-FRONT-OPERABILITY-002 | `useCanvasController.persistence.test.tsx`, `useCanvasController.reloadHydrationGuards.test.tsx` | Browser drag-refresh proof.                                   |
| US-FRONT-OPERABILITY-003 | `createApiClient.test.ts`, `canvasStartupAndDraftRecovery.architecture.test.ts`                  | Full local protected-runtime browser proof.                   |
| US-FRONT-OPERABILITY-004 | Existing unavailable UI states and documented gaps                                               | Endpoint contract matrix.                                     |
| US-FRONT-OPERABILITY-005 | Not yet implemented                                                                              | Cypress/Playwright route proof.                               |
| US-FRONT-OPERABILITY-006 | Not yet implemented                                                                              | CI guard and risk-register alignment.                         |

## TDD Traceability

| Slice                      | Red test                                                                       | Green implementation                                                      |
| -------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Admin route position       | Admin test expected `?tab=audit` after tab click.                              | `AdminView` writes tab to React Router search params.                     |
| Canvas layout refresh      | Persistence/reload tests expected local positions to survive remote hydration. | `shouldSeedCanvasLayoutFromRemoteDraft(...)` gates remote layout seeding. |
| Auth refresh               | API client tests expected fresh token after expiry and `401`.                  | `apiAuthConfig` refresh policy plus bounded `createApiClient` retry.      |
| Architecture documentation | `AdminView.architecture.test.ts` expected review, guide and backlog docs.      | This backlog, Admin component guide, and mailbox analysis.                |
