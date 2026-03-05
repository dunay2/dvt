---
title: PR #313 — Informe de ejecución de estabilización CI/CD (2026-02-28)
status: Draft
owner: docs
last_reviewed: 2026-03-05
planning_type: review
---
# PR #313 — Informe de ejecución de estabilización CI/CD (2026-02-28)

## Resumen ejecutivo

Este informe documenta, de extremo a extremo, qué cambios se aplicaron en la rama `split/pr299-contracts-workflow`, cómo se resolvieron conflictos de integración con `main`, qué validaciones manuales se ejecutaron, y por qué la PR [#313](https://github.com/dunay2/dvt/pull/313) sigue bloqueada en el momento de este informe.

Resultado técnico global:

- Se completó la estrategia de estabilización (modo manual con `workflow_dispatch`) en workflows críticos.
- Se resolvió el conflicto de merge en `.github/workflows/contracts.yml`.
- Se corrigieron rutas de paquetes a la estructura real `packages/@dvt/...`.
- Los smoke runs manuales clave quedaron en verde.
- El merge quedó bloqueado por política de rama protegida (no por conflicto de código ni checks rojos).

---

## Contexto y objetivo

La iniciativa partía de un estado de CI/CD inestable con múltiples fallos históricos (lint docs, trazabilidad ADR, type-check temporal, fixtures golden, permisos de deploy docs). El objetivo fue:

1. Pasar temporalmente a **modo estabilización**.
2. Recuperar verde por capas mediante ejecuciones manuales.
3. Dejar trazabilidad de rollback a modo normal.
4. Preparar y abrir PR para integración.

Documento marco de rollback asociado:

- `docs/planning/CI_CD_ROLLBACK_PLAN_20260228.md`

---

## Alcance del cambio en workflows

### Workflows puestos en modo manual (`workflow_dispatch`)

- `.github/workflows/ci.yml`
- `.github/workflows/contracts.yml`
- `.github/workflows/golden-paths.yml`
- `.github/workflows/test.yml`
- `.github/workflows/pr-quality-gate.yml`
- `.github/workflows/mkdocs-deploy.yml`
- `.github/workflows/release.yml`

### Inputs temporales (gates opcionales)

- `ci.yml`
  - `run_markdown_lint`
  - `run_traceability_gate`
- `contracts.yml`
  - `run_determinism_scan`
  - `run_golden_validation`
- `test.yml`
  - `run_full_test_suite`
  - `run_coverage`
- `golden-paths.yml`
  - `run_contract_fixture_validation`
- `pr-quality-gate.yml`
  - `run_typecheck_gate`
  - `run_temporal_integration`
- `mkdocs-deploy.yml`
  - `run_pages_deploy`

### Ajustes funcionales destacados

- En `pr-quality-gate.yml` los checks de formato PR (título, labels, tamaño, descripción) quedaron condicionados a evento `pull_request`, evitando falsos fallos en `workflow_dispatch`.
- En `contracts.yml` se retiró temporalmente la ruta de KG (`kg-cypher-sync`) para reducir superficie de fallo en fase de estabilización.

---

## Incidentes relevantes durante la ejecución

1. **Conflicto de merge con `origin/main`** en `.github/workflows/contracts.yml`.
   - Estado inicial: archivo con marcadores `<<<<<<<`, `=======`, `>>>>>>>`.
   - Resolución: merge manual conservando estrategia de estabilización y eliminando markers.

2. **Rutas incoherentes respecto al monorepo real**.
   - `main` y parte del histórico tenían referencias `packages/contracts` y `packages/engine/...`.
   - El repositorio usa `packages/@dvt/...`.
   - Se corrigieron filtros, escaneos y paths de artifacts/resultados a:
     - `packages/@dvt/contracts/**`
     - `packages/@dvt/engine/**`
     - `packages/@dvt/engine/test/contracts/**`

3. **Bloqueo de merge en PR #313 tras dejar todo en verde manual**.
   - Mensaje UI: “Merging is blocked — All comments must be resolved”.
   - Confirmado por API/CLI: existe hilo de review no resuelto (outdated) de `chatgpt-codex-connector`.

---

## Resolución del conflicto en `contracts.yml`

Durante la integración de `origin/main` se presentaron dos choques principales:

1. Reintroducción de job `kg-cypher-sync` desde `main`.
2. Dependencia `contract-compile` hacia `kg-cypher-sync`.

Decisión aplicada en PR #313:

- Mantener **sin** `kg-cypher-sync` en estabilización.
- Mantener `contract-compile` con `needs: [detect-changes]`.
- Corregir paths al layout real `@dvt`.

Esto alinea la PR con la decisión operativa de estabilización: primero recuperar verde base, luego reintroducir checks pesados por fases.

---

## Validaciones ejecutadas (evidencia)

### Contracts & Determinism (smoke)

- Workflow: `.github/workflows/contracts.yml`
- Run ID: `22524141501`
- Resultado: **success**
- Configuración:
  - `run_determinism_scan=false`
  - `run_golden_validation=false`

Jobs ejecutados exitosos:

- Detect contracts/determinism scope
- Validate JSON Schemas
- Compile TypeScript Contracts

Jobs omitidos por diseño de smoke:

- Determinism Pattern Scan
- Validate Golden JSON Fixtures
- Execute Golden Paths & Validate Hashes

### PR Quality Gate (smoke)

- Workflow: `.github/workflows/pr-quality-gate.yml`
- Run ID: `22524181044`
- Resultado: **success**
- Configuración:
  - `run_typecheck_gate=false`
  - `run_temporal_integration=false`

---

## Estado de PR #313

- PR: https://github.com/dunay2/dvt/pull/313
- Head: `split/pr299-contracts-workflow`
- Base: `main`
- Estado de mergeabilidad técnica: `mergeable=true`
- Estado global de merge en GitHub: `mergeStateStatus=BLOCKED`

Motivo de bloqueo observado:

- Política de rama protegida que exige resolver comentarios/hilos de review.
- Existe al menos un thread no resuelto (`isResolved=false`) en la PR.

Intentos de merge por CLI (`gh pr merge ...`) rechazados por policy.

---

## Qué incluye exactamente el cambio de `contracts.yml`

1. Trigger exclusivamente manual (`workflow_dispatch`) para estabilización.
2. Filtros de rutas de `dorny/paths-filter` ajustados a `packages/@dvt/...`.
3. Escaneos de determinismo apuntando a `packages/@dvt/engine/src`.
4. Comprobación de `any` en `packages/@dvt/contracts/src`.
5. Artifact de compilados en `packages/@dvt/contracts/...`.
6. Resultados golden en `packages/@dvt/engine/test/contracts/results/...`.
7. Eliminación del bloque de `kg-cypher-sync` en esta fase.

---

## Riesgos residuales (conocidos y aceptados en estabilización)

Estos riesgos no se “ocultan”; se gestionan por gating temporal mientras se corrigen de raíz:

- Deuda en `markdownlint` docs legacy.
- Deuda de trazabilidad ADR-0000.
- Type-check pendiente en adapter temporal (`@dvt/plan-interpreter` + `implicit any`).
- Fixtures golden incompletos (ej. `tenantId` en `EngineRunRef`).
- Permisos de `gh-pages` para deploy docs.

---

## Próximos pasos recomendados

1. Resolver el thread pendiente en PR #313 (UI GitHub, “Resolve conversation”).
2. Reintentar merge de la PR una vez levantado el bloqueo de policy.
3. Tras merge, iniciar fase de rollback gradual siguiendo:
   - `docs/planning/CI_CD_ROLLBACK_PLAN_20260228.md`
4. Reactivar checks opcionales por dominio hasta volver a automático sin toggles temporales.

---

## Anexo A — Línea temporal resumida

1. Se estabilizan workflows y se validan manualmente.
2. Se abre PR #313 para integrar a `main`.
3. Aparece conflicto al sincronizar con `origin/main` en `contracts.yml`.
4. Se resuelve conflicto + corrección de paths `@dvt` + commit de merge.
5. Push exitoso de rama (`split/pr299-contracts-workflow`).
6. Smoke runs manuales en verde (`contracts` y `pr-quality-gate`).
7. Merge bloqueado por policy de comentarios no resueltos.

---

## Anexo B — Comandos operativos usados (referencia)

```bash
git fetch origin && git merge origin/main
git add .github/workflows/contracts.yml
git commit --no-edit
git push origin split/pr299-contracts-workflow

gh workflow run .github/workflows/contracts.yml --ref split/pr299-contracts-workflow -f run_determinism_scan=false -f run_golden_validation=false
gh run watch 22524141501 --exit-status

gh workflow run .github/workflows/pr-quality-gate.yml --ref split/pr299-contracts-workflow -f run_typecheck_gate=false -f run_temporal_integration=false
gh run watch 22524181044 --exit-status

gh pr view 313 --json mergeStateStatus,mergeable,url
```
