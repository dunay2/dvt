# Estructura del proyecto DVT

Este documento describe la estructura de ficheros del repositorio DVT y qué contiene cada fichero/carpeta. Incluye un diagrama Mermaid con la vista de alto nivel.

---

## Resumen raíz

- `CHANGELOG.md` — Historial de cambios del repositorio.
- `CLAUDE.md` — Contexto del proyecto y reglas importantes (determinismo, políticas).
- `commitlint.config.cjs` — Configuración de `commitlint` (convenciones de commits).
- `CONTRIBUTING.md` — Guía para contribuciones.
- `dev.sh` — Script auxiliar para desarrollo local.
- `docker-compose.neo4j.yml` — Composición Docker para Neo4j (KG).
- `eslint.config.cjs` — Configuración ESLint compartida y reglas de determinismo.
- `package.json` — Scripts raíz (lint, test, build, comandos monorepo).
- `pnpm-workspace.yaml` / `pnpm-lock.yaml` — Configuración y lockfile de pnpm.
- `README.md` — Introducción y guía rápida del repositorio.
- `ROADMAP.md` — Hoja de ruta del proyecto.
- `tsconfig.json` / `tsconfig.*.json` — Configuración TypeScript (base, test, eslint).
- `vitest.config.ts` — Configuración de Vitest.

## Carpetas principales

- `apps/`
  - `api/` — Aplicación backend/API. Contiene `Dockerfile`, `Procfile`, `package.json`, `tsconfig.json` y `src/` con el código del servidor.
  - `web/` — Aplicación frontend (Vite + React/TS). Contiene `index.html`, `package.json`, `vite.config.ts`, `postcss.config.mjs`, `src/` (componentes, vistas), `README.md`.

- `docs/` — Documentación amplia del proyecto.
  - `architecture/` — Diagramas y especificaciones (engine, frontend, infra).
  - `decisions/` — ADRs numeradas (`ADR-0000`, `ADR-0001`, ...).
  - `guides/`, `planning/`, `status/`, `runbooks/` — Guías y runbooks operacionales.

- `infra/` — Infraestructura, contenedores y utilidades de despliegue.

- `packages/` — Monorepo packages (core y adaptadores).
  - `adapter-postgres/`
    - `package.json` — Dependencias del adaptador Postgres.
    - `src/PostgresStateStoreAdapter.ts` — Implementación SQL del state store (append events, outbox, advisory locks).
    - `test/` y `dist/` — Tests y build output.
  - `adapter-temporal/`
    - `src/workflows/RunPlanWorkflow.ts` — Workflows Temporal (nota: reglas de determinismo aplicadas).
    - `src/activities/` — Actividades y helpers Temporal.
    - `test/` y `dist/`.
  - `adapters-legacy/` — Código legacy, tests y ejemplos de adaptadores antiguos.
  - `cli/` — Herramientas CLI, p.ej. `validate-contracts.cjs`.
  - `contracts/` — Esquemas Zod y validadores de contratos de dominio.
    - `src/schemas.ts` — Zod schemas para `PlanRef`, `ExecutionPlan`, etc.
    - `src/validation.ts` — Helpers `parse*`, mapeo de errores.
    - `test/` y `dist/`.
  - `engine/` — Núcleo determinista del motor.
    - `src/core/WorkflowEngine.ts` — Lógica de ejecución del motor (validación de `schemaVersion`, reglas deterministas).
    - `src/adapters/` — Interfaces y adaptadores mock.
    - `test/` — Tests unitarios e integración (incluye determinism tests).

- `runbooks/` — Procedimientos operativos, p.ej. `WORKFLOW_ISOLATION_TESTING.md`.

- `scripts/` — Scripts y utilidades de repositorio.
  - `generate-contract-index.cjs` — Génesis/índice de contratos para docs.
  - `run-golden-paths.cjs`, `compare-hashes.cjs`, `validate-*` — Herramientas de QA y comprobaciones (determinismo, idempotencia, referencias).
  - `neo4j/` — Scripts para poblar Neo4j (knowledge graph).

- `.github/workflows/` — Workflows CI (contracts.yml, test.yml, lint.yml, determinism.yml).
- `.husky/` — Ganchos pre-commit que ejecutan `lint-staged` y `pnpm lint:determinism`.
- `.gh-comments/` — Plantillas o scripts para comentarios automáticos en GH (histórico).

## Ficheros y puntos clave (detalle selecto)

- `packages/adapter-postgres/src/PostgresStateStoreAdapter.ts`:
  - Implementa la persistencia del estado con `pg` (sin Prisma). Incluye creación de esquemas, tablas `run_events`/`runs`/`outbox`, funciones para `appendEventsTxWithClient`, `enqueueTxWithClient`, `listPending`, `markDelivered`.

- `packages/contracts/src/schemas.ts` y `src/validation.ts`:
  - Definen los contratos de dominio con Zod (p.ej. `schemaVersion`, `planVersion`), validadores y utilidades para mapear errores a respuestas legibles. Tests en `packages/contracts/test/validation.test.ts`.

- `packages/engine/src/core/WorkflowEngine.ts`:
  - Motor de ejecución: validación de `PlanRef`, `validateSchemaVersionOrThrow` (actualmente acepta `v1.*`), lógica de ejecución y coordinación con adaptadores.

- `eslint.config.cjs`:
  - Reglas de determinismo: `no-date-now`, `no-math-random`, prohibición de `process.env` en código de engine/workflows; mensajes y selectores AST para detectar usos prohibidos.

- `package.json` (raíz):
  - Scripts útiles: `lint:determinism` (`eslint` sobre `packages/engine/src` y `packages/adapter-temporal/src`), `test:determinism`, `precommit` que ejecuta `lint-staged && pnpm lint:determinism`.

- `.github/workflows/contracts.yml`:
  - Incluye pasos para escanear llamadas a `Date.now()` y `Math.random()` y bloquear PRs que las introduzcan en código de workflows/engine.

## Notas sobre determinismo y versionado

- Las reglas de determinismo están documentadas en `docs/architecture/engine/dev/determinism-tooling.md` y reforzadas por ESLint y CI. Sin embargo hay código de pruebas/integración y utilidades/scripts que usan `Date.now()` en contexto de test o scripts (aceptado cuando es test-only).
- La política de `schemaVersion`/`planVersion` se aplica en runtime (ver `validateSchemaVersionOrThrow`) y también en los validators de `packages/contracts`.

---

## Diagrama (Mermaid) — vista de alto nivel

```mermaid
graph TD
  Repo[Repositorio: dvt]
  Repo --> Apps[apps/]
  Repo --> Packages[packages/]
  Repo --> Docs[docs/]
  Repo --> Infra[infra/]
  Repo --> Scripts[scripts/]
  Repo --> GH[.github/]
  Repo --> RootFiles[raíz: README.md, package.json, tsconfig.json, etc.]

  Apps --> API[api/]
  Apps --> Web[web/]

  Packages --> Engine[@dvt/engine]
  Packages --> Contracts[@dvt/contracts]
  Packages --> AdapterPostgres[@dvt/adapter-postgres]
  Packages --> AdapterTemporal[@dvt/adapter-temporal]
  Packages --> CLI[@dvt/cli]
  Packages --> Legacy[adapters-legacy]

  Engine --> EngineSrc[src/core/WorkflowEngine.ts]
  AdapterPostgres --> PostgresSrc[src/PostgresStateStoreAdapter.ts]
  AdapterTemporal --> TemporalWorkflows[src/workflows/RunPlanWorkflow.ts]
  Contracts --> Schemas[src/schemas.ts]

  Docs --> ADRs[docs/decisions/]
  Scripts --> QA[determinism, compare-hashes, generate-contract-index]
  GH --> Workflows[workflows/*.yml]
```

---

Archivo con el árbol completo (máquina-legible): [docs/PROJECT_STRUCTURE_TREE.md](PROJECT_STRUCTURE_TREE.md)
