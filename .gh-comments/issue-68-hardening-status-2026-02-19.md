Update (2026-02-19 18:32 UTC): PostgreSQL hardening slice completed (P0/P1/P2) on top of the active #68 track.

Summary of completed changes:

1. P0

- Removed unused `_outbox` transactional parameter and aligned engine/in-memory call sites.
- Added safe pending outbox claim semantics with `FOR UPDATE SKIP LOCKED` + stale-claim recovery (`claimed_at`).

2. P1

- Added integration schema cleanup (`DROP SCHEMA ... CASCADE`) in adapter-postgres smoke tests.
- CI (`contracts.yml` / `contract-hashes`) now runs adapter-postgres integration smoke tests against service Postgres.

3. P2

- Removed redundant index path for `run_events(run_id, run_seq)` (already covered by PK).
- Evaluated local types vs `@dvt/contracts`; decision documented in code: keep local transactional adapter types for now to avoid conflating projection/snapshot contracts with outbox transaction contracts.

Validation evidence:

- `pnpm --filter @dvt/engine build` passed.
- `pnpm --filter @dvt/adapter-postgres build` passed.
- `pnpm --filter @dvt/adapter-postgres exec vitest run test/smoke.test.ts --config vitest.config.cjs` passed (3/3) with `DVT_PG_INTEGRATION=1` and `DATABASE_URL` set.

Note:

- This update hardens the Postgres adapter and CI validation path.
- Full closure of #68 still depends on end-to-end publication criteria tied to non-stub golden-path execution parity.
