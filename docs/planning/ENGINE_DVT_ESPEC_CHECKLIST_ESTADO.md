# Engine DVT — Checklist de estado de implementación (contra la especificación solicitada)

Fecha: 2026-02-26
Alcance evaluado: especificación extensa compartida por el usuario (Portada → Fuentes, contratos, DDL, tests, operación).

## Leyenda

- [x] Hecho en el repo actual
- [~] Parcial / con diferencias relevantes
- [ ] No implementado en el repo actual

---

## 1) Principios base (Portada)

- [x] `getRunStatus` canónico leído desde Store (snapshot-first + replay fallback), no desde runtime provider en ruta por defecto.
  - Evidencia: `WorkflowEngine.getRunStatus` usa `stateStore.getSnapshot(...)` y `stateStore.listEvents(...)`.
- [x] Separación de enriquecimiento runtime en método aparte (`enrichRunStatus`).
- [x] Determinismo workflow/activity aplicado en adapter Temporal.
- [~] Engine reemplazable Temporal/Conductor: contratos y stubs existen, Conductor no MVP funcional completo.

## 2) Contratos y versionado de plan

- [x] Validación de `contractVersion` soportada en runtime del adapter Temporal.
- [x] Rechazo explícito de `inputBindings` en v1 runtime para evitar comportamiento silencioso.
- [~] Contrato exacto pedido (`ExecutionPlan v1` con `stages[]`) **no coincide 1:1** con el modelo runtime actual (se trabaja con steps + DAG `dependsOn`).
- [~] Contrato exacto pedido para `IWorkflowEngine` (firma `startRun(plan: unknown, ...)`) **no coincide** con contrato actual (`PlanRef` + contexto).

## 3) Store y persistencia

- [x] Event log idempotente con deduplicación y semántica append-only en runtime actual.
- [x] Snapshot materializado para lectura rápida de estado.
- [x] Outbox implementado en adapter Postgres actual (no solo idea).
- [~] DDL solicitado (`runs`, `run_steps`, `step_attempts`, `run_events`) **no es el esquema runtime vigente**; el repo usa otro diseño operacional.
- [ ] Integridad exacta solicitada para `step_attempts -> run_steps(run_id,step_id)` no aplica al esquema vigente (no existe ese par de tablas en runtime actual).

## 4) TemporalAdapter MVP

- [x] Workflow tipado (sin `any` en los puntos críticos del workflow actual).
- [x] `proxyActivities` tipado correctamente.
- [x] Cancelación end-to-end validada en tests de integración temporal.
- [x] Reintentos/errores con cobertura de tests.
- [~] Ejecución por `stages[]` (como en la especificación) no coincide; implementación actual ejecuta por capas DAG derivadas.

## 5) API thin (`/runs`, `/cancel`, `/signal`, `/events`)

- [ ] No hay evidencia de implementación de esos endpoints en `apps/api` actualmente.

## 6) Testing (calidad / no gaps)

- [x] Tests unitarios y de integración temporal activos.
- [x] Se añadió aserción concreta para crash-recovery: unicidad de `idempotencyKey` tras restart de worker.
- [x] Cobertura de rechazo de versión contractual no soportada (`PLAN_CONTRACT_VERSION_UNKNOWN`).
- [~] Replay gate CI con corpus de histories versionado y política de actualización estricta: documentado parcialmente; no se confirma pipeline completo “gate” como en la especificación objetivo.

## 7) Observabilidad / seguridad / operación

- [~] Observabilidad OTel completa (interceptores + métricas + runbooks de operación) no queda cerrada al nivel “MVP operativo completo” de la especificación.
- [~] SecretsProvider y cifrado de payloads Temporal: hay contratos y lineamientos, no cierre integral verificado extremo a extremo en esta revisión.

## 8) Resumen ejecutivo de cumplimiento

- [x] Hecho y verificable en código/tests: **estado desde Store**, **tipado y restricciones runtime**, **idempotencia y crash assertion**.
- [~] Parcial: **alineación exacta con el spec “ExecutionPlan v1 con stages”**, **replay gate CI formal**, **observabilidad/ops full-stack**.
- [ ] Pendiente: **API thin de runs en `apps/api` según contrato solicitado**.

---

## Evidencias rápidas (referencias)

- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `packages/@dvt/adapter-temporal/test/activities.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
