# Plan de implementación e integración — Integraciones C, A, B, D, E

## Contexto

Este plan implementa, en orden, las integraciones definidas en [`integracion.md`](packages/mejora discutir 2/integracion.md), priorizando primero **Integración C (@dvt/canonical)** para habilitar el resto con bajo riesgo.

## Estado global

- Fecha inicio: 2026-02-23
- Rama: `feat/ddd-cqrs-structure`
- Estado actual: **En ejecución**

## Alcance

1. Integración C — Extraer canonicalización a `@dvt/canonical`.
2. Integración A — Nuevo paquete `@dvt/dsl` (AST + parser + evaluator v1).
3. Integración B — Añadir `inputHashSha256` en `ExecutionPlan.metadata` (aditivo).
4. Integración D — Añadir `PlannerInputEnvelope` en `@dvt/contracts`.
5. Integración E — Enforzar `no-restricted-imports` para adapters.
6. Verificación de calidad (typecheck, tests, lint relevante).
7. Commit + push.

## Plan detallado por pasos

### Paso 0 — Preparación y trazabilidad

- [x] Crear este archivo de plan e integración.
- [ ] Mantener actualizado el estado de cada paso según ejecución real.

### Paso 1 — Integración C (`@dvt/canonical`)

- [x] Crear `packages/@dvt/canonical/` con:
  - [x] `src/jcs.ts` (migrado desde engine)
  - [x] `src/sha256.ts`
  - [x] `src/index.ts`
  - [x] `package.json`
  - [x] `tsconfig.json`
- [x] Añadir paths TS en `tsconfig.base.json`:
  - [x] `@dvt/canonical`
  - [x] `@dvt/canonical/*`
- [x] Añadir dependencia workspace en `packages/@dvt/engine/package.json`.
- [x] Migrar import de JCS en engine a `@dvt/canonical`.
- [x] Mantener compatibilidad de `sha256` en engine re-exportando desde `@dvt/canonical`.

### Paso 2 — Integración A (`@dvt/dsl`)

- [x] Crear `packages/@dvt/dsl/` con:
  - [x] `src/v1/ast.ts`
  - [x] `src/v1/parser.ts`
  - [x] `src/v1/evaluator.ts`
  - [x] `src/index.ts`
  - [x] `package.json`
  - [x] `tsconfig.json`
- [x] Implementar parser/evaluator DSL v1 (operadores esperados, validación y errores).
- [x] Añadir tests unitarios básicos del parser/evaluator.

### Paso 3 — Integración B (`inputHashSha256`)

- [x] Extender contrato en `packages/@dvt/engine/src/contracts/executionPlan.ts`:
  - [x] `metadata.inputHashSha256?: string` con documentación.
- [x] Mantener compatibilidad total hacia atrás (campo opcional).

### Paso 4 — Integración D (`PlannerInputEnvelope`)

- [x] Crear `packages/@dvt/contracts/src/planner-input.ts`.
- [x] Definir schemas Zod y tipo inferido `PlannerInputEnvelope`.
- [x] Exportar desde los barrels necesarios en `@dvt/contracts`.

### Paso 5 — Integración E (ESLint sovereignty guard)

- [x] Actualizar `eslint.config.cjs` para `packages/@dvt/adapter-temporal/**/*.ts` y `packages/@dvt/adapter-postgres/**/*.ts`:
  - [x] `no-restricted-imports` bloqueando `@dvt/planner` y `@dvt/planner/*`.

### Paso 6 — Validación

- [x] `pnpm type-check`
- [x] `pnpm test:engine`
- [x] `pnpm test:contracts`
- [ ] `pnpm lint` (si aplica por tiempo/coste)
- [x] Resolver incidencias de formato/lint/hooks detectadas durante la implementación.

### Paso 7 — Entrega

- [ ] Commit con convención válida (scope permitido).
- [ ] Push a `origin/feat/ddd-cqrs-structure`.
- [ ] Confirmar resumen final de cambios integrados.

## Registro de ejecución

### 2026-02-23

- [x] Se crea plan de implementación e integración.
- [x] Integración C implementada (`@dvt/canonical` + migración de imports).
- [x] Integración A implementada (`@dvt/dsl` + tests unitarios).
- [x] Integración B implementada (`metadata.inputHashSha256` opcional).
- [x] Integración D implementada (`PlannerInputEnvelope` en contratos).
- [x] Integración E implementada (`no-restricted-imports` para adapters).
- [x] Validación ejecutada con type-check + tests focalizados (`@dvt/dsl`, `adapter-temporal` DAG scheduler y `@dvt/contracts`).
