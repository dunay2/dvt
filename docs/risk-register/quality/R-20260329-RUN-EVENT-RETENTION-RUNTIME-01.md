---
id: R-20260329-RUN-EVENT-RETENTION-RUNTIME-01
title: Run-event retention runtime can drift between configured policy and effective purge/archive execution
status: Open
date: 2026-03-29
owners:
  - @dvt/adapter-postgres
  - dvt-outbox-worker
severity: Medium
probability: Medium
---

# R-20260329-RUN-EVENT-RETENTION-RUNTIME-01

## Context

Retention behavior depends on runtime wiring across scheduler, coordinator, and storage adapters.
Even with policy defined in docs and env vars, production drift can occur if one execution path skips archive/purge or applies mismatched cutoffs.

## Residual Risk

1. `run_events` growth can exceed expected bounds when retention jobs do not run with the intended cadence.
2. Archive coverage can become partial if eligibility filters and purge cutoffs diverge.
3. Operators can misread "runtime healthy" while retention lag accumulates silently.

## Mitigation

1. Keep retention cutoffs and archived/purged row counters emitted as first-class metrics.
2. Maintain negative tests for invalid or out-of-window retention inputs.
3. Add periodic consistency checks comparing eligible rows vs processed rows per tenant.

## Exit Criteria

1. Runtime emits explicit retention lag and last-success timestamps.
2. Integration tests cover scheduler disabled/enabled modes and stale watermark recovery.
3. Operational runbook includes alert thresholds and rollback steps for retention lag.

## 2026-03-29 status update

1. ARC docs gate requirement (`riskUpdate`) is now explicitly satisfied in this slice.
