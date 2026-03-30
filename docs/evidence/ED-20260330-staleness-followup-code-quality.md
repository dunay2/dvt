---
title: Staleness query code quality followup — parallelization, alias constant, warn context
status: Accepted
date: 2026-03-30
owners:
  - apps/api
  - packages/@dvt/contracts
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/engine/IRunSnapshotStalenessQuery.v1.ts
  - packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuerySql.ts
  - packages/@dvt/adapter-postgres/test/PostgresSnapshotStalenessQuery.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts
  - apps/api/src/application/services/getRunStatusUseCase.ts
  - apps/api/src/infrastructure/telemetry/SafeRunSnapshotStalenessReader.ts
  - apps/api/test/application/services/getRunStatusUseCase.test.ts
  - scripts/validate-pr-title.cjs
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test -- test/PostgresSnapshotStalenessQuery.test.ts test/PostgresStateStoreAdapter.sharding.test.ts
    - pnpm --filter dvt-api test -- test/application/services/getRunStatusUseCase.test.ts test/infrastructure/telemetry/SafeRunSnapshotStalenessReader.test.ts
    - pnpm type-check
    - pnpm verify:prepush
---

## Summary

Non-breaking code quality improvements to the snapshot staleness feature
introduced in PR #671, addressing observations from the post-merge review.

## Changes

**LATENCY-1** — `GetRunStatusUseCase.execute` now runs `engine.getRunStatus` and
`resolveSnapshotStaleness` concurrently with `Promise.all`. Both are independent
Postgres reads; sequencing them added an unnecessary round-trip on every
`GET /runs/:runId` call. `resolveSnapshotStaleness` remains fail-soft so a
staleness query failure does not affect the engine status result.

**CI-2** — `IS_SNAPSHOT_STALE_ALIAS` exported from `PostgresSnapshotStalenessQuerySql.ts`
and imported in both test files. Eliminates the string literal duplication that
caused B4/B5 in PR #671 (test assertions drifted from the SQL alias).

**SAFE-WARN-1** — `SafeRunSnapshotStalenessReader` now includes `tenantId` and
`runId` in the failure log attributes. The previous call to `safeWarn` omitted
context, making the log entry self-contained only if paired with the telemetry
path.

**TEST-1** — Removed two `await Promise.resolve()` microtask flushes from
`getRunStatusUseCase.test.ts`. `reportUnknown` is called synchronously before
`execute()` resolves; the flush was fragile and unnecessary.

**TYPE-1** — Removed unused `RunSnapshotStalenessCandidate` type from the
contracts file. No consumer imports it.

**SQL-1** — Added explanatory comment to `isSnapshotStaleSql` documenting why
it uses a LATERAL join against `run_events` instead of `run_event_heads`. The
two functions solve different use cases (single-run API check vs batch discovery
for the projector worker).

**ci** — Added `scripts/validate-pr-title.cjs` and `pnpm pr:validate-title`
to enforce Conventional Commits format before `gh pr create`, wired into the
PR creation sequence in AGENTS.md.

## Risk assessment

All changes are refactors or non-functional improvements to existing behaviour.
No new contracts introduced. No schema changes. No breaking changes to public
interfaces.

The `Promise.all` parallelization is the only behavioural change: if the engine
query throws, the staleness query now runs concurrently and may emit telemetry
even on engine failures. This is acceptable because staleness telemetry is
explicitly fire-and-forget.
