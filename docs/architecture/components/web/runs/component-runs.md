---
title: Runs Component - Local Guide
status: Active
owner: Web / Architecture
last_reviewed: 2026-05-08
---

# Runs Component - Local Guide

This page is the local component guide for the Runs domain in `apps/web`. It
describes the public `IRunsPort` API, invariants, state transitions, consumers,
and adapter boundaries.

Use this guide with:

- [Runs Frontend Architecture](./dvt-runs-frontend-architecture.md)
- [Frontend Runtime Contract Technical Manual](./frontend-runtime-contract-technical-manual.md)
- [Web DDD Structure](../web-ddd.md)
- [Web Functionalities](../web-functional.md)
- [Command Query Rail Governance](../../../command-query-rail-governance.md)

Canonical local paths:

## Port

- [ports/runs.ts](../../../../../apps/web/src/app/ports/runs.ts)

## Services

- [runsService.ts](../../../../../apps/web/src/app/services/runs/runsService.ts)
- [runsService.api.ts](../../../../../apps/web/src/app/services/runs/runsService.api.ts)
- [runsService.mock.ts](../../../../../apps/web/src/app/services/runs/runsService.mock.ts)
- [runsApiPayloads.ts](../../../../../apps/web/src/app/services/runs/runsApiPayloads.ts)
- [runsApiDecoders.ts](../../../../../apps/web/src/app/services/runs/runsApiDecoders.ts)
- [runsApiSnapshotMapper.ts](../../../../../apps/web/src/app/services/runs/runsApiSnapshotMapper.ts)
- [runWorkspaceFacade.ts](../../../../../apps/web/src/app/services/runs/runWorkspaceFacade.ts)
- [runEventPresentationModel.ts](../../../../../apps/web/src/app/services/runs/runEventPresentationModel.ts)
- [runEventPresentationCopy.ts](../../../../../apps/web/src/app/services/runs/runEventPresentationCopy.ts)
- [runEventTimelineModel.ts](../../../../../apps/web/src/app/services/runs/runEventTimelineModel.ts)

## Shared Utilities

- [classifyHttpError.ts](../../../../../apps/web/src/app/services/api/classifyHttpError.ts)

## Views

- [runWorkbenchStateModel.ts](../../../../../apps/web/src/app/views/runs/runWorkbenchStateModel.ts)
- [runStatesModel.ts](../../../../../apps/web/src/app/views/runs/runStatesModel.ts)
- [runStatesCopy.ts](../../../../../apps/web/src/app/views/runs/runStatesCopy.ts)
- [runsRouteBootstrap.ts](../../../../../apps/web/src/app/views/runs/runsRouteBootstrap.ts)
- [useRunWorkspace.ts](../../../../../apps/web/src/app/views/runs/useRunWorkspace.ts)
- [CanvasRunsTabView.tsx](../../../../../apps/web/src/app/views/runs/CanvasRunsTabView.tsx)
- [RunListStateView.tsx](../../../../../apps/web/src/app/views/runs/RunListStateView.tsx)
- [RunDetailStateViews.tsx](../../../../../apps/web/src/app/views/runs/RunDetailStateViews.tsx)
- [RunStates.tsx](../../../../../apps/web/src/app/views/runs/RunStates.tsx)
- [RunWorkspaceStateView.tsx](../../../../../apps/web/src/app/views/runs/RunWorkspaceStateView.tsx)
- [RunEventTimelineTable.tsx](../../../../../apps/web/src/app/views/runs/RunEventTimelineTable.tsx)

## Tests

- [runsService.test.ts](../../../../../apps/web/src/app/services/runs/runsService.test.ts)
- [runsDomainBoundary.architecture.test.ts](../../../../../apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts)
- [runWorkspaceFacade.test.ts](../../../../../apps/web/src/app/services/runs/runWorkspaceFacade.test.ts)
- [runEventPresentationModel.test.ts](../../../../../apps/web/src/app/services/runs/runEventPresentationModel.test.ts)
- [runEventPresentationCopy.test.ts](../../../../../apps/web/src/app/services/runs/runEventPresentationCopy.test.ts)
- [runEventTimelineModel.test.ts](../../../../../apps/web/src/app/services/runs/runEventTimelineModel.test.ts)
- [runWorkbenchStateModel.test.ts](../../../../../apps/web/src/app/views/runs/runWorkbenchStateModel.test.ts)
- [runStatesModel.test.ts](../../../../../apps/web/src/app/views/runs/runStatesModel.test.ts)
- [useRunWorkspace.test.tsx](../../../../../apps/web/src/app/views/runs/useRunWorkspace.test.tsx)
- [RunStates.test.tsx](../../../../../apps/web/src/app/views/runs/RunStates.test.tsx)
- [runsRouteBootstrap.test.ts](../../../../../apps/web/src/app/views/runs/runsRouteBootstrap.test.ts)
- [runsApiPayloads.test.ts](../../../../../apps/web/src/app/services/runs/runsApiPayloads.test.ts)
- [classifyHttpError.test.ts](../../../../../apps/web/src/app/services/api/classifyHttpError.test.ts)

## Public API

`IRunsPort` is defined in [ports/runs.ts](../../../../../apps/web/src/app/ports/runs.ts).

```typescript
export interface IRunsPort {
  listRunSummaries: () => Promise<RunSummaryItem[]>;
  getRunSnapshot: (runId: string) => Promise<RunSnapshot | null>;
  startRun: (input: StartRunInput) => Promise<RunStartReceipt>;
  listRunEvents: (runId: string, afterSeq?: number) => Promise<RunEventTimelinePage>;
}
```

### Method Semantics

| Method             | Rail type | Idempotent | Runtime surface           | Description                                                              |
| ------------------ | --------- | ---------- | ------------------------- | ------------------------------------------------------------------------ |
| `listRunSummaries` | Query     | Yes        | `GET /runs`               | Returns runs visible to the current tenant/project/environment scope.    |
| `getRunSnapshot`   | Query     | Yes        | `GET /runs/:runId`        | Returns one run snapshot by ID, or `null` when the API returns HTTP 404. |
| `startRun`         | Command   | No         | `POST /runs/start`        | Submits a run request; the API owns admission and run identity.          |
| `listRunEvents`    | Query     | Yes        | `GET /runs/:runId/events` | Returns an ordered page of run events, optionally after a sequence.      |

### DTO Vocabulary

All presentation DTOs are defined locally in
[ports/runs.ts](../../../../../apps/web/src/app/ports/runs.ts). They are not
wire contracts and are not re-exported from `@dvt/contracts`.

| DTO                    | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `StartRunInput`        | Command input: `PlanRef`, `WorkspaceScope`, selection |
| `RunStartReceipt`      | Command result: server-owned run ID and admission     |
| `UiRunStatus`          | Presentation-level run status union                   |
| `RunSummaryItem`       | List item projection with `startedAt` authority       |
| `RunSnapshot`          | Run lifecycle snapshot and optional evidence fields   |
| `RunEventTimelinePage` | Paginated event feed                                  |

## Invariants

1. `IRunsPort` has four public methods. Views, hooks, and facades consume the
   interface instead of importing adapter implementations directly.
2. `startRun` sends `planRef`, `workspaceScope`, and `selection`. The web client
   does not send a canonical `runId`; the API returns the run identity.
3. `getRunSnapshot` maps HTTP 404 to `null`. Other API failures propagate to
   the caller.
4. `listRunSummaries` includes tenant, project, and environment scope query
   parameters through the API adapter.
5. `getRunSnapshot` and `listRunEvents` include tenant scope query parameters
   through the API adapter.
6. Mock and API implementations satisfy the same `IRunsPort` interface, so route
   code does not branch on `DataSourceMode`.
7. Architecture tests in
   [`runsDomainBoundary.architecture.test.ts`](../../../../../apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts)
   validate docblock presence, port boundary isolation, CQRS rail separation,
   discriminated-union state modelling, and adapter security properties.
8. Event chronology is normalized through the local
   [Run Event Timeline Component](./run-event-timeline-component.md) before
   either the shell console or the Runs workspace renders it.

## State Transitions

The Runs domain has no durable frontend-owned run state. Route state is derived
from backend reads and service facades. The route workbench state model is
documented in [dvt-runs-frontend-architecture.md](./dvt-runs-frontend-architecture.md).

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> LoadingList : listRunSummaries()
  LoadingList --> ListReady : success
  LoadingList --> ListError : failure
  ListReady --> LoadingSnapshot : select run
  LoadingSnapshot --> SnapshotReady : getRunSnapshot success
  LoadingSnapshot --> SnapshotMissing : getRunSnapshot 404
  LoadingSnapshot --> SnapshotError : getRunSnapshot failure
  SnapshotReady --> LoadingEvents : listRunEvents()
  LoadingEvents --> TimelineReady : events returned
  LoadingEvents --> TimelineEmpty : no events
  LoadingEvents --> TimelineDegraded : event query failure
  TimelineReady --> TimelineReady : overlapping page deduped
  TimelineReady --> TimelineReady : active run polls nextAfterSeq
  SnapshotReady --> [*] : deselect or navigate away
```

## Consumers

| Consumer                             | File                                                                                                                          | How it uses the port                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `runWorkspaceFacade`                 | [runWorkspaceFacade.ts](../../../../../apps/web/src/app/services/runs/runWorkspaceFacade.ts)                                  | Composes snapshot and timeline into view model              |
| `useRunWorkspace`                    | [useRunWorkspace.ts](../../../../../apps/web/src/app/views/runs/useRunWorkspace.ts)                                           | Subscribes to scope and reloads run workspace               |
| `RunsView` (via `CanvasRunsTabView`) | [CanvasRunsTabView.tsx](../../../../../apps/web/src/app/views/runs/CanvasRunsTabView.tsx)                                     | Entry point for Canvas-scoped Runs tab                      |
| `RunWorkspaceStateView`              | [RunWorkspaceStateView.tsx](../../../../../apps/web/src/app/views/runs/RunWorkspaceStateView.tsx)                             | Renders full workspace (detail + timeline) from view model  |
| `RunEventTimelineTable`              | [RunEventTimelineTable.tsx](../../../../../apps/web/src/app/views/runs/RunEventTimelineTable.tsx)                             | Renders dense timeline rows from shared event semantics     |
| `RunListStateView`                   | [RunListStateView.tsx](../../../../../apps/web/src/app/views/runs/RunListStateView.tsx)                                       | Renders runs summary list with status badges and navigation |
| `RunDetailStateViews`                | [RunDetailStateViews.tsx](../../../../../apps/web/src/app/views/runs/RunDetailStateViews.tsx)                                 | Owns empty, error, degraded, loading, missing state views   |
| `RunStates`                          | [RunStates.tsx](../../../../../apps/web/src/app/views/runs/RunStates.tsx)                                                     | Barrel re-export of named state views for route renderer    |
| `runsRouteBootstrap`                 | [runsRouteBootstrap.ts](../../../../../apps/web/src/app/views/runs/runsRouteBootstrap.ts)                                     | Derives bootstrap presentation from workbench state         |
| service tests                        | [runsService.test.ts](../../../../../apps/web/src/app/services/runs/runsService.test.ts)                                      | Verifies route calls, parsing, and rejections               |
| architecture tests                   | [runsDomainBoundary.architecture.test.ts](../../../../../apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts) | Validates docblocks, boundary isolation, CQRS rails         |

## Architecture Diagram

```mermaid
flowchart TB
  subgraph Views["Views (runs/)"]
    CanvasTab["CanvasRunsTabView.tsx"]
    ListView["RunListStateView.tsx"]
    DetailViews["RunDetailStateViews.tsx"]
    WorkspaceView["RunWorkspaceStateView.tsx"]
    RunStates["RunStates.tsx"]
    RouteBootstrap["runsRouteBootstrap.ts"]
  end

  subgraph Models["View Models (runs/)"]
    WorkbenchState["runWorkbenchStateModel.ts"]
    StatesModel["runStatesModel.ts"]
    StatesCopy["runStatesCopy.ts"]
  end

  subgraph Hooks["Hooks (runs/)"]
    Hook["useRunWorkspace.ts"]
  end

  subgraph Facades["Facades (services/runs/)"]
    Facade["runWorkspaceFacade.ts"]
    TimelineModel["runEventTimelineModel.ts"]
    EventsModel["runEventPresentationModel.ts"]
    EventsCopy["runEventPresentationCopy.ts"]
  end

  subgraph Shared["Shared Utilities"]
    ClassifyHttp["classifyHttpError.ts"]
  end

  subgraph Port["Port Layer"]
    IRunsPort["IRunsPort (ports/runs.ts)"]
  end

  subgraph Adapters["Adapter Layer (services/runs/)"]
    Factory["runsService.ts"]
    API["runsService.api.ts"]
    Mock["runsService.mock.ts"]
  end

  subgraph Support["Support Modules (services/runs/)"]
    Payloads["runsApiPayloads.ts"]
    Decoders["runsApiDecoders.ts"]
    Mapper["runsApiSnapshotMapper.ts"]
  end

  CanvasTab --> Hook
  Hook --> Facade
  Hook --> TimelineModel
  Hook ---> ClassifyHttp
  Facade --> IRunsPort
  Facade --> TimelineModel
  Facade --> EventsModel
  Facade --> EventsCopy
  Facade ---> ClassifyHttp
  WorkspaceView --> EventsModel
  WorkspaceView --> EventsCopy
  WorkspaceView --> StatesModel
  WorkspaceView --> StatesCopy
  ListView --> StatesModel
  ListView --> StatesCopy
  DetailViews --> StatesCopy
  RunStates --> WorkbenchState
  RouteBootstrap --> WorkbenchState
  WorkbenchState --> IRunsPort
  Factory --> API
  Factory --> Mock
  API --> Payloads
  API --> Decoders
  API --> Mapper

  style Port fill:#1a1a2e,stroke:#e94560,stroke-width:2px
  style Adapters fill:#16213e,stroke:#0f3460,stroke-width:1px
```

Dependency direction:

```text
views -> view models -> hooks/facades -> ports <- adapters <- support modules
```

Ports never import adapters. Adapters implement ports. Views do not import
`createApiClient` or `runsService.api.ts` directly.

`classifyHttpError.ts` lives in `services/api/` because it wraps `ApiError` from
`createApiClient.ts` and is shared by the run workspace facade and hook. Run
status presentation helpers remain in `runStatesModel.ts`, which keeps their
owner in the runs view-model layer instead of creating a generic app-root
module.

## Related Pages

- [Runs Frontend Architecture](./dvt-runs-frontend-architecture.md)
- [Frontend Runtime Contract Technical Manual](./frontend-runtime-contract-technical-manual.md)
- [Frontend Runtime Contract User Manual](./frontend-runtime-contract-user-manual.md)
- [Start Run Client Identity Boundary](./start-run-client-identity-boundary.md)
- [Runs User Stories](./user-stories-runs.md)
- [Run Event Timeline Component](./run-event-timeline-component.md)
- [Run Event Timeline User Stories](./run-event-timeline-user-stories.md)
- [Runs Domain Architecture Test](../../../../../apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts)
- [Web DDD Structure](../web-ddd.md)
- [Web Functionalities](../web-functional.md)
- [Web Store Domain Ownership Component](../web-store-domain-ownership-component.md)
