---
title: Planner Local ADR-0005 Metrics Via Optional Callback Interface
status: Archived
owner: Architecture / Planner / Docs
last_reviewed: 2026-05-31
planning_type: historical
---

# ADR-0005: Metrics via Optional Callback Interface

Archived from `packages/@dvt/planner/docs/adr/ADR-0005-metrics.md`.
This is a historical package-local ADR snapshot, not a repository ADR.

Decision:

- Planner accepts optional `metrics` callbacks.
- Metrics are not part of hash inputs and must not affect determinism.

Rationale:

- Observability without side effects in planner core.
