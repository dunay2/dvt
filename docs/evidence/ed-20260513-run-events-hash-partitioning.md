---
title: Run events hash partitioning for adapter-postgres
status: Accepted
date: 2026-05-13
owners:
  - dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts
  - packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresSchemaManager.rollback.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test -- PostgresStateStoreAdapter.migrate.test.ts PostgresSchemaManager.rollback.test.ts
    - DVT_PG_INTEGRATION=1 DVT_PG_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter @dvt/adapter-postgres test -- smoke.test.ts
    - Live PostgreSQL heap-upgrade probe verified partitioned parent, preserved row, 16 child partitions, and forced RLS
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-postgres typecheck
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm docs:sync
    - pnpm governance:refresh
    - pnpm verify:prepush
---

This evidence record covers `core_021_run_events_hash_partitioning`, which
creates fresh `run_events` tables as hash-partitioned parents by `run_id` and
converts legacy heap deployments while preserving the canonical column list,
ordering primary key, idempotency unique constraint, tenant-leading index, and
tenant RLS.

The implementation intentionally does not implement ADR-0037 archive-unit
deletion or time-range retention partitioning.
