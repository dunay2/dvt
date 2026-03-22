---
title: 'R-20260321-PURGE-OPT-IN-01 — Delivery buffer purge runtime is opt-in and will not run in existing deployments until DVT_PURGE_ENABLED is set'
status: Open
owner: Platform / Ops
last_reviewed: 2026-03-21
---

# R-20260321-PURGE-OPT-IN-01

## Risk Statement

The `DeliveryBufferPurgeRuntime` added in G5-PR3 is gated behind
`DVT_PURGE_ENABLED=true` (default `false`). Existing and new deployments that
do not set this env var will not run any purge cycle. The three non-authoritative
delivery buffer tables (`outbox` delivered rows, `outbox_dead_letter`,
`lineage_dead_letter`) will grow unbounded until the flag is explicitly enabled
and the retention window configured.

## Severity

**Medium** — no data correctness risk; operational/storage risk only. Row counts
grow silently with no alert unless `dvt.outbox.retained_rows` and
`dvt.dead_letter.retained_rows` histograms are scraped and alerted on.

## Trigger Conditions

- `DVT_PURGE_ENABLED` is not set (or set to `false`) in any outbox-worker deployment
- No external purge job compensates

## Impact

- `outbox` delivered rows accumulate without bound (default retention: 7 days
  if enabled — effectively infinite if disabled)
- `outbox_dead_letter` and `lineage_dead_letter` accumulate without bound
  (default retention: 30 days if enabled)
- Postgres storage grows; read query performance may degrade over time if table
  bloat affects index scans
- No metrics are emitted while the runtime is disabled — the gap is invisible
  without manual `SELECT COUNT(*)` queries

## Mitigations In Place

- `DVT_PURGE_ENABLED` is explicit and documented; cannot be accidentally enabled
- Default retention values match `DEFAULT_DELIVERY_BUFFER_RETENTION`
  (`{ 7, 30, 30, 5000 }`) and are documented in the G5-PR3 closeout
- `DeliveryBufferPurger` is fail-soft — enabling the runtime in production is
  low-risk
- The `dvt.outbox.retained_rows` and `dvt.dead_letter.retained_rows` histograms
  will emit on first enabled cycle, providing immediate visibility

## Recommended Actions

1. Set `DVT_PURGE_ENABLED=true` in staging before the next production deploy
2. Confirm `dvt.outbox.retained_rows` and `dvt.dead_letter.retained_rows` metrics
   appear in the observability dashboard
3. Set alerts on `dvt.outbox.purge_failures_total` and
   `dvt.dead_letter.purge_failures_total` counters
4. Enable in production with `DVT_PURGE_ENABLED=true` and tune retention windows
   via the remaining 5 env vars

## References

- [G5-PR3 Closeout](../planning/closeouts/20260321-gap-5-pr3-delivery-buffer-retention-closeout.md)
  — runtime wiring section documents `DeliveryBufferPurgeRuntime` and all 6 env vars
- `apps/outbox-worker/src/runtime/DeliveryBufferPurgeRuntime.ts`
- `apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts`
- `apps/outbox-worker/src/plugins/env.ts` — `ActiveCommonEnvSchema` purge fields
