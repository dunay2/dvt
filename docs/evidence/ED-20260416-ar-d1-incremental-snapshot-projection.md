---
title: AR-D1 incremental snapshot projection closure
status: Accepted
date: 2026-04-16
owners:
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/state/InMemoryRunStateStore.ts
  - packages/@dvt/engine/src/state/InMemoryTxStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts
  - packages/@dvt/engine/test/state/InMemoryRunStateStore.rebuildSnapshot.test.ts
  - packages/@dvt/engine/test/state/InMemoryTxStore.rebuildSnapshot.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts
  - docs/planning/closeouts/20260416-ar-d1-incremental-snapshot-projection-closeout.md
evidence:
  tests:
    - pnpm exec eslint "packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts" "packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts" "packages/@dvt/engine/src/state/InMemoryRunStateStore.ts" "packages/@dvt/engine/src/state/InMemoryTxStore.ts" "packages/@dvt/engine/test/state/InMemoryRunStateStore.rebuildSnapshot.test.ts" "packages/@dvt/engine/test/state/InMemoryTxStore.rebuildSnapshot.test.ts" --max-warnings 0
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test -- --run test/state/InMemoryRunStateStore.rebuildSnapshot.test.ts test/state/InMemoryTxStore.rebuildSnapshot.test.ts
    - pnpm --filter @dvt/adapter-postgres build
    - pnpm --filter @dvt/adapter-postgres test -- --run test/PostgresRunSnapshotStore.test.ts
    - pnpm verify:prepush
    - $env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs
---

## Summary

`AR-D1` closes the O(n) stale-snapshot replay risk by moving rebuild paths to
checkpoint-plus-delta projection.

## Outcome

1. `rebuildSnapshot` in Postgres now starts from persisted snapshot checkpoints
   and replays only tail events (`run_seq > checkpoint`).
2. In-memory run stores (`InMemoryRunStateStore`, `InMemoryTxStore`) now apply
   the same checkpoint-plus-delta strategy for rebuild behavior parity.
3. Full replay remains the fallback when checkpoints are missing or incompatible
   (for example, schema-version mismatch), preserving correctness guarantees.
