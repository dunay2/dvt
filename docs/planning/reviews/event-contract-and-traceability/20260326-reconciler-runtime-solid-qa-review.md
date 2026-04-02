---
title: Reconciler Runtime SOLID QA Review
status: Draft
owner: API / Runtime / QA
last_reviewed: 2026-04-02
planning_type: review
---

# Reconciler Runtime SOLID QA Review

## Prioridad 1 (Alta) - Cerrado

### Hallazgo (original)

`server.ts` mantiene logging con texto libre en shutdown y rompe la
homogeneidad de eventos estructurados.

### Evidencia (historica)

- `apps/api/src/server.ts`
  - `app.log.error({ err }, 'intent reconciler shutdown failed')`

### Riesgo (historico)

Inconsistencia en observabilidad, menor capacidad de filtrado/alertado por
evento y deriva de convenciones en runtime.

### Recomendacion (aplicada)

Convertir el shutdown failure a evento estructurado y reutilizar catalogo de
eventos del modulo runtime.

### Estado actual

Resuelto: `server.ts` emite evento estructurado de shutdown fallido usando
`RECONCILER_RUNTIME_EVENTS.shutdownFailed`, sin texto libre.

## Prioridad 2 (Media) - Cerrado

### Hallazgo (original)

`startReconcilerHealthWatchdog` no valida `staleMs` y `pollMs` de entrada.

### Evidencia (historica)

- `apps/api/src/runtime/reconcilerHealthWatchdog.ts`
  - uso directo de `config.staleMs` y `config.pollMs` sin guardas

### Riesgo (historico)

Con valores invalidos (`<= 0`, `NaN`, `Infinity`) puede haber polling
patologico o degradaciones inconsistentes.

### Recomendacion (aplicada)

Agregar validacion defensiva de config al inicio y fallar rapido con error
explicito.

### Estado actual

Resuelto: `startReconcilerHealthWatchdog` valida `staleMs` y `pollMs` como
numeros finitos positivos y falla rapido con error explicito.

## Prioridad 3 (Media) - Cerrado

### Hallazgo (original)

`reconcilerRuntimeBootstrap.ts` concentra varias responsabilidades:
orquestacion de bootstrap, mapeo de hooks y transiciones de estado inicial.

### Evidencia (historica)

- `apps/api/src/runtime/reconcilerRuntimeBootstrap.ts`
  - `buildReconcilerHealthHooks`
  - `withWatchdogSweepSignalHooks`
  - `bootstrapIntentReconciler`

### Riesgo (historico)

Mayor costo de cambio y menor aislacion de decisiones de dominio frente a
adaptadores de infraestructura.

### Recomendacion (aplicada)

Extraer fabrica de hooks de salud y orquestador de bootstrap en modulos
separados para cumplir SRP estricto.

### Estado actual

Resuelto: bootstrap separado en modulos dedicados:
`reconcilerRuntimeHealthHooks.ts` (hooks) y
`reconcilerRuntimeLifecycle.ts` (orquestacion), dejando
`reconcilerRuntimeBootstrap.ts` como fachada de exportacion.

## Prioridad 4 (Alta) - Cerrado

### Hallazgo (original)

Inversion de dependencias en la capa de health: `healthContract.ts` depende de
`healthPresenter.ts` para construir el schema HTTP.

### Evidencia (historica)

- `apps/api/src/routes/healthContract.ts`
  - importa `OVERALL_HEALTH_STATUS_VALUES`, `READINESS_STATUS`,
    `READINESS_REASON_CODE_VALUES` desde `healthPresenter.ts`

### Riesgo (historico)

Acoplamiento entre contrato y presenter; evoluciones de schema quedan atadas a
la implementacion de mapeo.

### Recomendacion (aplicada)

Extraer valores de contrato a modulo de contrato puro y hacer que presenter
dependa del contrato (no al reves).

### Estado actual

Resuelto: `healthContract.ts` ya no importa `healthPresenter.ts`; el contrato
es independiente y el presenter depende del contrato.

## Prioridad 5 (Media) - Cerrado

### Hallazgo (original)

`/readyz` mejoro (200/503), pero readiness sigue basarse solo en estado del
reconciler y no en dependencias operativas reales.

### Evidencia (historica)

- `apps/api/src/routes/health.ts`
  - handler usa `evaluateReadiness(opts.getIntentReconcilerHealth())`
- `apps/api/src/routes/healthPresenter.ts`
  - `evaluateReadiness` solo evalua estados del reconciler

### Riesgo (historico)

Persisten falsos positivos de readiness si otras dependencias (DB/infra) fallan
mientras reconciler no esta `starting/degraded`.

### Recomendacion (aplicada)

Agregar checks de readiness reales por puerto (DB/adaptadores criticos) e
integrarlos a la decision de `/readyz`.

### Estado actual

Resuelto: `/readyz` evalua policy por puertos reales (estado reconciler, DB y
runtime adapters) via modulos dedicados de readiness.

## Prioridad 6 (Baja) - Cerrado

### Hallazgo (original)

`buildReadyzPayload` quedo sin uso tras la nueva evaluacion de readiness.

### Evidencia (historica)

- `apps/api/src/routes/healthPresenter.ts`
  - funcion exportada no referenciada por `health.ts`

### Riesgo (historico)

Ruido accidental y deuda menor de mantenimiento.

### Recomendacion (aplicada)

Eliminar la funcion muerta y mantener el modulo sin exports huerfanos.

### Estado actual

Resuelto: `buildReadyzPayload` fue eliminado y no hay referencias activas.

## Reconciliacion H0 - Baseline real del slice health

Los items que reaparecieron en `LOCAL_EXECUTION_LOG_20260401.md` como trabajo
abierto de health/readiness ya estaban entregados en codigo y no deben volver a
entrar al backlog de implementacion.

### Estado real verificado

- `apps/api/src/routes/healthContractMapper.ts`
  - ya existe como traductor explicito `runtime -> contrato`.
- `apps/api/src/routes/healthPresenter.ts`
  - ya es una fachada minima que solo reexporta el mapper.
- `apps/api/src/runtime/reconcilerHealth.ts`
  - ya modela `ReconcilerHealthState` como discriminated union; `reasonCode`
    solo existe en `status: 'degraded'`.

### Decision operativa

1. No reabrir como implementacion los items "crear mapper", "crear DU" o
   "limpiar presenter".
2. Mantener ese trabajo como cerrado y usar `apps/api` tests como baseline de
   validacion.
3. Concentrar el trabajo abierto restante en `RC-G1` (ownership contractual).

## Prioridad 7 (Alta) - Abierto

### Hallazgo

Deuda de ownership contractual: la taxonomia `engine/planner/shared` no refleja
todavia una asignacion clara en la frontera fisica de contratos y puede derivar
en concentracion accidental en shared.

### Evidencia

- `docs/contracts/engine/index.md`
- `docs/contracts/planner/index.md`
- `docs/contracts/shared/index.md`
- `packages/@dvt/contracts/src/contracts/planner/*`
- `packages/@dvt/contracts/src/engine/*`
- `docs/planning/proposals/contracts-domain-ownership-migration-plan-20260327.md`
- seguimiento operativo en `docs/planning/state/agent-lane-a.yaml` como `RC-G1`

### Riesgo

- Ambiguedad de ownership semantico vs fisico.
- Deriva de reglas/literales entre runtime y contrato.
- Evolucion menos auditable por bounded context.

### Recomendacion

Ejecutar `RC-G1`: matriz de ownership por familia (`engine`/`planner`/`shared`)
y plan de migracion por slices bajo ADR-0041 Contract-First.

### Estado actual

Pendiente, pero ya reconciliado con la superficie canonica:

- `RC-G1` vive en Lane A como tarea paraguas.
- `RC-G1-A` congela la matriz de ownership.
- `RC-G1-B`, `RC-G1-C` y `RC-G1-D` secuencian la migracion restante.

## Resumen Ejecutivo

El runtime cierra los hallazgos priorizados de health/readiness y bootstrap con
separacion modular, validacion defensiva y contrato independiente. El trabajo
abierto real queda reducido a la deuda de ownership contractual bajo `RC-G1`.
