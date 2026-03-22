---
title: Execution Tracking Flow
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-03-22
planning_type: reference
---

# Execution Tracking Flow

Single flow for converting planning inputs into execution tasks and roadmap
impact tracking.

```mermaid
flowchart LR
  REV[Reviews]
  PROP[Proposals]
  GAP[Gap plans and status]

  REV --> WB[Execution Workboard]
  PROP --> WB
  GAP --> WB

  WB --> L1[Execution Runtime lane]
  WB --> L2[API and Admission lane]
  WB --> L3[Planner and Contracts lane]
  WB --> L4[Event Lifecycle and Retention lane]
  WB --> L5[Documentation Governance lane]

  L1 --> PR[PR slices]
  L2 --> PR
  L3 --> PR
  L4 --> PR
  L5 --> PR

  PR --> CLO[Closeouts and evidence]
  CLO --> STATUS[System and planning status updates]
```

## Canonical Links

- [Execution Workboard](../../state/execution-workboard.md)
- [Gap Execution Route](../../state/gap-execution-route.md)
- [Roadmap By Domain](../roadmap-by-domain.md)
- [Roadmap Of Record](../index.md)
