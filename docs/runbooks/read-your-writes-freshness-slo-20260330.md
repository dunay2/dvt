---
title: Read-Your-Writes Freshness SLO
status: Review
owner: API / Runtime / SRE
last_reviewed: 2026-03-30
---

# Read-Your-Writes Freshness SLO

## Scope

This SLO applies to authenticated `GET /runs/:runId` responses in the runtime API.
The API exposes caller-visible freshness as:

- `snapshotStaleness: FRESH`
- `snapshotStaleness: STALE`
- `snapshotStaleness: UNKNOWN`

Measured telemetry:

- `dvt.api.run_status.snapshot_staleness_result_total{result=...}`
- `dvt.api.run_status.snapshot_staleness_fallback_unknown_total{reason=...}`

## Contract

`GET /runs/:runId` is a bounded read-your-writes contract, not linearizable consistency.

Operational target:

- `UNKNOWN` freshness ratio <= `0.1%` over rolling `24h`.
- `STALE` freshness ratio <= `5%` over rolling `15m` for steady-state runtime.

Alert thresholds:

- Warning when `STALE` ratio > `2%` over `10m`.
- Critical when `STALE` ratio > `5%` over `15m`.
- Critical when `UNKNOWN` ratio > `0.1%` over `24h`.

## PromQL Examples

`STALE` ratio (15m):

```promql
sum(rate(dvt_api_run_status_snapshot_staleness_result_total{result="STALE"}[15m]))
/
sum(rate(dvt_api_run_status_snapshot_staleness_result_total[15m]))
```

`UNKNOWN` ratio (24h):

```promql
sum(rate(dvt_api_run_status_snapshot_staleness_result_total{result="UNKNOWN"}[24h]))
/
sum(rate(dvt_api_run_status_snapshot_staleness_result_total[24h]))
```

Fallback unknown by reason:

```promql
sum(rate(dvt_api_run_status_snapshot_staleness_fallback_unknown_total[15m])) by (reason)
```

## Operator Actions

When `STALE` breaches:

1. Verify projector/snapshot lag from runtime logs and state-store query latency.
2. Check adapter health (`temporal`/`postgres`) and readiness transitions.
3. Apply runtime recovery procedures from backend MVP runbook.

When `UNKNOWN` breaches:

1. Check whether staleness query role is wired in composition root.
2. Inspect fallback reasons:
   - `query_not_wired`
   - `query_failed`
3. Escalate to API/runtime owner if sustained for more than one alert window.
