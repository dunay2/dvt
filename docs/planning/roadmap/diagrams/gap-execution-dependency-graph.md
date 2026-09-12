---
title: Execution Dependency Graph
status: Review
owner: Architecture / Delivery / Docs
last_reviewed: 2026-09-10
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

- [GitHub MVP Issue Workflow](../../state/github-mvp-issue-workflow.md)
- [Roadmap By Domain](../roadmap-by-domain.md)
