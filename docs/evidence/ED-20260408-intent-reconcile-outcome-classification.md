---
title: Intent reconciliation outcome classification for bootstrapped DISPATCHED intents
status: Accepted
date: 2026-04-08
owners:
  - packages/@dvt/engine
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/engine/src/services/runMaintenance/DispatchedIntentReconciliationPolicy.ts
  - packages/@dvt/engine/src/ports/IRunMaintenanceService.ts
  - packages/@dvt/engine/test/services/RunMaintenanceService.test.ts
  - docs/adr/ADR-0030-pre-dispatch-intent-log.md
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/services/RunMaintenanceService.test.ts test/workers/IntentReconcilerWorker.test.ts
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

The intent reconciler classified a bootstrapped `DISPATCHED` intent as
`cancelled` even though no provider workflow cancel occurred. The fix adds a
distinct `resolved` outcome for local intent cleanup after the run is already
bootstrapped.

This slice is a breaking public API change for `@dvt/engine` consumers because
`ReconcileOrphanedIntentsResult` now requires a `resolved` array in addition to
the existing outcome buckets.

## What changed

- `DispatchedIntentReconciliationPolicy` now returns `resolved` when the run is
  already bootstrapped and the intent is only being resolved locally.
- `RunMaintenanceService` and `IntentReconcilerWorker` regression coverage now
  lock the split between `resolved` and `cancelled`.
- `IRunMaintenanceService`, ADR-0030, and the metrics catalog now document the
  explicit `resolved` outcome, the provider-labelled
  `dvt.intent.resolved_total` service metric, and the
  `dvt.intent.reconcile.resolved_total` worker rollup metric.

## Breaking change

- `ReconcileOrphanedIntentsResult` is an exported engine port and now includes a
  required `resolved: string[]` field.
- Any in-repo or out-of-tree implementation of `IRunMaintenanceService` must be
  updated to return `resolved`, even when the value is an empty array.
- Mixed-version deployments or tests that pair the updated worker with an older
  maintenance-service implementation are not compatible across this boundary.

## Expected effect

- `dvt.intent.reconcile.cancelled_total` only counts intents that triggered a
  real provider cancellation.
- `dvt.intent.resolved_total` preserves provider-scoped observability for
  bootstrapped `DISPATCHED` intents that only required local resolution.
- `dvt.intent.reconcile.resolved_total` counts bootstrapped `DISPATCHED`
  intents that only required local resolution.
- Bootstrapped `DISPATCHED` intents remain resolved in storage without being
  reported as cancelled.
