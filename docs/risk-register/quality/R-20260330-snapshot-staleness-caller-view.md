---
id: R-20260330-SNAPSHOT-STALENESS-CALLER-VIEW
title: Snapshot staleness can degrade to UNKNOWN while run status remains available
status: Open
date: 2026-03-30
owners:
  - apps/api
  - packages/@dvt/adapter-postgres
severity: Medium
probability: Medium
---

## Risk

`GET /runs/:runId` now exposes caller-visible freshness. If the staleness query
is not wired or fails, the response degrades to `snapshotStaleness=UNKNOWN`.
Consumers that assume strict freshness may mis-handle this state.

## Mitigation

- Emit metric `dvt.api.run_status.snapshot_staleness_fallback_unknown_total`
  with reason labels (`query_not_wired`, `query_failed`).
- Emit structured warning log `run_status.snapshot_staleness_unknown`.
- Keep explicit consumer contract: `UNKNOWN` is a valid state, not an error.

## Follow-up

- Define caller-side SLO and policy for `UNKNOWN` handling in the next lane task
  (`read-your-writes contract`).
