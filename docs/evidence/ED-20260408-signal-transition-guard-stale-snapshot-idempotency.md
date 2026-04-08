---
title: SignalTransitionGuard event-authoritative idempotency under stale snapshots
status: Accepted
date: 2026-04-08
owners:
  - packages/@dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/services/signal/SignalTransitionGuard.ts
  - packages/@dvt/engine/test/services/SignalTransitionGuard.test.ts
  - docs/adr/ADR-0047-runtime-owned-realized-lifecycle-for-signal-driven-transitions.md
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/services/SignalTransitionGuard.test.ts
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

`SignalTransitionGuard` previously depended on materialized snapshots when
evaluating PAUSE/RESUME idempotency. In asynchronous projection stores, stale
snapshots can diverge from the event log and allow duplicate signal dispatches
or block valid transitions.

This slice keeps guard validation event-authoritative when snapshots are stale
without forcing a full event replay on every signal.

## What changed

- `SignalTransitionGuard.assertAllowed()` now uses `getSnapshot()` as the hot
  path when the snapshot is fresh and falls back to event replay only when the
  snapshot is missing or the store marks it stale via
  `IRunSnapshotStalenessQuery`.
- `isAlreadyApplied()` keeps PAUSE/RESUME semantics aligned with runtime-owned
  realized lifecycle events (`RunPaused`/`RunResumed`) while using the
  event-derived snapshot state on the stale fallback path.
- Regression coverage now includes stale-snapshot scenarios for both PAUSE and
  RESUME to ensure duplicate signals are not re-dispatched when event history
  already contains the realized transition, plus a fast-path assertion that a
  fresh snapshot does not trigger `listEvents()`.

## Expected effect

- PAUSE/RESUME idempotency decisions are consistent even when materialized
  snapshots lag event append.
- Fresh snapshots keep the signal guard on the intended hot-read path instead
  of forcing an event scan per signal.
- The guard remains aligned with ADR-0047 runtime-owned lifecycle boundaries.
- Adapter signal dispatch is protected from duplicate PAUSE/RESUME caused by
  snapshot drift.
