---
title: WorkflowEngine subsystem context
status: Review
owner: Architecture / Engine / API
last_reviewed: 2026-04-03
---

# WorkflowEngine subsystem context

## Goal

Provide one canonical as-is map of the full `WorkflowEngine` subsystem inside
DVT execution so architecture, planning, and implementation no longer depend on
fragmented or stale engine notes.

## In-system placement

`WorkflowEngine` sits in the DVT **Execution** bounded context (`@dvt/engine`).
It is consumed northbound by application entrypoints such as `apps/api`, and it
uses southbound ports for state, intent durability, provider runtime, and
observability.

Key governing boundaries:

- execution semantics are engine-owned (`ADR-0003`, `ADR-0004`)
- plan identity trust boundary is `PlanRef` (`ADR-0012`, `ADR-0042`)
- query/read separation is explicit (`ADR-0015`)
- cross-context ownership follows bounded-context rules (`ADR-0034`)

## Current ownership and communication rules

- `@dvt/contracts` owns shared serialized surfaces (`PlanRef`, `RunContext`,
  `RunExecutionContextRef`, `RunStatusSnapshot`, etc.).
- `@dvt/engine` owns lifecycle use-case orchestration and execution invariants.
- `@dvt/artifacts` owns artifact retrieval behavior; engine consumes an
  engine-owned resolver port where needed.
- `apps/api` and other composition roots wire concrete adapters and pass them to
  engine-owned ports.

## Current inbound and outbound flows

Inbound flow (primary):

`caller -> api route/use case -> IWorkflowEngine.startRun/cancelRun/getRunStatus/signal`

Outbound flow (primary):

`WorkflowEngine -> StartRunAdmissionGuard/StartRunCoordinator/WorkflowEngineCoreService -> ports/adapters`

Current southbound dependencies:

- run state read/write stores
- start-run intent store
- provider adapter map
- run execution context resolver seam
- observability facade

```mermaid
flowchart LR
  Caller["apps/api or other caller"] --> UseCase["API use case layer"]
  UseCase --> Engine["WorkflowEngine facade"]
  Engine --> StartRun["StartRunCoordinator path"]
  Engine --> Core["WorkflowEngineCoreService path"]
  StartRun --> Ports["Engine ports"]
  Core --> Ports
  Ports --> State["Run state store adapter"]
  Ports --> Intent["StartRun intent store adapter"]
  Ports --> Provider["Provider adapter (Temporal/Conductor/Mock)"]
  Ports --> RunCtx["RunExecutionContext resolver seam"]
  StartRun --> Obs["Observability facade"]
  Core --> Obs
```

## Current ports and adapters inventory

Engine-owned ports (`packages/@dvt/engine/src/ports`):

- `IRunStateStore` read/write roles
- `IStartRunIntentStore`
- `IRunSnapshotStalenessQuery`
- `IRunMaintenanceService`
- `IPlanResolver`
- `IRunExecutionContextResolver`

Engine provider adapter contract:

- `IProviderAdapter` (`startRun`, `cancelRun`, `getRunStatus`, `signal`,
  optional capabilities and lookup helpers)

Known concrete adapter families:

- `@dvt/adapter-temporal`
- conductor stub path
- mock adapter for tests
- postgres adapters for persistence/intents

## Current component map

Main components in the subsystem:

- `WorkflowEngine` (public compatibility facade + dependency assembly)
- `StartRunAdmissionGuard` (admission/capability/adapter gate)
- `StartRunCoordinator` (start-run application orchestration)
- `StartRunExecutionService` and `StartRunFailurePolicy`
- `WorkflowEngineCoreService` (cancel/status/enrich/signal runtime path)
- `SnapshotProjector` (event-to-status read model projection)

```mermaid
flowchart TB
  WF["WorkflowEngine"] --> Guard["StartRunAdmissionGuard"]
  WF --> Coord["StartRunCoordinator"]
  WF --> Core["WorkflowEngineCoreService"]
  Coord --> Exec["StartRunExecutionService"]
  Coord --> Fail["StartRunFailurePolicy"]
  Core --> Projector["SnapshotProjector"]
  Guard --> Validation["StartRunValidationPolicy"]
  Guard --> RunCtxPolicy["RunExecutionContextAdmissionPolicy"]
```

## Current startRun sequence (as-is)

```mermaid
sequenceDiagram
  participant Client as API Use Case
  participant Engine as WorkflowEngine
  participant Guard as StartRunAdmissionGuard
  participant Coord as StartRunCoordinator
  participant Intent as IStartRunIntentStore
  participant Adapter as IProviderAdapter
  participant State as IRunStateStoreWrite

  Client->>Engine: startRun(planRef, runContext)
  Engine->>Guard: assertStartRunAllowed(planRef, resolvedContext)
  Guard->>Guard: validate preconditions + capabilities + rate limit
  Guard->>Coord: admission passed
  Coord->>Intent: createIntent(...)
  Coord->>Adapter: startRun(planRef, resolvedContext)
  Coord->>State: persist run bootstrap/events
  Coord->>Intent: markDispatched/markResolved
  Coord-->>Engine: EngineRunRef
  Engine-->>Client: EngineRunRef
```

## Current read/status sequence (as-is)

```mermaid
sequenceDiagram
  participant Client as API Use Case
  participant Engine as WorkflowEngine
  participant Core as WorkflowEngineCoreService
  participant State as IRunStateStoreRead
  participant Adapter as IProviderAdapter
  participant Projector as SnapshotProjector

  Client->>Engine: getRunStatus(runRef)
  Engine->>Core: getStatus(runRef)
  Core->>State: getSnapshot/listEvents
  alt snapshot exists
    Core->>Core: snapshotToStatus
  else no snapshot
    Core->>Projector: rebuild(runId, events)
  end
  Core-->>Engine: RunStatusSnapshot
  Engine-->>Client: RunStatusSnapshot

  Client->>Engine: enrichRunStatus(runRef)
  Engine->>Core: enrichStatus(runRef)
  Core->>State: base snapshot/events
  Core->>Adapter: getRunStatus(runRef)
  Core-->>Engine: base + provider enrichment
```

## What the subsystem already gets right

- event-sourced execution authority and replayable status model
- explicit CQRS split (`getRunStatus` vs `enrichRunStatus`)
- crash-consistency intent-log model around `startRun`
- provider runtimes remain behind adapter contract
- policy-object direction already exists on start-run path
- `runExecutionContextRef` admission hardening is now explicit

## Active drifts and architecture debt

- facade width still too broad in `WorkflowEngine`
- coordinator/guard still construct and mix collaborator concerns
- query/runtime behavior still concentrated in one core service
- provider-resolution and telemetry policy logic remains repeated
- ownership seams between engine resolver and artifacts reader need one explicit
  canonical mapping in docs/planning

```mermaid
flowchart LR
  WF["WorkflowEngine"] -->|width| W1["Facade includes normalization + wiring + health checks"]
  Guard["StartRunAdmissionGuard"] -->|mixed concerns| W2["Admission + capability + adapter + rate-limit"]
  Core["WorkflowEngineCoreService"] -->|mixed concerns| W3["Query + enrichment + command + telemetry"]
  Coord["StartRunCoordinator"] -->|internal construction| W4["Builds failure/exec collaborators directly"]
```

## Fowler/SOLID/hexagonal assessment (as-is)

- Fowler-style use-case decomposition is present but incomplete.
- SOLID posture is partially aligned:
  - SRP improved vs earlier monolith, but key classes remain wide.
  - DIP is mostly aligned through ports, but composition boundaries are not yet
    consistently narrow.
- Hexagonal shape exists, but application-policy and infrastructure-selection
  concerns still overlap in some orchestration classes.

## Canonical references

- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts`
- `packages/@dvt/engine/src/application/StartRunCoordinator.ts`
- `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`
- `packages/@dvt/engine/src/core/SnapshotProjector.ts`
- `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`
- `packages/@dvt/engine/src/ports/IRunExecutionContextResolver.ts`
- `packages/@dvt/artifacts/src/ports/IRunExecutionContextReader.ts`
