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
  CTRL[Planning Control Tower]
  REG[Lane YAML registry]

  REV --> CTRL
  PROP --> CTRL
  STATUS --> CTRL
  CTRL --> REG

  REG --> L1[Execution Runtime lane]
  REG --> L2[API and Admission lane]
  REG --> L3[Planner and Contracts lane]
  REG --> L4[Event Lifecycle and Retention lane]
  REG --> L5[Documentation Governance lane]

  L1 --> PR[PR slices]
  L2 --> PR
  L3 --> PR
  L4 --> PR
  L5 --> PR

  PR --> CLO[Closeouts and evidence]
  CLO --> SYNC[System and planning status updates]
```

## Canonical Links

- [Planning Control Tower](../../state/planning-control-tower.md)
- [Agent Lane A YAML](../../state/agent-lane-a.yaml)
- [Agent Lane B YAML](../../state/agent-lane-b.yaml)
- [Agent Lane C YAML](../../state/agent-lane-c.yaml)
- [Agent Lane D YAML](../../state/agent-lane-d.yaml)
- [Agent Lane E YAML](../../state/agent-lane-e.yaml)
- [Roadmap By Domain](../roadmap-by-domain.md)
- [Roadmap Of Record](../index.md)
