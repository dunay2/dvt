---
title: Execution Dependency Graph
status: Review
owner: Architecture / Delivery / Docs
last_reviewed: 2026-04-02
planning_type: reference
---

# Execution Dependency Graph

Dependency graph for the current execution-order assumptions that still shape
follow-up work.

```mermaid
flowchart LR
  A[Runtime foundations]
  B[Admission and API hardening]
  C[Planner and contract hardening]
  D[Archive and retention hardening]
  E[Traceability runtime hardening]

  A --> B
  A --> C
  A --> D
  B --> E
  C --> E
  D --> E
```

## Canonical References

- [Execution Workboard](../../state/execution-workboard.md)
- [Roadmap By Domain](../roadmap-by-domain.md)
