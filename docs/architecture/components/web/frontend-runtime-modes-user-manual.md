---
title: Frontend Runtime Modes User Manual
status: Active
owner: Frontend / Product / Docs
last_reviewed: 2026-04-03
---

# Frontend Runtime Modes User Manual

## Purpose

This manual explains how operators and developers should interpret frontend behavior in `mock` and `api` modes.

## Runtime Modes

### `mock` mode

- used for local development and UX iteration;
- data is synthetic or locally derived;
- network-backed capability checks can be unavailable without blocking basic UI navigation.

### `api` mode

- used for integration and operational validation;
- views consume backend-backed data through governed adapters;
- route behavior must follow runtime contracts exposed by `apps/api`.

Mode selection is done once at frontend composition boot. Views should not branch on mode.

## Shell Guarantees

The shell should expose clear states:

- `loading`: backend state is being resolved;
- `empty`: no data exists for the selected context;
- `degraded`: partial backend availability;
- `offline`: backend unreachable;
- `read-only`: user can inspect but cannot execute mutation actions.

## Route Behavior Under Target Model

- Canvas: renders graph and planning actions through controller hooks and facades.
- Runs: list/detail/events flow reads runtime data through `RunsPort`.
- Diff: reads diff data through `WorkspacePort` or dedicated diff port.
- Artifacts: reads artifact surfaces via adapter-backed services.
- Admin: reads capabilities, role, and audit views through governed clients.

No route should decide API/mock mode locally.

## Failure Interpretation

- capability unavailable: specific feature reported as not available by backend;
- backend failure: request failed due to network or HTTP error;
- permissions failure: action denied by auth/role posture.

Operators should distinguish “feature unavailable” from “system offline”.

## Shell Health Banner Behavior (F-03)

The shell TopBar and global banner use one health capability seam and expose:

- `Checking`: first health query is still pending (no optimistic `ok` shown).
- `Backend degraded`: backend reachable but health semantics are degraded.
- `Backend offline`: required health snapshot is unreachable.

Retry policy:

- automatic polling at `15s` in stable `ok` state;
- exponential backoff for repeated offline failures, capped at `60s`;
- manual `Retry now` action always available while degraded/offline.

Reference contract:

- [Frontend-facing backend contract MVP-E1 2026-04-04](./frontend-backend-contract-mvp-e1-20260404.md)

## F-03 Test Matrix By Type

| Type          | Scope                                      | Primary files                                                                                                                                                             | Focus                                                                                                  |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `unit`        | health projection and retry/backoff policy | `apps/web/src/capabilities/platform-health/presentation/platformHealthStatus.test.ts`, `apps/web/src/capabilities/platform-health/domain/platformHealthSelectors.test.ts` | `ok/degraded/offline` mapping and policy behavior for probe/auth/server failures.                      |
| `integration` | shell banner and topbar behavior           | `apps/web/src/app/Root.test.tsx`                                                                                                                                          | Initial checking state, degraded/offline banner rendering, countdown, and manual retry behavior.       |
| `contract`    | backend endpoint-to-snapshot mapping       | `apps/web/src/capabilities/platform-health/infrastructure/httpPlatformHealthClient.test.ts`                                                                               | HTTP and network failure mapping (`401/403/5xx` and unavailable probes) into frontend probe semantics. |

## Route Journey (Operator)

```mermaid
flowchart LR
  Shell["Shell"] --> Canvas["Canvas"]
  Canvas --> Plan["Plan preview"]
  Plan --> Run["Run start"]
  Run --> Detail["Runs detail"]
  Detail --> Timeline["Event timeline"]
```

Mode selection is not part of this route journey.
