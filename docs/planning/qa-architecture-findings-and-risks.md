---
title: QA Architecture Findings And Risks
status: Draft
owner: docs
last_reviewed: 2026-03-22
planning_type: reference
---

# QA Architecture Findings And Risks

Lo que falta en DVT+ que seria valioso:

- Sintaxis de seleccion rica (equivalente a `dbt --select tag:daily+`)
- Partition-aware planning
- IArtifactResolver concreto; sin `manifestRef` no opera

Son gaps reales, no diferencias de filosofia.

## QA RC-D1 - Revision dura (2026-03-22)

### Hallazgos

1. Severidad: Alta
   Tema: Fuga de detalle interno en endpoint publico de health.
   Evidencia: antes `server.ts` construia `reason` desde `err.message` y `health.ts` lo exponia en `/healthz`.
   Riesgo: `err.message` podia incluir detalles de infraestructura (host/DB/provider), y `/healthz` es publico.
   Accion aplicada: se reemplazo por `reasonCode` estable (`bootstrap_failed` o `runtime_unavailable`) y detalle interno solo en logs.

2. Severidad: Media
   Tema: Invariante de degradacion no cerrado para fallo post-start.
   Evidencia: inicialmente solo se marcaba `degraded` en fallo de bootstrap.
   Riesgo: si el reconciler caia despues de `start()`, `/healthz` podia quedar en `healthy`.
   Accion aplicada: se introdujo senal runtime (`onSweepFailure`/`onSweepSuccess`) conectada al estado de health.

3. Severidad: Media
   Tema: Cobertura de test negativo incompleta para contrato de health.
   Evidencia: faltaban asserts de no-exposicion de `reason` y fallback de `reasonCode`.
   Riesgo: regresiones silenciosas del payload publico.
   Accion aplicada: se agregaron tests para ausencia de `reason` en estados no degradados y fallback determinista de `reasonCode`.

### Veredicto QA

- Estado: Aceptacion condicionada (lista para merge de slice RC-D1).
- RC-D1 ahora cierra el objetivo funcional y los hallazgos QA clave para visibilidad operativa del reconciler.

## QA RC-D1A - Watchdog recovery regression (2026-03-23)

### Hallazgos

1. Severidad: Alta
   Tema: La nueva regresion cubre solo helpers, no el wiring real del watchdog.
   Evidencia: el test agregado ejercita `evaluateAndMarkReconcilerHealthStale()` y `buildReconcilerHealthHooks()`, pero no pasa por el flujo de `main()` que actualiza `lastSweepSignalAtMs`, instala el `setInterval` y limpia el watchdog en `onClose`.
   Riesgo: un error en la integracion real del runtime podria seguir pasando verde aunque la regresion helper siga verde.
   Accion aplicada: se fijo un ciclo minimo de degradacion y recuperacion en la suite de server tests.

2. Severidad: Media
   Tema: Falta fijar el borde exacto del umbral de stale.
   Evidencia: la regresion usa valores claramente por encima del umbral, pero no cubre el caso `nowMs - lastSweepSignalAtMs === staleMs`.
   Riesgo: un cambio accidental de `>` a `>=` en la logica de stale seguiria sin romper este test.
   Accion aplicada: ninguna aun; conviene fijarlo con un test adicional.

### Tests faltantes

1. Integracion watchdog real:
   - cubrir el wiring de `main()` o un wrapper equivalente;
   - verificar que `lastSweepSignalAtMs` se actualiza en `onSweepSuccess` y `onSweepFailure`;
   - verificar que el interval marca `runtime_unavailable` y luego recupera `healthy`.
2. Borde de umbral:
   - cubrir el caso exacto `nowMs - lastSweepSignalAtMs === staleMs`;
   - dejar fijado si el contrato es estricto `>` o inclusivo `>=`.

### Veredicto QA

- Estado: Aceptacion condicionada.
- El slice aporta valor como regresion, pero todavia no cierra la cobertura de watchdog integrada que el riesgo abierto pide.

## Constancia formal de riesgos y descubrimientos (2026-03-22)

- Riesgo abierto registrado:
  - [R-20260322-API-HEALTH-01 - API health puede reportar estado saludable cuando el reconciler falla despues del arranque](../risk-register/quality/R-20260322-api-health-reconciler-runtime-degradation-visibility.md)
- Descubrimientos subsanados:
  - fuga de detalle interno en `/healthz` mitigada con `reasonCode` sanitizado;
  - senal runtime post-start incorporada en estado de health.
- Residual:
  - ampliar en una siguiente iteracion con metrica dedicada y test de transicion controlada en runtime real para reducir riesgo operacional residual.
