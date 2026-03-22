---
title: Gap Execution Dependency Graph
status: Review
owner: Architecture / Delivery / Docs
last_reviewed: 2026-03-22
planning_type: reference
---

# Gap Execution Dependency Graph

Dependency graph for operational gap execution ordering.

```mermaid
flowchart LR
  G1[G1 Temporal Adapter]
  G2[G2 PostgresStateStore]
  G3[G3 Intent Store + Reconciler]
  G4[G4 compiledCodeRef Ownership]
  G5[G5 Outbox Worker]
  G6[G6 OpenLineage + Schema Pin]
  G7[G7 Projector + Read Models]
  G8[G8 API Auth + Query Runtime]
  G9[G9 StepTypeRegistry]
  G10[G10 outbox_lineage Worker]

  G1 --> G5
  G2 --> G3
  G2 --> G5
  G3 --> G7
  G4 --> G8
  G4 --> G9
  G5 --> G7
  G6 --> G10
  G7 --> G10
  G9 --> G10
```

## Canonical References

- [Gap Execution Plans](../../gaps/GAP_EXECUTION_PLANS.md)
- [Gap Execution Route](../../state/gap-execution-route.md)
