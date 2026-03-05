---
title: Engine DVT - Implementation Status Checklist (Against Requested Spec)
status: Draft
owner: docs
last_reviewed: 2026-03-05
planning_type: status
---
---

title: Engine DVT - Implementation Status Checklist (Against Requested Spec)
status: Draft
owner: docs
last_reviewed: 2026-03-04
planning_type: status

---

# Engine DVT - Implementation Status Checklist (Against Requested Spec)

Fecha: 2026-02-26
Alcance evaluado: especificaciÃ³n extensa compartida por el usuario (Portada â†’ Fuentes, contratos, DDL, tests, operaciÃ³n).

## Leyenda

- [x] Hecho en el repo actual
- [~] Parcial / con diferencias relevantes
- [ ] No implementado en el repo actual

---

## 1) Principios base (Portada)

- [x] `getRunStatus` canÃ³nico leÃ­do desde Store (snapshot-first + replay fallback), no desde runtime provider en ruta por defecto.
  - Evidencia: `WorkflowEngine.getRunStatus` usa `stateStore.getSnapshot(...)` y `stateStore.listEvents(...)`.
- [x] SeparaciÃ³n de enriquecimiento runtime en mÃ©todo aparte (`enrichRunStatus`).
- [x] Determinismo workflow/activity aplicado en adapter Temporal.
- [~] Engine reemplazable Temporal/Conductor: contratos y stubs existen, Conductor no MVP funcional completo.

## 2) Contratos y versionado de plan

- [x] ValidaciÃ³n de `contractVersion` soportada en runtime del adapter Temporal.
- [x] Rechazo explÃ­cito de `inputBindings` en v1 runtime para evitar comportamiento silencioso.
- [~] Contrato exacto pedido (`ExecutionPlan v1` con `stages[]`) **no coincide 1:1** con el modelo runtime actual (se trabaja con steps + DAG `dependsOn`).
- [~] Contrato exacto pedido para `IWorkflowEngine` (firma `startRun(plan: unknown, ...)`) **no coincide** con contrato actual (`PlanRef` + contexto).

## 3) Store y persistencia

- [x] Event log idempotente con deduplicaciÃ³n y semÃ¡ntica append-only en runtime actual.
- [x] Snapshot materializado para lectura rÃ¡pida de estado.
- [x] Outbox implementado en adapter Postgres actual (no solo idea).
- [~] DDL solicitado (`runs`, `run_steps`, `step_attempts`, `run_events`) **no es el esquema runtime vigente**; el repo usa otro diseÃ±o operacional.
- [ ] Integridad exacta solicitada para `step_attempts -> run_steps(run_id,step_id)` no aplica al esquema vigente (no existe ese par de tablas en runtime actual).

## 4) TemporalAdapter MVP

- [x] Workflow tipado (sin `any` en los puntos crÃ­ticos del workflow actual).
- [x] `proxyActivities` tipado correctamente.
- [x] CancelaciÃ³n end-to-end validada en tests de integraciÃ³n temporal.
- [x] Reintentos/errores con cobertura de tests.
- [~] EjecuciÃ³n por `stages[]` (como en la especificaciÃ³n) no coincide; implementaciÃ³n actual ejecuta por capas DAG derivadas.

## 5) API thin (`/runs`, `/cancel`, `/signal`, `/events`)

- [ ] No hay evidencia de implementaciÃ³n de esos endpoints en `apps/api` actualmente.

## 6) Testing (calidad / no gaps)

- [x] Tests unitarios y de integraciÃ³n temporal activos.
- [x] Se aÃ±adiÃ³ aserciÃ³n concreta para crash-recovery: unicidad de `idempotencyKey` tras restart de worker.
- [x] Cobertura de rechazo de versiÃ³n contractual no soportada (`PLAN_CONTRACT_VERSION_UNKNOWN`).
- [~] Replay gate CI con corpus de histories versionado y polÃ­tica de actualizaciÃ³n estricta: documentado parcialmente; no se confirma pipeline completo â€œgateâ€ como en la especificaciÃ³n objetivo.

## 7) Observabilidad / seguridad / operaciÃ³n

- [~] Observabilidad OTel completa (interceptores + mÃ©tricas + runbooks de operaciÃ³n) no queda cerrada al nivel â€œMVP operativo completoâ€ de la especificaciÃ³n.
- [~] SecretsProvider y cifrado de payloads Temporal: hay contratos y lineamientos, no cierre integral verificado extremo a extremo en esta revisiÃ³n.

## 8) Resumen ejecutivo de cumplimiento

- [x] Hecho y verificable en cÃ³digo/tests: **estado desde Store**, **tipado y restricciones runtime**, **idempotencia y crash assertion**.
- [~] Parcial: **alineaciÃ³n exacta con el spec â€œExecutionPlan v1 con stagesâ€**, **replay gate CI formal**, **observabilidad/ops full-stack**.
- [ ] Pendiente: **API thin de runs en `apps/api` segÃºn contrato solicitado**.

---

## Evidencias rÃ¡pidas (referencias)

- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `packages/@dvt/adapter-temporal/test/activities.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
