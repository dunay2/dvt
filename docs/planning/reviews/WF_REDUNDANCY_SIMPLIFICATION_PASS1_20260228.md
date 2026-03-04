---
title: Workflow Redundancy Simplification Pass 1
status: Review
owner: ci-cd
last_reviewed: 2026-02-28
---

## Objetivo

Reducir duplicidad de checks en workflows de GitHub Actions durante el modo de estabilización manual (`workflow_dispatch`), manteniendo bajo riesgo operativo y trazabilidad explícita de ownership.

## Alcance del pass

- Solo simplificación mínima de alto valor.
- Sin tocar alcance de Graph/KG.
- Sin reactivar triggers automáticos (`push`/`pull_request`) en esta iteración.

## Redundancias detectadas

1. `pnpm test:contracts:compile` estaba duplicado entre:
   - `.github/workflows/contracts.yml`
   - `.github/workflows/pr-quality-gate.yml`
2. `pnpm validate:contracts` aparece en:
   - `.github/workflows/contracts.yml`
   - `.github/workflows/golden-paths.yml`
   - Nota: se mantiene en esta fase por compatibilidad operativa del modo estabilización.

## Matriz de ownership canónico (actualizada)

| Check / capacidad                                           | Workflow canónico                                        | Estado en Pass 1                                  |
| ----------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| Compilación de contratos TS (`pnpm test:contracts:compile`) | `.github/workflows/contracts.yml` (`contract-compile`)   | **Consolidado**                                   |
| Validación de fixtures (`pnpm validate:contracts`)          | `.github/workflows/contracts.yml` (`contract-validate`)  | Parcial (aún coexistencia con `golden-paths.yml`) |
| Lint determinismo (`pnpm lint:determinism`)                 | `.github/workflows/contracts.yml` (`determinism-checks`) | Estable                                           |
| Type-check global opcional (`pnpm type-check`)              | `.github/workflows/pr-quality-gate.yml`                  | Estable                                           |
| Build/Test/Typecheck por workspace                          | `.github/workflows/ci.yml`                               | Estable                                           |

## Cambio implementado (Pass 1)

Se eliminó del workflow de calidad PR el paso duplicado de compilación de contratos:

- Eliminado: step `Compile contracts (fast-fail)` en `.github/workflows/pr-quality-gate.yml`.
- Conservado: job `contract-compile` en `.github/workflows/contracts.yml` como dueño único de esa verificación.

## Verificación de coherencia

- Todos los workflows críticos siguen en modo manual (`workflow_dispatch`).
- La compilación de contratos continúa cubierta por `contracts.yml`.
- No se introducen checks nuevos ni cambios de política de merge.

## Riesgo

Riesgo bajo: se elimina duplicidad, no cobertura.

## Siguiente simplificación recomendada (Pass 2)

1. Resolver ownership final de `pnpm validate:contracts` para evitar coexistencia entre `contracts.yml` y `golden-paths.yml`.
2. Evaluar extracción de setup repetido (Node + pnpm + cache + install) a workflow reusable para reducir mantenimiento.
