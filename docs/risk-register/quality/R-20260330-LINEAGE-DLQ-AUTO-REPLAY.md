---
id: R-20260330-LINEAGE-DLQ-AUTO-REPLAY
title: Automatic lineage DLQ replay may requeue persistent poison events repeatedly
status: Open
date: 2026-03-30
owners:
  - '@dvt/delivery'
  - '@dvt/adapter-postgres'
severity: Medium
probability: Medium
---

## Context

Lineage worker now supports automatic replay from `lineage_dead_letter` back into `lineage_outbox`.

## Risk

If failures are caused by persistent payload/data issues instead of transient sink outages, auto-replay can keep requeueing the same events and increase churn/noise without resolving root cause.

## Mitigation

1. Keep replay bounded by batch size and tenant scope.
2. Alert on dead-letter backlog threshold to surface sustained failure patterns.
3. Track replayed counts and dead-letter lag in logs; disable auto-replay (`DVT_LINEAGE_DLQ_AUTO_REPLAY_ENABLED=false`) if churn dominates.
4. Consider replay cooldown and replay-attempt budget per dead-letter record in a follow-up hardening slice.
