---
title: Graph Sequences And State Machines
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-22
---

# Graph Sequences And State Machines

## Sequence 1: Published Route Startup

```mermaid
sequenceDiagram
  participant Root as Root.tsx
  participant Active as useActiveRouteBootstrapRegistration
  participant Publisher as usePublishedRouteBootstrap
  participant Registry as routeBootstrapRegistry

  Root->>Active: resolve active route registration
  Active-->>Root: routeId + mode + initialPresentation
  Root->>Registry: read(routeId)
  Publisher->>Registry: publish(routeId, pending|blocked|error|complete)
  Registry-->>Root: notify updated posture
  Root->>Root: keep Raven or reveal shell
```

## Sequence 2: Save With CAS Conflict

```mermaid
sequenceDiagram
  participant Operator as Operator
  participant Controller as useCanvasController
  participant Session as CanvasDraftSession
  participant Port as Workspace draft port

  Operator->>Controller: mutate graph
  Controller->>Session: machine.markSaving()
  Controller->>Port: save(expectedRevision, payload)
  alt success
    Port-->>Controller: persisted record
    Controller->>Session: machine.applySaveSuccess()
  else conflict
    Port-->>Controller: conflict + current record
    Controller->>Session: machine.applyConflict()
  else missing remote
    Port-->>Controller: missing remote record
    Controller->>Session: machine.markRemoteDraftMissing()
  end
```

## State Machine: Route Startup

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> blocked
  pending --> error
  pending --> complete
  blocked --> pending
  blocked --> complete
  error --> pending
  error --> complete
  complete --> [*]
```

Rule:

- reset to initial posture only on unmount or route identity change.

## State Machine: Canvas Draft Session

```mermaid
stateDiagram-v2
  [*] --> bootstrapping
  bootstrapping --> editing
  editing --> saving
  saving --> editing
  saving --> conflict
  editing --> missing_remote
  conflict --> editing: reloadFromRemote
  missing_remote --> editing: reloadFromRemote
```

Rule:

- conflict and missing-remote are fail-closed mutation states until an
  authoritative remote reload succeeds.
