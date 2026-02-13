# Issue #5 / #68 — Estado, Puntos Alcanzados y Propuesta de Implementación Temporal

**Fecha**: 2026-02-13  
**Rama**: `docs/issue-5-implementation-proposal`  
**Ámbito**: Documentación de ejecución para cerrar el bloqueo Temporal en rutas activas `packages/*`

---

## 1) Estado actual y puntos alcanzados

### Puntos alcanzados (confirmados)

1. Estructura monorepo activa bajo `packages/*`.
2. Núcleo del engine funcional y con tests en `packages/engine`.
3. Contratos centralizados en `packages/contracts`.
4. Paquete `packages/adapter-temporal` creado (base de workspace existente).

### Brechas bloqueantes (Issue #5)

1. En `packages/engine/src/adapters/temporal/TemporalAdapterStub.ts` la ejecución real sigue en `NotImplemented`.
2. `packages/adapter-temporal/src/index.ts` es placeholder.
3. No existe aún wiring completo de Temporal SDK (Client + Worker + Workflow + Activities) en ruta activa.
4. Falta suite de pruebas de integración real adapter+engine sobre Temporal.
5. Existe drift entre #5 y #68 (scope legacy vs scope monorepo actual).

---

## 2) Principios no negociables

1. Separación de responsabilidades: planner ≠ engine ≠ state ≠ UI.
2. Determinismo en Workflow (sin APIs no deterministas en código de workflow).
3. Efectos externos en Activities (at-least-once ⇒ idempotencia obligatoria).
4. `RunStateStore` como source of truth operativo (no depender de queries de Temporal como verdad única).
5. Versionado de workflows obligatorio para evolución compatible con replay en ejecuciones vivas.

---

## 3) Plan de PRs (orden de ejecución)

### PR-0 — Normalize tracking (#5 vs #68) + paths canónicos

**Objetivo**

- Eliminar drift de tracking.
- Dejar una incidencia canónica para implementación Temporal activa.

**Done**

- Un único punto de verdad para implementación Temporal.
- Sin referencias legacy `engine/...` en incidencias activas relacionadas.

### PR-1 — `adapter-temporal` foundation (Client + Config + Mapper contracts)

**Archivos clave**

- `packages/adapter-temporal/src/config.ts`
- `packages/adapter-temporal/src/TemporalClient.ts`
- `packages/adapter-temporal/src/WorkflowMapper.ts`
- `packages/adapter-temporal/src/index.ts`

**Done**

- Wrapper de client con lifecycle connect/close.
- Mapper con `workflowId = runId`, mapping status y task queue MVP.

### PR-2 — `adapter-temporal` runnable MVP (WorkerHost + Workflow + Activities)

**Archivos clave**

- `packages/adapter-temporal/src/TemporalWorkerHost.ts`
- `packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/adapter-temporal/src/activities/StepActivity.ts`

**Done**

- Workflow ejecutado en entorno sandboxed/determinista (sin Node/DOM APIs en código de workflow).
- Evidencia mínima: workflow start + activity executed + completion event persisted + query/status devuelve proyección del store.

### PR-3 — Engine wiring (real adapter por defecto, stub solo test)

**Objetivo**

- Retirar stub del camino normal de ejecución.

### PR-4 — Idempotent Event Sink + RunState persistence contract (MVP)

**Objetivo**

- Cubrir semántica at-least-once sin duplicados.

### PR-5 — Tests (unit + integration con entorno Temporal)

**Objetivo**

- Harness estable para CI.

**Estrategia recomendada**

- Base CI: `TestWorkflowEnvironment.createTimeSkipping()`.
- Fallback documentado: entorno local/server completo cuando el CI lo requiera.

### PR-6 — CI + documentación operativa

**Objetivo**

- Hacer ejecutable y mantenible por el equipo.

---

## 4) Tabla check de seguimiento

| ID   | Entregable                          | Estado     | Evidencia requerida                                                             | Dependencias       |
| ---- | ----------------------------------- | ---------- | ------------------------------------------------------------------------------- | ------------------ |
| PR-0 | Canonical tracking #5/#68           | ⬜ Pending | Comentarios/estado de issues actualizado                                        | —                  |
| PR-1 | Client+Config+Mapper                | ⬜ Pending | Código + unit tests + lint                                                      | PR-0               |
| PR-2 | Worker+Workflow+Activities MVP      | ⬜ Pending | Run real en Temporal en integración                                             | PR-1               |
| PR-3 | Engine usa adapter real por defecto | ⬜ Pending | Boot real sin stub en modo normal                                               | PR-2               |
| PR-4 | Idempotencia + persistencia mínima  | ⬜ Pending | Test sin duplicados por retry                                                   | PR-3, #6 (parcial) |
| PR-5 | Suite tests estable CI              | ⬜ Pending | Unit+integration en verde usando `TestWorkflowEnvironment.createTimeSkipping()` | PR-4               |
| PR-6 | CI + docs operativas                | ⬜ Pending | README + workflow CI + roadmap/status                                           | PR-5               |

---

## 5) Criterios de aceptación global (MVP)

1. `packages/adapter-temporal/src/index.ts` deja de ser placeholder.
2. `packages/engine/src/adapters/temporal/TemporalAdapterStub.ts` sale del flujo normal de producción.
3. Flujo mínimo validado: `startRun -> signal/query/status -> cancel`.
4. Idempotencia demostrada en retries de activities.
5. Estado de run derivado de eventos persistidos.
6. Tracking normalizado (#5/#68) sin ambigüedad de alcance.

---

## 6) Dudas a resolver

1. Resuelta: #68 queda canónica (épica) y #5 pasa a superseded.
2. Resuelta: CI primero con harness embebido (`createTimeSkipping`), docker/local server como fallback.
3. Resuelta con condiciones: `in-memory` permitido temporalmente para PR-4, pero con semántica equivalente de idempotencia y marcado test/dev-only.

---

## 7) Texto operativo para PR-0 (tracking)

### 7.1 Comentario de cierre para #5 (superseded)

```md
Cierro #5 como **superseded** por #68.

Motivo:

- El alcance original de #5 incluye referencias a layout legacy (`engine/...`) y nomenclatura previa.
- La implementación Temporal real debe ejecutarse y testearse en rutas activas **`packages/*`** (monorepo actual).

Nuevo punto de verdad:

- **#68** queda como épica canónica para Temporal Adapter (Client + Worker + Workflow + Activities + tests + CI).
- Documento de estado/plan (rama): `docs/issue-5-implementation-proposal`.

Bloqueo que resuelve #68:

- Eliminar `TemporalAdapterStub` del flujo normal.
- Añadir wiring real Temporal SDK en `packages/adapter-temporal` + integración engine.
- Suite de pruebas de integración (Temporal + engine) y semántica idempotente (at-least-once).
```

### 7.2 Cuerpo sugerido para #68 (épica canónica)

```md
# #68 — Temporal Adapter (Epic, canonical)

**Scope**: Implementación ejecutable del Temporal Adapter en rutas activas `packages/*` (monorepo).
**Status**: ACTIVE — Bloqueante para golden paths y validación determinista multi-adapter.

## Principios no negociables

1. planner ≠ engine ≠ state ≠ UI
2. Determinismo en workflow
3. Efectos externos en activities (idempotencia)
4. RunStateStore como source of truth
5. Versionado de workflow para replay/evolución

## Checklist

- [ ] PR-0 tracking
- [ ] PR-1 foundation
- [ ] PR-2 runnable MVP
- [ ] PR-3 engine wiring
- [ ] PR-4 idempotencia + persistencia
- [ ] PR-5 tests CI
- [ ] PR-6 CI + docs
```

---

## 8) Referencias

- Temporal TypeScript SDK: https://docs.temporal.io/develop/typescript
- Determinism / core app: https://docs.temporal.io/develop/typescript/core-application
- Testing suite: https://docs.temporal.io/develop/typescript/testing-suite
- Versioning: https://docs.temporal.io/develop/typescript/versioning
- Message passing: https://docs.temporal.io/develop/typescript/message-passing

---

## 9) Avance de implementación (2026-02-13)

### PR-1 ejecutado en código

- Config foundation implementada en `packages/adapter-temporal/src/config.ts`.
- Client wrapper lifecycle implementado en `packages/adapter-temporal/src/TemporalClient.ts`.
- Mapper base implementado en `packages/adapter-temporal/src/WorkflowMapper.ts`.
- Exports públicos habilitados en `packages/adapter-temporal/src/index.ts`.

### Validación técnica

- Tests del paquete actualizados y en verde (`4 passed`) en `packages/adapter-temporal/test/smoke.test.ts`.
- Build TypeScript del paquete en verde (`tsc -p tsconfig.json`).

### Nota de alcance

Este avance cubre el objetivo de PR-1 (foundation). La ejecución real de workflows/activities (PR-2) queda como siguiente paso.

### Endurecimiento aplicado tras revisión

- El wrapper ya no es fake: usa conexión real de Temporal con `Connection.connect` + `Client`.
- Se añadió control de concurrencia `single-flight` para `connect()` concurrente.
- `close()` cierra recursos reales vía `connection.close()`.
- `identity` queda opcional para permitir default nativo del SDK.
