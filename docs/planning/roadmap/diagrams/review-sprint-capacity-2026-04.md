---
title: Review Sprint Capacity By Sprint 2026-04
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-04-02
planning_type: reference
---

# Review Sprint Capacity By Sprint 2026-04

```mermaid
flowchart TB
  subgraph S04A["Sprint 2026-04A"]
    ATotal["Total boards: 6"]
    ARun["In progress/review: 3"]
    AQueue["Queued: 3"]
    ABlock["Blocked: 0"]
  end

  subgraph S04B["Sprint 2026-04B"]
    BTotal["Total boards: 5"]
    BRun["In progress/review: 0"]
    BQueue["Queued: 3"]
    BBlock["Blocked: 2"]
  end

  subgraph S04C["Sprint 2026-04C"]
    CTotal["Total boards: 5"]
    CRun["In progress/review: 0"]
    CQueue["Queued: 1"]
    CBlock["Blocked: 4"]
  end

  ATotal --> ARun
  ATotal --> AQueue
  ATotal --> ABlock
  BTotal --> BRun
  BTotal --> BQueue
  BTotal --> BBlock
  CTotal --> CRun
  CTotal --> CQueue
  CTotal --> CBlock
```

## Readout

- Sprint `2026-04A` carries current execution load.
- Sprint `2026-04B` is partially preloaded but blocked on board dependencies.
- Sprint `2026-04C` is mostly dependency-gated and should not be pulled forward
  until upstream gates close.
