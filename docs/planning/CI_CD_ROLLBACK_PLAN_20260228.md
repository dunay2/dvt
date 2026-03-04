---
title: Plan de reversión CI/CD tras estabilización (2026-02-28)
status: Draft
owner: docs
last_reviewed: 2026-03-04
planning_type: status
---
# Plan de reversión CI/CD tras estabilización (2026-02-28)

## Objetivo

Restaurar progresivamente el modo normal de CI/CD después del periodo de estabilización, minimizando riesgo de rotura y manteniendo trazabilidad de cada cambio.

## Estado actual (modo estabilización)

- Triggers automáticos de `push`/`pull_request` desactivados temporalmente en workflows críticos.
- Ejecución manual habilitada con `workflow_dispatch`.
- Gates pesados puestos como opcionales por `inputs` para poder recuperar verde por capas.

## Cambios temporales aplicados

### Workflows en manual

- `.github/workflows/ci.yml`
- `.github/workflows/contracts.yml`
- `.github/workflows/golden-paths.yml`
- `.github/workflows/test.yml`
- `.github/workflows/pr-quality-gate.yml`
- `.github/workflows/mkdocs-deploy.yml`
- `.github/workflows/release.yml`

### Gates opcionales introducidos

- En `.github/workflows/ci.yml`
  - `run_markdown_lint`
  - `run_traceability_gate`

- En `.github/workflows/contracts.yml`
  - `run_determinism_scan`
  - `run_golden_validation`
  - Se retiró temporalmente `Knowledge Graph Cypher Sync`.

- En `.github/workflows/test.yml`
  - `run_full_test_suite`
  - `run_coverage`

- En `.github/workflows/golden-paths.yml`
  - `run_contract_fixture_validation`

- En `.github/workflows/pr-quality-gate.yml`
  - `run_typecheck_gate`
  - `run_temporal_integration`
  - Checks de PR (título, tamaño, labels, descripción) condicionados a evento `pull_request`.

- En `.github/workflows/mkdocs-deploy.yml`
  - `run_pages_deploy`

## Riesgos conocidos antes de volver a automático

1. **Trazabilidad ADR-0000**
   - Deuda histórica de `MISSING_BASELINE`, `MISSING_VERSION`, `ADR_NOT_ACCEPTED`.

2. **Markdown lint de documentación**
   - Errores acumulados (`MD025`, `MD029`) en docs legacy.

3. **Type-check de adapter temporal**
   - `@dvt/plan-interpreter` no resuelto y parámetros implícitos `any` en `RunPlanWorkflow.ts`.

4. **Validación de fixtures golden**
   - Falta `tenantId` en `EngineRunRef` en varios JSON de planes.

5. **Deploy de MkDocs a gh-pages**
   - El token por defecto no tiene permisos de push en ciertos contextos.

## Estrategia de reversión recomendada

### Fase 1 — Rehabilitación controlada (sin bloquear merges)

1. Mantener `workflow_dispatch` y ejecutar manualmente cada workflow.
2. Resolver deuda técnica por dominio (tests, contracts, docs, release).
3. Activar gates opcionales uno a uno en runs manuales hasta verde estable.

### Fase 2 — Reintroducción de triggers automáticos

1. Reponer `pull_request` en:
   - `ci.yml`
   - `contracts.yml`
   - `test.yml`
   - `pr-quality-gate.yml`

2. Reponer `push` en:
   - `ci.yml`
   - `contracts.yml`
   - `test.yml`
   - `release.yml`
   - `mkdocs-deploy.yml` (cuando permisos/pages estén validados)

3. Reponer `schedule` en `golden-paths.yml` solo cuando golden fixtures estén limpios.

### Fase 3 — Endurecimiento final

1. Eliminar `inputs` temporales y volver a gates obligatorios.
2. Reintroducir (si aplica) checks retirados temporalmente (por ejemplo, KG sync).
3. Confirmar que los checks obligatorios de merge quedan sincronizados con la política real.

## Checklist de salida de estabilización

- [ ] CI automática reactivada en PR y push.
- [ ] Gates de trazabilidad y markdown en verde sin bypass.
- [ ] Type-check global en verde sin excepciones.
- [ ] Golden fixtures validados con esquema completo.
- [ ] Deploy docs y release verificados con permisos correctos.
- [ ] Eliminados inputs temporales de estabilización.

## Criterio de finalización

Se considera completada la reversión cuando todos los workflows estén en modo automático, sin toggles temporales, y con verdes consecutivos en PRs reales durante al menos una ventana de cambios normal.
