---
title: Planning Domain Map
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-04-02
planning_type: reference
---

# Planning Domain Map

Cross-domain planning map showing canonical relationships between roadmap,
status, and delivery artifacts.

```mermaid
flowchart TB
  RR[Roadmap Of Record]
  SD[System Delivery Status]
  WB[Execution Workboard]
  PS[Planning Status]

  RR --> EX[Execution Runtime]
  RR --> API[API And Admission]
  RR --> PLC[Planner And Contracts]
  RR --> EVT[Event Lifecycle And Retention]
  RR --> DOC[Documentation Governance]

  SD --> EX
  SD --> API
  SD --> PLC
  WB --> EX
  WB --> API
  WB --> EVT
  PS --> PLC
  PS --> DOC

  EX --> EXR[Runtime boards and reviews]
  API --> APR[API proposals and reviews]
  PLC --> PLR[Planner target state and manifests]
  EVT --> EVR[Archival, retention, restore]
  DOC --> DOR[Governance inventory and checks]
```

## Source Pages

- [Roadmap Of Record](../index.md)
- [Roadmap by Domain](../roadmap-by-domain.md)
- [Planning Domains](../../domains/index.md)
- [Planning State](../../state/index.md)
