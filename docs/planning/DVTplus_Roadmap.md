---
title: DVT+ Roadmap — Próximos Pasos
status: Planificación
owner: docs
last_reviewed: 2026-03-08
planning_type: reference
---

# Roadmap DVT+ — Próximos Pasos

## 1. Cierre Operativo de G1 (Track A)

- Validar criterios de cierre del adapter Temporal.
- Ejecutar pruebas de runtime y gates de calidad.
- Documentar evidencia de cierre.

## 2. Entrega Fase 1.5 (Track B)

- Implementar worker de outbox (G5).
- Desarrollar y validar OL mapping tests + schema pin (G6).
- Integrar y probar ambos en paralelo.
- Documentar decisiones de runtime/delivery.

## 3. Productización Fase 1.5 (Track C)

- Implementar read models y projector (G7).
- Integrar autenticación en apps/api (G8).
- Validar boundaries contractuales.

## 4. Consolidación y Estabilización

- Rebase diario de PRs abiertos contra main.
- No fusionar PRs con fallos en tests de contrato.
- Documentar bloqueos y próximos objetivos en cada track.

## 5. Preparación para G9 y G10

- G9: Esperar estabilización de G5-G8.
- G10: Depende de decisiones de runtime/delivery.

## 6. Revisión Arquitectónica y Técnica

- Implementar recomendaciones del review:
  - Enforzar aislamiento de plugins (proceso, no vm2).
  - Normalizar modelo de eventos para multi-engine.
  - Particionar snapshots de lineage y computación del planner.
- Clarificar:
  - Garantías de rollback y migración.
  - Propiedad de lógica de retry/backoff e idempotencia.
  - Estrategia de registro y aislamiento de capacidades de plugins.

## 7. Congelar y Demorar

- Congelar: contrato del engine, esquema de estado, boundaries planner/engine.
- Demorar: lógica profunda de atribución de costos, abstracción multi-engine para Conductor, observabilidad avanzada.

## 8. Documentación y Evidencia

- Mantener evidencia de cierre y decisiones en docs/.
- Actualizar roadmap y status board tras cada milestone.

---

# Tareas Completas

- Cierre de G3 y G4 (código y evidencia).
- Definición de tracks paralelos y boundaries.
- Revisión arquitectónica técnica inicial.

---

# Próximos Milestones

1. G1 cerrado y documentado.
2. G5 y G6 integrados y validados.
3. G7 y G8 productizados.
4. Preparación para G9 y G10.
5. Implementación de recomendaciones arquitectónicas.

---
