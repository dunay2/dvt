---
title: Execution Dependency Gates
status: Review
owner: Architecture / Delivery / Docs
last_reviewed: 2026-09-10
planning_type: reference
---

# Execution Dependency Gates

Execution dependencies with synchronization gates.

```mermaid
flowchart TB
  F[Gate F: runtime foundations stable]
  R[Gate R: runtime ownership checks]
  C[Gate C: Contract compatibility]
  P[Gate P: Prepush + docs governance]

  F --> A[Runtime hardening]
  F --> B[API and admission]
  F --> D[Traceability]
  F --> E[Planner and contracts]

  A --> R
  D --> C
  E --> C
  B --> C
  R --> P
  C --> P
```

## Canonical References

- [GitHub MVP Issue Workflow](../../state/github-mvp-issue-workflow.md)
- [Roadmap By Domain](../roadmap-by-domain.md)
