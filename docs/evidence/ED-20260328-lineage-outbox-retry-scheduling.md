---
title: Lineage outbox retry scheduling hardening
status: Accepted
date: 2026-03-28
owners:
  - '@dvt/adapter-postgres'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts
  - packages/@dvt/adapter-postgres/migrations/005_lineage_outbox.sql
  - packages/@dvt/adapter-postgres/test/PostgresLineageOutboxStore.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm lint:md
    - pnpm verify:prepush
---

# 20260328 Lineage Outbox Retry Scheduling

## Summary

`lineage_outbox` now supports delayed retries via `next_attempt_at` with exponential backoff.
Pending selection only pulls retry-eligible records, reducing hot-loop retries and pacing DLQ pressure.

## Behavioral Notes

1. `PostgresLineageOutboxStore.listPending` now filters by `next_attempt_at <= NOW()` and keeps FIFO tie-break by `created_at`.
2. `PostgresLineageOutboxStore.markFailed` now computes exponential delay and stores it in `next_attempt_at`.
3. Schema baseline and migration path were updated so both fresh installs and already-migrated databases get the column/index shape.

## Validation Outcome

All listed commands passed on 2026-03-28 in this workspace.
