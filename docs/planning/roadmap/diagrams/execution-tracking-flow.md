---
title: Execution Tracking Flow
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-04-02
planning_type: reference
---

# Execution Tracking Flow

Single flow for converting planning inputs into execution tasks and roadmap
impact tracking.

```mermaid
flowchart LR
  REV[Reviews]
  PROP[Proposals]
  STATUS[Status and roadmap]

  REV --> WB[Execution Workboard]
  PROP --> WB
  STATUS --> WB

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
  CLO --> SYNC[System and planning status updates]
```

## Canonical Links

- [Execution Workboard](../../state/execution-workboard.md)
- [Open Task Route](../../state/open-task-route.md)
- [Roadmap By Domain](../roadmap-by-domain.md)
- [Roadmap Of Record](../index.md)
