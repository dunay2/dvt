# Plan de migración Engine: gap actual → target blueprint v0.6

> Espejo para wiki de [`plans/engine-gap-to-target-migration-plan.md`](../../plans/engine-gap-to-target-migration-plan.md).

## 1. Contexto

El estado actual de [`@dvt/engine`](../../packages/@dvt/engine/package.json:1) no sigue al 100% la plantilla objetivo definida en [`DVT_Blueprint_v0.6_MASTER.md`](../vision/DVT_Docs_Pack_v0.6/docs/DVT_Blueprint_v0.6_MASTER.md:100), especialmente en la estructura interna de [`src/`](../../packages/@dvt/engine/src/index.ts:1).

Objetivo de este plan: migrar por fases sin romper surface pública, CI ni tests.

## 2. Gap analysis (actual vs target)

### 2.1 Estructura objetivo esperada

- `docs/`
- `schemas/` (envelope/commands/events)
- `src/{generated,domain,application,ports,adapters,composition}`
- `test/{unit,contract,integration}`
- `cli/src/{smoke,validate-schemas,codegen}`

### 2.2 Estado actual observado en engine

En [`packages/@dvt/engine/src`](../../packages/@dvt/engine/src/index.ts:1) hoy existen carpetas mixtas:

- `core/`, `state/`, `security/`, `outbox/`, `utils/`, `metrics/`, `workers/`, `contracts/`, `application/`, `adapters/`, `ports/`

Desalineaciones clave:

1. Falta `domain/` y `composition/` explícitos.
2. Mezcla de runtime + contratos dentro de engine en paralelo a [`@dvt/contracts`](../../packages/@dvt/contracts/index.ts:1).
3. Barrel root amplio en [`src/index.ts`](../../packages/@dvt/engine/src/index.ts:1).
4. Falta `schemas/` y `cli/` propios según plantilla.

## 3. Estrategia por fases

1. **Fase 0**: Baseline de no-rotura (inventario exports).
2. **Fase 1**: Skeleton target (ya implementada).
3. **Fase 2**: Realineación interna incremental (`core` → `domain`, wiring → `composition`).
4. **Fase 3**: Control de API pública en root.
5. **Fase 4**: Contratos y schemas.
6. **Fase 5**: Normalización de tests y hardening.

## 4. Riesgos

- Ruptura de imports internos.
- Ambigüedad de ownership de contratos.
- PRs demasiado grandes.
- Regresiones de determinismo.

Mitigación: migración incremental, wrappers de compatibilidad, CI por fase y ADR de ownership antes de cambios de frontera.

## 5. Backlog ejecutable

- [x] Crear skeleton target en engine (`domain`, `composition`, `generated`, `schemas`, `cli`).
- [ ] Definir exports públicos permitidos en root.
- [ ] Primera migración piloto `core/WorkflowEngine` → `domain/*` con wrapper.
- [ ] Validar tests + type-check + lint.
- [ ] ADR de ownership de contratos engine vs `@dvt/contracts`.
