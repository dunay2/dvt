---
title: Web App Sequence
status: Draft
owner: UI / Visualization Domain
last_reviewed: 2026-03-28
---

# Web App Sequence

## Main Flow: Display Run Status

```mermaid
sequenceDiagram
  participant User
  participant WebAggregate as apps/web WebAggregate
  participant UIComponentAggregate
  participant APIGateway
  participant API as apps/api
  participant Engine as @dvt/engine

  User->>WebAggregate: navigates to run status page
  WebAggregate->>APIGateway: receiveStatusQuery(runId)
  APIGateway->>API: GET /runs/:runId/status
  API->>Engine: getWorkflowStatus(runId)
  Engine-->>API: WorkflowStatus
  API-->>APIGateway: RunStatus (JSON)
  APIGateway-->>WebAggregate: RunStatus
  WebAggregate->>UIComponentAggregate: storeUIComponent(statusView)
  WebAggregate->>WebAggregate: manageVisualizationLogic()
  WebAggregate-->>User: rendered run status view
```

## Global Flow Position

`apps/web` is the end-user-facing application in the DVT system. It sits at the top of the call chain for all user-initiated interactions. It depends on `apps/api` for all data and on `@dvt/engine` (via the EngineStatusFeed) for live workflow state. It is called by nothing else in the system — it is the entry point for human operators and monitoring consumers. The `@dvt/web` package provides the shared component library that `apps/web` consumes. No Planning, Execution, Infra, or Shared Boundary domain component calls `apps/web`.

## Key Files

- `apps/web/src/domain/WebAggregate.ts`
- `apps/web/src/domain/UIComponentAggregate.ts`
- `apps/web/src/gateways/APIGateway.ts`
- `apps/web/src/gateways/EngineStatusFeed.ts`
- `apps/web/src/index.ts`
