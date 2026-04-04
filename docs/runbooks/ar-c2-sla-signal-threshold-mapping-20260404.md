---
title: AR-C2 SLA Signal Threshold Mapping
status: Active
owner: API / Runtime / SRE
last_reviewed: 2026-04-04
---

# AR-C2 SLA Signal Threshold Mapping

Canonical mapping table for `AR-C2-T1`.

This document is the single source of truth for:

- logical signal identity
- exported metric identity
- threshold policy
- alert policy posture
- target dashboard panel key

Use this mapping to wire and verify `AR-C2-T2` and `AR-C2-T3`.

## Governing sources

- `docs/runbooks/api-runtime-sla-canonical-20260404.md`
- `docs/guides/api-control-plane-technical-manual-20260404.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-sla-operational-closure-plan-20260404.md`
- `docs/planning/state/agent-lane-c.yaml`

## Mapping table

| Logical signal                     | Logical metric ID                                              | Exported metric / derived expression                            | SLO threshold                      | Alert policy                                            | Target dashboard panel key        | Signal owner  |
| ---------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------- | --------------------------------- | ------------- |
| Start-run latency p50/p99          | `dvt.api.run_start.latency_ms`                                 | `dvt_api_run_start_latency_ms_bucket`                           | p50 <= 500ms, p99 <= 2500ms (15m)  | warning p99 > 2000ms (10m), critical p99 > 2500ms (15m) | `ar-c2.start-run-latency`         | API runtime   |
| Plan compile latency p50/p99       | `dvt.api.plan_compile.latency_ms`                              | `dvt_api_plan_compile_latency_ms_bucket`                        | p50 <= 1200ms, p99 <= 6000ms (15m) | warning p99 > 5000ms (10m), critical p99 > 6000ms (15m) | `ar-c2.plan-compile-latency`      | API runtime   |
| Snapshot staleness counts          | `dvt.api.run_status.snapshot_staleness_result_total`           | `dvt_api_run_status_snapshot_staleness_result_total`            | source for stale/unknown ratios    | source metric only                                      | `ar-c2.snapshot-staleness-counts` | API runtime   |
| Snapshot unknown fallback counts   | `dvt.api.run_status.snapshot_staleness_fallback_unknown_total` | `dvt_api_run_status_snapshot_staleness_fallback_unknown_total`  | source for unknown diagnostics     | source metric only                                      | `ar-c2.snapshot-unknown-fallback` | API runtime   |
| Outbox claimed-lag gauge           | `dvt_outbox_oldest_claimed_lag_seconds`                        | `dvt_outbox_oldest_claimed_lag_seconds`                         | observational baseline only        | no canonical threshold yet                              | `ar-c2.outbox-claimed-lag`        | outbox worker |
| Outbox drain lag p95               | `dvt_delivery_outbox_drain_lag_seconds`                        | `dvt_delivery_outbox_drain_lag_seconds`                         | p95 <= 30s (15m)                   | warning p95 > 25s (10m), critical p95 > 30s (15m)       | `ar-c2.outbox-drain-lag`          | outbox worker |
| Event delivery latency p95/p99     | `dvt_delivery_event_delivery_latency_ms`                       | `dvt_delivery_event_delivery_latency_ms_bucket`                 | p95 <= 1500ms, p99 <= 5000ms (15m) | warning p99 > 4000ms (10m), critical p99 > 5000ms (15m) | `ar-c2.event-delivery-latency`    | outbox worker |
| Stale ratio for `GET /runs/:runId` | derived from staleness counts                                  | stale ratio expression from `snapshot_staleness_result_total`   | stale <= 5% (15m)                  | warning > 2% (10m), critical > 5% (15m)                 | `ar-c2.run-status-stale-ratio`    | API runtime   |
| Unknown freshness ratio            | derived from staleness counts                                  | unknown ratio expression from `snapshot_staleness_result_total` | unknown <= 0.1% (24h)              | critical > 0.1% (24h)                                   | `ar-c2.run-status-unknown-ratio`  | API runtime   |

## Wiring posture

- `AR-C2-T1` completion means the mapping above is canonical and frozen.
- Dashboard wiring proof is owned by `AR-C2-T2`.
- Alert wiring/routing proof is owned by `AR-C2-T3`.
- Sustained validation evidence is owned by `AR-C2-T4`.
