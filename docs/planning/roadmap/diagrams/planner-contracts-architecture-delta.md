---
title: Planner And Contracts Architecture Delta
status: Review
owner: Planner / Contracts / Docs
last_reviewed: 2026-03-22
planning_type: reference
---

# Planner And Contracts Architecture Delta

Architecture delta view for planner stabilization and contract evolution.

## Missing / Residual Architecture Focus

- planVersion compatibility matrix hardening across runtime boundaries
- step-kind registry governance and policy vocabulary alignment
- artifact binding and canonicalization flow as executable contract

```mermaid
flowchart LR
  PL[Planner Domain]
  CV[Contract Validation]
  PV[PlanVersion Compatibility Matrix]
  SR[Step Registry Governance]
  AB[Artifact Binding Rules]
  RT[Runtime Consumers]

  PL --> CV
  CV --> PV
  CV --> SR
  CV --> AB
  PV --> RT
  SR --> RT
  AB --> RT
```

## References

- [Domain - Planner And Contracts](../../domains/planner-and-contracts.md)
- [Planner Target State Roadmap](../../proposals/planner-target-state-roadmap-20260320.md)
