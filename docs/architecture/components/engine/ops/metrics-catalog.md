---
title: DVT+ Engine Metrics Catalog
status: Active
owner: Engine Domain
last_reviewed: 2026-04-24
---

# DVT+ Engine Metrics Catalog

- **Version**: 1.0.0
- **Date**: 2026-03-04
- **Owner**: Engine Domain
- **Related**: ADR-0030 sections 3.4 and 5

Service-level metrics are emitted via `IObservability.metrics` from
`@dvt/observability` using the pattern:

```typescript
this.observability.metrics.counter(name, baseLabels).add(value);
```

Worker rollup metrics are emitted through the worker-specific metrics sink
injected into background workers such as `IntentReconcilerWorker`.

---

## Intent Reconciliation Metrics (ADR-0030)

### `dvt.intent.expired_total`

| Field       | Value                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Type        | Counter                                                                                                                                |
| Labels      | `operation`                                                                                                                            |
| Emitted by  | `RunMaintenanceService.reconcileOrphanedIntents()`                                                                                     |
| Description | A PENDING intent was expired after no provider workflow was detected (adapter has no `lookupRunRef`, or `lookupRunRef` returned null). |
| Invariant   | INV-INTENT-007                                                                                                                         |

### `dvt.intent.expired_after_cancel_total`

| Field       | Value                                                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Type        | Counter                                                                                                                            |
| Labels      | `provider`, `operation`                                                                                                            |
| Emitted by  | `RunMaintenanceService.reconcileOrphanedIntents()`                                                                                 |
| Description | A PENDING intent was expired after the reconciler detected a provider workflow via `lookupRunRef()` and successfully cancelled it. |
| Invariant   | INV-INTENT-012                                                                                                                     |

### `dvt.intent.cancelled_total`

| Field       | Value                                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Type        | Counter                                                                                                                                       |
| Labels      | `provider`, `operation`                                                                                                                       |
| Emitted by  | `RunMaintenanceService.reconcileOrphanedIntents()`                                                                                            |
| Description | A DISPATCHED intent was reported in `cancelled[]` after the reconciler cancelled the orphaned provider workflow (run was never bootstrapped). |
| Invariant   | INV-INTENT-013                                                                                                                                |

### `dvt.intent.resolved_total`

| Field       | Value                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Type        | Counter                                                                                                                           |
| Labels      | `provider`, `operation`                                                                                                           |
| Emitted by  | `RunMaintenanceService.reconcileOrphanedIntents()`                                                                                |
| Description | A DISPATCHED intent was reported in `resolved[]` after existing run metadata was found and no provider cancellation was required. |
| Invariant   | INV-INTENT-014                                                                                                                    |

### `dvt.intent.reconcile.resolved_total`

| Field       | Value                                                                   |
| ----------- | ----------------------------------------------------------------------- |
| Type        | Counter                                                                 |
| Labels      | None                                                                    |
| Emitted by  | `IntentReconcilerWorker`                                                |
| Description | Worker rollup count of `resolved[]` entries from reconciliation sweeps. |
| Invariant   | INV-INTENT-014                                                          |

---

## Run Maintenance Metrics

### `dvt.run.queued_timeout_total`

| Field       | Value                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Type        | Counter                                                                                                    |
| Labels      | `provider`, `tenantId`, `operation`                                                                        |
| Emitted by  | `RunMaintenanceService.detectStuckRuns()`                                                                  |
| Description | A PENDING run exceeded the stuck threshold and was transitioned to RunFailed with reason `QUEUED_TIMEOUT`. |

### `dvt.run.cancellation_timeout_total`

| Field       | Value                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Type        | Counter                                                                                                                    |
| Labels      | `provider`, `tenantId`, `operation`                                                                                        |
| Emitted by  | `RunMaintenanceService.detectStuckCancellingRuns()`                                                                        |
| Description | A CANCELLING run exceeded the cancellation threshold and was transitioned to RunFailed with reason `CANCELLATION_TIMEOUT`. |

---

## Label Glossary

| Label       | Values / Description                                                                |
| ----------- | ----------------------------------------------------------------------------------- |
| `operation` | Method name on the service (e.g. `reconcileOrphanedIntents`, `detectStuckRuns`)     |
| `provider`  | Adapter provider ID for a real runtime provider, such as `temporal` or `conductor`. |
| `tenantId`  | Tenant identifier present when the operation is tenant-scoped                       |

---

End of metrics catalog
