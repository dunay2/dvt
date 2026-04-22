---
title: Start-run execution capacity admission component
status: Active
owner: apps/api
last_reviewed: 2026-04-22
---

# Start-run execution capacity admission component

This local guide documents the `apps/api` component that adds an
execution-capacity admission seam to the start-run command path without
coupling the API layer to Temporal or any other concrete adapter.

This is a **local component guide**, not a second shared contract. The caller-
visible start-run result surface remains the canonical shared contract:
`docs/architecture/components/engine/contracts/engine/StartRunBoundary.v1.md`.

Read this together with:

- `apps/api/docs/start-run-application-component.md`
- `docs/architecture/components/engine/contracts/engine/start-run-boundary-component.md`

## Owned concern

The component owns exactly one concern:

- evaluate whether the selected `targetAdapter` can admit a new start-run
  request and translate that decision into canonical start-run admission
  results

It does **not** own:

- duplicate-run detection
- tenant backpressure policy
- HTTP response mapping
- adapter-native queue metrics
- concrete adapter capacity bindings beyond the fail-closed default

## Public API

- `IStartRunExecutionCapacityPort.ts`
  Abstract application seam:
  `IStartRunExecutionCapacityPort`,
  `StartRunExecutionCapacityRequest`,
  `StartRunExecutionCapacityResult`,
  `START_RUN_EXECUTION_CAPACITY_RESULT_KIND`,
  `START_RUN_EXECUTION_CAPACITY_REASON`
- `defaultStartRunExecutionCapacityPort.ts`
  Composition-time default binding:
  `DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT`
- `BackpressureAwareStartRunUseCase.ts`
  Orchestrator that consumes the seam as part of start-run admission ordering

## Invariants

- the API application layer remains adapter-agnostic
- the seam accepts only `targetAdapter` in the first slice
- the seam returns admission semantics, not raw queue depth or worker metrics
- inability to obtain a concrete capacity signal fails closed through the
  default binding
- the caller-visible start-run result kind remains `system_backpressure`
- more specific execution-capacity denials are expressed through canonical
  `code` values, not a second top-level result kind
- only composition binds the default implementation

## Transitions

```mermaid
stateDiagram-v2
  [*] --> DuplicateProbe
  DuplicateProbe --> Duplicate: existing run or intent found
  DuplicateProbe --> DeliveryAdmission: no duplicate found
  DeliveryAdmission --> DeliveryRejected: tenant/system backpressure
  DeliveryAdmission --> CapacityAdmission: delivery admission ok
  CapacityAdmission --> CapacityRejected: saturated or signal unavailable
  CapacityAdmission --> DelegateExecution: admissible
  Duplicate --> [*]
  DeliveryRejected --> [*]
  CapacityRejected --> [*]
  DelegateExecution --> [*]
```

## Component map

```mermaid
flowchart LR
  Facade["StartRunAuthorizedFacade"] --> UseCase["BackpressureAwareStartRunUseCase"]
  UseCase --> Guard["IAdmissionGuard"]
  UseCase --> Capacity["IStartRunExecutionCapacityPort"]
  UseCase --> Decisions["startRunAdmissionDecisions.ts"]
  UseCase --> Delegate["PlannerBackedStartRunUseCase / delegate"]
  Runtime["buildProtectedStartRunRuntime.ts"] --> Default["DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT"]
  Default --> Capacity
```

## Sequence

```mermaid
sequenceDiagram
  participant Facade as StartRunAuthorizedFacade
  participant UseCase as BackpressureAwareStartRunUseCase
  participant Duplicate as DuplicateRunProbe
  participant Guard as IAdmissionGuard
  participant Capacity as IStartRunExecutionCapacityPort
  participant Delegate as IStartRunUseCase delegate

  Facade->>UseCase: execute(command, context)
  UseCase->>Duplicate: findExisting(tenantId, runId)
  alt duplicate found
    Duplicate-->>UseCase: found run or intent
    UseCase-->>Facade: duplicate
  else not found
    Duplicate-->>UseCase: not_found
    UseCase->>Guard: assertAdmissible(tenantId)
    Guard-->>UseCase: ok or typed backpressure error
    UseCase->>Capacity: evaluate({ targetAdapter })
    Capacity-->>UseCase: admissible or saturated
    alt admissible
      UseCase->>Delegate: execute(command, context)
      Delegate-->>UseCase: accepted or duplicate
    else saturated
      UseCase-->>Facade: system_backpressure
    end
  end
```

## Consumers

- `BackpressureAwareStartRunUseCase.ts`
- `buildProtectedStartRunRuntime.ts`
- `startRunExecutionCapacityAdmission.architecture.test.ts`
- `defaultStartRunExecutionCapacityPort.test.ts`

## Focused file map

- `apps/api/src/application/ports/IStartRunExecutionCapacityPort.ts`
- `apps/api/src/application/services/defaultStartRunExecutionCapacityPort.ts`
- `apps/api/src/application/services/startRunAdmissionDecisions.ts`
- `apps/api/src/application/services/BackpressureAwareStartRunUseCase.ts`
- `apps/api/src/modules/startRun/buildProtectedStartRunRuntime.ts`
- `apps/api/test/application/services/BackpressureAwareStartRunUseCase.executionCapacity.test.ts`
- `apps/api/test/application/services/defaultStartRunExecutionCapacityPort.test.ts`
- `apps/api/test/application/services/startRunExecutionCapacityAdmission.architecture.test.ts`

## Extension rules

- bind concrete adapter signals only in composition
- keep provider-native metrics and queue semantics behind the port
- add new denial reasons only if they are canonical across adapters
- extend the shared `StartRunBoundary` contract before exposing new caller-
  visible denial codes
- preserve the ordering:
  duplicate probe -> delivery admission -> execution capacity -> delegate
