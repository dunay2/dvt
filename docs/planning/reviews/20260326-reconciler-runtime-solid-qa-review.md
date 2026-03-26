---
title: Reconciler Runtime SOLID QA Review
status: Draft
owner: API / Runtime / QA
last_reviewed: 2026-03-26
planning_type: review
---

# Reconciler Runtime SOLID QA Review

## Prioridad 1 (Alta)

### Hallazgo

`server.ts` mantiene logging con texto libre en shutdown y rompe la
homogeneidad de eventos estructurados.

### Evidencia

- `apps/api/src/server.ts`
  - `app.log.error({ err }, 'intent reconciler shutdown failed')`

### Riesgo

Inconsistencia en observabilidad, menor capacidad de filtrado/alertado por
evento y deriva de convenciones en runtime.

### Recomendacion

Convertir el shutdown failure a evento estructurado y reutilizar catalogo de
eventos del modulo runtime.

## Prioridad 2 (Media)

### Hallazgo

`startReconcilerHealthWatchdog` no valida `staleMs` y `pollMs` de entrada.

### Evidencia

- `apps/api/src/runtime/reconcilerHealthWatchdog.ts`
  - uso directo de `config.staleMs` y `config.pollMs` sin guardas

### Riesgo

Con valores invalidos (`<= 0`, `NaN`, `Infinity`) puede haber polling
patologico o degradaciones inconsistentes.

### Recomendacion

Agregar validacion defensiva de config al inicio y fallar rapido con error
explicito.

## Prioridad 3 (Media)

### Hallazgo

`reconcilerRuntimeBootstrap.ts` concentra varias responsabilidades:
orquestacion de bootstrap, mapeo de hooks y transiciones de estado inicial.

### Evidencia

- `apps/api/src/runtime/reconcilerRuntimeBootstrap.ts`
  - `buildReconcilerHealthHooks`
  - `withWatchdogSweepSignalHooks`
  - `bootstrapIntentReconciler`

### Riesgo

Mayor costo de cambio y menor aislacion de decisiones de dominio frente a
adaptadores de infraestructura.

### Recomendacion

Extraer fabrica de hooks de salud y orquestador de bootstrap en modulos
separados para cumplir SRP estricto.

## Resumen Ejecutivo

El runtime ya elimino la fachada de compatibilidad, pero aun no alcanza SOLID
estricto por homogeneidad incompleta de eventos, validacion defensiva
insuficiente y concentracion de responsabilidades en bootstrap.
