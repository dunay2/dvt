---
title: Start-run application decomposition diagrams
status: Active
owner: Architecture / Engine
last_reviewed: 2026-05-15
---

# Start-Run Application Decomposition Diagrams

## Purpose

This document is the local diagram pack for the WE-HX-3 start-run application
component. It shows the current component boundary, command sequence,
failure/compensation path, and state transitions for the existing
`IWorkflowEngine.startRun` command rail.

## Component Boundary

```mermaid
flowchart LR
  Caller["IWorkflowEngine.startRun caller"]
  UseCase["WorkflowStartRunUseCase"]
  App["StartRunApplicationService"]
  Admission["StartRunAdmissionService"]
  Intent["StartRunIntentService"]
  Execution["StartRunExecutionService"]
  Failure["StartRunFailurePolicy"]
  EventFactory["StartRunEventFactory"]
  PlanIntegrity["IPlanIntegrityValidator"]
  Provider["IProviderAdapter"]
  IntentStore["IStartRunIntentStore"]
  StateStore["IRunStateStore"]

  Caller --> UseCase
  UseCase --> App
  App --> Admission
  App --> Intent
  App --> Execution
  App --> Failure
  Admission --> PlanIntegrity
  Admission --> Provider
  Intent --> IntentStore
  Execution --> Provider
  Execution --> StateStore
  Execution --> EventFactory
  Failure --> IntentStore
  Failure --> StateStore
  Failure --> EventFactory
```

## Command Sequence

```mermaid
sequenceDiagram
  participant Caller
  participant UseCase as WorkflowStartRunUseCase
  participant App as StartRunApplicationService
  participant Admission as StartRunAdmissionService
  participant Intent as StartRunIntentService
  participant Execution as StartRunExecutionService
  participant Provider as IProviderAdapter
  participant Store as IRunStateStore

  Caller->>UseCase: startRun(planRef, context)
  UseCase->>App: startRun(planRef, resolvedContext, traceContext)
  App->>Admission: admit(planRef, resolvedContext)
  Admission-->>App: adapter + verified artifact
  App->>Intent: createIntent(resolvedContext, adapter.provider)
  Intent-->>App: intentId
  App->>Execution: executeStartRun(adapter, planRef, context, trace, intentId)
  Execution->>Provider: startRun(planRef, context)
  Provider-->>Execution: EngineRunRef
  Execution->>Store: bootstrapRunTx(metadata, RunQueued)
  Execution-->>App: EngineRunRef
  App-->>UseCase: EngineRunRef
  UseCase-->>Caller: EngineRunRef
```

## Failure And Compensation

```mermaid
sequenceDiagram
  participant App as StartRunApplicationService
  participant Execution as StartRunExecutionService
  participant Provider as IProviderAdapter
  participant Store as IRunStateStore
  participant Failure as StartRunFailurePolicy
  participant Intent as IStartRunIntentStore

  App->>Execution: executeStartRun(...)
  Execution->>Provider: startRun(...)
  Provider-->>Execution: EngineRunRef
  Execution->>Store: bootstrapRunTx(...)
  Store--xExecution: bootstrap failure
  Execution->>Provider: cancelRun(EngineRunRef)
  Execution->>Failure: markIntentResolvedBestEffort(...)
  Failure->>Intent: markResolved(...)
  Execution--xApp: rethrow bootstrap failure
  App->>Failure: handleStartRunError(...)
  Failure--xApp: rethrow original failure
```

## State Transitions

```mermaid
stateDiagram-v2
  [*] --> AdmissionRequested
  AdmissionRequested --> Admitted: access, provider, plan, capability valid
  AdmissionRequested --> Rejected: fail closed before intent
  Admitted --> IntentPending: deterministic intent persisted
  IntentPending --> ProviderDispatched: provider start accepted
  ProviderDispatched --> Bootstrapped: metadata and RunQueued persisted
  Bootstrapped --> IntentResolved: best-effort cleanup
  IntentPending --> FailedBeforeDispatch: provider not called
  ProviderDispatched --> Compensating: bootstrap or provider-ref persistence fails
  Compensating --> FailedAfterDispatch: cancel best-effort and rethrow
```

## Ownership Summary

| Component                    | Owned concern                                                 |
| ---------------------------- | ------------------------------------------------------------- |
| `WorkflowStartRunUseCase`    | Facade-facing adaptation and trace context handoff            |
| `StartRunApplicationService` | Phase orchestration                                           |
| `StartRunAdmissionService`   | Pre-dispatch admission and capability checks                  |
| `StartRunIntentService`      | Deterministic pre-dispatch intent creation                    |
| `StartRunExecutionService`   | Provider dispatch, bootstrap, and compensation                |
| `StartRunFailurePolicy`      | Failure reporting, guarded event emission, and intent cleanup |
