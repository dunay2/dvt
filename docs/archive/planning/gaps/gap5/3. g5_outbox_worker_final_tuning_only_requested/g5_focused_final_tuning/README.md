---
title: G5 Focused Final Tuning Pack
status: Draft
owner: docs
last_reviewed: 2026-03-08
scope: only requested follow-up items after focused review
---

# G5 Focused Final Tuning Pack

This pack contains only the follow-up items explicitly requested after the focused G5 Outbox Worker review.

Included topics:

1. crash-window hook safety in production,
2. hot-lane saturation as a known risk,
3. coexistence example for multiple side effects on the same channel,
4. terminology rename from `sideEffectClass` to `sideEffectKind`,
5. metric for exhausted retry budget.

Excluded topics:

- no rework of the broader runtime,
- no migration rewrite,
- no new CDC design,
- no new class decomposition beyond what was already accepted.
