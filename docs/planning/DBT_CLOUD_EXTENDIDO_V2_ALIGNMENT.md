# Alineación DVT vs Especificación «DBT Cloud Extendido V2»

<!--
Status: derived
Last-updated: 2026-02-21
Owner: dunay2
Source-of-truth: docs/planning/DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md
-->

## Alcance

Este análisis compara la especificación fuente en [DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md](./DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md) contra el estado actual de DVT.

## Resumen ejecutivo

- **Alineado**: motor determinista, contratos normativos, semántica de ejecución, seguridad base, observabilidad de arquitectura.
- **Parcial**: capa API Fastify/OpenAPI, ejecución tipo dbt-runner, modelo explícito `ExecutionPlan` con aprobaciones y coste.
- **Faltante**: stack frontend completo (React Flow/elkjs), integración dbt artifacts (`manifest.json`, `catalog.json`, `run_results.json`), FinOps operativo con query tags y correlación de coste.

## Matriz de alineación (0–16)

| Sección spec                | Estado             | Evidencia actual DVT                                                                                                                     | Brecha principal                                            |
| --------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 0. Propósito                | ✅ Alineado        | Roadmap y contratos versionados en [ROADMAP.md](../../ROADMAP.md) y [docs/architecture/engine/INDEX.md](../architecture/engine/INDEX.md) | —                                                           |
| 1. Rol/alcance              | ✅ Alineado        | Dirección arquitectónica ya definida por fases y contratos                                                                               | —                                                           |
| 2. Definición dbt/artifacts | ⚠️ Parcial         | Hay orientación a workflows deterministas, pero no módulo explícito de artifacts dbt                                                     | Ingesta/normalización dbt no implementada                   |
| 3. Objetivo funcional       | ⚠️ Parcial         | Ejecución/estado/auditoría orientada a engine                                                                                            | Falta UX completa y capa dbt-centric                        |
| 4. Principios               | ✅ Alineado        | Separación de contratos/semántica/eventos en docs de engine                                                                              | Formalizar `LogicalGraph/CanvasState` como bounded contexts |
| 5. Stack obligatorio        | ❌ Faltante        | Backend TS existe, pero Fastify no está integrado; frontend no está implementado con ese stack                                           | Gap de plataforma full-stack                                |
| 6. Arquitectura general     | ✅ Alineado        | Enfoque modular con adapters/workers y contratos                                                                                         | —                                                           |
| 7. Modelo de dominio        | ⚠️ Parcial         | `Run`, eventos, snapshots presentes                                                                                                      | Falta `LogicalGraph` dbt + `CanvasState` explícito          |
| 8. ExecutionPlan v2         | ⚠️ Parcial         | Existe planificación en roadmap y semántica de ejecución                                                                                 | Falta contrato formal de plan con aprobaciones/coste        |
| 9. Policies engine          | ⚠️ Parcial         | Dirección de capacidades/políticas en contratos y roadmap                                                                                | Falta runtime policy engine extensible formal               |
| 10. Ejecución               | ⚠️ Parcial         | Ciclo de ejecución del engine y adapters en progreso                                                                                     | Falta runner dbt Core end-to-end                            |
| 11. FinOps                  | ❌ Faltante        | No hay módulo FinOps operativo integrado                                                                                                 | Falta estimación/coste real por ejecución                   |
| 12. Observabilidad          | ⚠️ Parcial         | Guías de observabilidad y runbooks existen                                                                                               | Falta trazado e2e UI→API→Plan→Run→Query implementado        |
| 13. Seguridad               | ✅/⚠️ Parcial alto | Threat model + invariantes + contratos de auth en docs                                                                                   | Falta implementación completa Keycloak/Casbin productizada  |
| 14. Multi-tenant            | ⚠️ Parcial         | Semántica tenant está en contratos/invariantes                                                                                           | Falta modelo operativo completo Tenant→Org→Project→Env      |
| 15. Plugins                 | ⚠️ Parcial         | Hay enfoque extensible y capacidades                                                                                                     | Falta SDK/plugin manifest operativo                         |
| 16. UI                      | ❌ Faltante        | No hay front implementado con vistas objetivo                                                                                            | Gap completo de producto UI                                 |

## Fortalezas reutilizables de DVT para enriquecer la visión DBT

1. Contratos normativos y versionado ya consolidados.
2. Modelo de eventos/snapshots e idempotencia ya definido.
3. Roadmap por fases con trazabilidad en issues.
4. Base sólida para seguridad y operación (threat model + runbooks).

## Propuesta de enriquecimiento (prioridad)

### P0 — Fundacional

1. Crear contrato `DbtArtifactsIngestion.v1` (manifest/catalog/run_results).
2. Definir `ExecutionPlan.v2` como contrato normativo separado.
3. Introducir API boundary Fastify + OpenAPI 3.1 (sin acoplar al core).

### P1 — Producto

1. Crear módulo `LogicalGraph` y `CanvasState` (separación explícita de modelos).
2. Implementar `PolicyEngine` determinista (`evaluate(context) -> Decision[]`).
3. Definir `RunApproval` y flujo `awaiting_approval` para operaciones críticas.

### P2 — Escalado

1. Integrar FinOps: estimación pre-run + coste real post-run.
2. Definir manifiesto de plugins y permisos.
3. Iniciar frontend de workspace de grafo (React Flow + layout engine).

## Decisión recomendada

Usar la especificación DBT V2 como **target architecture** para DVT, pero ejecutar incrementalmente sobre la base contractual ya existente, evitando un “rewrite”.
