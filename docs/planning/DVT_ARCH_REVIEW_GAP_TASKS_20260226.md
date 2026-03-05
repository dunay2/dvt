---
title: DVT+ - Architectural Gap Remediation Tasks (2026-02-26)
status: Draft
owner: docs
last_reviewed: 2026-03-05
planning_type: review
---
---

title: DVT+ - Architectural Gap Remediation Tasks (2026-02-26)
status: Draft
owner: docs
last_reviewed: 2026-03-04
planning_type: review

---

# DVT+ - Architectural Gap Remediation Tasks (2026-02-26)

Fuente principal de carencias: [DVT+\_Architectural_Review_20260226_AI.md](../review/DVT+_Architectural_Review_20260226_AI.md)

---

## Objetivo

Cerrar los huecos estructurales detectados en arquitectura con tareas ejecutables, verificables y priorizadas.

## PolÃ­tica de ejecuciÃ³n

1. No avanzar a P1 sin cerrar P0 crÃ­tico.
2. Cada tarea requiere DoD + evidencia en CI.
3. NingÃºn â€œHECHOâ€ sin prueba automÃ¡tica asociada.

---

## Backlog de subsanaciÃ³n

| ID        | Prioridad | Carencia                            | Tarea                                                                                                                | Entregable                                                   | VerificaciÃ³n                                                                                                                                                         | Estado |
| --------- | --------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| GAP-P0-01 | P0        | Drift de contrato State Store       | Unificar contrato canÃ³nico de state store en `@dvt/contracts` y eliminar variantes legacy                           | Un Ãºnico contrato exportado y consumido por engine/adapters | `pnpm -r typecheck` + bÃºsqueda sin referencias legacy                                                                                                                | HECHO  |
| GAP-P0-02 | P0        | Planner subespecificado             | Definir contrato normativo `IPlanner` (inputs dbt manifest, selecciÃ³n, polÃ­ticas; output ExecutionPlan versionado) | EspecificaciÃ³n + tipos + schemas + fixtures mÃ­nimos        | Tests de contrato + validaciÃ³n de schemas                                                                                                                            | HECHO  |
| GAP-P0-03 | P0        | Planner no ejecutable               | Implementar Planner MVP (`manifest.json` â†’ DAG â†’ layers â†’ ExecutionPlan) con fixtures 10/100/500               | Paquete planner funcional con golden tests deterministas     | `pnpm --filter @dvt/planner test`                                                                                                                                     | HECHO  |
| GAP-P0-04 | P0        | Creep engine/decisiÃ³n              | Mover evaluaciÃ³n de gateway DSL a Activity boundary y dejar workflow sin decisiÃ³n de polÃ­tica                     | Refactor de runtime temporal + pruebas replay                | `pnpm --filter @dvt/adapter-temporal test:integration` + `pnpm lint:determinism`                                                                                      | HECHO  |
| GAP-P0-05 | P0        | Riesgo IDOR multi-tenant            | Forzar `tenantId` obligatorio en read/list/cancel/signal y negar cross-tenant por defecto                            | APIs/store con tenant scope estricto                         | `pnpm --filter @dvt/engine test` + `pnpm --filter @dvt/adapter-postgres test` (+ `DVT_PG_INTEGRATION=1` si hay Postgres local)                                        | HECHO  |
| GAP-P0-06 | P0        | Outbox incompleto                   | Implementar outbox relay polling + retry/backoff + DLQ + replay manual                                               | Worker operativo + runbook de reenvÃ­o                       | `pnpm --filter @dvt/engine test` + `pnpm --filter @dvt/adapter-postgres build && pnpm --filter @dvt/adapter-postgres test` (+ `DVT_PG_INTEGRATION=1` para smoke real) | HECHO  |
| GAP-P0-07 | P0        | Concurrencia startRun               | Garantizar idempotencia de arranque con `workflowId=runId` y polÃ­tica de conflicto explÃ­cita                       | Un solo workflow por runId bajo carrera                      | Test de carrera N-paralelo, 1 ejecuciÃ³n real                                                                                                                         | TODO   |
| GAP-P0-08 | P0        | Gaps no detectados en CI            | Activar suite no-gaps obligatoria: replay, idempotencia, tenant isolation, outbox, projector L3                      | Job CI bloqueante                                            | Pipeline falla ante cualquier gate roto                                                                                                                               | TODO   |
| GAP-P1-01 | P1        | EvoluciÃ³n contractual frÃ¡gil      | Tooling de migraciÃ³n de contratos/eventos (dual-read + transform + compat matrix)                                   | Runner + tests de compat vNâ†’vN+1                           | Tests de migraciÃ³n automÃ¡ticos                                                                                                                                      | TODO   |
| GAP-P1-02 | P1        | Escalabilidad de event log          | Particionar `run_events` + polÃ­tica de retenciÃ³n hot/cold + archivado                                              | DDL + jobs de mantenimiento + runbook                        | Bench de consultas + pruebas de rotaciÃ³n                                                                                                                             | TODO   |
| GAP-P1-03 | P1        | Sin backpressure/admisiÃ³n          | Definir y aplicar control de admisiÃ³n por tenant + cuotas + rate limit + circuit breaking                           | MÃ³dulo de admisiÃ³n + mÃ©tricas                             | Test de carga con bursts multi-tenant                                                                                                                                 | TODO   |
| GAP-P1-04 | P1        | Sandbox plugins inmaduro            | Cerrar decisiÃ³n e implementaciÃ³n de sandbox productivo (sin vm2) + capability enforcement runtime                  | Sandbox aislado + contrato de capacidades ejecutable         | Pruebas de aislamiento + security tests                                                                                                                               | TODO   |
| GAP-P1-05 | P1        | Paridad multi-engine sobreprometida | Formalizar y testear â€œstate-equivalentâ€ Temporal/Conductor con matriz de conformidad                              | Conformance suite + documento de lÃ­mites                    | Tests de equivalencia de estado                                                                                                                                       | TODO   |
| GAP-P2-01 | P2        | Cost attribution incompleto         | Separar coste pre-run (estimaciÃ³n) de post-run (atribuciÃ³n real) y construir pipeline fiable                       | Modelo de costes + ETL + dashboards                          | ValidaciÃ³n contra metering real                                                                                                                                      | TODO   |
| GAP-P2-02 | P2        | SLA no vinculados a runtime         | Convertir SLO/SLA en polÃ­ticas ejecutables (degradaciÃ³n, shedding, alertas)                                        | Reglas de degradaciÃ³n + runbooks                            | Chaos/SLO tests                                                                                                                                                       | TODO   |
| GAP-P2-03 | P2        | RetenciÃ³n/GDPR sin cierre          | Definir estrategia de borrado y retenciÃ³n compatible con event sourcing                                             | PolÃ­tica legal/tÃ©cnica + mecanismo operativo               | AuditorÃ­a de cumplimiento + tests                                                                                                                                    | TODO   |

### Evidencia de cierre â€” GAP-P0-02 (2026-02-26)

- Contrato normativo planner con alias de compatibilidad en `@dvt/contracts`.
- Tipos y schemas v2.3 de planner presentes y validados con fixtures mÃ­nimos.
- Suite de contrato aÃ±adida para input envelope, plan versionado y build result.
- VerificaciÃ³n local ejecutada:
  - `pnpm --filter @dvt/contracts build`
  - `pnpm --filter @dvt/contracts test`

### Evidencia de cierre â€” GAP-P0-03 (2026-02-27)

- Planner MVP operativo desde manifest con DAG/layers/ExecutionPlan en `@dvt/planner`.
- Fixtures 10/100/500 cubiertos por suite dedicada y hash determinista validado.
- VerificaciÃ³n local ejecutada:
  - `pnpm --filter @dvt/planner test`

### Evidencia de cierre â€” GAP-P0-04 (2026-02-27)

- EvaluaciÃ³n gateway DSL movida a Activity boundary (`executeStep`) en adapter Temporal.
- Workflow sin evaluaciÃ³n de DSL inline; consume `gatewayDecision` devuelto por Activity.
- Cobertura aÃ±adida:
  - unit tests de Activity para gateway true/false e invÃ¡lidos.
  - test de literals para asegurar ausencia de evaluaciÃ³n DSL en workflow.
  - integraciÃ³n time-skipping con camino gateway + `StepSkipped` + payload `gatewayDecision`.
- VerificaciÃ³n local ejecutada:
  - `pnpm --filter @dvt/adapter-temporal test`
  - `pnpm --filter @dvt/adapter-temporal test:integration`
  - `pnpm lint:determinism`

### Evidencia de cierre â€” GAP-P0-05 (2026-02-27)

- Endurecimiento en engine: validaciÃ³n de tenant scope antes de lookup de metadata para operaciones de lectura/acciÃ³n sobre runRef:
  - `cancelRun`
  - `getRunStatus`
  - `enrichRunStatus`
  - `signal`
  - `detectStuckRuns` (tenant-scoped read/list)
- Se mantiene `tenantId` obligatorio por contrato en store (`getRunMetadataByRunId`, `listEvents`, `getSnapshot`, `listRuns`).
- Cobertura negativa aÃ±adida:
  - tests de `authorizer` para denegar `cancelRun/getRunStatus/signal` con `runRef.tenantId` no autorizado (sin tocar adapter).
  - test de aislamiento en adapter Postgres para denegar lecturas cross-tenant por defecto (`null`/`[]` segÃºn operaciÃ³n).
- VerificaciÃ³n local ejecutada:
  - `pnpm --filter @dvt/engine test`
  - `pnpm --filter @dvt/adapter-postgres test` (unit, smoke integration skipped sin DB)
  - `DVT_PG_INTEGRATION=1 pnpm --filter @dvt/adapter-postgres test` (requiere Postgres local; en este entorno no disponible: `ECONNREFUSED` a `localhost:5432`)

### Evidencia de cierre â€” GAP-P0-06 (2026-02-27)

- Outbox relay polling endurecido en worker con entrega por registro (no por batch ambiguo) y manejo explÃ­cito de fallo por evento en `OutboxWorker`.
- Retry/backoff implementado en storage:
  - campo `nextAttemptAt` para gate temporal de reintento,
  - backoff exponencial con tope,
  - filtrado de `listPending` por elegibilidad temporal.
- DLQ y replay manual operativos:
  - soporte `listDeadLetter`,
  - `replayDeadLetters({ limit, runId, ids })` para reinsertar en pending con reseteo de intentos.
- Cobertura aÃ±adida:
  - tests de worker outbox (`drain`, `fail+retry`, `DLQ+replay`) en `@dvt/engine`.
  - smoke tests Postgres ampliados para backoff y replay DLQ (se ejecutan con `DVT_PG_INTEGRATION=1`).
- Runbook operativo aÃ±adido:
  - `runbooks/OUTBOX_RELAY_OPERATIONS.md`.
- VerificaciÃ³n local ejecutada:
  - `pnpm --filter @dvt/engine build`
  - `pnpm --filter @dvt/engine test`
  - `pnpm --filter @dvt/adapter-postgres build`
  - `pnpm --filter @dvt/adapter-postgres test` (unit, smoke integration skipped sin DB)

---

## Orden de ejecuciÃ³n recomendado (primer corte)

1. GAP-P0-01 â†’ GAP-P0-02 â†’ GAP-P0-03
2. GAP-P0-05 â†’ GAP-P0-07
3. GAP-P0-06 â†’ GAP-P0-08
4. GAP-P0-04 (tras estabilizar planner/state)

---

## Criterio de salida de fase P0

P0 se considera cerrado Ãºnicamente si:

- No hay drift contractual en state store.
- Planner genera planes vÃ¡lidos y deterministas para fixtures reales.
- Tenant isolation estÃ¡ forzado y probado en negativo.
- Outbox entrega de punta a punta bajo fallo/reintento.
- CI no-gaps estÃ¡ activo como bloqueo.
