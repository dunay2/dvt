---
id: R-20260322-API-HEALTH-01
title: API health puede reportar estado saludable cuando el reconciler falla despues del arranque
status: Open
date: 2026-03-22
owners:
  - api
  - runtime
  - ops
severity: Medium
probability: Medium
---

# R-20260322-API-HEALTH-01 - API health puede reportar estado saludable cuando el reconciler falla despues del arranque

## Contexto

El trabajo `RC-D1` incorporo estado del intent reconciler en `/healthz` y
ahora reporta degradacion tanto en bootstrap fallido como en fallo runtime de
sweep.

## Riesgo residual

Aunque `/healthz` ahora transiciona `healthy/degraded` con senal runtime,
permanece un riesgo residual: escenarios de degradacion que no disparen callback
de sweep (por ejemplo bloqueo silencioso o estancamiento) pueden no verse de
forma inmediata.

## Impacto

- posibles falsos negativos parciales en health checks de plataforma;
- deteccion tardia de fallos no cubiertos por callbacks actuales;
- riesgo de acumulacion de intents en escenarios de estancamiento.

## Mitigaciones implementadas

- `/healthz` expone estado por componente (`intentReconciler`);
- degradacion de bootstrap reportada con `reasonCode: bootstrap_failed`;
- degradacion runtime reportada con `reasonCode: runtime_unavailable`;
- watchdog de estancamiento runtime integrado con polling de salud y marca de sweep;
- payload publico sanitizado (sin `err.message`);
- tests de contrato cubren `disabled`, `starting`, `degraded`,
  no-exposicion de `reason`, y fallback de `reasonCode`.
- test de integracion cubre degradacion por estancamiento y recuperacion via
  `markSweepSignal` (`apps/api/test/server.test.ts`).

## Subsanacion adicional recomendada

1. Agregar metrica dedicada de disponibilidad runtime del reconciler.
2. Incorporar timeout/heartbeat para detectar estancamiento sin excepcion.
3. Agregar test de integracion de transicion controlada `healthy -> degraded`
   con runtime real.

## Evidencia

- `apps/api/src/routes/health.ts`
- `apps/api/src/server.ts`
- `apps/api/src/runtime/intentReconcilerRuntime.ts`
- `apps/api/test/app.test.ts`
- `docs/planning/qa-architecture-findings-and-risks.md`
