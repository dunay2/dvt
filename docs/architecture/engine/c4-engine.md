# Engine C4 Architecture

**Date**: 2026-03-06  
**Scope**: Logical architecture of `@dvt/engine` and direct collaborators.  
**Note**: C4 containers are logical/runtime boundaries. `@dvt/engine` is a TypeScript library embedded by processes such as `apps/api`, reconciler workers, and outbox workers.

**Primary sources**:

- [WorkflowEngine.ts](../../../packages/@dvt/engine/src/core/WorkflowEngine.ts)
- [SnapshotProjector.ts](../../../packages/@dvt/engine/src/core/SnapshotProjector.ts)
- [RunMaintenanceService.ts](../../../packages/@dvt/engine/src/services/RunMaintenanceService.ts)
- [IntentReconcilerWorker.ts](../../../packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts)
- [IRunStateStore.ts](../../../packages/@dvt/engine/src/ports/IRunStateStore.ts)
- [IProviderAdapter.ts](../../../packages/@dvt/engine/src/adapters/IProviderAdapter.ts)
- [ADR-0029](../../adr/ADR-0029-run-maintenance-service.md)
- [ADR-0030](../../adr/ADR-0030-pre-dispatch-intent-log.md)

## 1. Context View

```mermaid
C4Context
title DVT+ Engine - System Context

Person(api, "API / CLI", "Calls startRun, getRunStatus, cancelRun, signal")
Person(ops, "Ops / Scheduler", "Runs reconciliation and maintenance operations")

System_Boundary(dvt, "DVT+ execution domain") {
    System(engine, "@dvt/engine", "Orchestrates run lifecycle with event sourcing and explicit ports")
}

System_Ext(provider_runtime, "Provider runtime", "Temporal today, Conductor later")
System_Ext(state_store, "Run state store", "Snapshots, metadata, event log, outbox")
System_Ext(intent_store, "StartRun intent store", "PENDING -> DISPATCHED -> RESOLVED/EXPIRED")
System_Ext(obs, "Observability stack", "Logs, metrics, traces")
System_Ext(event_bus, "Event bus", "Kafka or equivalent downstream publisher")

Rel(api, engine, "Uses", "IWorkflowEngine")
Rel(ops, engine, "Operates", "IRunMaintenanceService / workers")
Rel(engine, provider_runtime, "Orchestrates execution", "IProviderAdapter")
Rel(engine, state_store, "Reads/writes run state", "IRunStateStore + IOutboxStorage")
Rel(engine, intent_store, "Protects startRun against crashes", "IStartRunIntentStore")
Rel(engine, obs, "Emits", "logs / metrics / traces")
Rel(engine, event_bus, "Publishes indirectly", "OutboxWorker")

UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## 2. Container View

```mermaid
C4Container
title DVT+ Engine - Container View

Person(api_user, "API / CLI", "Lifecycle API consumer")
Person(ops_user, "Ops / Scheduler", "Operates workers and batch jobs")

System_Ext(plan_registry, "Plan registry / artifact store", "PlanRef bytes + hash verification")
System_Ext(provider_runtime, "Provider runtime", "Temporal cluster or equivalent runtime")
System_Ext(event_bus, "Event bus", "Downstream event publication")
System_Ext(obs, "Observability stack", "Logs, metrics, tracing")

System_Boundary(dvt, "DVT+ execution subsystem") {
    Container(api_app, "apps/api", "Node.js", "Exposes HTTP/API and calls engine use cases")
    Container(engine_lib, "@dvt/engine", "TypeScript", "Lifecycle orchestration, replay, maintenance, workers")
    Container(provider_adapter, "@dvt/adapter-temporal", "TypeScript", "IProviderAdapter implementation and runtime control")
    ContainerDb(pg_store, "@dvt/adapter-postgres", "PostgreSQL", "IRunStateStore + IOutboxStorage + intent persistence")
    Container(intent_store, "IStartRunIntentStore", "InMemory + Postgres", "Pre-dispatch intent log for crash consistency")
    Container(delivery_worker, "Outbox delivery process", "Node.js", "Embeds OutboxWorker to publish events")
    Container(reconcile_worker, "Intent reconciliation process", "Node.js", "Embeds IntentReconcilerWorker + RunMaintenanceService")
}

Rel(api_user, api_app, "Uses")
Rel(api_app, engine_lib, "Invokes", "IWorkflowEngine")
Rel(ops_user, reconcile_worker, "Schedules / supervises")
Rel(ops_user, delivery_worker, "Schedules / supervises")

Rel(engine_lib, provider_adapter, "Delegates execution", "IProviderAdapter")
Rel(provider_adapter, plan_registry, "Fetches and validates", "PlanRef")
Rel(provider_adapter, provider_runtime, "startRun / cancelRun / signal / status")

Rel(engine_lib, pg_store, "Persistence and query", "IRunStateStore")
Rel(engine_lib, intent_store, "create / markDispatched / markResolved", "IStartRunIntentStore")
Rel(engine_lib, obs, "Emits telemetry")

Rel(reconcile_worker, engine_lib, "Uses", "RunMaintenanceService")
Rel(reconcile_worker, intent_store, "Scans orphaned intents")
Rel(reconcile_worker, provider_adapter, "lookupRunRef / cancelRun")
Rel(reconcile_worker, obs, "Emits telemetry")

Rel(delivery_worker, pg_store, "listPending / markDelivered / markFailed", "IOutboxStorage")
Rel(delivery_worker, event_bus, "Publishes envelopes")
Rel(delivery_worker, obs, "Emits telemetry")

UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="1")
```

## 3. Component View

```mermaid
C4Component
title @dvt/engine - Component View

Container_Ext(callers, "apps/api / callers", "Node.js", "Invokes lifecycle API")
Container_Ext(state_store, "@dvt/adapter-postgres", "TypeScript + PostgreSQL", "IRunStateStore + IOutboxStorage")
Container_Ext(intent_store, "IStartRunIntentStore", "InMemory + Postgres", "startRun intent persistence")
Container_Ext(provider_adapter, "@dvt/adapter-temporal", "TypeScript", "IProviderAdapter")
Container_Ext(event_bus, "Event bus", "Kafka or equivalent", "Consumes outbox publications")
Container_Ext(obs, "Observability stack", "OTel / logs / metrics", "Telemetry backend")

Container_Boundary(engine, "@dvt/engine") {
    Component(workflow, "WorkflowEngine", "core/WorkflowEngine.ts", "Lifecycle API: startRun, cancelRun, signal, getRunStatus")
    Component(projector, "SnapshotProjector", "core/SnapshotProjector.ts", "Materializes WorkflowSnapshot from event log")
    Component(maint, "RunMaintenanceService", "services/RunMaintenanceService.ts", "Detects stuck runs and reconciles orphaned intents")
    Component(idempotency, "IdempotencyKeyBuilder", "core/idempotency.ts", "Builds eventId and idempotency keys")
    Component(policies, "Security + Plan policies", "security/*", "Tenant access, plan URI policy, integrity checks")
    Component(outbox_worker, "OutboxWorker", "outbox/OutboxWorker.ts", "Polls outbox and publishes events")
    Component(intent_worker, "IntentReconcilerWorker", "workers/IntentReconcilerWorker.ts", "Schedules reconciliation sweeps with backoff")
}

Rel(callers, workflow, "Calls")

Rel(workflow, policies, "Validates")
Rel(workflow, idempotency, "Generates ids")
Rel(workflow, provider_adapter, "startRun / cancelRun / signal / getRunStatus", "IProviderAdapter")
Rel(workflow, intent_store, "createIntent / markDispatched / markResolved", "IStartRunIntentStore")
Rel(workflow, state_store, "bootstrapRunTx / appendAndEnqueueTx / getSnapshot / listEvents", "IRunStateStore")
Rel(workflow, projector, "Replays events when snapshot is missing")
Rel(workflow, obs, "Emits telemetry")

Rel(maint, state_store, "listRuns / getSnapshot / listEvents / appendAndEnqueueTx")
Rel(maint, intent_store, "listOrphaned / markExpired")
Rel(maint, provider_adapter, "lookupRunRef / cancelRun")
Rel(maint, idempotency, "Builds maintenance event ids")
Rel(maint, obs, "Emits telemetry")

Rel(intent_worker, maint, "Triggers reconcileOrphanedIntents")
Rel(intent_worker, obs, "Exports metrics and logs")

Rel(outbox_worker, state_store, "listPending / markDelivered / markFailed")
Rel(outbox_worker, event_bus, "publish")

UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## 4. Reading Notes

- `WorkflowEngine` is the lifecycle boundary and should not own plan bytes or runtime internals.
- `SnapshotProjector` is still in-process; no standalone projector service yet.
- `RunMaintenanceService` centralizes maintenance behavior from ADR-0029 and ADR-0030.
- `@dvt/adapter-postgres` now covers state store, outbox, and persistent intent store (`PostgresStartRunIntentStore`).
- `OutboxWorker` and `IntentReconcilerWorker` are operational components that embed `@dvt/engine`.

## 5. Implementation Maturity Map

**Cutoff date**: 2026-03-06  
**Basis**: current code in `packages/@dvt/engine`, `@dvt/adapter-postgres`, `@dvt/adapter-temporal`, and local test coverage.

```mermaid
flowchart LR
  E["Engine lifecycle (95%)"] --> P["Postgres state + outbox storage (95%)"]
  E --> I["Intent durability (85%)"]
  E --> T["Temporal runtime adapter (80%)"]
  E --> O["Independent outbox delivery process (65%)"]
  E --> R["Standalone projection/read models (40%)"]
  E --> C["Conductor adapter (15%)"]
```

| Area                              | Implemented | Code evidence                                                               | Main gap                                                     |
| --------------------------------- | ----------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Engine lifecycle core             | 95%         | `WorkflowEngine`, `SnapshotProjector`, `RunMaintenanceService`, broad tests | Operational hardening and integration debt                   |
| Postgres state + outbox storage   | 95%         | `PostgresStateStoreAdapter` with snapshots/event log/outbox + DLQ           | Real downstream publisher wiring and operational hardening   |
| Intent durability                 | 85%         | `PostgresStartRunIntentStore` + `IntentReconcilerWorker`                    | End-to-end wiring and production telemetry tuning            |
| Temporal runtime adapter          | 80%         | `TemporalAdapter`, `TemporalWorkerHost`, workflow/activities                | Remaining phase capabilities + CI integration lane stability |
| Standalone projection/read models | 40%         | In-process `SnapshotProjector` only                                         | Dedicated projector service and denormalized read models     |
| Conductor adapter                 | 15%         | `ConductorAdapterStub`                                                      | Real adapter implementation and parity validation            |

## 6. Missing Capabilities and Proposed Effort

| Gap                                      | Why it matters                                                                | Proposed implementation                                                                                                  | Estimated effort    |
| ---------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| Independent outbox delivery process      | Production reliability for async publication and isolation from API lifecycle | Harden `apps/outbox-worker`, add real publisher wiring, deploy profile, metrics, health checks, and retry/DLQ dashboards | 4-6 engineer-days   |
| Standalone projection/read model service | Scalable status queries and dashboard-friendly reads                          | Extract projector worker, add rebuild/replay tooling, introduce denormalized read models and indexes                     | 8-12 engineer-days  |
| Temporal integration hardening           | Reduce runtime risk and CI blind spots                                        | Stabilize Temporal integration lane (time-skipping/dev server), strengthen failure injection tests and shutdown behavior | 3-5 engineer-days   |
| Conductor real adapter                   | Multi-provider portability roadmap                                            | Replace `ConductorAdapterStub`, map signals/status/events, add capability parity tests                                   | 10-15 engineer-days |

### Sequencing proposal

1. Outbox delivery process
2. Temporal hardening
3. Standalone projection/read model service
4. Conductor adapter
