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

## Constancia formal de riesgos y descubrimientos (2026-03-22)

- Riesgo abierto registrado:
  - [R-20260322-API-HEALTH-01 - API health puede reportar estado saludable cuando el reconciler falla despues del arranque](../risk-register/quality/R-20260322-api-health-reconciler-runtime-degradation-visibility.md)
- Descubrimientos subsanados:
  - fuga de detalle interno en `/healthz` mitigada con `reasonCode` sanitizado;
  - senal runtime post-start incorporada en estado de health.
- Residual:
  - ampliar en una siguiente iteracion con metrica dedicada y test de transicion controlada en runtime real para reducir riesgo operacional residual.
