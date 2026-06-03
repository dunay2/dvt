---
title: WorkflowEngine runtime path decomposition component
status: Active
owner: Architecture / Engine
last_reviewed: 2026-05-12
---

# WorkflowEngine Runtime Path Decomposition Component

## Purpose

This component owns the internal runtime-control split for the engine facade.
It treats the public `IWorkflowEngine` surface as the current command/query
boundary while separating cancel commands, runtime signals, canonical status
queries, and provider-backed enrichment into dedicated paths.

## Public API

| Surface                     | Owner         | Role                                                             |
| --------------------------- | ------------- | ---------------------------------------------------------------- |
| `IRunCommandService`        | `@dvt/engine` | Cancel-command role port.                                        |
| `IRunSignalService`         | `@dvt/engine` | Runtime-signal role port.                                        |
| `RunCommandService`         | `@dvt/engine` | Authorizes, resolves metadata, dispatches cancel, records spans. |
| `RunSignalService`          | `@dvt/engine` | Validates transition, dispatches signal, emits events.           |
| `WorkflowEngineCoreService` | `@dvt/engine` | Pure combined run-control delegator.                             |
| `WorkflowEngineCoreDeps`    | `@dvt/engine` | Command and signal role-service constructor contract.            |
| `buildRunControlService`    | `@dvt/engine` | Compatibility helper for an already-composed delegator.          |
| `buildRunCommandService`    | `@dvt/engine` | Composition helper for cancel-command wiring.                    |
| `buildRunSignalService`     | `@dvt/engine` | Composition helper for runtime-signal wiring.                    |
| `RunStatusQueryService`     | `@dvt/engine` | Canonical run-status query path.                                 |
| `IRunEnrichmentService`     | `@dvt/engine` | Provider-backed enrichment outside `IWorkflowEngine`.            |

## Invariants

- `RunCommandService` must not own signal transition rules or emit
  signal-derived lifecycle events.
- `RunSignalService` must not own cancel-command dispatch.
- `WorkflowEngineCoreService` is a combined run-control delegator only; it
  delegates to command and signal services and does not own adapter dispatch,
  transition mapping, dependency-bag translation, or concrete service
  construction.
- `WorkflowEngineCoreService` constructor inputs must stay semantic: only
  `IRunCommandService` and `IRunSignalService` cross the wrapper boundary.
- Facade-facing cancel and signal use cases depend on separate command and
  signal ports.
- Query and enrichment paths remain outside the combined runtime-control
  delegator.

## Transitions

<!-- markdownlint-disable MD060 -->

| Transition     | From                           | To                       | Rule                                              |
| -------------- | ------------------------------ | ------------------------ | ------------------------------------------------- |
| cancel command | `IWorkflowCancelRunUseCase`    | `IRunCommandService`     | Parse at facade, execute through command service. |
| signal command | `IWorkflowSignalRunUseCase`    | `IRunSignalService`      | Parse at facade, execute through signal service.  |
| status query   | `IWorkflowRunStatusUseCase`    | `IRunStatusQueryService` | Query path remains status-read only.              |
| enrichment     | API or caller-specific surface | `IRunEnrichmentService`  | Provider enrichment remains outside facade.       |

<!-- markdownlint-enable MD060 -->

## Consumers

- `apps/api/src/application/services/WorkflowEngineFactory.ts`
- `apps/api/test/integration/plannerEngineContract.test.ts`
- `packages/@dvt/engine/src/application/workflow-engine-use-cases/*`
- `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`
- `packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts`

## Diagrams

```mermaid
flowchart LR
  Facade["WorkflowEngine facade"] --> CancelUseCase["IWorkflowCancelRunUseCase"]
  Facade --> SignalUseCase["IWorkflowSignalRunUseCase"]
  Facade --> StatusUseCase["IWorkflowRunStatusUseCase"]
  Caller["Enrichment caller"] --> Enrichment["IRunEnrichmentService"]

  CancelUseCase --> Command["IRunCommandService<br/>RunCommandService"]
  SignalUseCase --> Signal["IRunSignalService<br/>RunSignalService"]
  StatusUseCase --> Status["IRunStatusQueryService<br/>RunStatusQueryService"]

  Control["WorkflowEngineCoreService<br/>combined delegator"] --> Command
  Control --> Signal

  Command --> AdapterCancel["IProviderAdapter.cancelRun"]
  Signal --> AdapterSignal["IProviderAdapter.signal"]
  Signal --> Events["IRunStateStoreWrite"]
```

```mermaid
sequenceDiagram
  participant Facade as WorkflowEngine
  participant UseCase as WorkflowSignalRunUseCase
  participant Signal as RunSignalService
  participant Guard as SignalTransitionGuard
  participant Adapter as IProviderAdapter
  participant Store as IRunStateStoreWrite

  Facade->>UseCase: signal(runRef, request)
  UseCase->>Signal: signal(runRef, request)
  Signal->>Guard: assertAllowed(metadata, request)
  Signal->>Adapter: signal(runRef, request)
  Signal->>Store: append signal-derived event when runtime semantics require it
```

## Drift Guards

- `workflowEngineRuntimePathDecomposition.architecture.test.ts` fails if
  `WorkflowEngineCoreService` regrows adapter dispatch, signal transition
  mapping, signal-derived event emission, concrete runtime-service imports, or
  concrete runtime-service construction.
- `WorkflowEngineCoreService.test.ts` keeps cancel and signal runtime behavior
  green while the implementation moves behind dedicated services.
