---
title: Closeout - AR-D1 incremental snapshot projection
status: Review
owner: Runtime / State Store / Docs
last_reviewed: 2026-04-16
planning_type: closeout
slice: AR-D1-incremental-snapshot-projection
---

# Closeout: AR-D1 incremental snapshot projection

## Think-First Analysis

### Problem summary

Snapshot rebuild paths were replaying full event history by default. Under
high-step-count runs this converts stale-snapshot recovery into O(total events),
which degrades status freshness and projector throughput.

### Root cause

Rebuild implementations ignored available checkpoint state
(`run_snapshots.last_run_seq` and in-memory equivalents) and always started
replay from sequence origin.

### Governing constraints

- ADR-0004: run event ordering is authoritative via ascending `runSeq`.
- AR-D1 target in Lane D: apply event delta from projection checkpoints and keep
  full replay as fallback for missing or incompatible checkpoint state.
- AGENTS.md: no rule relaxation, no stub behavior, and validation evidence
  including `pnpm verify:prepush`.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts`
  - `packages/@dvt/engine/src/state/InMemoryRunStateStore.ts`
  - `packages/@dvt/engine/src/state/InMemoryTxStore.ts`
  - related tests in engine and adapter-postgres
  - planning closure/evidence/risk docs for AR-D1
- Out of scope:
  - worker scaling policy (`AR-D3`)
  - continue-as-new governance (`AR-D2`)
  - retention and rollout slices (`AR-D5`, `AR-D8`)

## Implementation Summary

1. Postgres `rebuildSnapshot` now reads persisted checkpoint
   (`snapshot`, `last_run_seq`) and replays only tail events after that
   sequence when checkpoint schema is compatible.
2. In-memory rebuilds now apply the same checkpoint-plus-delta behavior for
   parity with Postgres runtime semantics.
3. Full replay remains fallback when checkpoint data is missing, out of bounds,
   or schema-incompatible.
4. Added targeted tests covering:
   - Postgres checkpoint tail replay in `rebuildSnapshot`.
   - Postgres fallback replay on incompatible checkpoint schema.
   - In-memory checkpoint delta replay and fallback behavior.

## Validation Run

- `pnpm exec eslint "packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts" "packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts" "packages/@dvt/engine/src/state/InMemoryRunStateStore.ts" "packages/@dvt/engine/src/state/InMemoryTxStore.ts" "packages/@dvt/engine/test/state/InMemoryRunStateStore.rebuildSnapshot.test.ts" "packages/@dvt/engine/test/state/InMemoryTxStore.rebuildSnapshot.test.ts" --max-warnings 0`
- `pnpm --filter @dvt/engine build`
- `pnpm --filter @dvt/engine test -- --run test/state/InMemoryRunStateStore.rebuildSnapshot.test.ts test/state/InMemoryTxStore.rebuildSnapshot.test.ts`
- `pnpm --filter @dvt/adapter-postgres build`
- `pnpm --filter @dvt/adapter-postgres test -- --run test/PostgresRunSnapshotStore.test.ts`
- `pnpm docs:workboard:generate`
- `pnpm docs:sync`
- `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No stub, placeholder, or fake success path added.
- No lint/type/test rule disabled.
- No hook bypass or `--no-verify` flow used.
