# Roadmap de Implementación — Basado en Revisión Arquitectónica

**Fecha**: 2026-02-21
**Fuente**: Revisión arquitectónica profunda contra ADR-0003 a ADR-0016, contratos normativos v2.0.x, e implementación actual de `WorkflowEngine.ts` / `IProviderAdapter.ts`

Este documento **complementa** `ROADMAP.md`. No reemplaza las fases existentes; las extiende con tareas concretas derivadas de las discrepancias encontradas entre código, ADRs y contratos normativos.

Criterio de priorización:

- **WAVE 0** — Bugs activos. Código incorrecto hoy. Bloquean correctness garantizada antes de cualquier merge a producción.
- **WAVE 1** — Reconciliación de contratos. Documentos contradictorios que generarán implementaciones incorrectas si no se resuelven.
- **WAVE 2** — Critical path abierto. Issues existentes bloqueados o con dependencias no resueltas.
- **WAVE 3** — Fundamentos operacionales. Sin esto, la fase 1.5 falla.
- **WAVE 4** — Hardening (alineado con Phase 1.5 del ROADMAP.md existente).
- **WAVE 5** — Expansión de plataforma (alineado con Phase 2+).

---

## WAVE 0 — Bugs Activos (Bloquean correctness)

> Estas tareas describen código que produce comportamiento incorrecto **hoy**.
> Ningún merge a main que dependa de `WorkflowEngine` debe quedar abierto mientras estas tareas existan.

---

### W0-1 — Eliminar `IPlanFetcher` del `WorkflowEngine`

**Problema**: `WorkflowEngine.startRun` llama `this.deps.planFetcher.fetch(validatedPlanRef)` en la línea 146.
ADR-0012 §4 dice: _"Engine MUST NOT fetch plan bytes."_
El ADR fue escrito para corregir exactamente esto. No fue implementado.

**Tarea**:

- Eliminar `IPlanFetcher` de `WorkflowEngineDeps`.
- Eliminar la llamada `planFetcher.fetch()` de `startRun`.
- El engine pasa `planRef` (no `plan`) al adapter directamente.
- Eliminar el import y la dependencia de `IPlanFetcher` en `WorkflowEngine.ts`.

**Criterio de aceptación**:

- `WorkflowEngine` no importa ni instancia `IPlanFetcher`.
- `startRun` pasa `validatedPlanRef` al adapter, no un `ExecutionPlan` resuelto.
- Tests de unidad de `WorkflowEngine` no mockean `planFetcher`.
- `tsc --noEmit` pasa.

**Archivos afectados**:

- [WorkflowEngine.ts](../../packages/@dvt/engine/src/core/WorkflowEngine.ts)
- [IPlanFetcher.ts](../../packages/@dvt/engine/src/adapters/IPlanFetcher.ts) — candidato a eliminación

**Dependencia**: W0-2 debe completarse simultáneamente (cambio de firma del adapter).

---

### W0-2 — Cambiar firma de `IProviderAdapter.startRun`: `ExecutionPlan` → `PlanRef`

**Problema**: `IProviderAdapter.startRun(plan: ExecutionPlan, ...)` recibe el plan ya resuelto.
Tres documentos contradicen esto:

- `IWorkflowEngine.v2.0.md` §2: _"startRun MUST accept PlanRef"_
- ADR-0014: _"adapter.startRun(planRef, context)"_
- ADR-0012 §4: _"Adapters MUST: 1. Fetch bytes from PlanRef.uri; 2. Verify sha256"_

**Tarea**:

- Cambiar `IProviderAdapter.startRun(plan: ExecutionPlan, ctx)` a `startRun(planRef: PlanRef, ctx)`.
- Actualizar `MockAdapter`, `TemporalAdapterStub`, `ConductorAdapterStub` con la nueva firma.
- El adapter (no el engine) es responsable de fetch + verificación de integridad.

**Criterio de aceptación**:

- `IProviderAdapter.startRun` recibe `PlanRef`, no `ExecutionPlan`.
- `WorkflowEngine` pasa `validatedPlanRef` al adapter.
- `MockAdapter` implementa fetch interno (puede ser in-memory/noop para tests).
- Todos los stubs compilados y con tipo correcto.

**Archivos afectados**:

- [IProviderAdapter.ts](../../packages/@dvt/engine/src/adapters/IProviderAdapter.ts)
- [MockAdapter.ts](../../packages/@dvt/engine/src/adapters/mock/MockAdapter.ts)
- [TemporalAdapterStub.ts](../../packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts)
- [ConductorAdapterStub.ts](../../packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts)

**Dependencia**: W0-1 (simultáneos), W0-3 (el verifier es el que se inyecta en el adapter).

---

### W0-3 — Crear `@dvt/plan-verifier`

**Problema**: ADR-0012 §6 manda: _"All adapters MUST use `@dvt/plan-verifier`."_ No existe.
Sin él, cada adapter implementará su propia verificación SHA-256 y se desalinearán.

**Tarea**: Crear `packages/@dvt/plan-verifier/` con:

```
src/
  verifyPlanIntegrity.ts   — fetch bytes, sha256(bytes) === PlanRef.sha256, lanza PlanErrorCode
  parsePlan.ts             — parse + validación de schema (zod)
  verifyPlanIdentity.ts    — planId/version/tenantId match
  errors.ts                — enum PlanErrorCode (HASH_MISMATCH | SCHEMA_INVALID | IDENTITY_MISMATCH | FETCH_FAILED)
  index.ts
```

**Criterio de aceptación**:

- `verifyPlanIntegrity(planRef, fetchFn)` retorna `ExecutionPlan` o lanza `PlanVerificationError` con `PlanErrorCode`.
- Hash se computa sobre bytes crudos, no sobre JSON re-serializado.
- `MockAdapter` y `TemporalAdapterStub` usan el paquete.
- Tests de contrato: hash mismatch → `HASH_MISMATCH`; schema inválido → `SCHEMA_INVALID`; id mismatch → `IDENTITY_MISMATCH`.

---

### W0-4 — Eliminar la ventana entre `bootstrapRunTx` y `saveProviderRef`

**Problema**: En `startRun` hay una escritura en dos fases:

1. `bootstrapRunTx(...)` — persiste con `providerWorkflowId: ''` y `providerRunId: ''`
2. `adapter.startRun(...)` — retorna el `EngineRunRef`
3. `saveProviderRef(...)` — segunda escritura que rellena los IDs

Si el proceso muere después del paso 2, el run está activo en el provider pero el state store tiene IDs vacíos. `cancelRun` y `getRunStatus` no pueden alcanzar al provider.

**Tarea**:

- `bootstrapRunTx` debe incluir `providerWorkflowId` y `providerRunId` en la metadata inicial.
- Esto requiere que `adapter.startRun` se llame **antes** de `bootstrapRunTx`, o bien que el adapter retorne el ref como parte de una confirmación atómica.
- Opción recomendada: llamar `adapter.startRun` primero → obtener `runRef` → llamar `bootstrapRunTx` con el ref incluido. Si `bootstrapRunTx` falla, llamar `adapter.cancelRun` como compensación.
- Eliminar `saveProviderRef` del `IRunStateStore`.

**Criterio de aceptación**:

- No existe llamada a `saveProviderRef` en `WorkflowEngine.startRun`.
- `RunMetadata` tras `bootstrapRunTx` siempre tiene `providerWorkflowId` y `providerRunId` no vacíos.
- Test: simular fallo de `bootstrapRunTx` después de `adapter.startRun` → verificar que se emite cancelación compensatoria.
- `buildRunMetadata` no inicializa strings vacíos para campos de provider.

**Archivos afectados**:

- [WorkflowEngine.ts](../../packages/@dvt/engine/src/core/WorkflowEngine.ts) — `startRun`, `saveProviderRef`, `buildRunMetadata`
- [IRunStateStore.ts](../../packages/@dvt/engine/src/state/IRunStateStore.ts) — eliminar `saveProviderRef`

---

### W0-5 — Corregir idempotency key de señales (`signalKey`)

**Problema**: `IdempotencyKeyBuilder.signalKey` produce:

```typescript
['sig', tenantId, runId, req.signalId].join('|');
```

- No es SHA-256. Formato incompatible con los lifecycle events.
- Incluye `tenantId`, que el contrato normativo prohíbe en la derivación.
- No está definido en ningún contrato normativo.

**Tarea**:

- Definir la fórmula de idempotencia para señales en `RunEvents.v2.0.md` o en `SignalsAndAuth v1.1` (documentar la dependencia).
- Fórmula propuesta: `SHA256(runId | 'SIGNAL' | signalType | signalId | logicalAttemptId | planId | planVersion)`.
- Actualizar `signalKey()` en `IdempotencyKeyBuilder` para seguir la fórmula.
- Agregar golden test vectors para señales.

**Criterio de aceptación**:

- `signalKey()` retorna un SHA-256 hex string.
- La fórmula está documentada en el contrato normativo correspondiente.
- Golden vectors incluidos en el contrato.
- Tests de contrato validan la derivación.

**Archivos afectados**:

- [idempotency.ts](../../packages/@dvt/engine/src/core/idempotency.ts)
- `docs/architecture/engine/contracts/engine/RunEvents.v2.0.md` o nuevo contrato de señales

---

### W0-6 — Separar enriquecimiento del provider de `getRunStatus` (ADR-0015)

**Problema**: `WorkflowEngine.getRunStatus` llama `adapter.getRunStatus()` síncronamente con timeout de 30s.
ADR-0015: _"The default read path MUST NOT call the provider."_
En una instalación multi-réplica, el circuit breaker in-process no protege nada.

**Tarea**:

- En `WorkflowEngine.getRunStatus`: eliminar el bloque `if (adapter) { const providerView = await ... }` del path principal.
- Crear método separado `enrichRunStatus(engineRunRef)` que llama al provider y puede fallar sin afectar el estado autoritativo.
- Eliminar `circuitStateByProvider` del `WorkflowEngine` (el circuit breaker in-process es inútil en multi-réplica; si hay un circuit breaker real, debe vivir en infraestructura externa).

**Criterio de aceptación**:

- `getRunStatus` retorna el estado proyectado del event log solamente.
- Latencia de `getRunStatus` no depende de la disponibilidad del provider.
- `enrichRunStatus` existe como método separado (o endpoint separado en la API).
- `circuitStateByProvider` eliminado o movido a `enrichRunStatus`.
- Tests de unidad: `getRunStatus` no mockea `adapter.getRunStatus`.

**Archivos afectados**:

- [WorkflowEngine.ts](../../packages/@dvt/engine/src/core/WorkflowEngine.ts) — `getRunStatus`, `withCircuitBreaker`

---

### W0-7 — Snapshot write-through en `appendAndEnqueueTx`

**Problema**: `getRunStatus` usa un snapshot almacenado, pero no existe ningún mecanismo que actualice el snapshot después de cada append.
Flujo actual:

1. Evento se append → snapshot **no se actualiza**
2. `getRunStatus` → lee snapshot stale → llama `listEvents` (full replay O(n)) si no hay snapshot

**Tarea**:

- Tras cada `appendAndEnqueueTx` exitoso, `applyRunEvent` debe aplicarse al snapshot actual y upsertarlo.
- Esto puede hacerse en la capa del `IRunStateStore` (el store actualiza snapshot como parte de la transacción) o en el caller.
- La función `applyRunEvent` ya es pura y exportada — úsala directamente en la lógica de append.
- Agregar `upsertSnapshot(snapshot: WorkflowSnapshot): Promise<void>` a `IRunStateStore` si no existe.

**Criterio de aceptación**:

- Después de cada append, el snapshot del run refleja el nuevo estado.
- `getRunStatus` nunca llama `listEvents` para runs activos (solo para runs pre-snapshot que son legacy).
- Test: append 10 eventos → `getSnapshot` retorna snapshot con todos los estados aplicados sin full replay.

---

## WAVE 1 — Reconciliación de Contratos

> Documentos contradictorios que generarán bugs silenciosos en nuevas implementaciones si no se resuelven ahora.

---

### W1-1 — Deprecar sección de idempotencia de ADR-0010

**Problema**: ADR-0010 §4 incluye `payload` en la derivación del idempotencyKey (referencia RFC 8785).
`RunEvents.v2.0.1` §3.1 excluye payload explícitamente y define exactamente 6 campos.
La implementación sigue v2.0.1 (correcto), pero ADR-0010 sigue siendo el documento "Approved".

**Tarea**:

- Agregar una nota en ADR-0010 §4:
  _"SUPERSEDED BY RunEvents.v2.0.1 §3.1. La fórmula definitiva excluye payload. Este ADR no debe usarse como referencia para derivación de idempotencyKey."_
- Actualizar el status de ADR-0010 a `Accepted (partial — §4 superseded)`.
- Agregar referencia cruzada en `RunEvents.v2.0.1` apuntando a la obsolescencia de ADR-0010 §4.

**Criterio de aceptación**:

- ADR-0010 anotado. Ningún implementador puede leer §4 sin ver la advertencia de superseded.
- La sección de idempotencia de ADR-0010 tiene un bloqueo visual claro (`> ⚠️ SUPERSEDED`).

---

### W1-2 — Actualizar `IRunStateStore.v2.0.md` para reflejar la implementación real

**Problema**: El contrato normativo v2.0.0 define:

```typescript
interface IRunStateStore {
  appendEvent(event: RunEventWrite): Promise<AppendResult>;
  fetchEvents(runId, options?): Promise<RunEventRecord[]>;
  getSnapshot(runId): Promise<RunSnapshot | null>;
  projectSnapshot(runId): Promise<RunSnapshot>;
}
```

La implementación real tiene: `bootstrapRunTx`, `appendAndEnqueueTx`, `getRunMetadataByRunId`, `saveProviderRef`, `listEvents`, `listRuns`, `getSnapshot`.
Son interfaces completamente distintas. El contrato normativo está desactualizado.

**Tarea**:

- Actualizar `IRunStateStore.v2.0.md` a `v2.1.0` (minor bump — backwards incompatible additions).
- Incorporar: `bootstrapRunTx`, `appendAndEnqueueTx`, la semántica del outbox, `RunMetadata`, y eliminar `projectSnapshot` (la proyección no debe ser responsabilidad del store).
- Actualizar el changelog del contrato con la razón del cambio.

---

### W1-3 — Definir ownership de `RunCancelled` (nuevo ADR o enmienda a ADR-0011)

**Problema**: ADR-0011 define que el adapter emite `RunStarted`. No existe decisión equivalente para `RunCancelled`.
`WorkflowEngine.cancelRun` emite `RunCancelled` directamente después de que `adapter.cancelRun()` retorna.
Para Temporal y Conductor, `cancelRun` envía una señal de cancelación — el workflow no se ha cancelado aún cuando la llamada retorna.

**Tarea**:

- Decidir y documentar: ¿quién emite `RunCancelled`?
  - **Opción A**: El adapter emite `RunCancelled` desde dentro del contexto de ejecución del workflow (cuando el workflow procesa la cancelación). El engine no emite `RunCancelled`.
  - **Opción B**: El engine emite `RunCancelled` como evento de intención ("se solicitó cancelación"). El adapter emite un evento separado cuando la cancelación efectiva ocurre (nuevo event type `RunTerminated`).
- Escribir ADR-0017 con la decisión.
- Actualizar `WorkflowEngine.cancelRun` para reflejar la decisión.

**Criterio de aceptación**:

- ADR-0017 aprobado y referenciado desde ADR-0011.
- `WorkflowEngine.cancelRun` implementa la decisión sin ambigüedad.
- Projector maneja la transición de estado de forma consistente con la decisión.

---

### W1-4 — Definir fórmula normativa para señales en contrato (SignalsAndAuth v1.1)

**Problema**: `RunEvents.v2.0.md` §1.1 excluye señales del scope y los refiere a "SignalsAndAuth v1.1 (pending publication)".
Ese documento no existe. La implementación usa una fórmula ad-hoc no contractual.

**Tarea**:

- Publicar `SignalsAndAuth.v1.1.md` en `docs/architecture/engine/contracts/engine/`.
- Incluir: event types de señales (`SignalAccepted`, `SignalRejected`), idempotency key formula, envelope fields requeridos.
- Actualizar referencias en `RunEvents.v2.0.md` y `IWorkflowEngine.v2.0.md`.

---

### W1-5 — Avanzar ADRs Proposed/Pending a Accepted tras verificar implementación

Según `ADR_Status_Board_Extensive.md`, varios ADRs están en estado Proposed/Pending con código parcialmente implementado.

| ADR                             | Estado actual | Acción                                                                                             |
| ------------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| ADR-0013 (`bootstrapRunTx`)     | Proposed      | `bootstrapRunTx` existe en código. Verificar criterios del status board → marcar Accepted.         |
| ADR-0011 (RunStarted ownership) | Approved      | Verificar que implementación de Temporal emite RunStarted desde workflow. Si sí → marcar Accepted. |
| ADR-0012 (plan integrity)       | Pending       | No implementado. Permanece Pending hasta W0-1/W0-2/W0-3 completados.                               |
| ADR-0014 (run-driven model)     | Proposed      | Implementado parcialmente (IProviderAdapter acepta plan, no planRef). Se cierra junto con W0-2.    |
| ADR-0015 (getRunStatus)         | Proposed      | Se cierra junto con W0-6.                                                                          |
| ADR-0016 (logicalAttemptId)     | Proposed      | Se cierra junto con W3-2.                                                                          |

**Criterio**: Un ADR no puede marcarse Accepted sin: código conforme + test que prueba el invariante + CI verde.

---

## WAVE 2 — Critical Path Abierto (Issues existentes)

> Issues del ROADMAP.md existente. Los listamos con sus dependencias reales tras el análisis.

---

### W2-1 — PostgresStateStore MVP (`#6`)

**Bloqueado por**: W0-4 (la interfaz de `IRunStateStore` cambia al eliminar `saveProviderRef`), W1-2 (contrato actualizado).

**Requisitos adicionales del análisis**:

- DDL debe incluir particionamiento por `tenant_id` + rango de tiempo en `run_events`. Sin particionamiento, los queries de `listEvents` se degradan a O(total events) a escala.
- Índice único en `(run_id, idempotency_key)` — obligatorio por contrato.
- Índice único en `(run_id, run_seq)` — obligatorio por contrato.
- `bootstrapRunTx` debe ser una única transacción `BEGIN; INSERT run_metadata; INSERT run_events; INSERT outbox; COMMIT;`.
- `appendAndEnqueueTx` debe incluir upsert de snapshot (W0-7).
- `run_seq` debe generarse con `SELECT nextval('run_seq_seq_for_' || run_id)` o equivalent para evitar contention — no `MAX(run_seq) + 1`.

**Criterio de aceptación** (adicional al existente en #6):

- `EXPLAIN ANALYZE` en `listEvents(runId)` para 10K eventos muestra Index Scan, no Seq Scan.
- `bootstrapRunTx` con `run_id` duplicado retorna `RUN_ALREADY_EXISTS`, no error de Postgres sin manejar.
- Partición por tiempo definida en la migración inicial.

---

### W2-2 — TemporalAdapter full implementation (`#68`)

**Bloqueado por**: W0-2 (firma `startRun(planRef)`), W0-3 (`@dvt/plan-verifier`), W0-4 (no más `saveProviderRef`).

**Requisitos adicionales del análisis**:

- `RunStarted` DEBE emitirse como **primera operación dentro del workflow function body**, antes de scheduling de activities (ADR-0011).
- `logicalAttemptId` DEBE almacenarse en el workflow state (no derivarse de DB). Esto requiere que el workflow tenga una variable `logicalAttemptId` que se pasa como input a cada activity.
- UUID v4 dentro del workflow code DEBE usar `workflow.uuid4()` de Temporal TypeScript SDK, no `randomUUID` de Node.js (no determinista en workflow context).
- `signal(RETRY_STEP/RETRY_RUN)` puede quedar como `SignalNotImplementedError` en Phase 1 pero debe estar documentado explícitamente en el adapter.
- El adapter DEBE usar `@dvt/plan-verifier` para fetch + SHA-256 + schema + identity.

---

### W2-3 — Temporal Interpreter Workflow (`#15`)

**Requisitos adicionales del análisis**:

- La resolución de `dependsOn` en el plan (qué steps ejecutar en paralelo, cuáles deben esperar) es responsabilidad del Interpreter. El plan define el DAG; el Interpreter lo camina.
- Step execution en paralelo: usar `workflow.executeActivity` con `Promise.all` para steps sin dependencias entre sí.
- Error en un step: emitir `StepFailed` → según `RetryBackoffPolicy` en el plan, decidir si reintentar (incrementar `logicalAttemptId`) o terminar con `RunFailed`.
- La política de retry del plan (`RetryBackoffPolicy`) no existe aún — para Phase 1, usar retry policy fija (hardcoded 3 intentos, backoff exponencial).

---

### W2-4 — Snapshot write-through en PostgresStateStore (`#6` sub-task)

Ver W0-7. Debe hacerse como parte de la implementación del PostgresStateStore, no como add-on posterior.
`appendAndEnqueueTx` en Postgres debe:

1. INSERT evento en `run_events`
2. INSERT en `outbox`
3. UPSERT snapshot en `run_snapshots`
4. COMMIT

Los cuatro en una sola transacción.

---

## WAVE 3 — Fundamentos Operacionales

> Sin estas tareas, la Phase 1.5 (hardening) no puede validarse correctamente.

---

### W3-1 — Stuck-run detection: SLA de `RunQueued → RunStarted`

**Problema**: Un run puede quedarse en `RunQueued` indefinidamente si el Temporal worker está caído. No hay timeout ni alerta definida.

**Tarea**:

- Definir SLA máximo para `RunQueued → RunStarted` (sugerencia: 5 minutos configurable por tenant).
- Implementar un proceso background (job/cron) que detecte runs en `RunQueued` más de N minutos y emita `RunFailed` con `payload.reason = 'QUEUED_TIMEOUT'`.
- Agregar alert en Grafana/Prometheus: `runs_stuck_in_queued_gt_threshold`.
- Documentar el SLA en un nuevo documento `SLADefinitions.v1.md`.

**Criterio de aceptación**:

- Test de integración: run en `RunQueued` > threshold → `RunFailed` emitido automáticamente.
- Métrica `dvt.run.queued_timeout_total` existe y es incrementada.

---

### W3-2 — Implementar `logicalAttemptId` tracking en Temporal workflow state (ADR-0016 completo)

**Problema actual**: `buildRunEvent` hardcodea `logicalAttemptId: 1` en todos los eventos emitidos por el engine. Para los eventos emitidos por el Temporal adapter (StepStarted, StepFailed, etc.) el logicalAttemptId debe rastrearse en el workflow state.

**Tarea**:

- En el Temporal Interpreter Workflow: mantener variable `logicalAttemptId: number` en el workflow state, inicializado en `1`.
- Pasar `logicalAttemptId` como parámetro de entrada a cada activity que emita eventos.
- Cuando se reciba un signal `RETRY_STEP` o `RETRY_RUN`: incrementar `logicalAttemptId` en el workflow state antes de re-ejecutar.
- El engine nunca lee `logicalAttemptId` de la DB para emitirlo — siempre viene del workflow state.

**Criterio de aceptación**:

- Un run con 2 retries de un step tiene eventos con `logicalAttemptId` 1, 2, 3 respectivamente.
- El idempotencyKey del step en intento 2 es diferente al del intento 1 (derivación es por `logicalAttemptId`).
- El Temporal workflow replay reproduce el mismo `logicalAttemptId` sin tocar la DB.
- ADR-0016 marcado Accepted tras verificación.

---

### W3-3 — Paginación en `listEvents` y `listRuns`

**Problema**: `IRunStateStore.listEvents(runId)` retorna todos los eventos sin límite. Para un run de 1000 nodos dbt, son 2000+ rows en una sola query.

**Tarea**:

- Agregar parámetros `{ afterSeq?: number; limit?: number }` a `listEvents` en `IRunStateStore`.
- Agregar `{ cursor?: string; limit?: number }` a `listRuns` (cursor-based pagination).
- Actualizar `IRunStateStore.v2.1.md` con las firmas.
- `WorkflowEngine.getRunStatus` debe usar paginación cuando hace full replay.
- Definir límite máximo por default: `limit = 500` para listEvents, `limit = 50` para listRuns.

---

### W3-4 — Política de retención de eventos

**Problema**: El event log es append-only sin archival. Crecerá sin límite.

**Tarea**:

- Definir y documentar en `RetentionPolicy.v1.md`:
  - Hot tier (Postgres): 90 días para runs completados/fallidos; runs activos sin expiración.
  - Cold tier (S3/GCS): 7 años (requerimiento SOC2 referenciado en AuditLog.v1.md).
  - Archival trigger: runs terminados (COMPLETED/FAILED/CANCELLED) con `persistedAt` > 90 días.
- Implementar job de archival que serializa eventos a NDJSON, los sube a object storage, y borra de Postgres.
- Agregar `archived_at` a `run_metadata` para saber si un run fue archivado.
- `listEvents` debe indicar si los eventos fueron archivados y el URI del archivo.

---

### W3-5 — Estrategia de migración de eventos v1 → v2

**Problema**: Los contratos cambiaron de v1 a v2 (se agregó `planId`/`planVersion` al idempotencyKey, se removió `occurredAt`, se separaron `emittedAt`/`persistedAt`). No hay una guía de qué hacer con eventos v1 en el log.

**Tarea**:

- Documentar en `ContractMigrationGuide.v1-v2.md`:
  - Qué campos cambiaron y cómo normalizarlos.
  - Ventana de compatibilidad (sugerencia: 30 días post-cutover, projectors aceptan ambos formatos).
  - Qué hacer con eventos v1 que no tienen `planId`/`planVersion` — definir valor de relleno (`"legacy"` / `"0"`).
  - Procedimiento de rollback si se detectan eventos v1 en producción tras cutover.
- Implementar normalización en el projector para campos faltantes con fallback documentado.

---

### W3-6 — Aislamiento de tenants a nivel de base de datos

**Problema actual**: El aislamiento de tenants es solo via `IAuthorizer.assertTenantAccess()`. Si una query no filtra por `tenantId`, los datos de diferentes tenants pueden mezclarse.

**Tarea**:

- Todas las queries en PostgresStateStore deben incluir `WHERE tenant_id = $1` como primer filtro, sin excepción.
- Agregar índices que incluyan `tenant_id` como primera columna para queries frecuentes.
- Implementar test de aislamiento: tenant A no puede ver eventos de tenant B aunque conozca el `runId`.
- Opcionalmente: Row Level Security (RLS) en Postgres como capa de defensa adicional.

---

### W3-7 — Definir y documentar el modelo de concurrencia para `startRun`

**Problema**: `ensureRunDoesNotExist` + `bootstrapRunTx` tienen una ventana de race condition entre el check y la inserción. La guarda de `RUN_ALREADY_EXISTS` de la DB es la última línea de defensa.

**Tarea**:

- Documentar el comportamiento esperado en dos escenarios:
  1. Mismo `runId` enviado dos veces concurrentemente: el segundo debe recibir `RUN_ALREADY_EXISTS` (409).
  2. Mismo `runId` con mismo plan (idempotent retry): ¿retornar el `EngineRunRef` existente o rechazar?
- Implementar el comportamiento documentado.
- Eliminar el check de `ensureRunDoesNotExist` separado — es redundante si `bootstrapRunTx` ya maneja el conflicto con `RUN_ALREADY_EXISTS`. O dejarlo como fast-fail antes de la operación costosa del adapter.

---

## WAVE 4 — Hardening (Phase 1.5 del ROADMAP existente)

> Prerrequisito: WAVE 0 completado. Sin correctness, el load testing valida comportamiento incorrecto.

---

### W4-1 — Load Testing con k6 (issue #18)

**Requisito adicional del análisis**: El test de carga debe incluir:

- Stress test de `runSeq` contention: 100 steps en paralelo para el mismo run → verificar que `runSeq` es monotónico sin gaps incorrectos.
- Test de `listEvents(runId)` para runs de 1000 steps: latencia p99 < 50ms con snapshot habilitado vs sin snapshot.
- Test de `bootstrapRunTx` bajo concurrencia: 1000 runs simultáneos de diferentes tenants → zero `RUN_ALREADY_EXISTS` falsos positivos.

---

### W4-2 — Chaos Engineering

Adicional a lo planificado:

- Crash del process Node.js entre `adapter.startRun()` y `bootstrapRunTx` — verificar compensación (W0-4).
- Crash del `OutboxWorker` con outbox con 1000 pendientes — verificar at-least-once delivery sin duplicados en el estado derivado.
- Restart de un Temporal worker con un workflow activo — verificar que `logicalAttemptId` sobrevive el replay (W3-2).

---

### W4-3 — Backpressure en OutboxWorker

**Problema identificado**: No hay backpressure definido en el procesamiento del outbox. Si el event bus es lento, el outbox crece sin límite.

**Tarea**:

- Implementar `BACKPRESSURE_ON` signal cuando el queue depth del outbox supera umbral configurable (ej: 10K pending).
- `BACKPRESSURE_OFF` cuando baja de umbral de recovery.
- Métrica `dvt.outbox.pending_count` visible en Prometheus.
- Documentar en el roadmap existente como sub-tarea de #18.

---

## WAVE 5 — Expansión de Plataforma (Phase 2+)

> No iniciar hasta que WAVE 0 + WAVE 1 + critical path WAVE 2 estén completados.

---

### W5-1 — Implementar `IExecutionPlanner` port + implementación mínima

**Estado actual**: No existe. Es el tercer pilar del mantra "planner / engine / state".

**Tarea**:

- Crear `packages/@dvt/planner/`:
  - `IExecutionPlanner` port: `plan(spec: RunSpec): Promise<ExecutionPlan>`
  - `RunSpec` type: qué correr, con qué selección, en qué entorno
  - `BasicPlanner` implementación: construye un `ExecutionPlan` desde un dbt manifest
- `DAGAnalyzer`: parsea `manifest.json`, construye grafo de dependencias, ordena steps por topología.
- **No** incluir `CostImpactEstimator` en Phase 1 del planner — es un enhancement, no un bloqueador.

**Criterio de aceptación**:

- `BasicPlanner.plan({ manifest, selection })` retorna `ExecutionPlan` válido con steps en orden topológico.
- Tests: plan de 5 nodos con dependencias → steps en orden correcto → engine puede ejecutarlos.

---

### W5-2 — Conductor Adapter (post-Temporal hardening)

**Prerrequisito**: Temporal adapter en producción verificado. Los semantic gaps identificados deben estar documentados antes de comenzar:

1. **`cancelRun` timing**: En Conductor, `terminate` es asíncrono. La decisión de ADR-0017 (W1-3) debe estar implementada antes de escribir una línea de ConductorAdapter.
2. **`logicalAttemptId`**: Conductor no expone attempt counts nativos a nivel de run. La estrategia de tracking debe definirse antes de implementar.
3. **`RunStarted` ownership**: Conductor define en qué punto "el workflow empieza ejecutando". Esto debe mapearse al mismo criterio de ADR-0011.

---

### W5-3 — Plugin System: fundación

**Prerrequisito**: `IExecutionPlanner` existe (W5-1), `IProviderAdapter` estabilizado (W0-2).

**Tarea**: Solo la fundación, no un sistema completo:

- `PluginManifest` schema (capabilities, permissions, UI modules) — definir como JSON Schema + zod.
- `PluginRegistry`: carga manifests, valida capabilities, no ejecuta nada.
- `IPluginRuntime` port: `load(manifest)`, `invoke(pluginId, method, ctx)`, `unload(pluginId)`.
- **NO** comenzar con la sandbox de ejecución hasta que `IPluginRuntime` sea estable.
- Eliminar `vm2` como opción de sandbox — tiene historial de vulnerabilidades documentadas. Usar `worker_threads` como default.

---

## Resumen de Dependencias Críticas

```
W0-1 ──┐
W0-2 ──┼──► W0-3 (@dvt/plan-verifier) ──► W2-2 (TemporalAdapter)
W0-4 ──┘
         │
         └──► W2-1 (PostgresStateStore) ──► W4-1 (Load Testing)

W1-1 ──► (unblocks new adapter implementors)
W1-2 ──► W2-1
W1-3 ──► W2-2, W5-2

W0-6 ──► W3-1 (stuck-run detection sin provider coupling)
W0-7 ──► W3-3 (pagination + snapshot)

W2-1 + W2-2 + W2-3 ──► W4-1 (load testing)
W4-1 + W4-2 ──► W5-1 (planner)
W5-1 ──► W5-2 (Conductor), W5-3 (plugins)
```

---

## Tareas que NO deben empezarse antes de tiempo

| Tarea                                       | Razón para esperar                                                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Snowflake Cost Attribution                  | Sin runs en producción, cualquier modelo es especulativo. `QUERY_HISTORY` no es síncrono. Delay a post-Phase 2.                    |
| UI: Graph Canvas / Diff View / Lineage View | Depende de `ArtifactsParser` y `LineageStore` que no existen. Build el backend primero.                                            |
| Conductor Adapter completo                  | Los semantic gaps (cancelRun, logicalAttemptId) requieren que ADR-0017 exista y que Temporal esté en producción verificado.        |
| `requiresCapabilities` validation real      | Actualmente tira error si `capabilities.length > 0`. No construir el sistema de capabilities hasta que `IExecutionPlanner` exista. |

---

## Métricas de progreso sugeridas

Para cada WAVE, la definición de "Done" es:

| WAVE   | Done cuando...                                                                                                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WAVE 0 | Todos los tests de `WorkflowEngine` pasan sin mockear `IPlanFetcher`; `saveProviderRef` eliminado; `getRunStatus` no llama al adapter; golden vectors de señales en contrato. |
| WAVE 1 | ADR-0010 anotado; `IRunStateStore.v2.1.md` publicado; ADR-0017 aprobado; `SignalsAndAuth.v1.1.md` publicado.                                                                  |
| WAVE 2 | Golden paths de Phase 1 MVP pasan con PostgresStateStore real + TemporalAdapter real.                                                                                         |
| WAVE 3 | Stuck-run test pasa; retención definida; `listEvents` paginado; contract migration guide existe.                                                                              |
| WAVE 4 | Load test 500 events/sec sostenido 4h; chaos suite pasa; idempotency torture 1M events sin corrupción.                                                                        |
| WAVE 5 | `BasicPlanner` retorna plan válido desde manifest dbt real; plugin manifest cargado y validado.                                                                               |

---

_Generado desde revisión arquitectónica de 2026-02-21. Complementa `ROADMAP.md` — no lo reemplaza._
