---
title: AR-C2 generated operational evidence
status: Active
owner: Runtime / SRE / Docs
last_reviewed: 2026-05-18
---

# AR-C2 generated operational evidence

Generated at (UTC): `2026-05-18T14:51:48.519Z`

Source mapping:

- `docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md`

## Dashboard wiring evidence (T2)

| Signal key                                                     | Target panel key                  | Status          |
| -------------------------------------------------------------- | --------------------------------- | --------------- |
| `dvt_api_run_start_latency_seconds`                            | `ar-c2.start-run-latency`         | `missing_panel` |
| `dvt_api_plan_compile_latency_seconds`                         | `ar-c2.plan-compile-latency`      | `missing_panel` |
| `dvt.api.run_status.snapshot_staleness_result_total`           | `ar-c2.snapshot-staleness-counts` | `missing_panel` |
| `dvt.api.run_status.snapshot_staleness_fallback_unknown_total` | `ar-c2.snapshot-unknown-fallback` | `missing_panel` |
| `dvt_outbox_oldest_claimed_lag_seconds`                        | `ar-c2.outbox-claimed-lag`        | `missing_panel` |
| `dvt_delivery_outbox_drain_lag_seconds`                        | `ar-c2.outbox-drain-lag`          | `missing_panel` |
| `dvt_delivery_event_delivery_latency_seconds`                  | `ar-c2.event-delivery-latency`    | `missing_panel` |
| `derived from staleness counts`                                | `ar-c2.run-status-stale-ratio`    | `missing_panel` |
| `derived from staleness counts`                                | `ar-c2.run-status-unknown-ratio`  | `missing_panel` |

## Alert wiring evidence (T3)

| Threshold key                             | Source reference                                                                     | Alert rule id                             | Expression                                                                                                                                                          | Window | Routing target          | Status          |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- | --------------- |
| `ar-c2.start-run-latency.warning`         | `docs/runbooks/api-runtime-sla-canonical-20260404.md#current-observability-baseline` | `ar-c2-start-run-latency-warning`         | `histogram_quantile(0.50, sum(rate(dvt_api_run_start_latency_seconds_bucket[15m])) by (le)) > 0.5`                                                                  | `15m`  | `api-oncall`            | `missing_alert` |
| `ar-c2.start-run-latency.critical`        | `docs/runbooks/api-runtime-sla-canonical-20260404.md#current-observability-baseline` | `ar-c2-start-run-latency-critical`        | `histogram_quantile(0.99, sum(rate(dvt_api_run_start_latency_seconds_bucket[15m])) by (le)) > 2.5`                                                                  | `15m`  | `api-oncall-pager`      | `missing_alert` |
| `ar-c2.plan-compile-latency.warning`      | `docs/runbooks/api-runtime-sla-canonical-20260404.md#current-observability-baseline` | `ar-c2-plan-compile-latency-warning`      | `histogram_quantile(0.50, sum(rate(dvt_api_plan_compile_latency_seconds_bucket[15m])) by (le)) > 1.2`                                                               | `15m`  | `api-oncall`            | `missing_alert` |
| `ar-c2.plan-compile-latency.critical`     | `docs/runbooks/api-runtime-sla-canonical-20260404.md#current-observability-baseline` | `ar-c2-plan-compile-latency-critical`     | `histogram_quantile(0.99, sum(rate(dvt_api_plan_compile_latency_seconds_bucket[15m])) by (le)) > 6`                                                                 | `15m`  | `api-oncall-pager`      | `missing_alert` |
| `ar-c2.outbox-drain-lag.warning`          | `docs/runbooks/api-runtime-sla-canonical-20260404.md#current-observability-baseline` | `ar-c2-outbox-drain-lag-warning`          | `histogram_quantile(0.95, sum(rate(dvt_delivery_outbox_drain_lag_seconds_bucket[15m])) by (le)) > 30`                                                               | `15m`  | `delivery-oncall`       | `missing_alert` |
| `ar-c2.outbox-drain-lag.critical`         | `docs/runbooks/api-runtime-sla-canonical-20260404.md#current-observability-baseline` | `ar-c2-outbox-drain-lag-critical`         | `histogram_quantile(0.95, sum(rate(dvt_delivery_outbox_drain_lag_seconds_bucket[15m])) by (le)) > 60`                                                               | `15m`  | `delivery-oncall-pager` | `missing_alert` |
| `ar-c2.event-delivery-latency.warning`    | `docs/runbooks/api-runtime-sla-canonical-20260404.md#current-observability-baseline` | `ar-c2-event-delivery-latency-warning`    | `histogram_quantile(0.95, sum(rate(dvt_delivery_event_delivery_latency_seconds_bucket[15m])) by (le)) > 1.5`                                                        | `15m`  | `delivery-oncall`       | `missing_alert` |
| `ar-c2.event-delivery-latency.critical`   | `docs/runbooks/api-runtime-sla-canonical-20260404.md#current-observability-baseline` | `ar-c2-event-delivery-latency-critical`   | `histogram_quantile(0.99, sum(rate(dvt_delivery_event_delivery_latency_seconds_bucket[15m])) by (le)) > 5`                                                          | `15m`  | `delivery-oncall-pager` | `missing_alert` |
| `ar-c2.run-status-stale-ratio.warning`    | `docs/runbooks/read-your-writes-freshness-slo-20260330.md#contract`                  | `ar-c2-run-status-stale-ratio-warning`    | `sum(rate(dvt_api_run_status_snapshot_staleness_result_total{result="stale"}[15m])) / sum(rate(dvt_api_run_status_snapshot_staleness_result_total[15m])) > 0.05`    | `15m`  | `api-oncall`            | `missing_alert` |
| `ar-c2.run-status-stale-ratio.critical`   | `docs/runbooks/read-your-writes-freshness-slo-20260330.md#contract`                  | `ar-c2-run-status-stale-ratio-critical`   | `sum(rate(dvt_api_run_status_snapshot_staleness_result_total{result="stale"}[15m])) / sum(rate(dvt_api_run_status_snapshot_staleness_result_total[15m])) > 0.2`     | `15m`  | `api-oncall-pager`      | `missing_alert` |
| `ar-c2.run-status-unknown-ratio.critical` | `docs/runbooks/read-your-writes-freshness-slo-20260330.md#contract`                  | `ar-c2-run-status-unknown-ratio-critical` | `sum(rate(dvt_api_run_status_snapshot_staleness_result_total{result="unknown"}[24h])) / sum(rate(dvt_api_run_status_snapshot_staleness_result_total[24h])) > 0.001` | `24h`  | `api-oncall-pager`      | `missing_alert` |

## Sustained validation windows (T4)

| Signal key                                                     | Window    | Observed  | Expected                             | Status                     |
| -------------------------------------------------------------- | --------- | --------- | ------------------------------------ | -------------------------- |
| `dvt_api_run_start_latency_seconds`                            | `pending` | `pending` | `p50 <= 500ms, p99 <= 2500ms (15m)`  | `insufficient_window_data` |
| `dvt_api_plan_compile_latency_seconds`                         | `pending` | `pending` | `p50 <= 1200ms, p99 <= 6000ms (15m)` | `insufficient_window_data` |
| `dvt.api.run_status.snapshot_staleness_result_total`           | `pending` | `pending` | `source for stale/unknown ratios`    | `insufficient_window_data` |
| `dvt.api.run_status.snapshot_staleness_fallback_unknown_total` | `pending` | `pending` | `source for unknown diagnostics`     | `insufficient_window_data` |
| `dvt_outbox_oldest_claimed_lag_seconds`                        | `pending` | `pending` | `observational baseline only`        | `insufficient_window_data` |
| `dvt_delivery_outbox_drain_lag_seconds`                        | `pending` | `pending` | `p95 <= 30s (15m)`                   | `insufficient_window_data` |
| `dvt_delivery_event_delivery_latency_seconds`                  | `pending` | `pending` | `p95 <= 1500ms, p99 <= 5000ms (15m)` | `insufficient_window_data` |
| `derived from staleness counts`                                | `pending` | `pending` | `stale <= 5% (15m)`                  | `insufficient_window_data` |
| `derived from staleness counts`                                | `pending` | `pending` | `unknown <= 0.1% (24h)`              | `insufficient_window_data` |

## Notes

- Status values are generated by the collector: `pass`, `missing_panel`, `missing_alert`, `insufficient_window_data`.
- This artifact is machine-generated and should be referenced by AR-C2 closeout tasks.
