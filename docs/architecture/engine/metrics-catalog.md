# DVT+ Engine Metrics Catalog

- **Version**: 1.0.0
- **Date**: 2026-03-04
- **Owner**: Engine Domain
- **Related**: ADR-0030 §3.9

All metrics are emitted via `IObservability.metrics` from `@dvt/observability` using the pattern:

```typescript
this.observability.metrics.counter(name, baseLabels).add(value);
```

---

## Intent Reconciliation Metrics (ADR-0030)

### `dvt.intent.expired_total`

| Field       | Value                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Type        | Counter                                                                                                                                |
| Labels      | `operation`                                                                                                                            |
| Emitted by  | `RunMaintenanceService.reconcileOrphanedIntents()`                                                                                     |
| Description | A PENDING intent was expired after no provider workflow was detected (adapter has no `lookupRunRef`, or `lookupRunRef` returned null). |
| Invariant   | INV-INTENT-013                                                                                                                         |

### `dvt.intent.expired_after_cancel_total`

| Field       | Value                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Type        | Counter                                                                                                                          |
| Labels      | `provider`, `operation`                                                                                                          |
| Emitted by  | `RunMaintenanceService.reconcileOrphanedIntents()`                                                                               |
| Description | A PENDING intent was expired after the reconciler detected a provider workflow via `lookupRunRef` and successfully cancelled it. |
| Invariant   | INV-INTENT-011                                                                                                                   |

### `dvt.intent.cancelled_total`

| Field       | Value                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Type        | Counter                                                                                                                      |
| Labels      | `provider`, `operation`                                                                                                      |
| Emitted by  | `RunMaintenanceService.reconcileOrphanedIntents()`                                                                           |
| Description | A DISPATCHED intent was resolved after the reconciler cancelled the orphaned provider workflow (run was never bootstrapped). |
| Invariant   | INV-INTENT-008                                                                                                               |

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

| Label       | Values / Description                                                            |
| ----------- | ------------------------------------------------------------------------------- |
| `operation` | Method name on the service (e.g. `reconcileOrphanedIntents`, `detectStuckRuns`) |
| `provider`  | Adapter provider ID: `temporal`, `mock`, `conductor`, etc.                      |
| `tenantId`  | Tenant identifier — present when the operation is tenant-scoped                 |

---

End of metrics catalog
