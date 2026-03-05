---
title: DVT+ - Gap Execution Plans
status: Draft
owner: docs
last_reviewed: 2026-03-05
planning_type: proposal
---

---

title: DVT+ - Gap Execution Plans
status: Draft
owner: docs
last_reviewed: 2026-03-04
planning_type: proposal

---

# DVT+ - Gap Execution Plans

**Fecha**: 2026-03-04
**Fuente**: [`docs/architecture/system-delivery-status.md`](../docs/architecture/system-delivery-status.md)
**Estado**: G2 cerrado. G1/G3/G4 pendientes Phase 1.

---

## Ãndice

| Gap                                                 | DescripciÃ³n                               | Fase      | Estado                                               |
| --------------------------------------------------- | ------------------------------------------ | --------- | ---------------------------------------------------- |
| [G1](#g1--temporal-adapter-real)                    | Temporal Adapter real                      | Phase 1   | âŒ Pendiente                                         |
| [G2](#g2--postgresstatestore-completo)              | PostgresStateStoreAdapter completo         | Phase 1   | âœ… Cerrado                                          |
| [G3](#g3--istartrunintentstore-postgres--scheduler) | IStartRunIntentStore Postgres + scheduler  | Phase 1   | âŒ Pendiente                                         |
| [G4](#g4--compiledcoderef-ownership)                | compiledCodeRef ownership â€” decisiÃ³n    | Phase 1   | ðŸŸ¡ ADR-0032 Accepted â€” implementaciÃ³n pendiente |
| [G5](#g5--outbox-worker-independiente)              | Outbox Worker (polling, DLQ, shards)       | Phase 1.5 | âŒ Pendiente                                         |
| [G6](#g6--ol-translation-tests--schemaurl-pin)      | OL translation tests CI + `_schemaURL` pin | Phase 1.5 | âŒ Pendiente                                         |
| [G7](#g7--read-models--proyector-standalone)        | Read Models + proyector standalone         | Phase 1.5 | âŒ Pendiente                                         |
| [G8](#g8--auth-real-en-appsapi)                     | Auth real en `apps/api`                    | Phase 1.5 | âŒ Pendiente                                         |
| [G9](#g9--steptyperegistry--tipado-steptypeconfig)  | StepTypeRegistry + tipado `stepTypeConfig` | Phase 2   | âŒ Pendiente                                         |
| [G10](#g10--outbox_lineage-worker--fail-open-dlq)   | `outbox_lineage` Worker + fail-open DLQ    | Phase 2   | âŒ Pendiente                                         |

---

## G1 â€” Temporal Adapter real

**Paquete**: `packages/@dvt/adapter-temporal`
**Bloquea**: end-to-end con Temporal real, integraciÃ³n tests con `time-skipping`
**ADRs**: ADR-0001, ADR-0003, ADR-0030

### Estado actual

- Temporal SDK ya instalado (`@temporalio/client`, `@temporalio/worker`, `@temporalio/workflow` v1.14.1) âœ…
- `TemporalClientManager` con `connect()`/`close()` implementado âœ…
- `RunPlanWorkflow` determinÃ­stico con `proxyActivities`, seÃ±ales PAUSE/RESUME/CANCEL âœ…
- `TemporalAdapter.startRun()`, `cancelRun()`, `signal()`, `getRunStatus()`, `ping()` implementados âœ…
- `lookupRunRef` â€” **ausente** en `TemporalAdapter` (sÃ³lo en `MockAdapter`) âŒ
- Worker real (`TemporalWorkerHost`) existe pero sin configuraciÃ³n de producciÃ³n validada ðŸŸ¡
- Tests de integraciÃ³n con `time-skipping` requieren `DVT_TEMPORAL_INTEGRATION=1` â€” no corren en CI main ðŸŸ¡

### Scope del plan

#### Tarea 1 â€” Implementar `lookupRunRef` en `TemporalAdapter`

**Contrato requerido** (`IProviderAdapter`):

```typescript
lookupRunRef?(runId: string, tenantId: string): Promise<EngineRunRef | null>
```

**LÃ³gica**:

1. Derivar `workflowId` desde `runId` usando `toTemporalWorkflowId(runId)` (ya existe en `WorkflowMapper.ts`).
2. Llamar `workflowClient.getHandle(workflowId).describe()` â€” devuelve metadata si existe, lanza `WorkflowNotFoundError` si no.
3. Si existe: construir `EngineRunRef` con `workflowId`, `runId`, namespace y taskQueue desde config.
4. Si `WorkflowNotFoundError`: retornar `null`.
5. Cualquier otro error: relanzar (no silenciar).

**Archivos a modificar**:

- `src/TemporalAdapter.ts` â€” aÃ±adir mÃ©todo `lookupRunRef`
- `src/WorkflowMapper.ts` â€” aÃ±adir helper `toEngineRunRefFromDescribe` si hace falta
- `test/TemporalAdapter.test.ts` â€” tests con `workflowClient` mock para las 3 ramas (existe, no existe, error)

#### Tarea 2 â€” Validar `TemporalWorkerHost` en entorno real

**Verificar**:

- `TemporalWorkerHost.start()` registra correctamente `RunPlanWorkflow` y actividades `stepActivities`
- Connection retry policy configurable (no hardcoded)
- Graceful shutdown (`worker.shutdown()`) sin pÃ©rdida de actividades en vuelo

**Archivos a modificar**:

- `src/TemporalWorkerHost.ts` â€” revisar y completar si hay gaps
- `src/config.ts` â€” verificar que todos los campos de producciÃ³n tienen defaults razonables

#### Tarea 3 â€” Habilitar integration tests en CI (opcional Phase 1, obligatorio Phase 1.5)

- AÃ±adir job `temporal-integration` en `.github/workflows/` con `testcontainers` o Temporal dev server
- Condicionado a `DVT_TEMPORAL_INTEGRATION=1`
- Cubrir: `startRun`, `cancelRun`, `signal(PAUSE/RESUME)`, `lookupRunRef` (existe / no existe)

### Criterios de cierre G1

- [ ] `TemporalAdapter.lookupRunRef` implementado con las 3 ramas (existe / no-existe / error)
- [ ] Tests unitarios de `lookupRunRef` pasan sin Temporal real
- [ ] `tsc --noEmit` limpio
- [ ] `RunMaintenanceService` con adapter Temporal real pasa `reconcileOrphanedIntents` en mock path
- [ ] (Phase 1.5) Integration test con Temporal dev server pasa en CI

---

## G2 â€” PostgresStateStore completo

**Estado**: âœ… **Cerrado 2026-03-04**

`listEvents(options?)` con cursor `afterSeq`/`limit` y `listRuns` con filtro `status` implementados.
Ver commit en `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`.

---

## G3 â€” IStartRunIntentStore Postgres + scheduler

**Paquete**: `packages/@dvt/engine` + `packages/@dvt/adapter-postgres`
**Bloquea**: durabilidad del intent log en producciÃ³n (actualmente en-memory â†’ se pierde en restart)
**ADRs**: ADR-0030, ADR-0003, ADR-0013

### Estado actual

- `IStartRunIntentStore` contrato completo en `src/ports/IStartRunIntentStore.ts` âœ…
- `InMemoryStartRunIntentStore` implementada y testeada âœ…
- `RunMaintenanceService.reconcileOrphanedIntents` usa el store (funciona con InMemory) âœ…
- **Postgres implementation**: no existe âŒ
- **Scheduler periÃ³dico** (llama a `reconcileOrphanedIntents` cada N segundos): no existe âŒ

### Scope del plan

#### Tarea 1 â€” `PostgresStartRunIntentStore` en `packages/@dvt/adapter-postgres`

**DDL** (nueva tabla en `ensureSchema`):

```sql
CREATE TABLE IF NOT EXISTS {schema}.start_run_intents (
  intent_id    TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL,
  run_id       TEXT NOT NULL,
  provider     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'PENDING',
  engine_run_ref JSONB,
  created_at   TIMESTAMPTZ NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS intents_orphaned_idx
  ON {schema}.start_run_intents (status, created_at ASC)
  WHERE status IN ('PENDING', 'DISPATCHED');
```

**MÃ©todos a implementar** (implementan `IStartRunIntentStore`):

- `createIntent` â€” INSERT con `ON CONFLICT (intent_id) DO NOTHING`, retorna existente si ya existe
- `markDispatched` â€” UPDATE status PENDINGâ†’DISPATCHED + set `engine_run_ref`, valida transiciÃ³n
- `markResolved` â€” UPDATE status â†’RESOLVED, valida transiciÃ³n desde PENDING o DISPATCHED
- `markExpired` â€” UPDATE status PENDINGâ†’EXPIRED, valida transiciÃ³n
- `listOrphaned` â€” SELECT WHERE status IN ('PENDING','DISPATCHED') AND created_at < NOW() - thresholdMs ORDER BY created_at ASC LIMIT N
- `getIntent` â€” SELECT by intent_id

**Transiciones vÃ¡lidas** (mismas que `InMemoryStartRunIntentStore`):

- PENDING â†’ DISPATCHED (markDispatched)
- PENDING â†’ EXPIRED (markExpired)
- PENDING â†’ RESOLVED (markResolved)
- DISPATCHED â†’ RESOLVED (markResolved)

**Archivos nuevos/modificados**:

- `packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts` â€” nueva clase
- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts` â€” aÃ±adir DDL de la tabla en `ensureSchemaObjects`
- `packages/@dvt/adapter-postgres/src/index.ts` â€” exportar nueva clase
- `packages/@dvt/adapter-postgres/test/smoke.test.ts` â€” suite de integraciÃ³n para el intent store

#### Tarea 2 â€” Scheduler periÃ³dico de reconciliaciÃ³n

**UbicaciÃ³n**: `packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts` (o similar)

**LÃ³gica**:

```typescript
// Ejecuta reconcileOrphanedIntents cada intervalMs
// Para en shutdown graceful
class IntentReconcilerWorker {
  start(intervalMs: number): void;
  stop(): Promise<void>;
}
```

**ConfiguraciÃ³n**:

- `intervalMs` â€” default 30_000 (30s), configurable
- `orphanThresholdMs` â€” default 300_000 (5 min), configurable (ADR-0030 Â§4)
- `limit` â€” default 50 intents por sweep

**IntegraciÃ³n**: el worker se instancia en el entry point de `apps/api` junto con el adapter Postgres.

**Archivos nuevos/modificados**:

- `packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts` â€” nueva clase
- `packages/@dvt/engine/src/index.ts` â€” exportar si es API pÃºblica

### Criterios de cierre G3

- [ ] `PostgresStartRunIntentStore` implementa todas las transiciones del contrato
- [ ] DDL migrado en `ensureSchema` (idempotente con `IF NOT EXISTS`)
- [ ] Tests unitarios pasan con mock de `pg.Pool`
- [ ] Integration test con PG real (`DVT_PG_INTEGRATION=1`)
- [ ] `IntentReconcilerWorker` arranca/para limpiamente
- [ ] `RunMaintenanceService` funciona end-to-end con `PostgresStartRunIntentStore`
- [ ] `tsc --noEmit` limpio

---

## G4 â€” compiledCodeRef ownership

**Packages**: `@dvt/contracts`, `@dvt/planner`, `@dvt/adapter-temporal`, `@dvt/traceability-service`
**Blocks**: complete SQL execution traceability and OpenLineage SqlJobFacet
**ADR**: [ADR-0032](../docs/adr/ADR-0032-compiledcoderef-ownership.md) â€” Accepted (Option A: reference in StepStarted.payload)

### Current state

- `dbt run_results.json` provides `compiled_code` per node âœ…
- ADR-0032 accepted: `CompiledCodeRef { sha256, storageUri, sizeBytes }` in `StepStarted.payload` âœ…
- **Implementation**: pending across 4 packages âŒ

### Dependency graph

```
T4-1 (contracts) â”€â”€â†’ T4-2 (planner)           [parallel after T4-1]
                 â”€â”€â†’ T4-3 (adapter-temporal)   [parallel after T4-1]
                 â”€â”€â†’ T4-4 (traceability)       [parallel after T4-1]
```

T4-1 is small (~4h). Once merged (or on a shared feature branch), T4-2/T4-3/T4-4 are fully independent.

---

### T4-1 â€” `@dvt/contracts`: CompiledCodeRef type + golden fixtures

**Owner**: 1 developer
**Estimated size**: small (~4h)
**Blocks**: T4-2, T4-3, T4-4

**Files to change**:

- `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts` â€” add `CompiledCodeRef` interface
- `packages/@dvt/contracts/test/contracts/StepStarted-with-compiledCodeRef.golden.json` â€” new golden fixture
- `packages/@dvt/contracts/test/contracts/StepStarted-without-compiledCodeRef.golden.json` â€” new golden fixture

**Contract to add**:

```typescript
export interface CompiledCodeRef {
  sha256: string; // SHA-256 hex of compiled SQL bytes
  storageUri: string; // s3://<bucket>/<key> | gs://... | file:// (dev only)
  sizeBytes: number;
  encoding?: 'utf-8';
}
```

**Closure criteria**:

- [ ] `CompiledCodeRef` exported from `@dvt/contracts`
- [ ] Both golden fixtures committed
- [ ] `tsc --noEmit` clean
- [ ] `pnpm --filter @dvt/contracts build` passes

---

### T4-2 â€” `@dvt/planner`: ICompiledCodeStorage + SHA-256 + buildStep integration

**Owner**: 1 developer
**Estimated size**: medium (~2â€“3 days)
**Depends on**: T4-1 merged or available on shared branch
**New dependencies**: `@aws-sdk/client-s3` (covers both S3 and MinIO via endpoint override)

**Files to create/change**:

- `src/ports/ICompiledCodeStorage.ts` â€” port interface
- `src/adapters/S3CompiledCodeStorage.ts` â€” production (`@aws-sdk/client-s3`)
- `src/adapters/MinioCompiledCodeStorage.ts` â€” CI (S3-compatible, endpoint override)
- `src/adapters/FileSystemCompiledCodeStorage.ts` â€” local dev (`file://` URI)
- `src/adapters/InMemoryCompiledCodeStorage.ts` â€” unit tests
- `src/adapters/NoopCompiledCodeStorage.ts` â€” tests that don't verify upload
- `src/compiledCode/sha256.ts` â€” `computeSha256(content: Buffer): string` using `node:crypto`
- `src/compiledCode/uploadCache.ts` â€” per-invocation `Map<sha256, storageUri>` dedup cache
- `src/buildStep.ts` (modify) â€” extract `compiled_code`, compute sha256, upload, attach `compiledCodeRef` in `stepTypeConfig`
- `src/config.ts` (modify) â€” `file://` blocked in `NODE_ENV=production` (INV-CCREF-007)
- `test/compiledCode/*.test.ts` â€” unit tests (see ADR-0032 Â§5.5)

**Closure criteria**:

- [ ] All 5 `ICompiledCodeStorage` implementations exist
- [ ] `buildStep` attaches `compiledCodeRef` to `stepTypeConfig` when `compiled_code` is present
- [ ] `buildStep` omits field and does NOT upload when `compiled_code` is absent
- [ ] Same sha256 in single invocation triggers only 1 upload (cache test)
- [ ] `file://` rejected at startup in `NODE_ENV=production`
- [ ] All unit tests pass with `InMemoryCompiledCodeStorage`
- [ ] `tsc --noEmit` clean

---

### T4-3 â€” `@dvt/adapter-temporal`: activity propagates compiledCodeRef to StepStarted

**Owner**: 1 developer
**Estimated size**: small (~4â€“6h)
**Depends on**: T4-1 merged or available on shared branch
**New dependencies**: none

**Files to change**:

- `src/activities/stepActivities.ts` â€” read `compiledCodeRef` from `step.stepTypeConfig`, propagate to `StepStarted.payload`
- `src/compiledCode/typeGuard.ts` (new) â€” `extractCompiledCodeRef(stepTypeConfig): CompiledCodeRef | undefined`
- `test/stepActivities.compiledCodeRef.test.ts` (new) â€” type guard unit tests (4 cases: valid / absent / malformed sha256 / malformed sizeBytes)

**Key implementation** (type guard â€” no throw, fail-open):

```typescript
function extractCompiledCodeRef(cfg: Record<string, unknown>): CompiledCodeRef | undefined {
  const ref = cfg['compiledCodeRef'];
  if (
    ref !== null &&
    typeof ref === 'object' &&
    typeof (ref as Record<string, unknown>)['sha256'] === 'string' &&
    typeof (ref as Record<string, unknown>)['storageUri'] === 'string' &&
    typeof (ref as Record<string, unknown>)['sizeBytes'] === 'number'
  )
    return ref as CompiledCodeRef;
  return undefined;
}
```

**Closure criteria**:

- [ ] `StepStarted.payload.compiledCodeRef` populated when present in `stepTypeConfig`
- [ ] `StepStarted.payload.compiledCodeRef` absent when `stepTypeConfig` field is missing or malformed â€” no throw
- [ ] 4 type guard unit tests pass
- [ ] `tsc --noEmit` clean

---

### T4-4 â€” `@dvt/traceability-service`: ICompiledCodeReader + LRU + SqlJobFacet

**Owner**: 1 developer
**Estimated size**: medium (~2â€“3 days)
**Depends on**: T4-1 merged or available on shared branch
**New dependencies**: `lru-cache`, `p-retry`, `@aws-sdk/client-s3`

**Files to create/change**:

- `src/ports/ICompiledCodeReader.ts` â€” port interface `get(storageUri): Promise<string | null>`
- `src/adapters/S3CompiledCodeReader.ts` â€” production/CI (`@aws-sdk/client-s3`)
- `src/adapters/InMemoryCompiledCodeReader.ts` â€” unit tests (shared `Map` with `InMemoryCompiledCodeStorage`)
- `src/cache/CompiledCodeCache.ts` â€” LRU cache wrapping `ICompiledCodeReader`
  - `lru-cache`, TTL=`COMPILED_CODE_CACHE_TTL_MS` (default 86400000), max=`COMPILED_CODE_CACHE_MAX_ENTRIES` (default 512)
  - retry via `p-retry` (3 attempts, factor 4: 100msâ†’400msâ†’1600ms)
- `src/facets/SqlJobFacet.ts` (new) â€” `buildSqlJobFacet(ref, cache): Promise<SqlJobFacet | undefined>`
- `src/service.ts` (modify) â€” consume `SqlJobFacet` when mapping `StepStarted â†’ OL RunEvent`
- `test/sqlJobFacet.test.ts` â€” unit tests (present+resolves / absent / resolves-null / cache-hit)
- `test/integration/compiledCodeRef.integration.test.ts` â€” MinIO integration tests (3 scenarios from ADR Â§5.5)
- `infra/docker/docker-compose.test.yml` (new or modify) â€” MinIO service for integration tests

**Closure criteria**:

- [ ] `ICompiledCodeReader` port + `S3CompiledCodeReader` + `InMemoryCompiledCodeReader` implemented
- [ ] LRU cache with configurable TTL and max entries
- [ ] `p-retry` exponential backoff: 3 attempts, 100ms base, factor 4
- [ ] `SqlJobFacet` constructed when `compiledCodeRef` present and blob resolves
- [ ] OL emitted without `SqlJobFacet` when ref absent or blob unresolvable (fail-open)
- [ ] Metric `dvt.traceability.blob_resolution_failed_total` recorded on resolution failure
- [ ] LRU cache test: second call for same `storageUri` does not hit the reader
- [ ] All unit tests pass (no MinIO required)
- [ ] 3 MinIO integration test scenarios pass
- [ ] `tsc --noEmit` clean

---

### G4 closure criteria

- [ ] T4-1: `CompiledCodeRef` exported, golden fixtures committed
- [ ] T4-2: planner uploads and attaches ref; all unit tests pass
- [ ] T4-3: activity propagates ref to `StepStarted.payload`; type guard tests pass
- [ ] T4-4: traceability builds `SqlJobFacet`; LRU cache works; integration tests pass with MinIO
- [ ] End-to-end: `pnpm test` green across all 4 packages
- [ ] Evidence Doc `ED-20260304-compiledcoderef-ownership.md` updated with real PR + test paths

---

## G5 â€” Outbox Worker independiente

**Paquete**: `apps/api` o nuevo `apps/outbox-worker`
**Bloquea**: entrega at-least-once a Kafka/EventBus en producciÃ³n
**ADRs**: ADR-0004, ADR-0009

### Estado actual

- Outbox pattern implementado en `PostgresStateStoreAdapter`: `listPending`, `markDelivered`, `markFailed`, DLQ âœ…
- No existe worker de polling que llame a esos mÃ©todos y publique a Kafka âŒ

### Scope del plan

#### Tarea 1 â€” `OutboxPollingWorker`

```typescript
class OutboxPollingWorker {
  constructor(store: IOutboxStorage, publisher: IEventPublisher, opts: OutboxWorkerOptions);
  start(): void; // arranca polling loop
  stop(): Promise<void>; // graceful shutdown
}
```

**Loop**:

1. `store.listPending(batchSize)` â€” por defecto 100
2. Para cada record: `publisher.publish(record.payload)`
3. Si OK: `store.markDelivered([id])`
4. Si falla: `store.markFailed(id, error.message)` â†’ backoff exponencial gestionado por el adapter
5. Sleep `pollIntervalMs` (default 100ms)

**GarantÃ­as**:

- Exactly-once delivery al publisher NO es responsabilidad del worker (at-least-once es suficiente)
- Consumers deben deduplicar por `idempotencyKey` (contrato existente)

#### Tarea 2 â€” `IEventPublisher` port

```typescript
interface IEventPublisher {
  publish(event: EventEnvelope): Promise<void>;
}
```

Implementaciones:

- `KafkaEventPublisher` â€” usa `kafkajs` (Phase 1.5)
- `NoopEventPublisher` â€” para tests (inmediato)
- `InMemoryEventPublisher` â€” buffer en-memoria para smoke tests

**Archivos nuevos/modificados**:

- `packages/@dvt/engine/src/ports/IEventPublisher.ts`
- `packages/@dvt/engine/src/workers/OutboxPollingWorker.ts`
- `apps/api/src/workers/` â€” instanciaciÃ³n en startup

### Criterios de cierre G5

- [ ] `OutboxPollingWorker` arranca/para limpiamente
- [ ] Tests unitarios con `InMemoryEventPublisher` + `InMemoryTxStore`
- [ ] Integration test con PG real: eventos pasan de `outbox` â†’ `markDelivered`
- [ ] `KafkaEventPublisher` bÃ¡sico operativo (Phase 1.5)

---

## G6 â€” OL translation tests CI + `_schemaURL` pin

**Paquete**: `packages/@dvt/traceability-service`
**ADRs**: ADR-0020, ADR-0021

### Estado actual

- `@dvt/traceability-service` â€” estructura `adapters/`, `core/`, `service.ts` existe ðŸŸ¡
- RunEvents â†’ OL mapping documentado en ADR-0020/0021 âœ…
- ImplementaciÃ³n TypeScript del mapping: âŒ
- Tests CI para el mapping: âŒ
- `_schemaURL` de OL spec fijado en cÃ³digo: âŒ

### Scope del plan

#### Tarea 1 â€” Implementar mapping `RunEvents â†’ OL`

Mapeo canÃ³nico:

- `RunStarted` â†’ OL `START` job facet
- `RunCompleted`/`RunFailed` â†’ OL `COMPLETE`/`FAIL` job facet
- `StepStarted`/`StepCompleted`/`StepFailed` â†’ OL `RUN` dataset facets con `compiledCodeRef`

Pin de versiÃ³n: `_schemaURL: "https://openlineage.io/spec/2-0-2/OpenLineage.json#/definitions/RunEvent"`

#### Tarea 2 â€” Tests CI del mapping

Golden fixtures: input (RunEvent) â†’ output (OL event JSON) versionados y validados en CI.

### Criterios de cierre G6

- [ ] Mapping RunEventsâ†’OL implementado para los 6 event types principales
- [ ] `_schemaURL` hardcoded como constante con comentario de versiÃ³n OL
- [ ] Golden fixtures en `test/contracts/ol-mapping/`
- [ ] CI valida fixtures en cada PR

---

## G7 â€” Read Models + proyector standalone

**Paquete**: `packages/@dvt/state-store` + infra
**Bloquea**: `listRuns` con status en tiempo real sin full scan, UI dashboard

### Estado actual

- `getSnapshot` implementado (O(1) con tabla `run_snapshots`) âœ…
- `listRuns` con filtro `status` implementado (G2, INNER JOIN `run_snapshots`) âœ…
- No hay proyector standalone que reconstruya snapshots a partir de eventos âŒ
- No hay Ã­ndice denormalizado para queries complejas de dashboard (tenant + status + date range) âŒ

### Scope del plan

#### Tarea 1 â€” `SnapshotRebuildService`

```typescript
class SnapshotRebuildService {
  // Reconstruye snapshot para un run especÃ­fico desde sus eventos
  rebuildOne(tenantId: string, runId: string): Promise<WorkflowSnapshot>;
  // Reconstruye todos los snapshots nulos (recovery batch)
  rebuildMissing(tenantId: string, batchSize?: number): Promise<number>;
}
```

#### Tarea 2 â€” Ãndice adicional para `run_snapshots`

```sql
CREATE INDEX IF NOT EXISTS snapshots_status_updated_idx
  ON {schema}.run_snapshots ((snapshot->>'status'), updated_at DESC);
```

Permite `listRuns(status=X)` con index-only scan sin full table scan.

### Criterios de cierre G7

- [ ] `SnapshotRebuildService` implementado con tests
- [ ] Ãndice de status en `run_snapshots` aÃ±adido en `ensureIndexes`
- [ ] `listRuns(status)` usa el Ã­ndice (EXPLAIN ANALYZE verificado)

---

## G8 â€” Auth real en `apps/api`

**Paquete**: `apps/api`
**ADRs**: IAuthorization.v1.md, THREAT_MODEL.md

### Estado actual

- Fastify + routes implementado ðŸŸ¡
- Sin autenticaciÃ³n real (todos los endpoints son open) âŒ
- `IAuthorization` contrato diseÃ±ado âœ…

### Scope del plan

#### Tarea 1 â€” JWT middleware en Fastify

- VerificaciÃ³n JWT con clave pÃºblica configurable (RS256 o ES256)
- ExtracciÃ³n de `tenantId` del claim `sub` o `tenant_id`
- Rechazo 401 si token invÃ¡lido/expirado

#### Tarea 2 â€” RBAC stub

- 5 roles definidos en `IAuthorization.v1.md`: `ADMIN`, `OPERATOR`, `VIEWER`, `RUNNER`, `AUDITOR`
- Middleware que mapea roles del token a permisos por endpoint
- Stub inicial: `ADMIN` tiene todos los permisos

### Criterios de cierre G8

- [ ] JWT verificado en todos los endpoints de `/runs`
- [ ] `tenantId` extraÃ­do del token y propagado al adapter (no override desde request body)
- [ ] Test de integraciÃ³n: token invÃ¡lido â†’ 401, token vÃ¡lido â†’ 200

---

## G9 â€” StepTypeRegistry + tipado `stepTypeConfig`

**Paquete**: `packages/@dvt/planner` + `packages/@dvt/engine`

### Estado actual

- `stepTypeConfig` en el plan es `Record<string, unknown>` â€” completamente opaco âŒ
- No hay validaciÃ³n de tipo de step en runtime âŒ

### Scope del plan

#### Tarea 1 â€” Definir `StepTypeRegistry`

```typescript
interface StepTypeDefinition {
  type: string;
  configSchema: z.ZodSchema; // Zod schema para validar stepTypeConfig
  capabilities?: string[]; // capabilities requeridas
}

class StepTypeRegistry {
  register(def: StepTypeDefinition): void;
  validate(type: string, config: unknown): void;
  getRequired(type: string): StepTypeDefinition;
}
```

Tipos iniciales: `dbt_model`, `dbt_test`, `gateway`, `noop`

#### Tarea 2 â€” Integrar en `@dvt/planner`

- Validar `stepTypeConfig` contra el registry al construir el plan
- Rechazar planes con `stepType` desconocido o config invÃ¡lida

### Criterios de cierre G9

- [ ] Registry con 4 tipos base implementado
- [ ] Planner rechaza `stepType` desconocido con error descriptivo
- [ ] Zod schemas para `dbt_model` y `dbt_test` con campos mÃ­nimos obligatorios

---

## G10 â€” `outbox_lineage` Worker + fail-open DLQ

**Paquete**: `packages/@dvt/traceability-service`
**ADRs**: ADR-0020, ADR-0021

### Estado actual

- `outbox_lineage` tabla separada del outbox de dominio âœ… (separaciÃ³n correcta de concerns)
- Worker que lee `outbox_lineage` y publica a Marquez: no existe âŒ
- Fail-open policy (si Marquez no responde, no bloquear el run): no definida âŒ

### Scope del plan

#### Tarea 1 â€” `OutboxLineageWorker`

Mismo patrÃ³n que `OutboxPollingWorker` (G5) pero sobre `outbox_lineage`:

1. `listPendingLineage(batchSize)`
2. Transformar RunEvent â†’ OL event (mapping G6)
3. `POST /api/v1/lineage` a Marquez
4. `markLineageDelivered(id)` si OK
5. **Fail-open**: si Marquez responde 4xx/5xx o timeout â†’ `markLineageFailed(id)` pero no bloquear el run

#### Tarea 2 â€” DLQ para lineage

- Misma estructura que `outbox_dead_letter` pero para `outbox_lineage`
- PolÃ­tica: despuÃ©s de `MAX_LINEAGE_ATTEMPTS` (default: 5), mueve a dead letter
- Operadores pueden reintentar manualmente (mismo patrÃ³n que `replayDeadLetters`)

### Criterios de cierre G10

- [ ] `OutboxLineageWorker` implementado con fail-open
- [ ] DLQ de lineage operativo
- [ ] Tests unitarios con Marquez client mock
- [ ] Documentado en `docs/architecture/engine/ops/observability.md`

---

## Orden de ejecuciÃ³n recomendado

```
Phase 1 (actual):
  G3 â†’ G1 â†’ G4 (decisiÃ³n)

Phase 1.5:
  G5 â†’ G7 â†’ G8 â†’ G6

Phase 2:
  G9 â†’ G10
```

**Rationale G3 antes de G1**: el IntentStore Postgres es el prerrequisito de durabilidad que hace que el adapter Temporal real sea seguro en producciÃ³n. Sin G3, un restart del proceso pierde todos los intents pendientes aunque el Temporal workflow estÃ© corriendo.

---

_Generado: 2026-03-04 â€” referencia: `docs/architecture/system-delivery-status.md` v1.1.0_
