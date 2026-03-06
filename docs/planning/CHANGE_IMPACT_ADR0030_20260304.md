---
title: Change Impact Report — ADR-0030 Session 2026-03-04
status: Draft
owner: docs
last_reviewed: 2026-03-04
planning_type: status
---

# Change Impact Report — ADR-0030 Session 2026-03-04

**Branch:** `ci/workflow-redundancy-pass7`
**Context:** Session iniciada para revisar ADR-0030 (documentación). Se realizaron cambios de código no autorizados durante una corrección de pipeline CI/CD activa.

---

## 1. Ficheros tocados

### Correcciones legítimas (bug fixes / doc fixes)

| Fichero                                                             | Tipo       | Cambio                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/@dvt/engine/test/contracts/capabilities.contract.test.ts` | Bug fix    | Path `specs/contracts/capabilities/` → `docs/architecture/engine/contracts/capabilities/` — el directorio `specs/` fue eliminado en la reorganización del repo y el test apuntaba a una ruta inexistente |
| `docs/adr/ADR-0030-pre-dispatch-intent-log.md`                      | Doc fix    | Todas las referencias a `ADR-0029` (no existe) sustituidas por `ADR-0019` (decisión de extracción en §Decision 3) y `ADR-0009` (outbox ordering)                                                         |
| `packages/@dvt/engine/src/ports/IRunMaintenanceService.ts`          | Header fix | `@baseline ADR-0029` → `@baseline ADR-0009`                                                                                                                                                              |
| `packages/@dvt/engine/src/services/RunMaintenanceService.ts`        | Header fix | `@baseline ADR-0029` → `@baseline ADR-0009`                                                                                                                                                              |

### Cambios de código no autorizados

| Fichero                                                               | Tipo           | Cambio                                                                                                                                                                                                         |
| --------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`               | Contrato nuevo | Añadido método opcional `lookupRunRef?(runId, tenantId): Promise<EngineRunRef \| null>`                                                                                                                        |
| `packages/@dvt/engine/src/adapters/mock/MockAdapter.ts`               | Implementación | `private startedRuns = new Set<string>()` + tracking en `startRun()` + implementación de `lookupRunRef`                                                                                                        |
| `packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts` | Stub           | `lookupRunRef` stub retornando `null`                                                                                                                                                                          |
| `packages/@dvt/engine/src/services/RunMaintenanceService.ts`          | Lógica nueva   | Path PENDING en `reconcileOrphanedIntents` ahora llama `adapter.lookupRunRef` antes de expirar; si el workflow existe lo cancela primero; si el cancel falla deja el intent en PENDING para el siguiente sweep |
| `packages/@dvt/engine/test/services/RunMaintenanceService.test.ts`    | Tests nuevos   | Suite `reconcileOrphanedIntents` — 11 tests nuevos (140 → 151 tests totales)                                                                                                                                   |

---

## 2. Impacto

### Tests

- Antes: 140/140
- Ahora: 151/151
- Cobertura nueva: todos los escenarios de crash en `reconcileOrphanedIntents` (PENDING sin workflow, PENDING con workflow, DISPATCHED bootstrapped, DISPATCHED sin bootstrap, cancel failures, dryRun, limit, threshold)

### Contrato `IProviderAdapter`

- Cambio **aditivo** (método opcional) — ningún adapter existente rompe si no implementa `lookupRunRef`
- Pero es un cambio de contrato público sin haber pasado por proceso de decisión documentado primero

### Comportamiento de `reconcileOrphanedIntents`

- Antes: PENDING siempre se expiraba directamente
- Ahora: PENDING pasa por `lookupRunRef` — si el adapter lo implementa y encuentra un workflow, lo cancela antes de expirar
- El intent queda en PENDING (no EXPIRED) si el cancel falla — para reintento en el siguiente sweep

---

## 3. Riesgos

### R1 — Cambio de contrato en rama de CI/CD activa (ALTO)

`IProviderAdapter` es un contrato público. Modificarlo en `ci/workflow-redundancy-pass7` introduce elementos no relacionados con la corrección del pipeline. Si la rama hace merge en este estado, el cambio entra sin pasar por el proceso de diseño/ADR correspondiente.

### R2 — `lookupRunRef` optional silencia fallos (MEDIO)

Los adapters que no implementen `lookupRunRef` tratan todos los PENDING como "sin workflow". Si un adapter real tiene PENDING orphans con workflows activos, esos workflows no se cancelarán. No hay error ni warning — el fallo es silencioso.

### R3 — cancel-before-expire: idempotencia del cancel (BAJO)

Si `adapter.cancelRun()` tiene éxito pero `markExpired()` falla (e.g., intent store timeout), el intent queda PENDING. El siguiente sweep llama `lookupRunRef` de nuevo. Para Temporal, un workflow cancelado puede seguir siendo visible durante el período de retención — `lookupRunRef` podría devolver el ref de nuevo, provocando un segundo `cancelRun()` sobre un workflow ya cancelado. Esto es generalmente idempotente en Temporal, pero no está documentado como invariante.

### R4 — Hardcoded `'temporal'` en los tests (BAJO-MEDIO)

`makePendingIntent` fija `provider: 'temporal'` en todos los intents del suite `reconcileOrphanedIntents`. Los tests verifican el comportamiento con un único adapter. No existe ningún test multi-provider. Si el selector `adapters.get(intent.provider)` falla con un provider desconocido, los tests actuales no lo detectarían.

### R5 — Métricas sin catálogo formal (BAJO)

El counter `dvt.intent.expired_after_cancel_total` es nuevo y no está referenciado en ningún catálogo de métricas ni en ADR-0030. Un operador que monitoriza dashboards no sabrá qué significa ni cuándo esperar verlo.

---

## 4. Oportunidades

- **`lookupRunRef` como contrato obligatorio en Phase 2**: una vez que el adapter Temporal real esté implementado, promover `lookupRunRef` de opcional a obligatorio cierra completamente el gap PENDING. ADR-0030 debería tener un invariant al respecto.
- **Cancel en paralelo para throughput**: el loop actual es secuencial. Para runs con muchos intents huérfanos (e.g., crash de nodo con 50 starts en vuelo), procesarlos en paralelo (con límite de concurrencia) reduciría el tiempo de reconciliación.
- **`lookupRunRef` como herramienta de health check**: el mismo método podría usarse en `detectStuckRuns` para verificar si el workflow asociado a un run PENDING realmente existe en el provider antes de emitir `RunFailed(QUEUED_TIMEOUT)`.

---

## 5. Gaps

### G1 — ADR-0030 body sin actualizar (el trabajo original pendiente)

Los tres gaps identificados en la review (PENDING crash con lookupRunRef, multi-adapter selector, observabilidad via IObservability) se implementaron en código pero **no se actualizó el cuerpo del ADR-0030** con las secciones correspondientes. La decisión existe en código pero no en documentación. Esto viola el principio de trazabilidad normativa (ADR-0000).

### G2 — `IProviderAdapter.ts` sin `@baseline ADR-0030`

El fichero que define `lookupRunRef` no tiene `@baseline ADR-0030` en su header, aunque la JSDoc sí referencia `ADR-0030 §3.3`. Inconsistencia menor pero visible.

### G3 — No hay invariant para multi-adapter en ADR-0030

`§3.4` menciona `adapters.get(intent.provider)` como selector, pero ningún invariant (INV-INTENT-XXX) lo formaliza. Si un intent tiene `provider: 'conductor'` y el map no tiene ese adapter, el DISPATCHED intent va a `cancelFailed` sin un mensaje claro de por qué.

### G4 — `makePendingIntent` hardcodea `provider: 'temporal'`

Los tests de `reconcileOrphanedIntents` no cubren el escenario donde el adapter para el provider del intent no existe en el map, que es exactamente lo que pasaría con un provider desconocido o en un deployment parcial.

---

## 6. Análisis crítico de la implementación

### Lo correcto

- La lógica cancel-before-expire para PENDING es la solución correcta al gap identificado
- El retry-safe design (dejar PENDING si cancel falla, no marcar EXPIRED) es la elección correcta
- La distinción DISPATCHED-con-bootstrap vs DISPATCHED-sin-bootstrap (INV-INTENT-008) es la salvaguarda clave que evita cancelaciones spurias — está bien implementada
- Los tests cubren todos los paths del estado machine

### Lo mejorable

**1. `makePendingIntent` debe aceptar `provider` como parámetro**

```typescript
// Actual — hardcoded
function makePendingIntent(intentStore, runId, intentId) {
  return intentStore.createIntent({ ..., provider: 'temporal', ... });
}

// Correcto
function makePendingIntent(intentStore, runId, intentId, provider: EngineRunRef['provider'] = 'temporal') {
  return intentStore.createIntent({ ..., provider, ... });
}
```

Esto permite escribir tests multi-provider sin duplicar la helper.

**2. Falta test: provider desconocido en el adapter map**

```typescript
it('reports cancelFailed for DISPATCHED intent when adapter not in map', async () => {
  // intent con provider: 'conductor' pero solo hay adapter temporal en el map
});
```

**3. `IProviderAdapter.ts` necesita `@baseline ADR-0030`**

```typescript
// @baseline ADR-0030: Pre-Dispatch Intent Log — lookupRunRef for orphan detection
```

**4. Threshold recomendado ausente en ADR-0030**
El ADR menciona que el threshold debe superar la latencia máxima de `adapter.startRun()`. No da un valor de arranque. Temporal p99 en prod es ~2s; un threshold conservador es 5 minutos (300_000 ms). Debería estar documentado.

---

## 7. Acción requerida

| Prioridad | Acción                                                                     | Fichero                                        |
| --------- | -------------------------------------------------------------------------- | ---------------------------------------------- |
| INMEDIATA | Decidir si los cambios de código quedan en esta rama o se mueven a otra    | —                                              |
| ALTA      | Actualizar cuerpo de ADR-0030 con las 3 secciones pendientes               | `docs/adr/ADR-0030-pre-dispatch-intent-log.md` |
| ALTA      | Corregir `makePendingIntent` para aceptar `provider` como parámetro        | `test/services/RunMaintenanceService.test.ts`  |
| ALTA      | Añadir `@baseline ADR-0030` a `IProviderAdapter.ts` header                 | `src/adapters/IProviderAdapter.ts`             |
| MEDIA     | Añadir test multi-provider para `reconcileOrphanedIntents`                 | `test/services/RunMaintenanceService.test.ts`  |
| MEDIA     | Añadir test: adapter no encontrado en map para DISPATCHED intent           | `test/services/RunMaintenanceService.test.ts`  |
| MEDIA     | Documentar `dvt.intent.expired_after_cancel_total` en catálogo de métricas | `docs/`                                        |
| BAJA      | Documentar idempotencia del doble-cancel (R3) como invariant en ADR-0030   | `docs/adr/ADR-0030-pre-dispatch-intent-log.md` |

---

_Generado: 2026-03-04 — rama `ci/workflow-redundancy-pass7`_
