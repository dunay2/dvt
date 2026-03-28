---
title: Web Sequence
status: Draft
owner: UI / Visualization Domain
last_reviewed: 2026-03-28
---

# Web Sequence

## Main Flow: fetchStatus and Render

```mermaid
sequenceDiagram
  participant User
  participant WebComponent as @dvt/web WebComponent
  participant APIClient
  participant API as apps/api
  participant Engine as @dvt/engine

  User->>WebComponent: opens run status view
  WebComponent->>APIClient: fetchStatus(runId)
  APIClient->>API: GET /runs/:runId/status
  API->>Engine: getWorkflowStatus(runId)
  Engine-->>API: WorkflowStatus
  API-->>APIClient: RunStatus (JSON)
  APIClient-->>WebComponent: RunStatus
  WebComponent->>WebComponent: renderView(state)
  WebComponent-->>User: rendered status view
```

## Global Flow Position

`@dvt/web` sits at the outermost layer of the DVT system, serving as the shared UI component library for `apps/web`. It is consumed by the web application to render run status, workflow progress, and user interaction surfaces. It calls `apps/api` for data and may surface engine workflow status via the EngineStatusAdapter. It has no knowledge of the Planning, Execution, or Infra domains — all business logic and data access is delegated downstream through the API layer. The web layer is entirely read-driven with user interactions dispatched as API requests.

## Key Files

- `packages/@dvt/web/src/components/`
- `packages/@dvt/web/src/adapters/APIClient.ts`
- `packages/@dvt/web/src/adapters/EngineStatusAdapter.ts`
- `packages/@dvt/web/src/index.ts`
