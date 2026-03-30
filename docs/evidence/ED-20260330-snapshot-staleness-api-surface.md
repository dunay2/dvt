---
title: Snapshot staleness caller surface and fallback telemetry
status: Accepted
date: 2026-03-30
owners:
  - apps/api
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/engine/IRunSnapshotStalenessQuery.v1.ts
  - packages/@dvt/engine/src/state/InMemoryRunStateStore.ts
  - packages/@dvt/engine/src/state/InMemoryTxStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuery.ts
  - apps/api/src/application/services/getRunStatusUseCase.ts
  - apps/api/src/infrastructure/telemetry/ObservabilityRunStatusStalenessTelemetry.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test -- test/PostgresSnapshotStalenessQuery.test.ts test/PostgresStateStoreAdapter.sharding.test.ts
    - pnpm --filter @dvt/engine test -- test/state/InMemoryRunStateStore.staleSnapshotRuns.test.ts test/state/InMemoryTxStore.staleSnapshotRuns.test.ts
    - pnpm --filter dvt-api test -- test/application/services/getRunStatusUseCase.test.ts test/modules/stateStoreRoles.test.ts test/entrypoints/http/getRunRoute.test.ts
    - pnpm --filter dvt-lineage-worker test -- test/env.test.ts
    - pnpm type-check
    - pnpm verify:prepush
---

## Summary

This change makes snapshot freshness explicit for run status callers while keeping
the read path fail-soft. The API now returns `snapshotStaleness` as `FRESH`,
`STALE`, or `UNKNOWN`.

When staleness lookup is unavailable or fails, the route still returns status
successfully and emits a fallback metric/log event. This preserves read
availability and gives operations visibility into degraded freshness telemetry.

## SRP rationale

- Runtime status read (`GetRunStatusUseCase`) owns orchestration only.
- Snapshot freshness lookup is isolated behind a minimal reader boundary
  (`isSnapshotStale`).
- Fallback observability is isolated in
  `ObservabilityRunStatusStalenessTelemetry`.

This keeps domain read behavior, infrastructure query behavior, and telemetry
behavior independently changeable.
