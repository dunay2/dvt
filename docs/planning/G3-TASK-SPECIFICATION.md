---
title: G3 TASK SPECIFICATION
status: Draft
owner: docs
last_reviewed: 2026-03-06
planning_type: proposal
---
# G3 TASK SPECIFICATION

# G3-TASK-SPECIFICATION.md

**Gap**: G3 - IStartRunIntentStore Postgres + scheduler  
**Fecha**: 2026-03-04  
**Estado**: Draft v3 para aprobación técnica  
**Fuente principal**: `plans/GAP_EXECUTION_PLANS.md`  
**Guía de proceso**: `plans/dvt-traceability-pack-v2-lite-R6`

---

## 1) Objetivo

Cerrar G3 con criterios de producción y operación real:

1. Persistencia durable de intents en Postgres.
2. Reconciliación periódica robusta con tolerancia a fallos.
3. Integración runtime obligatoria (no queda "worker huérfano").
4. Observabilidad y pruebas suficientes para detectar regresiones operativas.

---

## 2) Decisiones cerradas (v3)

### D1) Estados con ENUM (no CHECK)

Se define tipo explícito:

```sql
CREATE TYPE {schema}.start_run_intent_status AS ENUM (
  'PENDING',
  'DISPATCHED',
  'RESOLVED',
  'EXPIRED'
);
```

Y columna:

```sql
status {schema}.start_run_intent_status NOT NULL DEFAULT 'PENDING'
```

Rationale: evitar deuda por ALTER CHECK en tablas grandes.

### D2) Integridad `engine_run_ref`

- Constraint mínima DB:
  - `status <> 'DISPATCHED' OR engine_run_ref IS NOT NULL`
- Shape mínimo JSONB en DB (campos requeridos):
  - `provider`, `tenantId`
- Validación completa de shape en aplicación y tests de contrato.

### D3) Unicidad activa por run (obligatoria)

```sql
CREATE UNIQUE INDEX IF NOT EXISTS start_run_intents_active_run_uniq
ON {schema}.start_run_intents (tenant_id, run_id)
WHERE status IN ('PENDING','DISPATCHED');
```

### D4) Concurrencia: patrón exacto

Se estandariza el comportamiento:

1. `UPDATE ... WHERE intent_id = $1 AND status IN (...) RETURNING ...`
2. Si no hay fila afectada:
   - `SELECT status FROM ... WHERE intent_id = $1`
   - sin fila -> `IntentNotFoundError`
   - con fila -> `IntentInvalidTransitionError`

Nota: se acepta que el estado leído es "estado actual" bajo contención; el contrato exige tipo de error correcto, no snapshot histórico exacto.

### D5) Política de backoff por tipo de error

- Backoff **solo** para errores de infraestructura/transitorios (`ECONN*`, timeout, `57P01`, `53300`, `08006`, etc.).
- Errores de dominio/lógica no activan backoff exponencial.
- Backoff se resetea tras sweep exitoso.
- Se aplica jitter para evitar sincronización entre workers.

### D6) Timeouts obligatorios

- Configurar `statement_timeout` en sesión/tx para consultas del store.
- Timeout de ciclo del worker (guard rail) para evitar ticks colgados.

### D7) Estrategia DDL (decisión explícita)

Se elige **A: mantener `migrate()` independiente** para `PostgresStartRunIntentStore`.

- No se fusiona en `PostgresStateStoreAdapter` en esta iteración.
- Evita refactor arquitectural no necesario para cerrar G3.
- Cualquier fusión futura requiere ADR/cambio separado.

---

## 3) Alcance exacto

### 3.1 Adapter Postgres

- **Modificar** `PostgresStartRunIntentStore.ts` existente (no reimplementar desde cero).
- Cambios exactos en store existente:
  - `status` de `CHECK/TEXT` a `ENUM`,
  - agregar índice único parcial activo `(tenant_id, run_id) WHERE status IN ('PENDING','DISPATCHED')`,
  - aplicar `statement_timeout` para queries del store.
- Mantener DDL del store en su `migrate()` propio (decisión D7).
- Export desde `packages/@dvt/adapter-postgres/src/index.ts`.

### 3.2 Engine

- Crear `IntentReconcilerWorker` con:
  - loop no solapado,
  - clasificación de error,
  - backoff + jitter,
  - stop limpio.
- Export desde `packages/@dvt/engine/src/index.ts`.

Nota crítica: `RunMaintenanceService.reconcileOrphanedIntents()` ya existe y contiene la lógica de reconciliación.
El `IntentReconcilerWorker` es **solo** el loop de scheduling/invocación; no debe duplicar lógica de negocio.

### 3.3 Runtime integration (obligatorio)

- Integrar worker en entry point runtime (`apps/api` o bin equivalente en repo).
- Startup/shutdown gestionado por lifecycle de proceso.
- Si no existe wiring real en esta app, **G3 no se cierra** y se crea sub-gap explícito bloqueante.

---

## 4) Observabilidad obligatoria

### Métricas mínimas

- `dvt.intent.reconcile.sweeps_total`
- `dvt.intent.reconcile.errors_total`
- `dvt.intent.reconcile.inspected_total`
- `dvt.intent.reconcile.expired_total`
- `dvt.intent.reconcile.cancelled_total`
- `dvt.intent.reconcile.duration_ms`
- `dvt.intent.reconcile.backoff_ms`

### Logs estructurados

Por sweep:

- `intervalMs`, `thresholdMs`, `limit`
- `inspected`, `expired`, `cancelled`, `cancelFailed`
- `errorClass`, `errorCode`, `errorMessage`
- `backoffMs`, `attempt`

---

## 5) Riesgos y mitigaciones (v3)

### R1) Race conditions

Mitigación: transición atómica por `UPDATE ... WHERE ...` + error typing consistente.

### R2) Duplicados activos

Mitigación: índice único parcial activo.

### R3) DB inestable

Mitigación: clasificación de errores + backoff exponencial + jitter + reset en éxito.

### R4) Consultas colgadas

Mitigación: timeouts en DB/client + guard rail de ciclo.

### R5) Migración de datos

Decisión explícita requerida antes de implementar:

- Opción A: **aceptar pérdida** de intents en memoria al cutover (documentado y comunicado).
- Opción B: ventana de mantenimiento y replay/migración manual.

Sin decisión explícita, no se despliega.

### R6) Worker no integrado

Mitigación: integración runtime incluida en este scope; si no, G3 queda abierto.

---

## 6) Plan de ejecución (orden)

0. **Prerequisito**: verificar wiring mínimo real de engine en `apps/api` para poder instanciar:
   - `PostgresStartRunIntentStore`,
   - `RunMaintenanceService`,
   - `IntentReconcilerWorker`.
     Si no existe wiring viable en esta iteración, abrir sub-gap bloqueante y no cerrar G3.

1. DDL v3 (ENUM + constraints + índices, incluida unicidad activa).
2. Store con transiciones y clasificación de errores.
3. Worker con backoff por infraestructura + jitter + métricas/logs.
4. Wiring runtime en app.
5. Tests unitarios + integración + resiliencia + carga básica.
6. Validaciones de paquete/monorepo.

---

## 7) Pruebas requeridas

### Unit

- Transiciones válidas/invalidas.
- Idempotencia de `createIntent`.
- Concurrencia (dos actualizaciones simultáneas al mismo intent).
- Clasificación de errores del worker (infra vs lógica).

### Integración PG (`DVT_PG_INTEGRATION=1`)

- DDL idempotente.
- Existencia de ENUM/índices/constraints esperados.
- Unicidad activa por `(tenant_id, run_id)`.
- `RunMaintenanceService` con store Postgres real.

### Resiliencia básica

- Simular error transitorio de DB y verificar:
  - worker sigue vivo,
  - backoff crece,
  - reset de backoff tras éxito.

### Carga básica (no benchmark exhaustivo)

- Dataset 100k intents.
- Verificar `listOrphaned` bajo umbral de latencia acordado (se define en PR).

---

## 8) Archivos objetivo

### Adapter Postgres

- `packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts`
- `packages/@dvt/adapter-postgres/src/index.ts`
- `packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts` (nuevo)
- `packages/@dvt/adapter-postgres/test/smoke.test.ts`

### Engine

- `packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts` (nuevo)
- `packages/@dvt/engine/src/index.ts`
- `packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts` (nuevo)

### App/runtime

- entry point correspondiente en `apps/api` (startup/shutdown del worker)

### Exports obligatorios para no bloquear integración

- `packages/@dvt/adapter-postgres/src/index.ts`
  - exportar `PostgresStartRunIntentStore` (+ tipos/config y errores del store).
- `packages/@dvt/engine/src/index.ts`
  - exportar `IStartRunIntentStore` y `InMemoryStartRunIntentStore`.

---

## 9) Criterios de cierre G3 (bloqueantes)

- [ ] Estados en DB usando ENUM (no CHECK text).
- [ ] Índice único parcial activo implementado y probado.
- [ ] Store con transiciones y errores tipados correctos.
- [ ] Timeouts configurados para queries/ciclo worker.
- [ ] Worker no solapado, con backoff+jitter por error de infraestructura.
- [ ] Métricas/logs mínimos emitidos.
- [ ] Wiring runtime completado.
- [ ] Tests unitarios, integración PG, resiliencia y carga básica verdes.
- [ ] Decisión explícita de migración de datos documentada (A o B).

---

## 10) Pendientes de decisión de producto/operación

1. Política de migración de intents en memoria (A: pérdida aceptada / B: ventana + replay).
2. SLA de latencia para `listOrphaned` en test de carga básica.
3. Umbral inicial de alertas para `errors_total` y `backoff_ms`.
