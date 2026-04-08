---
title: Intent reconciliation outcome classification for bootstrapped DISPATCHED intents
status: Accepted
date: 2026-04-08
owners:
  - packages/@dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/services/runMaintenance/DispatchedIntentReconciliationPolicy.ts
  - packages/@dvt/engine/src/ports/IRunMaintenanceService.ts
  - packages/@dvt/engine/test/services/RunMaintenanceService.test.ts
  - docs/adr/ADR-0030-pre-dispatch-intent-log.md
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/services/RunMaintenanceService.test.ts
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

The intent reconciler classified a bootstrapped `DISPATCHED` intent as
`cancelled` even though no provider workflow cancel occurred. The fix adds a
distinct `resolved` outcome for local intent cleanup after the run is already
bootstrapped.

## What changed

- `DispatchedIntentReconciliationPolicy` now returns `resolved` when the run is
  already bootstrapped and the intent is only being resolved locally.
- `RunMaintenanceService` and `IntentReconcilerWorker` regression coverage now
  lock the split between `resolved` and `cancelled`.
- `IRunMaintenanceService`, ADR-0030, and the metrics catalog now document the
  explicit `resolved` outcome and the new `dvt.intent.reconcile.resolved_total`
  rollup metric.

## Expected effect

- `dvt.intent.reconcile.cancelled_total` only counts intents that triggered a
  real provider cancellation.
- `dvt.intent.reconcile.resolved_total` counts bootstrapped `DISPATCHED`
  intents that only required local resolution.
- Bootstrapped `DISPATCHED` intents remain resolved in storage without being
  reported as cancelled.
