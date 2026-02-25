# Issue #6 Playbook Draft (Local Review)

Status: Draft for maintainer review before publishing to GitHub issue comments.

---

## Template A — Pre-implementation brief

### Suitability

- The issue requires replacing in-memory persistence in the PostgreSQL adapter with real SQL-backed persistence.
- A direct `pg` implementation is suitable because the adapter contracts are already explicit and only require transactional event + outbox semantics.
- Constraints considered:
  - Keep current adapter contracts stable (`IRunStateStore` + `IOutboxStorage`).
  - Preserve idempotency and deterministic sequencing behavior.
  - Add migration path for CI/local reproducibility.

### Blockers

- Blocker initially present: migration script was still in stub mode.
- Resolved by implementing executable SQL migration flow with schema placeholders and migration tracking.

### Opportunities

- Reuse this migration foundation for upcoming end-to-end Temporal + Postgres integration scope.
- Add CI job variants that run integration tests with `DVT_PG_INTEGRATION=1`.

### WHAT

- Replaced in-memory maps with PostgreSQL persistence and queries.
- Added migration SQL and migration runner.
- Added integration test mode against real PostgreSQL.

### FOR (goal)

- Unblock MVP persistence milestone for Issue #6.
- Enable reliable end-to-end validation for Golden Paths with persistent state and outbox semantics.

### HOW

- Implemented SQL-backed adapter using `pg`.
- Added schema migration file for `run_metadata`, `run_events`, and `outbox`.
- Added migration runner and npm script.
- Added integration test gating via env vars.

### WHY

- Selected approach: explicit SQL + `pg` (low abstraction, predictable transactions, easy troubleshooting).
- Rejected alternatives:
  - Prisma migration now: would add ORM indirection and setup overhead for current adapter-contract milestone.
  - Keep in-memory + fake migration: does not satisfy issue acceptance for real persistence.

### Scope touched

- Changed:
  - [`packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
  - [`packages/@dvt/adapter-postgres/migrations/001_init.sql`](packages/@dvt/adapter-postgres/migrations/001_init.sql)
  - [`packages/@dvt/adapter-postgres/test/smoke.test.ts`](packages/@dvt/adapter-postgres/test/smoke.test.ts)
  - [`packages/@dvt/adapter-postgres/package.json`](packages/@dvt/adapter-postgres/package.json)
  - [`scripts/db-migrate.cjs`](scripts/db-migrate.cjs)
  - [`package.json`](package.json)
  - [`pnpm-lock.yaml`](pnpm-lock.yaml)
- Out of scope:
  - Temporal orchestration closure tasks (#68 / #14 / #15).
  - Production observability/runbook expansions.

### Risk

- Classification: Medium.
- Main risks:
  - Transaction behavior regressions under duplicate idempotency keys.
  - Schema drift if migrations are not consistently applied in CI.

### Risks & Mitigation

- Risk 1: duplicate event append breaks transaction.
  - Mitigation: `ON CONFLICT (run_id, idempotency_key) DO NOTHING` + fetch existing payload as deduped evidence.
- Risk 2: migration script inconsistencies.
  - Mitigation: schema-level migration tracking table (`schema_migrations`) and ordered SQL execution.

### Impact (affected areas)

- Affected areas:
  - Adapter persistence layer.
  - Local/CI migration flow.
  - Integration testing strategy.
- Compatibility:
  - Contract surface preserved.
- Runtime/CI impact:
  - New DB dependency in migration script (`pg` from workspace root).

### Validation plan

- Targeted checks:
  - `pnpm --filter @dvt/adapter-postgres typecheck`
  - `pnpm --filter @dvt/adapter-postgres test`
- Integration checks:
  - `docker compose -f infra/docker/postgres/docker-compose.yml up -d`
  - `set DATABASE_URL=postgresql://dvt:dvt@localhost:5432/dvt`
  - `set DVT_PG_SCHEMA=dvt_it`
  - `pnpm db:migrate`
  - `set DVT_PG_INTEGRATION=1`
  - `pnpm --filter @dvt/adapter-postgres test`

### Unknowns / maintainer decisions needed

- Confirm whether integration DB tests should run in default CI matrix or only in a dedicated workflow job.
- Confirm whether migration files should move to a repository-global `/migrations` path later.

---

## Template B — Final issue close summary

### Suitability outcome

- The SQL + `pg` approach was suitable and sufficient to implement real persistence while preserving current contracts.

### Blockers encountered

- Transaction failure during duplicate-idempotency test (`current transaction is aborted`).
- Resolved by replacing exception-driven flow with `ON CONFLICT DO NOTHING` and explicit dedup lookup.

### Opportunities identified

- Add dedicated CI integration stage with ephemeral PostgreSQL.
- Extend negative-path tests for transient DB failures and retry behavior.

### WHAT changed

- SQL persistence implemented in [`PostgresStateStoreAdapter`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts).
- Transactional append+enqueue path added in [`appendAndEnqueueTx()`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:89).
- Initial migration added in [`001_init.sql`](packages/@dvt/adapter-postgres/migrations/001_init.sql).
- Migration runner implemented in [`db-migrate.cjs`](scripts/db-migrate.cjs).
- Root script added in [`db:migrate`](package.json:47).
- Integration tests updated in [`smoke.test.ts`](packages/@dvt/adapter-postgres/test/smoke.test.ts).

### WHY this approach

- Needed deterministic transactional behavior with minimal abstraction overhead and immediate compatibility with existing adapter interfaces.

### Acceptance criteria mapping

- [x] Real DB tables for run metadata/events/outbox → migration SQL + migration runner.
- [x] Replace in-memory maps with real SQL persistence → adapter implementation switched to `pg` queries.
- [x] Transactional behavior for append + enqueue → implemented and tested via adapter transaction path.
- [x] Integration test against real PostgreSQL → gated integration suite passing with `DVT_PG_INTEGRATION=1`.

### Validation evidence

- `pnpm --filter @dvt/adapter-postgres typecheck` → pass.
- `pnpm db:migrate` (with `DATABASE_URL` + `DVT_PG_SCHEMA`) → pass.
- `pnpm --filter @dvt/adapter-postgres test` with `DVT_PG_INTEGRATION=1` → 3/3 tests pass.

### Rollback note

- Revert changed files listed in scope section and restore previous in-memory adapter implementation.

### Residual scope (if any)

- Wire this adapter into full Temporal E2E path in next milestone (#68).
- Decide CI policy for integration DB tests.
