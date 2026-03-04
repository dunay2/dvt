# DVT+ — Planes de ejecución por Gap

**Fecha**: 2026-03-04
**Fuente**: [`docs/architecture/system-delivery-status.md`](../docs/architecture/system-delivery-status.md)
**Estado**: G2 cerrado. G1/G3/G4 pendientes Phase 1.

---

## Índice

| Gap                                                 | Descripción                                | Fase      | Estado                                          |
| --------------------------------------------------- | ------------------------------------------ | --------- | ----------------------------------------------- |
| [G1](#g1--temporal-adapter-real)                    | Temporal Adapter real                      | Phase 1   | ❌ Pendiente                                    |
| [G2](#g2--postgresstatestore-completo)              | PostgresStateStoreAdapter completo         | Phase 1   | ✅ Cerrado                                      |
| [G3](#g3--istartrunintentstore-postgres--scheduler) | IStartRunIntentStore Postgres + scheduler  | Phase 1   | ❌ Pendiente                                    |
| [G4](#g4--compiledcoderef-ownership)                | compiledCodeRef ownership — decisión       | Phase 1   | 🟡 ADR-0032 Accepted — implementación pendiente |
| [G5](#g5--outbox-worker-independiente)              | Outbox Worker (polling, DLQ, shards)       | Phase 1.5 | ❌ Pendiente                                    |
| [G6](#g6--ol-translation-tests--schemaurl-pin)      | OL translation tests CI + `_schemaURL` pin | Phase 1.5 | ❌ Pendiente                                    |
| [G7](#g7--read-models--proyector-standalone)        | Read Models + proyector standalone         | Phase 1.5 | ❌ Pendiente                                    |
| [G8](#g8--auth-real-en-appsapi)                     | Auth real en `apps/api`                    | Phase 1.5 | ❌ Pendiente                                    |
| [G9](#g9--steptyperegistry--tipado-steptypeconfig)  | StepTypeRegistry + tipado `stepTypeConfig` | Phase 2   | ❌ Pendiente                                    |
| [G10](#g10--outbox_lineage-worker--fail-open-dlq)   | `outbox_lineage` Worker + fail-open DLQ    | Phase 2   | ❌ Pendiente                                    |

---

## G1 — Temporal Adapter real

**Paquete**: `packages/@dvt/adapter-temporal`
**Bloquea**: end-to-end con Temporal real, integración tests con `time-skipping`
**ADRs**: ADR-0001, ADR-0003, ADR-0030

### Estado actual

- Temporal SDK ya instalado (`@temporalio/client`, `@temporalio/worker`, `@temporalio/workflow` v1.14.1) ✅
- `TemporalClientManager` con `connect()`/`close()` implementado ✅
- `RunPlanWorkflow` determinístico con `proxyActivities`, señales PAUSE/RESUME/CANCEL ✅
- `TemporalAdapter.startRun()`, `cancelRun()`, `signal()`, `getRunStatus()`, `ping()` implementados ✅
- `lookupRunRef` — **ausente** en `TemporalAdapter` (sólo en `MockAdapter`) ❌
- Worker real (`TemporalWorkerHost`) existe pero sin configuración de producción validada 🟡
- Tests de integración con `time-skipping` requieren `DVT_TEMPORAL_INTEGRATION=1` — no corren en CI main 🟡

### Scope del plan

#### Tarea 1 — Implementar `lookupRunRef` en `TemporalAdapter`

**Contrato requerido** (`IProviderAdapter`):

```typescript
lookupRunRef?(runId: string, tenantId: string): Promise<EngineRunRef | null>
```

**Lógica**:

1. Derivar `workflowId` desde `runId` usando `toTemporalWorkflowId(runId)` (ya existe en `WorkflowMapper.ts`).
2. Llamar `workflowClient.getHandle(workflowId).describe()` — devuelve metadata si existe, lanza `WorkflowNotFoundError` si no.
3. Si existe: construir `EngineRunRef` con `workflowId`, `runId`, namespace y taskQueue desde config.
4. Si `WorkflowNotFoundError`: retornar `null`.
5. Cualquier otro error: relanzar (no silenciar).

**Archivos a modificar**:

- `src/TemporalAdapter.ts` — añadir método `lookupRunRef`
- `src/WorkflowMapper.ts` — añadir helper `toEngineRunRefFromDescribe` si hace falta
- `test/TemporalAdapter.test.ts` — tests con `workflowClient` mock para las 3 ramas (existe, no existe, error)

#### Tarea 2 — Validar `TemporalWorkerHost` en entorno real

**Verificar**:

- `TemporalWorkerHost.start()` registra correctamente `RunPlanWorkflow` y actividades `stepActivities`
- Connection retry policy configurable (no hardcoded)
- Graceful shutdown (`worker.shutdown()`) sin pérdida de actividades en vuelo

**Archivos a modificar**:

- `src/TemporalWorkerHost.ts` — revisar y completar si hay gaps
- `src/config.ts` — verificar que todos los campos de producción tienen defaults razonables

#### Tarea 3 — Habilitar integration tests en CI (opcional Phase 1, obligatorio Phase 1.5)

- Añadir job `temporal-integration` en `.github/workflows/` con `testcontainers` o Temporal dev server
- Condicionado a `DVT_TEMPORAL_INTEGRATION=1`
- Cubrir: `startRun`, `cancelRun`, `signal(PAUSE/RESUME)`, `lookupRunRef` (existe / no existe)

### Criterios de cierre G1

- [ ] `TemporalAdapter.lookupRunRef` implementado con las 3 ramas (existe / no-existe / error)
- [ ] Tests unitarios de `lookupRunRef` pasan sin Temporal real
- [ ] `tsc --noEmit` limpio
- [ ] `RunMaintenanceService` con adapter Temporal real pasa `reconcileOrphanedIntents` en mock path
- [ ] (Phase 1.5) Integration test con Temporal dev server pasa en CI

---

## G2 — PostgresStateStore completo

**Estado**: ✅ **Cerrado 2026-03-04**

`listEvents(options?)` con cursor `afterSeq`/`limit` y `listRuns` con filtro `status` implementados.
Ver commit en `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`.

---

## G3 — IStartRunIntentStore Postgres + scheduler

**Paquete**: `packages/@dvt/engine` + `packages/@dvt/adapter-postgres`
**Bloquea**: durabilidad del intent log en producción (actualmente en-memory → se pierde en restart)
**ADRs**: ADR-0030, ADR-0003, ADR-0013

### Estado actual

- `IStartRunIntentStore` contrato completo en `src/ports/IStartRunIntentStore.ts` ✅
- `InMemoryStartRunIntentStore` implementada y testeada ✅
- `RunMaintenanceService.reconcileOrphanedIntents` usa el store (funciona con InMemory) ✅
- **Postgres implementation**: no existe ❌
- **Scheduler periódico** (llama a `reconcileOrphanedIntents` cada N segundos): no existe ❌

### Scope del plan

#### Tarea 1 — `PostgresStartRunIntentStore` en `packages/@dvt/adapter-postgres`

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

**Métodos a implementar** (implementan `IStartRunIntentStore`):

- `createIntent` — INSERT con `ON CONFLICT (intent_id) DO NOTHING`, retorna existente si ya existe
- `markDispatched` — UPDATE status PENDING→DISPATCHED + set `engine_run_ref`, valida transición
- `markResolved` — UPDATE status →RESOLVED, valida transición desde PENDING o DISPATCHED
- `markExpired` — UPDATE status PENDING→EXPIRED, valida transición
- `listOrphaned` — SELECT WHERE status IN ('PENDING','DISPATCHED') AND created_at < NOW() - thresholdMs ORDER BY created_at ASC LIMIT N
- `getIntent` — SELECT by intent_id

**Transiciones válidas** (mismas que `InMemoryStartRunIntentStore`):

- PENDING → DISPATCHED (markDispatched)
- PENDING → EXPIRED (markExpired)
- PENDING → RESOLVED (markResolved)
- DISPATCHED → RESOLVED (markResolved)

**Archivos nuevos/modificados**:

- `packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts` — nueva clase
- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts` — añadir DDL de la tabla en `ensureSchemaObjects`
- `packages/@dvt/adapter-postgres/src/index.ts` — exportar nueva clase
- `packages/@dvt/adapter-postgres/test/smoke.test.ts` — suite de integración para el intent store

#### Tarea 2 — Scheduler periódico de reconciliación

**Ubicación**: `packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts` (o similar)

**Lógica**:

```typescript
// Ejecuta reconcileOrphanedIntents cada intervalMs
// Para en shutdown graceful
class IntentReconcilerWorker {
  start(intervalMs: number): void;
  stop(): Promise<void>;
}
```

**Configuración**:

- `intervalMs` — default 30_000 (30s), configurable
- `orphanThresholdMs` — default 300_000 (5 min), configurable (ADR-0030 §4)
- `limit` — default 50 intents por sweep

**Integración**: el worker se instancia en el entry point de `apps/api` junto con el adapter Postgres.

**Archivos nuevos/modificados**:

- `packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts` — nueva clase
- `packages/@dvt/engine/src/index.ts` — exportar si es API pública

### Criterios de cierre G3

- [ ] `PostgresStartRunIntentStore` implementa todas las transiciones del contrato
- [ ] DDL migrado en `ensureSchema` (idempotente con `IF NOT EXISTS`)
- [ ] Tests unitarios pasan con mock de `pg.Pool`
- [ ] Integration test con PG real (`DVT_PG_INTEGRATION=1`)
- [ ] `IntentReconcilerWorker` arranca/para limpiamente
- [ ] `RunMaintenanceService` funciona end-to-end con `PostgresStartRunIntentStore`
- [ ] `tsc --noEmit` limpio

---

## G4 — compiledCodeRef ownership

**Packages**: `@dvt/contracts`, `@dvt/planner`, `@dvt/adapter-temporal`, `@dvt/traceability-service`
**Blocks**: complete SQL execution traceability and OpenLineage SqlJobFacet
**ADR**: [ADR-0032](../docs/adr/ADR-0032-compiledcoderef-ownership.md) — Accepted (Option A: reference in StepStarted.payload)

### Current state

- `dbt run_results.json` provides `compiled_code` per node ✅
- ADR-0032 accepted: `CompiledCodeRef { sha256, storageUri, sizeBytes }` in `StepStarted.payload` ✅
- **Implementation**: pending across 4 packages ❌

### Dependency graph

```
T4-1 (contracts) ──→ T4-2 (planner)           [parallel after T4-1]
                 ──→ T4-3 (adapter-temporal)   [parallel after T4-1]
                 ──→ T4-4 (traceability)       [parallel after T4-1]
```

T4-1 is small (~4h). Once merged (or on a shared feature branch), T4-2/T4-3/T4-4 are fully independent.

---

### T4-1 — `@dvt/contracts`: CompiledCodeRef type + golden fixtures

**Owner**: 1 developer
**Estimated size**: small (~4h)
**Blocks**: T4-2, T4-3, T4-4

**Files to change**:

- `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts` — add `CompiledCodeRef` interface
- `packages/@dvt/contracts/test/contracts/StepStarted-with-compiledCodeRef.golden.json` — new golden fixture
- `packages/@dvt/contracts/test/contracts/StepStarted-without-compiledCodeRef.golden.json` — new golden fixture

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

### T4-2 — `@dvt/planner`: ICompiledCodeStorage + SHA-256 + buildStep integration

**Owner**: 1 developer
**Estimated size**: medium (~2–3 days)
**Depends on**: T4-1 merged or available on shared branch
**New dependencies**: `@aws-sdk/client-s3` (covers both S3 and MinIO via endpoint override)

**Files to create/change**:

- `src/ports/ICompiledCodeStorage.ts` — port interface
- `src/adapters/S3CompiledCodeStorage.ts` — production (`@aws-sdk/client-s3`)
- `src/adapters/MinioCompiledCodeStorage.ts` — CI (S3-compatible, endpoint override)
- `src/adapters/FileSystemCompiledCodeStorage.ts` — local dev (`file://` URI)
- `src/adapters/InMemoryCompiledCodeStorage.ts` — unit tests
- `src/adapters/NoopCompiledCodeStorage.ts` — tests that don't verify upload
- `src/compiledCode/sha256.ts` — `computeSha256(content: Buffer): string` using `node:crypto`
- `src/compiledCode/uploadCache.ts` — per-invocation `Map<sha256, storageUri>` dedup cache
- `src/buildStep.ts` (modify) — extract `compiled_code`, compute sha256, upload, attach `compiledCodeRef` in `stepTypeConfig`
- `src/config.ts` (modify) — `file://` blocked in `NODE_ENV=production` (INV-CCREF-007)
- `test/compiledCode/*.test.ts` — unit tests (see ADR-0032 §5.5)

**Closure criteria**:

- [ ] All 5 `ICompiledCodeStorage` implementations exist
- [ ] `buildStep` attaches `compiledCodeRef` to `stepTypeConfig` when `compiled_code` is present
- [ ] `buildStep` omits field and does NOT upload when `compiled_code` is absent
- [ ] Same sha256 in single invocation triggers only 1 upload (cache test)
- [ ] `file://` rejected at startup in `NODE_ENV=production`
- [ ] All unit tests pass with `InMemoryCompiledCodeStorage`
- [ ] `tsc --noEmit` clean

---

### T4-3 — `@dvt/adapter-temporal`: activity propagates compiledCodeRef to StepStarted

**Owner**: 1 developer
**Estimated size**: small (~4–6h)
**Depends on**: T4-1 merged or available on shared branch
**New dependencies**: none

**Files to change**:

- `src/activities/stepActivities.ts` — read `compiledCodeRef` from `step.stepTypeConfig`, propagate to `StepStarted.payload`
- `src/compiledCode/typeGuard.ts` (new) — `extractCompiledCodeRef(stepTypeConfig): CompiledCodeRef | undefined`
- `test/stepActivities.compiledCodeRef.test.ts` (new) — type guard unit tests (4 cases: valid / absent / malformed sha256 / malformed sizeBytes)

**Key implementation** (type guard — no throw, fail-open):

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
- [ ] `StepStarted.payload.compiledCodeRef` absent when `stepTypeConfig` field is missing or malformed — no throw
- [ ] 4 type guard unit tests pass
- [ ] `tsc --noEmit` clean

---

### T4-4 — `@dvt/traceability-service`: ICompiledCodeReader + LRU + SqlJobFacet

**Owner**: 1 developer
**Estimated size**: medium (~2–3 days)
**Depends on**: T4-1 merged or available on shared branch
**New dependencies**: `lru-cache`, `p-retry`, `@aws-sdk/client-s3`

**Files to create/change**:

- `src/ports/ICompiledCodeReader.ts` — port interface `get(storageUri): Promise<string | null>`
- `src/adapters/S3CompiledCodeReader.ts` — production/CI (`@aws-sdk/client-s3`)
- `src/adapters/InMemoryCompiledCodeReader.ts` — unit tests (shared `Map` with `InMemoryCompiledCodeStorage`)
- `src/cache/CompiledCodeCache.ts` — LRU cache wrapping `ICompiledCodeReader`
  - `lru-cache`, TTL=`COMPILED_CODE_CACHE_TTL_MS` (default 86400000), max=`COMPILED_CODE_CACHE_MAX_ENTRIES` (default 512)
  - retry via `p-retry` (3 attempts, factor 4: 100ms→400ms→1600ms)
- `src/facets/SqlJobFacet.ts` (new) — `buildSqlJobFacet(ref, cache): Promise<SqlJobFacet | undefined>`
- `src/service.ts` (modify) — consume `SqlJobFacet` when mapping `StepStarted → OL RunEvent`
- `test/sqlJobFacet.test.ts` — unit tests (present+resolves / absent / resolves-null / cache-hit)
- `test/integration/compiledCodeRef.integration.test.ts` — MinIO integration tests (3 scenarios from ADR §5.5)
- `infra/docker/docker-compose.test.yml` (new or modify) — MinIO service for integration tests

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

## G5 — Outbox Worker independiente

**Paquete**: `apps/api` o nuevo `apps/outbox-worker`
**Bloquea**: entrega at-least-once a Kafka/EventBus en producción
**ADRs**: ADR-0004, ADR-0009

### Estado actual

- Outbox pattern implementado en `PostgresStateStoreAdapter`: `listPending`, `markDelivered`, `markFailed`, DLQ ✅
- No existe worker de polling que llame a esos métodos y publique a Kafka ❌

### Scope del plan

#### Tarea 1 — `OutboxPollingWorker`

```typescript
class OutboxPollingWorker {
  constructor(store: IOutboxStorage, publisher: IEventPublisher, opts: OutboxWorkerOptions);
  start(): void; // arranca polling loop
  stop(): Promise<void>; // graceful shutdown
}
```

**Loop**:

1. `store.listPending(batchSize)` — por defecto 100
2. Para cada record: `publisher.publish(record.payload)`
3. Si OK: `store.markDelivered([id])`
4. Si falla: `store.markFailed(id, error.message)` → backoff exponencial gestionado por el adapter
5. Sleep `pollIntervalMs` (default 100ms)

**Garantías**:

- Exactly-once delivery al publisher NO es responsabilidad del worker (at-least-once es suficiente)
- Consumers deben deduplicar por `idempotencyKey` (contrato existente)

#### Tarea 2 — `IEventPublisher` port

```typescript
interface IEventPublisher {
  publish(event: EventEnvelope): Promise<void>;
}
```

Implementaciones:

- `KafkaEventPublisher` — usa `kafkajs` (Phase 1.5)
- `NoopEventPublisher` — para tests (inmediato)
- `InMemoryEventPublisher` — buffer en-memoria para smoke tests

**Archivos nuevos/modificados**:

- `packages/@dvt/engine/src/ports/IEventPublisher.ts`
- `packages/@dvt/engine/src/workers/OutboxPollingWorker.ts`
- `apps/api/src/workers/` — instanciación en startup

### Criterios de cierre G5

- [ ] `OutboxPollingWorker` arranca/para limpiamente
- [ ] Tests unitarios con `InMemoryEventPublisher` + `InMemoryTxStore`
- [ ] Integration test con PG real: eventos pasan de `outbox` → `markDelivered`
- [ ] `KafkaEventPublisher` básico operativo (Phase 1.5)

---

## G6 — OL translation tests CI + `_schemaURL` pin

**Paquete**: `packages/@dvt/traceability-service`
**ADRs**: ADR-0020, ADR-0021

### Estado actual

- `@dvt/traceability-service` — estructura `adapters/`, `core/`, `service.ts` existe 🟡
- RunEvents → OL mapping documentado en ADR-0020/0021 ✅
- Implementación TypeScript del mapping: ❌
- Tests CI para el mapping: ❌
- `_schemaURL` de OL spec fijado en código: ❌

### Scope del plan

#### Tarea 1 — Implementar mapping `RunEvents → OL`

Mapeo canónico:

- `RunStarted` → OL `START` job facet
- `RunCompleted`/`RunFailed` → OL `COMPLETE`/`FAIL` job facet
- `StepStarted`/`StepCompleted`/`StepFailed` → OL `RUN` dataset facets con `compiledCodeRef`

Pin de versión: `_schemaURL: "https://openlineage.io/spec/2-0-2/OpenLineage.json#/definitions/RunEvent"`

#### Tarea 2 — Tests CI del mapping

Golden fixtures: input (RunEvent) → output (OL event JSON) versionados y validados en CI.

### Criterios de cierre G6

- [ ] Mapping RunEvents→OL implementado para los 6 event types principales
- [ ] `_schemaURL` hardcoded como constante con comentario de versión OL
- [ ] Golden fixtures en `test/contracts/ol-mapping/`
- [ ] CI valida fixtures en cada PR

---

## G7 — Read Models + proyector standalone

**Paquete**: `packages/@dvt/state-store` + infra
**Bloquea**: `listRuns` con status en tiempo real sin full scan, UI dashboard

### Estado actual

- `getSnapshot` implementado (O(1) con tabla `run_snapshots`) ✅
- `listRuns` con filtro `status` implementado (G2, INNER JOIN `run_snapshots`) ✅
- No hay proyector standalone que reconstruya snapshots a partir de eventos ❌
- No hay índice denormalizado para queries complejas de dashboard (tenant + status + date range) ❌

### Scope del plan

#### Tarea 1 — `SnapshotRebuildService`

```typescript
class SnapshotRebuildService {
  // Reconstruye snapshot para un run específico desde sus eventos
  rebuildOne(tenantId: string, runId: string): Promise<WorkflowSnapshot>;
  // Reconstruye todos los snapshots nulos (recovery batch)
  rebuildMissing(tenantId: string, batchSize?: number): Promise<number>;
}
```

#### Tarea 2 — Índice adicional para `run_snapshots`

```sql
CREATE INDEX IF NOT EXISTS snapshots_status_updated_idx
  ON {schema}.run_snapshots ((snapshot->>'status'), updated_at DESC);
```

Permite `listRuns(status=X)` con index-only scan sin full table scan.

### Criterios de cierre G7

- [ ] `SnapshotRebuildService` implementado con tests
- [ ] Índice de status en `run_snapshots` añadido en `ensureIndexes`
- [ ] `listRuns(status)` usa el índice (EXPLAIN ANALYZE verificado)

---

## G8 — Auth real en `apps/api`

**Paquete**: `apps/api`
**ADRs**: IAuthorization.v1.md, THREAT_MODEL.md

### Estado actual

- Fastify + routes implementado 🟡
- Sin autenticación real (todos los endpoints son open) ❌
- `IAuthorization` contrato diseñado ✅

### Scope del plan

#### Tarea 1 — JWT middleware en Fastify

- Verificación JWT con clave pública configurable (RS256 o ES256)
- Extracción de `tenantId` del claim `sub` o `tenant_id`
- Rechazo 401 si token inválido/expirado

#### Tarea 2 — RBAC stub

- 5 roles definidos en `IAuthorization.v1.md`: `ADMIN`, `OPERATOR`, `VIEWER`, `RUNNER`, `AUDITOR`
- Middleware que mapea roles del token a permisos por endpoint
- Stub inicial: `ADMIN` tiene todos los permisos

### Criterios de cierre G8

- [ ] JWT verificado en todos los endpoints de `/runs`
- [ ] `tenantId` extraído del token y propagado al adapter (no override desde request body)
- [ ] Test de integración: token inválido → 401, token válido → 200

---

## G9 — StepTypeRegistry + tipado `stepTypeConfig`

**Paquete**: `packages/@dvt/planner` + `packages/@dvt/engine`

### Estado actual

- `stepTypeConfig` en el plan es `Record<string, unknown>` — completamente opaco ❌
- No hay validación de tipo de step en runtime ❌

### Scope del plan

#### Tarea 1 — Definir `StepTypeRegistry`

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

#### Tarea 2 — Integrar en `@dvt/planner`

- Validar `stepTypeConfig` contra el registry al construir el plan
- Rechazar planes con `stepType` desconocido o config inválida

### Criterios de cierre G9

- [ ] Registry con 4 tipos base implementado
- [ ] Planner rechaza `stepType` desconocido con error descriptivo
- [ ] Zod schemas para `dbt_model` y `dbt_test` con campos mínimos obligatorios

---

## G10 — `outbox_lineage` Worker + fail-open DLQ

**Paquete**: `packages/@dvt/traceability-service`
**ADRs**: ADR-0020, ADR-0021

### Estado actual

- `outbox_lineage` tabla separada del outbox de dominio ✅ (separación correcta de concerns)
- Worker que lee `outbox_lineage` y publica a Marquez: no existe ❌
- Fail-open policy (si Marquez no responde, no bloquear el run): no definida ❌

### Scope del plan

#### Tarea 1 — `OutboxLineageWorker`

Mismo patrón que `OutboxPollingWorker` (G5) pero sobre `outbox_lineage`:

1. `listPendingLineage(batchSize)`
2. Transformar RunEvent → OL event (mapping G6)
3. `POST /api/v1/lineage` a Marquez
4. `markLineageDelivered(id)` si OK
5. **Fail-open**: si Marquez responde 4xx/5xx o timeout → `markLineageFailed(id)` pero no bloquear el run

#### Tarea 2 — DLQ para lineage

- Misma estructura que `outbox_dead_letter` pero para `outbox_lineage`
- Política: después de `MAX_LINEAGE_ATTEMPTS` (default: 5), mueve a dead letter
- Operadores pueden reintentar manualmente (mismo patrón que `replayDeadLetters`)

### Criterios de cierre G10

- [ ] `OutboxLineageWorker` implementado con fail-open
- [ ] DLQ de lineage operativo
- [ ] Tests unitarios con Marquez client mock
- [ ] Documentado en `docs/architecture/engine/ops/observability.md`

---

## Orden de ejecución recomendado

```
Phase 1 (actual):
  G3 → G1 → G4 (decisión)

Phase 1.5:
  G5 → G7 → G8 → G6

Phase 2:
  G9 → G10
```

**Rationale G3 antes de G1**: el IntentStore Postgres es el prerrequisito de durabilidad que hace que el adapter Temporal real sea seguro en producción. Sin G3, un restart del proceso pierde todos los intents pendientes aunque el Temporal workflow esté corriendo.

---

_Generado: 2026-03-04 — referencia: `docs/architecture/system-delivery-status.md` v1.1.0_
