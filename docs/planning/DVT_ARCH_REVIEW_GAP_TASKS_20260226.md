# DVT+ — Tareas de subsanación de carencias (2026-02-26)

Fuente principal de carencias: [DVT+\_Architectural_Review_20260226_AI.md](../review/DVT+_Architectural_Review_20260226_AI.md)

---

## Objetivo

Cerrar los huecos estructurales detectados en arquitectura con tareas ejecutables, verificables y priorizadas.

## Política de ejecución

1. No avanzar a P1 sin cerrar P0 crítico.
2. Cada tarea requiere DoD + evidencia en CI.
3. Ningún “HECHO” sin prueba automática asociada.

---

## Backlog de subsanación

| ID        | Prioridad | Carencia                            | Tarea                                                                                                              | Entregable                                                  | Verificación                                                                                                                                                          | Estado |
| --------- | --------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| GAP-P0-01 | P0        | Drift de contrato State Store       | Unificar contrato canónico de state store en `@dvt/contracts` y eliminar variantes legacy                          | Un único contrato exportado y consumido por engine/adapters | `pnpm -r typecheck` + búsqueda sin referencias legacy                                                                                                                 | HECHO  |
| GAP-P0-02 | P0        | Planner subespecificado             | Definir contrato normativo `IPlanner` (inputs dbt manifest, selección, políticas; output ExecutionPlan versionado) | Especificación + tipos + schemas + fixtures mínimos         | Tests de contrato + validación de schemas                                                                                                                             | HECHO  |
| GAP-P0-03 | P0        | Planner no ejecutable               | Implementar Planner MVP (`manifest.json` → DAG → layers → ExecutionPlan) con fixtures 10/100/500                   | Paquete planner funcional con golden tests deterministas    | `pnpm --filter @dvt/planner test`                                                                                                                                     | HECHO  |
| GAP-P0-04 | P0        | Creep engine/decisión               | Mover evaluación de gateway DSL a Activity boundary y dejar workflow sin decisión de política                      | Refactor de runtime temporal + pruebas replay               | `pnpm --filter @dvt/adapter-temporal test:integration` + `pnpm lint:determinism`                                                                                      | HECHO  |
| GAP-P0-05 | P0        | Riesgo IDOR multi-tenant            | Forzar `tenantId` obligatorio en read/list/cancel/signal y negar cross-tenant por defecto                          | APIs/store con tenant scope estricto                        | `pnpm --filter @dvt/engine test` + `pnpm --filter @dvt/adapter-postgres test` (+ `DVT_PG_INTEGRATION=1` si hay Postgres local)                                        | HECHO  |
| GAP-P0-06 | P0        | Outbox incompleto                   | Implementar outbox relay polling + retry/backoff + DLQ + replay manual                                             | Worker operativo + runbook de reenvío                       | `pnpm --filter @dvt/engine test` + `pnpm --filter @dvt/adapter-postgres build && pnpm --filter @dvt/adapter-postgres test` (+ `DVT_PG_INTEGRATION=1` para smoke real) | HECHO  |
| GAP-P0-07 | P0        | Concurrencia startRun               | Garantizar idempotencia de arranque con `workflowId=runId` y política de conflicto explícita                       | Un solo workflow por runId bajo carrera                     | Test de carrera N-paralelo, 1 ejecución real                                                                                                                          | TODO   |
| GAP-P0-08 | P0        | Gaps no detectados en CI            | Activar suite no-gaps obligatoria: replay, idempotencia, tenant isolation, outbox, projector L3                    | Job CI bloqueante                                           | Pipeline falla ante cualquier gate roto                                                                                                                               | TODO   |
| GAP-P1-01 | P1        | Evolución contractual frágil        | Tooling de migración de contratos/eventos (dual-read + transform + compat matrix)                                  | Runner + tests de compat vN→vN+1                            | Tests de migración automáticos                                                                                                                                        | TODO   |
| GAP-P1-02 | P1        | Escalabilidad de event log          | Particionar `run_events` + política de retención hot/cold + archivado                                              | DDL + jobs de mantenimiento + runbook                       | Bench de consultas + pruebas de rotación                                                                                                                              | TODO   |
| GAP-P1-03 | P1        | Sin backpressure/admisión           | Definir y aplicar control de admisión por tenant + cuotas + rate limit + circuit breaking                          | Módulo de admisión + métricas                               | Test de carga con bursts multi-tenant                                                                                                                                 | TODO   |
| GAP-P1-04 | P1        | Sandbox plugins inmaduro            | Cerrar decisión e implementación de sandbox productivo (sin vm2) + capability enforcement runtime                  | Sandbox aislado + contrato de capacidades ejecutable        | Pruebas de aislamiento + security tests                                                                                                                               | TODO   |
| GAP-P1-05 | P1        | Paridad multi-engine sobreprometida | Formalizar y testear “state-equivalent” Temporal/Conductor con matriz de conformidad                               | Conformance suite + documento de límites                    | Tests de equivalencia de estado                                                                                                                                       | TODO   |
| GAP-P2-01 | P2        | Cost attribution incompleto         | Separar coste pre-run (estimación) de post-run (atribución real) y construir pipeline fiable                       | Modelo de costes + ETL + dashboards                         | Validación contra metering real                                                                                                                                       | TODO   |
| GAP-P2-02 | P2        | SLA no vinculados a runtime         | Convertir SLO/SLA en políticas ejecutables (degradación, shedding, alertas)                                        | Reglas de degradación + runbooks                            | Chaos/SLO tests                                                                                                                                                       | TODO   |
| GAP-P2-03 | P2        | Retención/GDPR sin cierre           | Definir estrategia de borrado y retención compatible con event sourcing                                            | Política legal/técnica + mecanismo operativo                | Auditoría de cumplimiento + tests                                                                                                                                     | TODO   |

### Evidencia de cierre — GAP-P0-02 (2026-02-26)

- Contrato normativo planner con alias de compatibilidad en `@dvt/contracts`.
- Tipos y schemas v2.3 de planner presentes y validados con fixtures mínimos.
- Suite de contrato añadida para input envelope, plan versionado y build result.
- Verificación local ejecutada:
  - `pnpm --filter @dvt/contracts build`
  - `pnpm --filter @dvt/contracts test`

### Evidencia de cierre — GAP-P0-03 (2026-02-27)

- Planner MVP operativo desde manifest con DAG/layers/ExecutionPlan en `@dvt/planner`.
- Fixtures 10/100/500 cubiertos por suite dedicada y hash determinista validado.
- Verificación local ejecutada:
  - `pnpm --filter @dvt/planner test`

### Evidencia de cierre — GAP-P0-04 (2026-02-27)

- Evaluación gateway DSL movida a Activity boundary (`executeStep`) en adapter Temporal.
- Workflow sin evaluación de DSL inline; consume `gatewayDecision` devuelto por Activity.
- Cobertura añadida:
  - unit tests de Activity para gateway true/false e inválidos.
  - test de literals para asegurar ausencia de evaluación DSL en workflow.
  - integración time-skipping con camino gateway + `StepSkipped` + payload `gatewayDecision`.
- Verificación local ejecutada:
  - `pnpm --filter @dvt/adapter-temporal test`
  - `pnpm --filter @dvt/adapter-temporal test:integration`
  - `pnpm lint:determinism`

### Evidencia de cierre — GAP-P0-05 (2026-02-27)

- Endurecimiento en engine: validación de tenant scope antes de lookup de metadata para operaciones de lectura/acción sobre runRef:
  - `cancelRun`
  - `getRunStatus`
  - `enrichRunStatus`
  - `signal`
  - `detectStuckRuns` (tenant-scoped read/list)
- Se mantiene `tenantId` obligatorio por contrato en store (`getRunMetadataByRunId`, `listEvents`, `getSnapshot`, `listRuns`).
- Cobertura negativa añadida:
  - tests de `authorizer` para denegar `cancelRun/getRunStatus/signal` con `runRef.tenantId` no autorizado (sin tocar adapter).
  - test de aislamiento en adapter Postgres para denegar lecturas cross-tenant por defecto (`null`/`[]` según operación).
- Verificación local ejecutada:
  - `pnpm --filter @dvt/engine test`
  - `pnpm --filter @dvt/adapter-postgres test` (unit, smoke integration skipped sin DB)
  - `DVT_PG_INTEGRATION=1 pnpm --filter @dvt/adapter-postgres test` (requiere Postgres local; en este entorno no disponible: `ECONNREFUSED` a `localhost:5432`)

### Evidencia de cierre — GAP-P0-06 (2026-02-27)

- Outbox relay polling endurecido en worker con entrega por registro (no por batch ambiguo) y manejo explícito de fallo por evento en `OutboxWorker`.
- Retry/backoff implementado en storage:
  - campo `nextAttemptAt` para gate temporal de reintento,
  - backoff exponencial con tope,
  - filtrado de `listPending` por elegibilidad temporal.
- DLQ y replay manual operativos:
  - soporte `listDeadLetter`,
  - `replayDeadLetters({ limit, runId, ids })` para reinsertar en pending con reseteo de intentos.
- Cobertura añadida:
  - tests de worker outbox (`drain`, `fail+retry`, `DLQ+replay`) en `@dvt/engine`.
  - smoke tests Postgres ampliados para backoff y replay DLQ (se ejecutan con `DVT_PG_INTEGRATION=1`).
- Runbook operativo añadido:
  - `runbooks/OUTBOX_RELAY_OPERATIONS.md`.
- Verificación local ejecutada:
  - `pnpm --filter @dvt/engine build`
  - `pnpm --filter @dvt/engine test`
  - `pnpm --filter @dvt/adapter-postgres build`
  - `pnpm --filter @dvt/adapter-postgres test` (unit, smoke integration skipped sin DB)

---

## Orden de ejecución recomendado (primer corte)

1. GAP-P0-01 → GAP-P0-02 → GAP-P0-03
2. GAP-P0-05 → GAP-P0-07
3. GAP-P0-06 → GAP-P0-08
4. GAP-P0-04 (tras estabilizar planner/state)

---

## Criterio de salida de fase P0

P0 se considera cerrado únicamente si:

- No hay drift contractual en state store.
- Planner genera planes válidos y deterministas para fixtures reales.
- Tenant isolation está forzado y probado en negativo.
- Outbox entrega de punta a punta bajo fallo/reintento.
- CI no-gaps está activo como bloqueo.
