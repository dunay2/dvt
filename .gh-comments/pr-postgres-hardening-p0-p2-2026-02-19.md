## Summary

This PR applies the requested PostgreSQL hardening slice (P0/P1/P2) and updates status publication.

Implemented scope:

- P0: remove unused `_outbox` transactional parameter and align call sites.
- P0: enforce safe outbox claiming with `FOR UPDATE SKIP LOCKED` and stale claim recovery.
- P1: add integration schema cleanup in adapter smoke tests.
- P1: execute adapter-postgres integration smoke tests in CI (`contract-hashes` job).
- P2: remove redundant `run_events(run_id, run_seq)` index path.
- P2: assess type drift and document decision in adapter types.

## Technical changes

- [`packages/adapter-postgres/src/PostgresStateStoreAdapter.ts`](../packages/adapter-postgres/src/PostgresStateStoreAdapter.ts)
  - `appendAndEnqueueTx` signature cleanup.
  - `listPending()` uses `FOR UPDATE SKIP LOCKED` + `claimed_at` claim/update flow.
  - `markDelivered()` / `markFailed()` clear `claimed_at`.
  - schema bootstrap includes `claimed_at` and updated pending index.
  - redundant `run_events(run_id, run_seq)` index path removed.

- [`packages/engine/src/core/WorkflowEngine.ts`](../packages/engine/src/core/WorkflowEngine.ts)
  - aligned optional transactional method signature and invocation.

- [`packages/engine/src/state/InMemoryTxStore.ts`](../packages/engine/src/state/InMemoryTxStore.ts)
  - aligned transactional signature.

- [`packages/adapter-postgres/test/smoke.test.ts`](../packages/adapter-postgres/test/smoke.test.ts)
  - added `afterAll` schema teardown (`DROP SCHEMA ... CASCADE`).

- [`packages/adapter-postgres/src/types.ts`](../packages/adapter-postgres/src/types.ts)
  - added timestamped P2 decision note on type-drift handling.

- [`.github/workflows/contracts.yml`](../.github/workflows/contracts.yml)
  - `contract-hashes` job now runs adapter-postgres integration smoke tests with Postgres env.

- [`docs/status/IMPLEMENTATION_SUMMARY.md`](../docs/status/IMPLEMENTATION_SUMMARY.md)
  - added hardening status block with timestamp (`2026-02-19 18:32 UTC`).

- [`.gh-comments/issue-68-hardening-status-2026-02-19.md`](../.gh-comments/issue-68-hardening-status-2026-02-19.md)
  - issue publication template used for #68 status update.

## Validation

- `pnpm --filter @dvt/engine build` ✅
- `pnpm --filter @dvt/adapter-postgres build` ✅
- `pnpm --filter @dvt/adapter-postgres exec vitest run test/smoke.test.ts --config vitest.config.cjs` with `DVT_PG_INTEGRATION=1` and `DATABASE_URL` ✅ (3/3)

## Issue tracking

- Status update comment posted on #68 with timestamped summary and evidence.
