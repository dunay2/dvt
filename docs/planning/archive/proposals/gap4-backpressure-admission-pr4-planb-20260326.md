---
title: G4-PR4 Operability & Metrics - Plan B
status: Ready to implement
owner: Architecture / API
last_reviewed: 2026-03-26
planning_type: proposal
---

# G4-PR4: Admission Control Operability - Plan B

## Goal

Cerrar la brecha de operabilidad de admisión con menor riesgo de regressión:

1. instrumentar primero sin romper contratos públicos existentes
2. migrar contratos a unión discriminada en una segunda fase controlada
3. mantener trazabilidad y métricas desde el primer merge

## Strategy

Plan B divide PR4 en dos tracks:

- **Track A (non-breaking first):** observabilidad real y métricas de capacidad sin cambiar la firma actual de `AdmissionTelemetry`.
- **Track B (breaking hardening):** migración de `recordDecision(input-bag)` a `record(AdmissionDecisionRecord)` con unión discriminada y limpieza final.

## Scope

### In Scope

- reemplazo de `NoopAdmissionTelemetry` por implementación real basada en `IObservability`
- decorator de backpressure store para emitir gauges de capacidad
- wiring en `buildProtectedRuntimeModule.ts`
- tests unitarios de adapters y decorator
- runbook operativo mínimo para modos `off|observe|enforce`

### Out Of Scope

- cambiar contrato del puerto en el primer corte
- snapshot proyectado adicional
- retry-after dinámico per-tenant
- cambios en paquetes engine/delivery fuera del boundary API

## Architecture Target

Se mantiene hexagonal:

- Puertos en `application/ports`
- Orquestación en `application/services`
- Adaptadores de observabilidad en `infrastructure/*`
- Wiring solo en composition root

## Phased Execution

## Phase 1 - Operability without contract break

1. Implementar `ObservabilityAdmissionTelemetry` adaptando el contrato actual (`recordDecision`).
2. Introducir `IBackpressureCapacityTelemetry` y `ObservabilityBackpressureCapacityTelemetry`.
3. Introducir `MetricsEmittingBackpressureStore` como decorator.
4. Wire en `buildProtectedRuntimeModule.ts`.
5. Añadir tests de counters/gauges/logging y del decorator.

Resultado esperado: métricas y logs productivos activos sin churn de contrato.

## Phase 2 - Contract hardening (planned break)

1. Migrar `AdmissionTelemetry` a:
   - `record(event: AdmissionDecisionRecord)`
   - unión discriminada exhaustiva
2. Ajustar `BackpressureAwareStartRunUseCase` y adapters.
3. Eliminar compatibilidad de firma anterior.
4. Reforzar tests de exhaustividad por variantes de decisión.

Resultado esperado: ISP/OCP fuertes y exhaustividad compile-time.

## TDD Plan

### Phase 1 tests

- `ObservabilityAdmissionTelemetry.test.ts`
  - emite `decision_total` para accept/duplicate/reject/would_reject
  - emite `rejection_total` solo en rechazos
  - no usa `tenantId`/`runId` como labels métricos
  - no rompe flujo si observability falla
- `ObservabilityBackpressureCapacityTelemetry.test.ts`
  - gauges correctos para `live|cache|fallback`
- `MetricsEmittingBackpressureStore.test.ts`
  - propaga snapshot del delegate
  - emite snapshot a telemetry
  - swallow de errores de telemetry

### Phase 2 tests

- actualización de tests anteriores a unión discriminada
- cobertura exhaustiva por decisión con `switch` total

## Microcommit Sequence

1. `feat(api): add observability admission telemetry adapter (non-breaking)`
2. `feat(api): add backpressure capacity telemetry port and adapter`
3. `feat(api): add metrics-emitting backpressure store decorator`
4. `wire(api): enable admission telemetry and capacity metrics in runtime module`
5. `docs(api): add admission operability runbook for mode rollout`
6. `refactor(api): migrate admission telemetry to discriminated union contract`
7. `refactor(api): remove legacy recordDecision signature and finalize tests`

## Risks And Mitigations

- **R1: Contract churn rompe integración interna.**
  - Mitigación: Fase 1 non-breaking, migración en Fase 2.
- **R2: Cardinalidad alta en métricas.**
  - Mitigación: prohibir `tenantId` y `runId` en labels.
- **R3: Telemetry impacta latencia/admisión.**
  - Mitigación: emisión best-effort, errores swallow en adapters.

## Tooling Policy

- ESLint se mantiene en rama estable 9.x en todo el monorepo.
- No se adopta ESLint 10 hasta compatibilidad oficial de plugins críticos
  (en particular `eslint-plugin-import` para `import/order`).

## Validation Baseline

- `pnpm --filter dvt-api test`
- `pnpm --filter dvt-api build`
- `pnpm verify:prepush`

## Acceptance Criteria

- métricas de admisión y capacidad visibles en runtime
- no regresión en flujo `off|observe|enforce`
- sin cambios en contratos engine/delivery fuera del scope API
- migración a unión discriminada cerrada en Fase 2, con tests verdes

## Progress Tracker

- [ ] Phase 1 complete: adapters + decorator + wiring + tests
- [ ] Runbook operability merged
- [ ] Phase 2 complete: discriminated union migration
- [ ] Legacy signature removed
- [ ] `verify:prepush` green
