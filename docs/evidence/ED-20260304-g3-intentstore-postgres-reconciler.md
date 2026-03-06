---
title: ED-20260304 - G3 IntentStore Postgres + Reconciler Worker
status: Draft
date: 2026-03-04
owners: Engine / Data Platform
arc_level: ARC-3
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts
  - packages/@dvt/adapter-postgres/src/index.ts
  - packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts
  - packages/@dvt/adapter-postgres/test/smoke.test.ts
  - packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts
  - packages/@dvt/engine/src/index.ts
evidence:
  pr: pending
  tests:
    - packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts
    - packages/@dvt/adapter-postgres/test/smoke.test.ts
    - packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts
  code:
    - packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts
    - packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts
---

## Evidence Doc (ED): G3 IntentStore Postgres + Reconciler Worker

## What changed (planned)

- Implementar `PostgresStartRunIntentStore` para persistencia durable del pre-dispatch intent log (ADR-0030).
- Añadir DDL idempotente de `start_run_intents` + índice de huérfanos en el adapter Postgres.
- Incorporar `IntentReconcilerWorker` periódico (start/stop/tick) para ejecutar `reconcileOrphanedIntents` con shutdown limpio.
- Exportar APIs públicas nuevas en `@dvt/adapter-postgres` y `@dvt/engine`.
- Añadir tests unitarios e integración condicional (`DVT_PG_INTEGRATION=1`) para transiciones y reconciliación.

## Scope técnico detallado

1. Persistencia (`@dvt/adapter-postgres`)

- Tabla `start_run_intents`:
  - `intent_id` PK
  - `tenant_id`, `run_id`, `provider`, `status`, `engine_run_ref`, `created_at`, `updated_at`
- Índice parcial:
  - `(status, created_at ASC)` para `status IN ('PENDING','DISPATCHED')`
- Implementación de métodos del contrato:
  - `createIntent` (idempotente)
  - `markDispatched`
  - `markResolved`
  - `markExpired`
  - `listOrphaned`
  - `getIntent`
- Validación estricta de transiciones (mismas reglas que in-memory).

1. Scheduler (`@dvt/engine`)

- Clase `IntentReconcilerWorker`:
  - `start(intervalMs?)`
  - `stop(): Promise<void>`
  - ejecución periódica de `runMaintenanceService.reconcileOrphanedIntents({ thresholdMs, limit })`
- Defaults:
  - `intervalMs = 30_000`
  - `orphanThresholdMs = 300_000`
  - `limit = 50`
- Protección contra doble arranque y stop idempotente.

1. Testing

- Unit tests de store (transiciones válidas/inválidas, idempotencia, orden y límite de huérfanos).
- Smoke tests con Postgres real bajo flag de integración.
- Unit tests del worker (loop periódico, no overlap de ticks, stop limpio).

## Correcciones al enfoque (autocorrección)

- Corrección 1 (proceso): se pausará la ejecución de cambios funcionales hasta que este documento sea validado por ti.
- Corrección 2 (trazabilidad): toda modificación quedará vinculada a este ED y a criterios ADR-012 relevantes.
- Corrección 3 (riesgo): antes de cerrar, se documentarán explícitamente límites/gaps (por ejemplo, wiring en `apps/api` si no aplica en este repo aún).
- Corrección 4 (control de cambios): cualquier archivo ya creado de forma preliminar se ajustará estrictamente al scope aquí definido y a revisión por pruebas.

## Evidence (paths/links)

- Tests: `packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts`, `packages/@dvt/adapter-postgres/test/smoke.test.ts`, `packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts`
- Code: `packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts`, `packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts`
- Schemas/contracts: `packages/@dvt/engine/src/ports/IStartRunIntentStore.ts`

## Risks (only real ones)

- New risks:
  - R-G3-01: transiciones inválidas por race conditions en updates concurrentes.
  - R-G3-02: sweep periódico con umbral/configuración inadecuada (falsos positivos/negativos de huérfanos).
- Residual risks:
  - sin wiring de runtime real en `apps/api`, el worker puede quedar implementado pero no activado en despliegue.

## Design notes (ADR-012)

- Criterio 3 (desacoplamiento): store y worker detrás de contratos (`IStartRunIntentStore`, `IRunMaintenanceService`).
- Criterio 9 (testabilidad): pruebas unitarias y smoke integration por paquete.
- Criterio 11 (performance): índice parcial para búsqueda de huérfanos.
- Criterio 12 (errores/logs): transiciones con errores explícitos (`IntentInvalidTransitionError`, `IntentNotFoundError`).
- Criterio 14 (config externa): interval/threshold/limit configurables.

## Rollout / compatibility

- Rollout:
  - 1. desplegar DDL idempotente,
  - 1. activar store Postgres,
  - 1. activar worker con `intervalMs` conservador,
  - 1. observar métricas de reconciliación.
- Compatibilidad/migración:
  - no breaking change de contratos públicos existentes;
  - `InMemoryStartRunIntentStore` sigue disponible para tests/local.
