---
title: AR-C2 generated operational evidence
status: Active
owner: Runtime / SRE / Docs
last_reviewed: 2026-04-04
---

# AR-C2 generated operational evidence

Generated at (UTC): `2026-04-04T20:52:30.811Z`

Source mapping:

- `docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md`

## Dashboard wiring evidence (T2)

| Signal key                                                     | Target panel key                  | Status          |
| -------------------------------------------------------------- | --------------------------------- | --------------- |
| `dvt.api.run_start.latency_ms`                                 | `ar-c2.start-run-latency`         | `missing_panel` |
| `dvt.api.plan_compile.latency_ms`                              | `ar-c2.plan-compile-latency`      | `missing_panel` |
| `dvt.api.run_status.snapshot_staleness_result_total`           | `ar-c2.snapshot-staleness-counts` | `missing_panel` |
| `dvt.api.run_status.snapshot_staleness_fallback_unknown_total` | `ar-c2.snapshot-unknown-fallback` | `missing_panel` |
| `dvt_outbox_oldest_claimed_lag_seconds`                        | `ar-c2.outbox-claimed-lag`        | `missing_panel` |
| `dvt_delivery_outbox_drain_lag_seconds`                        | `ar-c2.outbox-drain-lag`          | `missing_panel` |
| `dvt_delivery_event_delivery_latency_ms`                       | `ar-c2.event-delivery-latency`    | `missing_panel` |
| `derived from staleness counts`                                | `ar-c2.run-status-stale-ratio`    | `missing_panel` |
| `derived from staleness counts`                                | `ar-c2.run-status-unknown-ratio`  | `missing_panel` |

## Alert wiring evidence (T3)

| Threshold key                             | Alert rule id | Expression | Window    | Routing target | Status          |
| ----------------------------------------- | ------------- | ---------- | --------- | -------------- | --------------- |
| `ar-c2.start-run-latency.warning`         | `pending`     | `pending`  | `pending` | `pending`      | `missing_alert` |
| `ar-c2.start-run-latency.critical`        | `pending`     | `pending`  | `pending` | `pending`      | `missing_alert` |
| `ar-c2.plan-compile-latency.warning`      | `pending`     | `pending`  | `pending` | `pending`      | `missing_alert` |
| `ar-c2.plan-compile-latency.critical`     | `pending`     | `pending`  | `pending` | `pending`      | `missing_alert` |
| `ar-c2.outbox-drain-lag.warning`          | `pending`     | `pending`  | `pending` | `pending`      | `missing_alert` |
| `ar-c2.outbox-drain-lag.critical`         | `pending`     | `pending`  | `pending` | `pending`      | `missing_alert` |
| `ar-c2.event-delivery-latency.warning`    | `pending`     | `pending`  | `pending` | `pending`      | `missing_alert` |
| `ar-c2.event-delivery-latency.critical`   | `pending`     | `pending`  | `pending` | `pending`      | `missing_alert` |
| `ar-c2.run-status-stale-ratio.warning`    | `pending`     | `pending`  | `pending` | `pending`      | `missing_alert` |
| `ar-c2.run-status-stale-ratio.critical`   | `pending`     | `pending`  | `pending` | `pending`      | `missing_alert` |
| `ar-c2.run-status-unknown-ratio.critical` | `pending`     | `pending`  | `pending` | `pending`      | `missing_alert` |

## Sustained validation windows (T4)

| Signal key                                                     | Window    | Observed  | Expected                             | Status                     |
| -------------------------------------------------------------- | --------- | --------- | ------------------------------------ | -------------------------- |
| `dvt.api.run_start.latency_ms`                                 | `pending` | `pending` | `p50 <= 500ms, p99 <= 2500ms (15m)`  | `insufficient_window_data` |
| `dvt.api.plan_compile.latency_ms`                              | `pending` | `pending` | `p50 <= 1200ms, p99 <= 6000ms (15m)` | `insufficient_window_data` |
| `dvt.api.run_status.snapshot_staleness_result_total`           | `pending` | `pending` | `source for stale/unknown ratios`    | `insufficient_window_data` |
| `dvt.api.run_status.snapshot_staleness_fallback_unknown_total` | `pending` | `pending` | `source for unknown diagnostics`     | `insufficient_window_data` |
| `dvt_outbox_oldest_claimed_lag_seconds`                        | `pending` | `pending` | `observational baseline only`        | `insufficient_window_data` |
| `dvt_delivery_outbox_drain_lag_seconds`                        | `pending` | `pending` | `p95 <= 30s (15m)`                   | `insufficient_window_data` |
| `dvt_delivery_event_delivery_latency_ms`                       | `pending` | `pending` | `p95 <= 1500ms, p99 <= 5000ms (15m)` | `insufficient_window_data` |
| `derived from staleness counts`                                | `pending` | `pending` | `stale <= 5% (15m)`                  | `insufficient_window_data` |
| `derived from staleness counts`                                | `pending` | `pending` | `unknown <= 0.1% (24h)`              | `insufficient_window_data` |

## Notes

- Status values are generated by the collector: `pass`, `missing_panel`, `missing_alert`, `insufficient_window_data`.
- This artifact is machine-generated and should be referenced by AR-C2 closeout tasks.
