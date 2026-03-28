---
title: RC-B5-F2 lineage claim-timeout and stale-claimer integration coverage
status: Accepted
date: 2026-03-28
owners:
  - '@dvt/adapter-postgres'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/test/PostgresLineageOutboxStore.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm verify:prepush
---

# RC-B5-F2 closeout evidence

## Scope

Adds real-Postgres integration coverage for lineage outbox claim-timeout boundary behavior and stale-claimer interaction semantics.

## Added integration coverage

1. claim-timeout boundary reclaim:
   - a claimed lineage record is not reclaimable before timeout
   - it becomes reclaimable after timeout
1. stale-claimer interaction:
   - stale worker `markFailed` is fenced out after timeout (`not_found`)
   - a fresh worker can reclaim the same record after timeout

## Notes

- Tests run under `DVT_PG_INTEGRATION=1` and require a live Postgres DSN (`DVT_PG_URL` or `DATABASE_URL`).
- The integration tests allocate unique schemas and drop them in `afterAll`.
