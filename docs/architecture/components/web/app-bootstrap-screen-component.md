---
title: App Bootstrap Screen Component
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-27
---

# App Bootstrap Screen Component

## Owned Concern

The app bootstrap screen owns the pre-React Raven startup gate. It keeps a
single visible startup surface alive while the browser shell mounts, services
compose, runtime capabilities settle, platform health resolves, and the active
route publishes operability.

The component is split into a pure Presentation Model and a DOM adapter:

- `appBootstrapPresentation.ts` owns startup copy, step ordering, aggregate
  state transitions, completion rules, progress snapshots, and build-date
  formatting.
- `appBootstrapScreen.ts` owns DOM lookup, ARIA writes, metadata writes, and
  the exported control API used by the rest of the app.

It does not own route-specific readiness, backend contract semantics, or Canvas
draft truth. Those concerns publish into this component through typed route and
health/bootstrap adapters.

## Public API

| API                          | Owned behavior                                                              |
| ---------------------------- | --------------------------------------------------------------------------- |
| `startBootstrapScreen()`     | Resets step state, writes initial detail copy, metadata, progress, and ARIA |
| `setBootstrapStepStatus()`   | Updates one startup step and re-derives the aggregate screen state          |
| `completeBootstrapScreen()`  | Removes the screen only after every step reaches an allowed terminal state  |
| `showBootstrapFailure()`     | Converts startup exceptions into the single controlled error screen         |
| `isBootstrapScreenVisible()` | Allows route error boundaries to avoid stacking a second error surface      |
| `renderBootstrapProgress()`  | Renders progress from an already resolved bootstrap snapshot                |

## Presentation Model API

| API                                    | Owned behavior                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `BOOTSTRAP_STEP_ORDER`                 | Canonical order for startup step rendering and aggregate readiness            |
| `createInitialBootstrapStepState()`    | Produces the initial pending state with default details                       |
| `createBootstrapStepState()`           | Resolves one typed step state with caller detail or default presentation copy |
| `resolveBootstrapScreenPresentation()` | Derives screen copy, announcement state, step presentations, and progress     |
| `canCompleteBootstrapSteps()`          | Validates the terminal-state invariant before DOM removal                     |
| `formatBootstrapBuildDate()`           | Normalizes build metadata for the critical startup shell                      |

## Invariants

- The startup screen remains visible while any critical step is `pending`,
  `blocked`, or `error`.
- `blocked` and `error` states do not reveal the workbench behind the startup
  gate.
- A transport-level health failure is a visible failed startup check, not a
  degraded check. It is non-blocking for shell reveal when the active route can
  render a governed failure state.
- Backend/offline readiness in API runtime blocks unsafe Canvas interactions
  inside the Canvas route, but it does not keep the pre-React startup gate
  visible once the route can render that blocker as its first useful surface.
- Once a platform-health probe has failed, automatic retries must not demote
  the visible startup posture back to cold-start `pending`; retries update
  detail copy in place while the gate stays settled.
- `completeBootstrapScreen()` is a guard, not a command override; it cannot
  remove the screen until all steps are terminally allowed.
- ARIA state is owned by the bootstrap state machine: `aria-busy="true"` before
  completion and `aria-busy="false"` after completion.
- The HTML shell provides critical markup and CSS before React loads; React
  components do not need to mount before users see deterministic startup status.
- Visual posture stays operational: compact brand, ordered status flow,
  readiness segments, and build metadata instead of a decorative hero image or
  a misleading percentage bar.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Loading: step pending
  Loading --> Loading: step degraded
  Loading --> Loading: non-critical step failed
  Loading --> Blocked: any step blocked
  Loading --> Error: any step error
  Blocked --> Loading: blocked step returns pending
  Blocked --> Error: any step error
  Blocked --> Complete: all steps complete, degraded, or non-critical failed
  Error --> Error: controlled startup failure
  Loading --> Complete: all steps complete, degraded, or non-critical failed
  Complete --> [*]: delayed DOM removal
```

## Component Boundary

```mermaid
flowchart LR
  Publishers["main / providers / root / route errors"] --> Screen["appBootstrapScreen.ts\nDOM adapter"]
  Screen --> Presentation["appBootstrapPresentation.ts\nPresentation Model"]
  Presentation --> Snapshot["screen + steps + progress snapshot"]
  Screen --> Dom["index.html startup DOM"]
  Screen --> Progress["bootstrapProgressBar.ts"]
  Progress --> Dom
```

## Consumer Topology

```mermaid
flowchart LR
  Html["index.html critical shell"] --> Bootstrap["appBootstrapScreen.ts"]
  Main["main.tsx"] --> Bootstrap
  Providers["AppProviders.tsx"] --> Bootstrap
  Root["Root.tsx"] --> Bootstrap
  RouteErrors["AppRouteErrorBoundary.tsx"] --> Bootstrap
  Bootstrap --> Presentation["appBootstrapPresentation.ts"]
  Root --> RouteBootstrap["routeBootstrapRegistry.ts"]
  Root --> Health["platform-health query"]
  RouteBootstrap --> Bootstrap
  Health --> Bootstrap
  Bootstrap --> Progress["bootstrapProgressBar.ts"]
```

## Consumers

- `apps/web/index.html` owns the critical HTML and CSS shell.
- `apps/web/src/main.tsx` starts the screen and completes the hydration step.
- `apps/web/src/app/AppProviders.tsx` publishes service/provider readiness.
- `apps/web/src/app/Root.tsx` publishes capability, platform health, and active
  route posture.
- `apps/web/src/app/AppRouteErrorBoundary.tsx` uses visibility state to avoid a
  second failure surface while bootstrap is still visible.

## Test Coverage

- `apps/web/src/app/bootstrap/appBootstrapPresentation.test.ts` covers
  presentation-model defaults, completion rules, blocked/error precedence,
  non-critical health failure, and build metadata formatting.
- `apps/web/src/app/bootstrap/appBootstrapScreen.test.ts` covers blocked,
  failure, production HTML shell contract, metadata, completion, and ARIA
  busy-state semantics.
- `apps/web/src/app/Root.bootstrapFlow.test.tsx` covers root-to-bootstrap
  integration for health, capabilities, route blocks, and route completion.

## Governance Drift Guard

- `tools/ci/planning-truth-sync.test.mjs` protects the planning truth for the
  related Canvas runtime-policy closure that feeds route startup posture.
