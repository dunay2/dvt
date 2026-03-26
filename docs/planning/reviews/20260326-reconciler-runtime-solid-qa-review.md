---
title: Reconciler Runtime SOLID QA Review
status: Draft
owner: API / Runtime / QA
last_reviewed: 2026-03-26
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

## Prioridad 7 (Alta) - Abierto

### Hallazgo

Existe deuda de ownership contractual: la taxonomia `engine/planner/shared` no
esta poblada de forma coherente con el objetivo de `ADR-0041` (global) y
`ADR-0041A` (slice health), y hay riesgo de deriva hacia "todo en shared".

### Evidencia

- `docs/contracts/engine/index.md` (catalogo sin contratos concretos listados)
- `docs/contracts/planner/index.md` (catalogo, pero frontera fisica no
  materializada en `docs/contracts/planner`)
- `docs/contracts/shared/index.md`
- `packages/@dvt/contracts/src/contracts/planner/*`
- `packages/@dvt/contracts/src/engine/*`

### Riesgo

- Ambiguedad de ownership semantico vs fisico de contratos.
- Mayor probabilidad de duplicacion de literales/reglas entre runtime y
  contrato.
- Fronteras de compatibilidad menos claras para cambios de `engine` y
  `planner`.

### Recomendacion

Ejecutar una normalizacion contract-first (JSON Schema) por fases:

1. Declarar inventario de contratos por familia (`engine`, `planner`, `shared`)
   con owner semantico y estado de migracion.
2. Mover o etiquetar contratos para evitar que `shared` absorba contratos
   de dominio que no son cross-context.
3. Mantener mapeo explicito runtime -> contract en borde (sin acoplar runtime a
   schema HTTP).

### Donde tocar (pasada inicial)

- `docs/contracts/engine/index.md`
  - añadir matriz de contratos engine y clasificacion (domain-owned vs shared).
- `docs/contracts/planner/index.md`
  - añadir matriz de contratos planner y clasificacion.
- `docs/contracts/shared/index.md`
  - marcar solo contratos realmente cross-context.
- `docs/adr/ADR-0041-global-domain-state-model-and-boundary-contracts.md`
  - anclar checklist de cumplimiento por familia.
- `docs/adr/ADR-0041a-reconciler-health-state-and-readiness-port-semantics.md`
  - referenciar explicitamente contrato boundary health en JSON Schema.
- `packages/@dvt/contracts/src/contracts/planner/*`
  - etiquetar owner/alcance en comments o indices de contrato.
- `packages/@dvt/contracts/src/engine/*`
  - revisar mezcla de contrato de dominio vs shared serializable.

### Estado actual

Pendiente. No resuelto aun.

## Resumen Ejecutivo

El runtime cierra los hallazgos priorizados de health/readiness y bootstrap con
separacion modular, validacion defensiva y contrato independiente.
