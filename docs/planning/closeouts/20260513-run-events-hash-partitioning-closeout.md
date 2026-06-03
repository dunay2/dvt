---
slice: run-events-hash-partitioning
date: 2026-05-13
last_reviewed: 2026-05-13
lane: D
task: run_events partitioning
author: AI (GPT-5)
---

# Closeout: Run Events Hash Partitioning

## Think-First Analysis

The governing analysis lives in
`docs/planning/proposals/mandatory/runtime-and-contracts/run-events-hash-partitioning-plan-20260513.md`.

The selected design partitions hot `run_events` storage by `HASH(run_id)`
instead of by `persisted_at` because the current correctness contract depends on
`PRIMARY KEY (run_id, run_seq)` and `UNIQUE (run_id, idempotency_key)`. PostgreSQL
requires partitioned unique constraints to include the partition key.

## Changes Made

| File                                                                                                        | Change                                                                                                                               | Why                                                                                         |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts`                                               | Added `core_021_run_events_hash_partitioning`, fresh hash-partitioned DDL, heap conversion, rollback, and RLS reapplication helpers. | Reduce hot event-log table pressure while preserving adapter invariants.                    |
| `packages/@dvt/adapter-postgres/src/PostgresTenantIsolationPolicy.ts`                                       | Declared the `run_events` parent and hash partitions as tenant-owned RLS catalog surfaces.                                           | Keep physical partition access aligned with ADR-0031 tenant isolation.                      |
| `packages/@dvt/adapter-postgres/test/PostgresTenantIsolationPolicy.test.ts`                                 | Added catalog coverage for run event hash partitions.                                                                                | Prove partition tables stay declared in policy metadata.                                    |
| `packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts`                      | Extended catalog proof to partitioned parents and physical partitions.                                                               | Prove forced RLS coverage for every tenant-owned physical relation.                         |
| `packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts`                             | Added fresh-schema and legacy-heap migration coverage.                                                                               | Prove the partitioned shape and conversion path.                                            |
| `packages/@dvt/adapter-postgres/test/PostgresSchemaManager.rollback.test.ts`                                | Added rollback coverage for partition-to-heap conversion and RLS posture.                                                            | Prove operational rollback.                                                                 |
| `docs/architecture/components/engine/adapters/state-store/postgres/run-events-partitioning-component.md`    | Added local component guide with API, invariants, transitions, consumers, and diagrams.                                              | Make component behavior queryable and reviewable.                                           |
| `docs/architecture/components/engine/adapters/state-store/postgres/run-events-partitioning-user-stories.md` | Added user stories and acceptance criteria.                                                                                          | Cover fresh migration, upgrade, duplicate delivery, rollback, and future retention posture. |
| `docs/evidence/ed-20260513-run-events-hash-partitioning.md`                                                 | Added ARC-2 evidence.                                                                                                                | Satisfy adapter change evidence requirement.                                                |
| `docs/risk-register/quality/R-20260513-RUN-EVENTS-HASH-PARTITIONING.yaml`                                   | Added ARC-2 risk.                                                                                                                    | Track residual partitioning/idempotency/RLS drift risk.                                     |

## Validation Plan

- `pnpm docs:feature-mechanization --feature RUN-EVENTS-HASH-PARTITIONING`
- `pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts`
- `pnpm --filter @dvt/adapter-postgres test -- PostgresStateStoreAdapter.migrate.test.ts PostgresSchemaManager.rollback.test.ts`
- `DVT_PG_INTEGRATION=1 pnpm --filter @dvt/adapter-postgres test -- PostgresAppRoleRuntime.integration.test.ts PostgresTenantRlsEnforcement.integration.test.ts`
- `DVT_PG_INTEGRATION=1 DVT_PG_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter @dvt/adapter-postgres test -- smoke.test.ts`
- Live PostgreSQL heap-upgrade probe verifying partitioned parent, preserved
  row, 16 child partitions, and forced RLS.
- `pnpm --filter @dvt/adapter-postgres test`
- `pnpm --filter @dvt/adapter-postgres typecheck`
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
- `pnpm docs:sync`
- `pnpm governance:refresh`
- `pnpm docs:feature-mechanization:implementation`
- `pnpm verify:prepush`

## Debt Introduced

None intended.

## Stub Or Placeholder Introduced

None intended.
