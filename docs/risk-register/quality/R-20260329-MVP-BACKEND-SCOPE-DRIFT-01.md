---
id: R-20260329-MVP-BACKEND-SCOPE-DRIFT-01
title: MVP backend scope can drift from implemented operability surface
status: Open
date: 2026-03-29
owners:
  - docs
  - dvt-api
severity: Medium
probability: Medium
---

# R-20260329-MVP-BACKEND-SCOPE-DRIFT-01

## Context

The roadmap reset defines MVP as the currently implemented backend control-plane
surface. If planning docs and lane execution drift, teams may reintroduce
non-MVP commitments while core operability remains the primary delivery need.

## Risk

1. MVP claims become inconsistent across roadmap, domain board, and lane tasks.
2. Deferred deep-dive items can re-enter active scope without explicit decision.
3. Frontend expectations can diverge from backend capabilities currently shipped.

## Mitigation

1. Keep `MVP-A1` inventory and `MVP-B1` traceability matrix synchronized with
   roadmap, runbook, and lane state.
2. Require updates to `domain-status-board` and lane YAML in the same PR when
   MVP claims change.
3. Track frontend expectation alignment through `MVP-E1` before enabling new UI
   assumptions.
4. Keep `MVP-D1` residual-risk baseline explicit and synchronized:
   [20260330-mvp-d1-residual-risk-baseline-review](../../planning/reviews/event-lifecycle-and-retention/20260330-mvp-d1-residual-risk-baseline-review.md).

## Residual Baseline Snapshot (2026-03-31)

Accepted as non-blocking for MVP backend operability baseline:

1. Lifecycle depth beyond baseline operability (retention completion,
   deferred deletion, restore automation).
2. Scale optimization programs (partitioning, read-replica path, advanced
   concurrency tuning).
3. Admission/backpressure deepening beyond current baseline.
4. GTM/compliance/billing packaging.

Lane ownership for deferred items:

- Lane D: lifecycle depth, scale path, cost/billing, pilot/compliance tracks.
- Lane C/D: admission/backpressure maturity.

`MVP-A1` and `MVP-B1` are now closed, so this snapshot is no longer
provisional. The risk remains open until the stability criteria below are met
across subsequent planning cycles.

## Exit criteria

Close this risk when:

1. MVP capability inventory is stable and linked to executable evidence.
2. Claim-to-proof traceability is maintained for two consecutive planning cycles.
3. No out-of-MVP feature is promoted without explicit scope update in roadmap.
