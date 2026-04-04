---
title: Data Source Service Boundary
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-03
---

# Data Source Service Boundary

## Purpose

This document defines the current `F-04` frontend boundary for
`VITE_DATA_SOURCE` in `apps/web`.

It is the technical source of truth for:

- where mode selection happens;
- how views consume services;
- which dependencies are allowed;
- how tests inject seams without global module mutation.

## Operational Contract

`VITE_DATA_SOURCE` remains a shell-level switch with two valid values:

- `mock`
- `api`

Mode resolution for service consumption happens once inside shell composition
through `AppServicesProvider`. Views and plugins do not resolve mode directly.

## Composition Rule

`Root` mounts one provider that composes:

- `dataSourceMode`
- `apiClient`
- `workspaceService`
- `runsService`
- `plansService`

Consumers use only typed hooks:

- `useAppDataSourceMode()`
- `useWorkspaceService()`
- `useRunsService()`
- `usePlansService()`

This rule applies to view-facing service composition. It does not claim that
every configuration or capability helper in the entire frontend now reads the
mode only through the provider.

```mermaid
flowchart LR
  Root["Root shell"] --> Provider["AppServicesProvider"]
  Provider --> Mode["resolveDataSource() once"]
  Provider --> ApiClient["createApiClient() once"]

  Provider --> WS["workspaceService composer"]
  Provider --> RS["runsService composer"]
  Provider --> PS["plansService composer"]

  WS --> WSM["workspace.mock adapter"]
  WS --> WSA["workspace.api adapter"]
  RS --> RSM["runs.mock adapter"]
  RS --> RSA["runs.api adapter"]
  PS --> PSM["plans.mock adapter"]
  PS --> PSA["plans.api adapter"]

  Views["Views / Components / Plugins"] --> Hooks["use*Service hooks"]
  Hooks --> Provider
```

## Ownership Matrix

| Layer                        | Owns                                                     | Must not own                                        |
| ---------------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| Views / components / plugins | UI state, query orchestration, route behavior            | mode resolution, service construction, mock imports |
| Service hooks / provider     | mode selection, service composition, test override seams | view-local UI decisions                             |
| Service composers            | mode routing `mock` vs `api`                             | view logic, direct React state                      |
| `*.mock.*` adapters          | mock data behavior for local/demo mode                   | API transport concerns                              |
| `*.api.*` adapters           | API transport and DTO mapping                            | local mock datasets                                 |

## Dependency Rules

Allowed:

- `views -> services/AppServicesContext hooks`
- `AppServicesContext -> service composers`
- `service composers -> *.mock.* and *.api.*`
- `*.api.* -> ApiClient`
- `*.mock.* -> app/data/mock*`

Forbidden:

- `views/components/plugins -> resolveDataSource()`
- `views/components/plugins -> createWorkspaceService/createRunsService/createPlansService`
- non-mock files importing `app/data/mock*`

## Runtime Behavior

Both modes remain runnable without code changes:

- `mock`: services return local mock-backed behavior.
- `api`: services call backend endpoints; unsupported endpoints fail explicitly
  from service layer with clear error messages.

```mermaid
sequenceDiagram
  participant User
  participant View
  participant Hook as useWorkspaceService()
  participant Provider as AppServicesProvider
  participant Service as WorkspaceService
  participant Adapter as mock/api adapter

  User->>View: Open route action
  View->>Hook: Request service instance
  Hook->>Provider: Read composed service
  Provider-->>Hook: WorkspaceService
  Hook-->>View: WorkspaceService
  View->>Service: Call operation
  Service->>Adapter: Route by selected mode
  Adapter-->>Service: Data or explicit error
  Service-->>View: Typed result
```

## Test Seam And Injection Strategy

Tests use provider overrides, not global `resolveDataSource` monkey patching.

`AppServicesProvider` accepts:

- explicit `mode` override;
- optional `apiClient` override;
- optional per-service overrides for focused tests.

This allows:

- route or component tests to inject deterministic service fakes;
- service tests to validate composer routing by mode;
- no module-level implicit coupling in consumer tests.

## Affected Frontend Surfaces

This boundary now governs consumers that previously created mode-aware services
locally, including:

- canvas controller;
- runs and operational views;
- source import and console surfaces;
- plugin history panels that query run data.

## Explicit Non-Goals

This slice does not:

- standardize query-key ownership or invalidation rules;
- decompose `appStore`;
- align runtime route drift such as `/runs` versus `/runs/start`;
- remove legacy `GraphCanvas`;
- deliver real live logs in the bottom console.

## Current Residual Gaps

After `F-04`, the boundary is cleaner, but some work remains intentionally
outside this slice:

- `GraphCanvas` still imports legacy mock data directly and remains governed by
  `F-12`.
- `sessionStore`, `workspaceConfig`, and platform-health metadata still read
  data-source configuration outside the shell provider because they are config
  or capability surfaces rather than route consumers.
- API-mode console output is now explicitly non-live instead of pretending mock
  logs are real; true run-event and log convergence remains future work.
