---
title: Web Store Domain Ownership User Stories
status: Active
owner: Web / Architecture
last_reviewed: 2026-05-03
---

# Web Store Domain Ownership User Stories

These stories cover the active F-05 store domain ownership scenarios. They are
architecture stories: their user is a product user, reviewer, or maintainer
depending on the scenario.

## User Stories

### US-WEB-STORE-001 - Workspace Scope Selection

As a user changing tenant, project, environment, or target adapter, I want the
workspace scope to be owned by one shell-session store so run actions and
workspace reads use the same scope.

Acceptance:

- `useSessionStore` owns tenant, project, environment, and target adapter.
- `buildRunContext` is the single local query that projects scope into run
  command context.
- No layout or Canvas interaction store owns workspace scope.

### US-WEB-STORE-002 - Canvas Interaction State

As a Canvas user, I want selection, overlays, inspector focus, viewport, and
node positions to survive route interaction without becoming global app state.

Acceptance:

- `useCanvasInteractionStore` owns Canvas interaction commands.
- Canvas layout persistence remains keyed by workspace.
- Route facades compose this store explicitly.

### US-WEB-STORE-003 - Shell Layout Control

As a workbench user, I want panels, tabs, focus mode, grid size, and palette to
behave as shell preferences without carrying runtime health or execution
authority.

Acceptance:

- `useUiLayoutStore` owns shell layout commands and visual preferences.
- `connectionStatus is not layout state`.
- Persisted layout storage cannot rehydrate platform connection fields.

### US-WEB-STORE-004 - Platform Connection Status

As a user looking at the shell connection indicator, I want REST and live-event
connection status to reflect the platform-health read model.

Acceptance:

- `usePlatformConnectionStore` owns `ProjectPlatformConnectionStatus`.
- `Root` updates the projection from the authoritative platform-health query.
- `TopAppBar` reads the projection or a direct health override.

### US-WEB-STORE-005 - Runtime Evidence Display

As a user inspecting runs, cost, or console context, I want current plan and run
evidence to be available without being mixed with shell layout state.

Acceptance:

- `useExecutionStore.currentPlan` and `useExecutionStore.currentRun` are runtime
  evidence read-model fields.
- Runs, Cost, Console, and Canvas facade consumers read evidence through the
  explicit store.
- Authorization does not share this store after the hard cut.

### US-WEB-STORE-006 - Authorization Capability Display

As a Canvas user, I want planning, run, edge-edit, plugin, and RBAC actions to
follow one explicit authorization projection rather than hidden runtime
evidence defaults.

Acceptance:

- `useAuthorizationStore.userPermissions` owns effective UI capabilities.
- `useExecutionStore.userPermissions` is forbidden; no compatibility path is
  accepted.
- Canvas route facades compose runtime evidence and authorization explicitly.

### US-WEB-STORE-007 - Reviewer Semantic Guard

As a reviewer, I want store ownership to be guarded semantically so a future
change cannot reintroduce an aggregate store, hidden barrel, or layout/status
mix while keeping tests green.

Acceptance:

- Store modules start with owned-concern docblocks.
- The local component guide names public API, invariants, transitions, and
  consumers.
- `webStoreDomainOwnership.architecture.test.ts` validates semantic ownership,
  documentation, and hard-cut language.

## Scenario Coverage Matrix

| Story            | Primary files                                             | Required proof                                                               |
| ---------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| US-WEB-STORE-001 | `sessionStore.ts`                                         | `webStoreDomainOwnership.architecture.test.ts`, `Root.shellChrome.test.tsx`  |
| US-WEB-STORE-002 | `canvasInteractionStore.ts`                               | `canvasInteractionStore.test.ts`, Canvas facade architecture tests           |
| US-WEB-STORE-003 | `uiLayoutStore.ts`                                        | `uiLayoutStore.test.ts`, `webStoreDomainOwnership.architecture.test.ts`      |
| US-WEB-STORE-004 | `platformConnectionStore.ts`, `Root.tsx`, `TopAppBar.tsx` | `platformConnectionStore.test.ts`, `Root.platformHealthBanner.test.tsx`      |
| US-WEB-STORE-005 | `executionStore.ts`                                       | `webStoreDomainOwnership.architecture.test.ts`, runtime view tests           |
| US-WEB-STORE-006 | `authorizationStore.ts`, Canvas facade                    | `authorizationStore.test.ts`, `webStoreDomainOwnership.architecture.test.ts` |
| US-WEB-STORE-007 | Component guide, local guide, mailbox, architecture test  | `webStoreDomainOwnership.architecture.test.ts`                               |

## Scenario Catalog

| Scenario                                            | Story            | Expected result                                                                  | Negative proof                                                                        |
| --------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| User changes workspace scope.                       | US-WEB-STORE-001 | Run context reads the same tenant/project/environment/adapter from session.      | Layout, Canvas interaction, and execution stores do not define workspace scope.       |
| Canvas persists node positions per workspace key.   | US-WEB-STORE-002 | Positions and viewport hydrate only for the matching workspace key.              | A different workspace key does not reuse the previous Canvas layout.                  |
| User toggles shell panels and visual preferences.   | US-WEB-STORE-003 | Layout commands update shell-only state.                                         | Persisted layout cannot restore `connectionStatus` or authorization fields.           |
| Platform health changes while the shell is mounted. | US-WEB-STORE-004 | Root writes `ProjectPlatformConnectionStatus`; TopBar displays that projection.  | `uiLayoutStore` has no `connectionStatus` command, state field, or type import.       |
| A plan or run becomes current.                      | US-WEB-STORE-005 | Runtime views and Canvas read current plan/run from `useExecutionStore`.         | `executionStore` does not expose authorization types, defaults, or `userPermissions`. |
| Canvas policy reads effective user capabilities.    | US-WEB-STORE-006 | Planning, running, edge editing, plugins, and RBAC read `useAuthorizationStore`. | No compatibility selector, bridge, alias, or barrel can route through execution.      |
| Reviewer checks future store changes.               | US-WEB-STORE-007 | Docs, owned-concern docblocks, and semantic architecture tests agree.            | A thin-file-only change cannot pass without matching owner, rail, and story docs.     |

## TDD Traceability

- `platformConnectionStore.test.ts` proved the new platform connection read
  model owns partial status updates.
- `uiLayoutStore.test.ts` proved layout hydration does not revive legacy
  `connectionStatus`.
- `authorizationStore.test.ts` proved effective UI permissions live outside
  runtime evidence.
- `webStoreDomainOwnership.architecture.test.ts` proves the semantic component
  docs, owned-concern docblocks, and hard-cut language remain aligned.
