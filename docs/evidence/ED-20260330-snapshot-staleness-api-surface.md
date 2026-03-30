---
title: Snapshot staleness query and API freshness surface
status: Accepted
date: 2026-03-30
owners:
  - packages/@dvt/contracts
  - packages/@dvt/adapter-postgres
  - packages/@dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/engine/IRunSnapshotStalenessQuery.v1.ts
  - packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuery.ts
  - apps/api/src/application/services/getRunStatusUseCase.ts
evidence:
  - pnpm --filter @dvt/engine test -- test/state/InMemoryRunStateStore.staleSnapshotRuns.test.ts test/state/InMemoryTxStore.staleSnapshotRuns.test.ts
  - pnpm --filter @dvt/adapter-postgres test -- test/PostgresSnapshotStalenessQuery.test.ts test/PostgresStateStoreAdapter.sharding.test.ts
  - pnpm --filter dvt-api test -- test/application/services/getRunStatusUseCase.test.ts test/entrypoints/http/getRunRoute.test.ts test/modules/stateStoreRoles.test.ts
---

## Summary

This change introduces a per-run snapshot staleness check and propagates that signal to API callers as `snapshotStaleness` (`FRESH | STALE | UNKNOWN`) on `GET /runs/:runId`.

## Why

Batch-oriented stale listing is not safe for per-run API freshness decisions because bounded batch size can produce false negatives.

## What was validated

- In-memory state stores expose deterministic per-run staleness checks.
- Postgres adapter supports tenant-scoped per-run staleness query and preserves existing batch listing behavior.
- API read use case returns caller-visible freshness while preserving existing runtime query contract semantics.
