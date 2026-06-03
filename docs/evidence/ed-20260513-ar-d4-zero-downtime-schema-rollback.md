---
title: AR-D4 zero-downtime schema rollback
status: Accepted
date: 2026-05-13
owners:
  - '@dvt/adapter-postgres'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts
  - packages/@dvt/adapter-postgres/src/PostgresStateStoreAdminAdapter.ts
  - packages/@dvt/adapter-postgres/test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts test/PostgresSchemaManager.rollback.test.ts test/PostgresStateStoreAdapter.migrate.test.ts
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm docs:feature-mechanization -- --feature AR-D4-ZERO-DOWNTIME-SCHEMA-ROLLBACK
    - pnpm docs:sync
    - pnpm docs:status:generate
    - pnpm governance:refresh
    - pnpm verify:prepush
---

# AR-D4 zero-downtime schema rollback evidence

AR-D4 classifies Postgres schema rollback plans as online-compatible or
offline-only. Online-compatible rollback can execute with active state-store
readers; offline-only plans fail closed before DDL executes.

## Scope

- `PostgresSchemaManager` owns migration catalog, rollback planning/execution,
  and rollback compatibility classification.
- `PostgresStateStoreAdminAdapter` owns the concrete admin command surface.
- The engine state-store contracts are unchanged.

## Result

- Rollback plans expose compatibility metadata per reverse step.
- `rollbackSchemaTo()` checks `PostgresSchemaRollbackCompatibilityPolicy`
  instead of active-client count.
- Offline rollback plans reject with
  `SCHEMA_ROLLBACK_REQUIRES_OFFLINE_COMPATIBILITY`.
- Component docs, user stories, and package design use the same published
  language.
