````markdown
# Plan: Implementación de estructura DDD + CQRS en el monorepo

Objetivo: introducir una estructura de paquetes orientada a dominio (DDD) y patrones CQRS mínimos en el monorepo, con pasos verificables y PRs pequeños y reversibles.

Resumen de pasos

- 0. Preparación (esta tarea): crear este plan en `docs/planning` y abrirlo para revisión.
- 1. Crear esqueletos de paquete: `@dvt/contracts`, `@dvt/engine`, `@dvt/adapter-postgres`, `@dvt/adapter-temporal`, `@dvt/cli`.
- 2. Añadir layout DDD en `@dvt/engine`:
  - `src/domain/` (entities, value-objects, aggregates, repositories-interfaces)
  - `src/application/` (use-cases/commands, command-handlers, DTOs)
  - `src/infrastructure/` (adapters, persistence, temporal/postgres bridges)
  - `src/transport/` (API adapters, workers, event publishers)
  - `src/cqrs/` (command bus, query handlers, event handlers — minimal stubs)
- 3. Añadir ejemplos mínimos (one-entity, one-command, one-query, one-event) con trazabilidad ADR (usar ADR-0000/ADR-0004/ADR-0005).
- 4. Documentación: crear `docs/architecture/ddd-cqrs.md` con guía concisa, convenciones de carpetas y ejemplos de headers `@baseline ADR-xxxx`.
- 5. CI / scripts: actualizar `pnpm-workspace.yaml` si es necesario y añadir `pnpm -w -r build`/`test` pasos para validar paquetes nuevos en CI.
- 6. Tests y validación: añadir prueba unitarias mínimas en `@dvt/engine` y `@dvt/contracts`, ejecutar `pnpm -r build && pnpm -r test` localmente.
- 7. PRs iterativos: crear rama `feat/ddd-cqrs-structure` con pasos 1–3 + docs; abrir PR para revisión pequeña.

Entregables por PR (tamaño recomendado por PR)

- PR 1: esqueletos de paquetes + package.json mínimos + tsconfig referencias.
- PR 2: layout DDD en `@dvt/engine` + ejemplos de command/query/event (con tests verdes).
- PR 3: adapters skeletons + docs/architecture + CI adjustments.

Criterios de aceptación

- `pnpm -r build` finaliza sin errores (en los paquetes añadidos al menos).
- `pnpm -r test` pasa para los tests introducidos.
- Documentación `docs/architecture/ddd-cqrs.md` revisada y aceptada en PR.
- Todos los artefactos generados incluyen `@baseline ADR-0000` o ADRs aplicables.

Comandos rápidos para verificación local

```bash
pnpm -r build
pnpm -r test
pnpm -w -r lint
```
````

Riesgos y mitigación

- Riesgo: romper `pnpm -r build` por `tsconfig` o referencias; mitigación: crear paquetes `private: true` y hacer PRs pequeños.
- Riesgo: hooks/pre-push fallando (TypeScript errors); mitigación: ejecutar `pnpm -r build` local antes de push y abrir PRs sin bypass.

Rollback

- Cada PR es reversible; si hay problemas revertir el PR y aislar el cambio problemático (ej. tsconfig incorrecto).

Tiempo estimado

- PR 1 (esqueletos + package.json): 1–2 horas
- PR 2 (layout + ejemplo + tests): 2–4 horas
- PR 3 (adapters + docs + CI): 2–3 horas

Responsables propuestos

- Autor técnico: Engine maintainers
- Revisión: Architecture / Contracts owners

Notas finales

- Mantener las PRs pequeñas y con ejemplos ejecutables.
- Todas las piezas deben incluir trazabilidad a ADRs según `ADR-0000`.

```

```
