---
title: API And Admission Architecture Delta
status: Review
owner: API / Product / Docs
last_reviewed: 2026-03-22
planning_type: reference
---

# API And Admission Architecture Delta

Architecture delta view for API admission and query-side hardening.

## Missing / Residual Architecture Focus

- admission policy orchestration under burst backpressure
- raw-store and projected read-model coherence for operational reads
- rollout safety gates and operability controls across PR1..PR5

```mermaid
flowchart LR
  C[API Command Routes]
  Q[API Query Routes]
  A[Admission Policy]
  B[Backpressure Store]
  P[Projected Read Model]
  R[Raw Snapshot Store]
  O[Operability and Rollout Controls]

  C --> A
  A --> B
  A --> R
  R --> P
  Q --> P
  C --> O
  Q --> O
```

## References

- [Domain - API And Admission](../../domains/api-and-admission.md)
- [Gap 4 Admission Design](../../proposals/gap4-backpressure-admission-design-20260319.md)
