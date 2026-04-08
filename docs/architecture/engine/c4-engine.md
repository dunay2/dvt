# Engine C4 Architecture

**Last reviewed**: 2026-04-09  
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

System_Ext(provider_runtime, "Provider runtime", "Temporal today; second runtime not on the active delivery path")
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
    Container(provider_adapter, "@dvt/adapter-temporal", "TypeScript", "Implemented IProviderAdapter runtime path today")
    ContainerDb(pg_store, "@dvt/adapter-postgres", "PostgreSQL", "IRunStateStore + IOutboxStorage + intent persistence")
    Container(intent_store, "IStartRunIntentStore", "InMemory + Postgres", "Pre-dispatch intent log for crash consistency")
    Container(delivery_worker, "Outbox delivery process", "Node.js", "Embeds OutboxWorker to publish events and exposes health/metrics")
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

## 5. Current delivery posture

This C4 view is structural. For delivery sequencing, use
[Engine Roadmap](roadmap/engine-phases.md) and the active Lane A/Lane C tasks.

```mermaid
flowchart LR
  Core["Implemented core: WorkflowEngine plus state-store plus Temporal"] --> Hex["WE-HX derivation and facade narrowing"]
  Hex --> Runtime["MW-C1 plus TF-C2 runtime vertical"]
  Hex --> Cleanup["AR-A8 Conductor illusion cleanup"]
```

| Area                                                  | Current posture                         | Code evidence                                                                                                 | Current projection                                                      |
| ----------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Engine lifecycle core                                 | Implemented                             | `WorkflowEngine`, `SnapshotProjector`, `RunMaintenanceService`, broad tests                                   | Keep hardening under `WE-HX`, not a new MVP phase                       |
| Postgres state, outbox, and read-model path           | Implemented                             | `@dvt/adapter-postgres`, delivery runtime, projector/read-model ownership in current docs                     | Already absorbed into mainline; no longer a future engine roadmap claim |
| Temporal runtime adapter                              | Implemented with ongoing hardening      | `@dvt/adapter-temporal`, `RunPlanWorkflow`, integration coverage                                              | Continue hardening via `WE-HX`, `AR-C*`, and `MW-C1`                    |
| Compatibility facade and ownership seams              | In progress                             | `workflow-engine-subsystem-context.md`, `workflow-engine-target-architecture.v1.md`, `StartRunProtocol.v1.md` | Close `WE-HX-0..3`, then `WE-HX-5..6`                                   |
| Conductor truthfulness                                | Residual debt, not active product phase | `ConductorAdapterStub`, provider typing, draft Conductor docs                                                 | Close `AR-A8` before treating a second runtime as live roadmap work     |
| First execution-first transformation runtime vertical | Queued                                  | Lane C `MW-C1`, `TF-C2-A`, `TF-C2-B`                                                                          | This is the next real runtime value path                                |

## 6. Current sequencing

1. close the remaining `WE-HX` derivation waves so the engine boundary is
   truthful and easier to evolve;
2. remove the Conductor illusion from runtime typing and documentation through
   `AR-A8`;
3. deliver `MW-C1` plus `TF-C2-A/B` so persisted plans can drive the first
   PostgreSQL execution-first path with caller-visible evidence.
