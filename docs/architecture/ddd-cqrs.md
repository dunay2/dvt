````markdown
# DDD + CQRS guidelines (summary)

This document describes the minimal conventions for structuring packages using Domain-Driven Design and a lightweight CQRS approach.

Folder conventions (in `@dvt/engine`):

- `src/domain/` — Entities, Value Objects, Aggregates, Domain Services, Repository interfaces.
- `src/application/` — Use cases, Commands, Command Handlers, DTOs, Application Services.
- `src/infrastructure/` — Implementations of repository/adapters (Postgres, Temporal), external integrations.
- `src/transport/` — API adapters, event publishers, workers.
- `src/cqrs/` — Command bus, Query bus, Event handlers (in-process minimal implementations).

Traceability conventions:

- All generated artifacts must include `@baseline ADR-0000` in file headers.
- Use ADR references in commits and manifest files.

Example: Command handler header

```typescript
/**
 * @file StartRunHandler.ts
 * @baseline ADR-0000
 * @decision ADR-0004, ADR-0005
 */
```
````

Testing:

- Keep unit tests close to implementation (same package under `test/` or `src/__tests__`).
- Add conformance/golden vector tests for contracts in `@dvt/contracts`.

CI:

- Ensure `pnpm -r build` and `pnpm -r test` run the added packages.

```

```
