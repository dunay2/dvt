---
title: G4-PR4: Admission Control Operability - Plan B
status: Draft
owner: docs
last_reviewed: 2026-04-01
planning_type: proposal
---

---

title: G4-PR4 Operability & Metrics - Plan B
status: Ready to implement
owner: Architecture / API
last_reviewed: 2026-04-01
planning_type: proposal

---

# G4-PR4: Admission Control Operability - Plan B

## Goal

Cerrar la brecha de operabilidad de admisiÃ³n con menor riesgo de regressiÃ³n:

1. instrumentar primero sin romper contratos pÃºblicos existentes
2. migrar contratos a uniÃ³n discriminada en una segunda fase controlada
3. mantener trazabilidad y mÃ©tricas desde el primer merge

## Strategy

Plan B divide PR4 en dos tracks:

- **Track A (non-breaking first):** observabilidad real y mÃ©tricas de capacidad sin cambiar la firma actual de `AdmissionTelemetry`.
- **Track B (breaking hardening):** migraciÃ³n de `recordDecision(input-bag)` a `record(AdmissionDecisionRecord)` con uniÃ³n discriminada y limpieza final.

## Scope

### In Scope

- reemplazo de `NoopAdmissionTelemetry` por implementaciÃ³n real basada en `IObservability`
- decorator de backpressure store para emitir gauges de capacidad
- wiring en `buildProtectedRuntimeModule.ts`
- tests unitarios de adapters y decorator
- runbook operativo mÃ­nimo para modos `off|observe|enforce`

### Out Of Scope

- cambiar contrato del puerto en el primer corte
- snapshot proyectado adicional
- retry-after dinÃ¡mico per-tenant
- cambios en paquetes engine/delivery fuera del boundary API

## Architecture Target

Se mantiene hexagonal:

- Puertos en `application/ports`
- OrquestaciÃ³n en `application/services`
- Adaptadores de observabilidad en `infrastructure/*`
- Wiring solo en composition root

## Phased Execution

## Phase 1 - Operability without contract break

1. Implementar `ObservabilityAdmissionTelemetry` adaptando el contrato actual (`recordDecision`).
2. Introducir `IBackpressureCapacityTelemetry` y `ObservabilityBackpressureCapacityTelemetry`.
3. Introducir `MetricsEmittingBackpressureStore` como decorator.
4. Wire en `buildProtectedRuntimeModule.ts`.
5. AÃ±adir tests de counters/gauges/logging y del decorator.

Resultado esperado: mÃ©tricas y logs productivos activos sin churn de contrato.

## Phase 2 - Contract hardening (planned break)

1. Migrar `AdmissionTelemetry` a:
   - `record(event: AdmissionDecisionRecord)`
   - uniÃ³n discriminada exhaustiva
2. Ajustar `BackpressureAwareStartRunUseCase` y adapters.
3. Eliminar compatibilidad de firma anterior.
4. Reforzar tests de exhaustividad por variantes de decisiÃ³n.

Resultado esperado: ISP/OCP fuertes y exhaustividad compile-time.

## TDD Plan

### Phase 1 tests

- `ObservabilityAdmissionTelemetry.test.ts`
  - emite `decision_total` para accept/duplicate/reject/would_reject
  - emite `rejection_total` solo en rechazos
  - no usa `tenantId`/`runId` como labels mÃ©tricos
  - no rompe flujo si observability falla
- `ObservabilityBackpressureCapacityTelemetry.test.ts`
  - gauges correctos para `live|cache|fallback`
- `MetricsEmittingBackpressureStore.test.ts`
  - propaga snapshot del delegate
  - emite snapshot a telemetry
  - swallow de errores de telemetry

### Phase 2 tests

- actualizaciÃ³n de tests anteriores a uniÃ³n discriminada
- cobertura exhaustiva por decisiÃ³n con `switch` total

## Microcommit Sequence

1. `feat(api): add observability admission telemetry adapter (non-breaking)`
2. `feat(api): add backpressure capacity telemetry port and adapter`
3. `feat(api): add metrics-emitting backpressure store decorator`
4. `wire(api): enable admission telemetry and capacity metrics in runtime module`
5. `docs(api): add admission operability runbook for mode rollout`
6. `refactor(api): migrate admission telemetry to discriminated union contract`
7. `refactor(api): remove legacy recordDecision signature and finalize tests`

## Risks And Mitigations

- **R1: Contract churn rompe integraciÃ³n interna.**
  - MitigaciÃ³n: Fase 1 non-breaking, migraciÃ³n en Fase 2.
- **R2: Cardinalidad alta en mÃ©tricas.**
  - MitigaciÃ³n: prohibir `tenantId` y `runId` en labels.
- **R3: Telemetry impacta latencia/admisiÃ³n.**
  - MitigaciÃ³n: emisiÃ³n best-effort, errores swallow en adapters.

## Validation Baseline

- `pnpm --filter dvt-api test`
- `pnpm --filter dvt-api build`
- `pnpm verify:prepush`

## Acceptance Criteria

- mÃ©tricas de admisiÃ³n y capacidad visibles en runtime
- no regresiÃ³n en flujo `off|observe|enforce`
- sin cambios en contratos engine/delivery fuera del scope API
- migraciÃ³n a uniÃ³n discriminada cerrada en Fase 2, con tests verdes

## Progress Tracker

- [ ] Phase 1 complete: adapters + decorator + wiring + tests
- [ ] Runbook operability merged
- [ ] Phase 2 complete: discriminated union migration
- [ ] Legacy signature removed
- [ ] `verify:prepush` green
