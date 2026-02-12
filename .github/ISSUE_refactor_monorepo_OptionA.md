# refactor(monorepo): consolidate to packages/\* and fix tsconfig/eslint project boundaries (Option A)

## Motivación y síntomas

- ESLint reports `parserOptions.project` errors because the current tsconfigs do not include many files.
- Estructura dispersa: `engine/`, `adapters/`, `scripts/`, `test/`, `packages/` coexisten y generan ambigüedad sobre el origen de la verdad.
- Interfaces y implementaciones mezcladas (por ejemplo `engine/src/adapters` contiene `I*` y adaptadores concretos).
- Barriles (`index.ts`) mezclan dominio/aplicación/infraestructura.
- Tooling mixed with runtime code (scripts in the repository root).

## Objetivo (Opción A)

Consolidar el repo en un monorepo ligero bajo `packages/*` y corregir los límites de `tsconfig`/ESLint:

- `packages/contracts`
- `packages/engine`
- `packages/adapter-postgres`
- `packages/adapter-temporal`
- `packages/cli`
- conservar `examples/` y `docs/`

---

## Sprint 1 — Foundations (checklist)

a) Audit current folders: `engine/`, `adapters/`, `scripts/`, `test/`, `docs/`, `packages/`

b) Definir source-of-truth:

- Contracts → `packages/contracts/src`
- Engine core (domain + application) → `packages/engine/src`
- Adapters → `packages/adapter-*/src`
- CLI/tooling → `packages/cli/src`

c) Move code (mapping table below).

d) Crear/ajustar `tsconfig.json` y `package.json` por paquete.

e) Actualizar `tsconfig.base.json` y `references` por paquete.

f) Actualizar ESLint para que `parserOptions.project` incluya `./packages/*/tsconfig.json` (o usar `tsconfig.eslint.json` por paquete).

g) Cambiar imports a protocolo de workspace (`@dvt/contracts`, `@dvt/engine`, etc.).

h) Actualizar CI para usar `pnpm -r build/test/lint` y `--filter` por paquete.

i) Después de validar, eliminar/colar como deprecated los top-level folders (`engine/`, `adapters/`, `scripts/`, `test/`) o mantenerlos como wrappers con nota deprecatoria.

### Mapeo (ejemplo)

| Origen                      | Destino                            |
| --------------------------- | ---------------------------------- |
| `engine/src/adapters/I*.ts` | `packages/contracts/src/adapters/` |
| `engine/src/types/*.ts`     | `packages/contracts/src/types/`    |
| `engine/src/core/*`         | `packages/engine/src/core/`        |
| `engine/src/workers/*`      | `packages/engine/src/application/` |
| `adapters/postgres/*`       | `packages/adapter-postgres/src/`   |
| `scripts/*.cjs`             | `packages/cli/src/`                |

---

## Criterios de aceptación

- `pnpm -r lint` pasa sin errores `parserOptions.project`.
- `pnpm -r test` pasa.
- `pnpm -r build` pasa.
- No duplicate folders remain (no `engine/` parallel to `packages/engine`).
- Grafo de dependencias acíclico: `engine` → `contracts`; `adapters` → `engine` + `contracts`; `cli` → `contracts`/`engine`.

---

## Riesgos y mitigaciones

- Movida grande: dividir en commits pequeños; usar `git mv`.
- Rotura de tooling: actualizar `tsconfig` + ESLint al principio.
- Imports rotos: usar codemods / sed / TypeScript path updates y CI rápido.

---

## Referencias

- pnpm workspaces: https://pnpm.io/workspaces
- typescript-eslint project include issue: https://tseslint.com/none-of-those-tsconfigs-include-this-file
- Nx monorepo concept: https://nx.dev/concepts/more-concepts/why-monorepos

---

_Nota: ejecutar la migración en pequeños pasos y validar CI en cada PR._
