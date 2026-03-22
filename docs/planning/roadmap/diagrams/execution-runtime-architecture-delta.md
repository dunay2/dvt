---
title: Execution Runtime Architecture Delta
status: Review
owner: Architecture / Engine / Docs
last_reviewed: 2026-03-22
planning_type: reference
---

# Execution Runtime Architecture Delta

Architecture delta view for remaining runtime hardening when new slices are
opened.

## Missing / Residual Architecture Focus

- deterministic replay and rebuild automation hardening
- projector/runtime ownership and fencing observability
- retention-lifecycle hooks aligned with archival policies

```mermaid
flowchart LR
  E[WorkflowEngine]
  S[State Store + Snapshots]
  O[Outbox Worker Runtime]
  P[Projector Runtime]
  M[Metrics and Operational Signals]
  R[Replay and Rebuild Automation]
  T[Retention Lifecycle Hooks]

  E --> S
  E --> O
  O --> P
  P --> S
  O --> M
  P --> M
  S --> R
  R --> M
  S --> T
  T --> M
```

## References

- [Domain - Execution Runtime](../../domains/execution-runtime.md)
- [Gap Execution Route](../../state/gap-execution-route.md)
