# C4 del Engine

**Fecha**: 2026-03-05  
**Alcance**: arquitectura logica de `@dvt/engine` y sus colaboradores directos  
**Nota**: este documento usa contenedores logicos C4. `@dvt/engine` es una libreria TypeScript, mientras que `apps/api`, el reconciler y el outbox worker representan procesos que la embeben en runtime.

**Fuentes primarias**:

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

Person(api, "API / CLI", "Solicita startRun, getRunStatus, cancelRun y signal")
Person(ops, "Ops / Scheduler", "Ejecuta reconciliacion e inspeccion operacional")

System_Boundary(dvt, "DVT+ execution domain") {
    System(engine, "@dvt/engine", "Orquesta el ciclo de vida de runs con event sourcing y puertos explicitos")
}

System_Ext(provider_runtime, "Provider runtime", "Temporal hoy, Conductor futuro")
System_Ext(state_store, "Run state store", "Snapshots, metadata, event log y outbox")
System_Ext(intent_store, "StartRun intent store", "Registro PENDING -> DISPATCHED -> RESOLVED/EXPIRED")
System_Ext(obs, "Observability stack", "Logs, metrics y traces")
System_Ext(event_bus, "Event bus", "Kafka u otro publicador downstream")

Rel(api, engine, "Usa", "IWorkflowEngine")
Rel(ops, engine, "Opera", "IRunMaintenanceService / workers")
Rel(engine, provider_runtime, "Orquesta ejecucion", "IProviderAdapter")
Rel(engine, state_store, "Lee / escribe runs", "IRunStateStore + IOutboxStorage")
Rel(engine, intent_store, "Protege startRun ante crash", "IStartRunIntentStore")
Rel(engine, obs, "Emite", "logs / metrics / traces")
Rel(engine, event_bus, "Publica indirectamente", "OutboxWorker")

UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## 2. Container View

```mermaid
C4Container
title DVT+ Engine - Container View

Person(api_user, "API / CLI", "Consumidor del lifecycle API")
Person(ops_user, "Ops / Scheduler", "Opera workers y jobs batch")

System_Ext(plan_registry, "Plan registry / artifact store", "PlanRef bytes + hash verification")
System_Ext(provider_runtime, "Provider runtime", "Temporal cluster o runtime equivalente")
System_Ext(event_bus, "Event bus", "Publicacion downstream de eventos")
System_Ext(obs, "Observability stack", "Logs, metrics y tracing")

System_Boundary(dvt, "DVT+ execution subsystem") {
    Container(api_app, "apps/api", "Node.js", "Expone HTTP/API y llama al engine")
    Container(engine_lib, "@dvt/engine", "TypeScript", "Lifecycle orchestration, replay, maintenance y workers")
    Container(provider_adapter, "@dvt/adapter-temporal", "TypeScript", "Implementa IProviderAdapter; fetch de plan bytes y control del runtime")
    ContainerDb(pg_store, "@dvt/adapter-postgres", "PostgreSQL", "Implementa IRunStateStore + IOutboxStorage: metadata, events, snapshots, outbox y DLQ")
    Container(intent_store, "IStartRunIntentStore", "InMemory hoy, Postgres pendiente", "Pre-dispatch intent log para crash consistency")
    Container(delivery_worker, "Outbox delivery process", "Node.js", "Embebe OutboxWorker para publicar eventos")
    Container(reconcile_worker, "Intent reconciliation process", "Node.js", "Embebe IntentReconcilerWorker + RunMaintenanceService")
}

Rel(api_user, api_app, "Usa")
Rel(api_app, engine_lib, "Invoca", "IWorkflowEngine")
Rel(ops_user, reconcile_worker, "Programa / supervisa")
Rel(ops_user, delivery_worker, "Programa / supervisa")

Rel(engine_lib, provider_adapter, "Delega ejecucion", "IProviderAdapter")
Rel(provider_adapter, plan_registry, "Resuelve y verifica", "PlanRef")
Rel(provider_adapter, provider_runtime, "startRun / cancelRun / signal / status")

Rel(engine_lib, pg_store, "Persistencia y lectura", "IRunStateStore")
Rel(engine_lib, intent_store, "create / markDispatched / markResolved", "IStartRunIntentStore")
Rel(engine_lib, obs, "Emite telemetria")

Rel(reconcile_worker, engine_lib, "Usa", "RunMaintenanceService")
Rel(reconcile_worker, intent_store, "Escanea huerfanos")
Rel(reconcile_worker, provider_adapter, "lookupRunRef / cancelRun")
Rel(reconcile_worker, obs, "Emite telemetria")

Rel(delivery_worker, pg_store, "listPending / markDelivered / markFailed", "IOutboxStorage")
Rel(delivery_worker, event_bus, "Publica envelopes")
Rel(delivery_worker, obs, "Emite telemetria")

UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="1")
```

## 3. Component View

```mermaid
C4Component
title @dvt/engine - Component View

Container_Ext(callers, "apps/api / callers", "Node.js", "Invocan el lifecycle API")
Container_Ext(state_store, "@dvt/adapter-postgres", "TypeScript + PostgreSQL", "IRunStateStore + IOutboxStorage")
Container_Ext(intent_store, "IStartRunIntentStore", "InMemory hoy, Postgres pendiente", "Registro de intents startRun")
Container_Ext(provider_adapter, "@dvt/adapter-temporal", "TypeScript", "IProviderAdapter")
Container_Ext(event_bus, "Event bus", "Kafka u otro", "Consume publicaciones del outbox")
Container_Ext(obs, "Observability stack", "OTel / logs / metrics", "Telemetria")

Container_Boundary(engine, "@dvt/engine") {
    Component(workflow, "WorkflowEngine", "core/WorkflowEngine.ts", "API de lifecycle: startRun, cancelRun, signal, getRunStatus")
    Component(projector, "SnapshotProjector", "core/SnapshotProjector.ts", "Materializa WorkflowSnapshot desde el event log")
    Component(maint, "RunMaintenanceService", "services/RunMaintenanceService.ts", "Detecta runs stuck y reconcilia intents huerfanos")
    Component(idempotency, "IdempotencyKeyBuilder", "core/idempotency.ts", "Genera eventId e idempotency keys")
    Component(policies, "Security + Plan policies", "security/*", "Tenant access, plan URI policy e integridad")
    Component(outbox_worker, "OutboxWorker", "outbox/OutboxWorker.ts", "Hace polling del outbox y publica eventos")
    Component(intent_worker, "IntentReconcilerWorker", "workers/IntentReconcilerWorker.ts", "Agenda sweeps periodicos con backoff")
}

Rel(callers, workflow, "Llama")

Rel(workflow, policies, "Valida")
Rel(workflow, idempotency, "Genera ids")
Rel(workflow, provider_adapter, "startRun / cancelRun / signal / getRunStatus", "IProviderAdapter")
Rel(workflow, intent_store, "createIntent / markDispatched / markResolved", "IStartRunIntentStore")
Rel(workflow, state_store, "bootstrapRunTx / appendAndEnqueueTx / getSnapshot / listEvents", "IRunStateStore")
Rel(workflow, projector, "Reproduce eventos cuando falta snapshot")
Rel(workflow, obs, "Emite telemetria")

Rel(maint, state_store, "listRuns / getSnapshot / listEvents / appendAndEnqueueTx")
Rel(maint, intent_store, "listOrphaned / markExpired")
Rel(maint, provider_adapter, "lookupRunRef / cancelRun")
Rel(maint, idempotency, "Genera eventos de mantenimiento")
Rel(maint, obs, "Emite telemetria")

Rel(intent_worker, maint, "Dispara reconcileOrphanedIntents")
Rel(intent_worker, obs, "Expone metricas y logs")

Rel(outbox_worker, state_store, "listPending / markDelivered / markFailed")
Rel(outbox_worker, event_bus, "publish")

UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## 4. Notas de lectura

- `WorkflowEngine` es la frontera de lifecycle; no debe conocer bytes del plan ni detalles del runtime.
- `SnapshotProjector` sigue siendo in-process. No hay servicio standalone de proyeccion a la fecha del 2026-03-05.
- `RunMaintenanceService` concentra mantenimiento batch segun ADR-0029 y ADR-0030.
- `@dvt/adapter-postgres` cubre state store y outbox; un intent store persistente sigue pendiente.
- `OutboxWorker` e `IntentReconcilerWorker` son piezas operacionales que embeben el package `@dvt/engine`, no contratos publicos del lifecycle API.
