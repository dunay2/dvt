---
id: R-20260328-LINEAGE-RETRY-SCHEDULING-01
title: Lineage retry scheduling can increase delivery lag under sustained sink failures
status: Open
date: 2026-03-28
owners:
  - @dvt/adapter-postgres
severity: Medium
probability: Medium
---

# R-20260328-LINEAGE-RETRY-SCHEDULING-01

## Context

`lineage_outbox` now delays retries with exponential backoff (`next_attempt_at`).
This prevents hot retry loops but may increase end-to-end lineage publication latency during prolonged downstream failures.

## Residual Risk

1. Backoff can accumulate a larger pending backlog before recovery.
2. Operators may interpret lag as worker under-capacity instead of downstream sink instability.

## Mitigation

1. Keep `lineage_outbox` lag visible through the lineage worker health endpoint.
2. Follow-on slice (`DLQ alerting + automated replay`) must add explicit lag and DLQ alert thresholds.

## 2026-03-28 status update

1. Sonar warnings in adapter/delivery runtime were remediated in `6b98f90`.
2. Residual risk is now focused on production race-depth confidence, not static-quality debt.
3. The remaining mitigation path is:
   - `RC-B5-F2` for real-Postgres concurrency coverage
   - `DLQ alerting + automated replay` for operational lag controls
