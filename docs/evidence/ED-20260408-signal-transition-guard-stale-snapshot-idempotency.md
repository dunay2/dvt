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

This slice makes guard validation event-authoritative by rebuilding the
evaluation snapshot from the run event stream.

## What changed

- `SignalTransitionGuard.assertAllowed()` now rebuilds the base snapshot from
  `listEvents()` for validation/idempotency checks instead of trusting
  `getSnapshot()`.
- `isAlreadyApplied()` keeps PAUSE/RESUME semantics aligned with runtime-owned
  realized lifecycle events (`RunPaused`/`RunResumed`) while using the
  event-derived snapshot state.
- Regression coverage now includes stale-snapshot scenarios for both PAUSE and
  RESUME to ensure duplicate signals are not re-dispatched when event history
  already contains the realized transition.

## Expected effect

- PAUSE/RESUME idempotency decisions are consistent even when materialized
  snapshots lag event append.
- The guard remains aligned with ADR-0047 runtime-owned lifecycle boundaries.
- Adapter signal dispatch is protected from duplicate PAUSE/RESUME caused by
  snapshot drift.
