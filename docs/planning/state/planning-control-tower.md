---
title: Planning Control Tower
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-04-02
planning_type: operational
---

# Planning Control Tower

Single operational entry point for all planning documentation.

Use this page first when a task affects planning, roadmap, proposals, reviews,
or closeouts.

## Mandatory Update Map By Task Type

- Starts, re-scopes, or changes an active work item:
  update the relevant `agent-lane-*.yaml` entry and regenerate planning-derived
  views locally.
- Changes sequencing, dependencies, blockers, or parallel lanes:
  update [Roadmap Of Record](../roadmap/index.md),
  [Roadmap By Domain](../roadmap/roadmap-by-domain.md),
  [Review Remediation Roadmap 2026-04-02](../roadmap/review-remediation-roadmap-20260402.md),
  and the affected lane YAML registry.
- Changes domain priorities or active objective focus:
  update [Domain Status Board](domain-status-board.md) and
  [Roadmap By Domain](../roadmap/roadmap-by-domain.md).
- Introduces or updates a plan/proposal:
  update the corresponding file under `docs/planning/proposals/` and its linked
  work item in the relevant lane YAML.
- Produces review findings that require execution:
  update the corresponding file under `docs/planning/reviews/`, the relevant
  lane YAML, and the roadmap or domain surface that owns the follow-up.
- Closes implementation work:
  update the corresponding file under `docs/planning/closeouts/`, the status in
  the relevant lane YAML, and any canonical status
  surfaces whose posture changed.
- Changes roadmap classification or canonical roadmap posture:
  update [Roadmap Of Record](../roadmap/index.md).
- Retires or supersedes a planning construct:
  update the affected active surfaces,
  [Architecture Surface Inventory](../../architecture/architecture-surface-inventory-20260402.md),
  and [System Delivery Status](../../architecture/system-delivery-status.md).

## Legacy Gap Program Rule

- `G1` through `G10` are retired identifiers from a closed planning program.
- Do not use legacy gap IDs as active work IDs, roadmap lanes, or current
  authority references.
- Express live work as sprint boards, proposal slices, review intake items, or
  lane `task_id` entries.
- If a historical gap document is still cited, treat it as archive-only context
  and route active truth through current status, roadmap, and the lane registry.

## Canonical Planning Navigation

- Strategy and classification: [Roadmap Of Record](../roadmap/index.md)
- Cross-domain roadmap view: [Roadmap By Domain](../roadmap/roadmap-by-domain.md)
- Planning entrypoint: [Planning Control Tower](planning-control-tower.md)
- Task registry:
  [Agent Lane A](agent-lane-a.yaml), [Agent Lane B](agent-lane-b.yaml),
  [Agent Lane C](agent-lane-c.yaml), [Agent Lane D](agent-lane-d.yaml),
  [Agent Lane E](agent-lane-e.yaml)
- Domain views: [Planning Domains](../domains/index.md)
- Proposals: [Proposal Portfolio Map](../proposals/portfolio-map-20260403.md)
- Reviews: [Review Status Board](../reviews/review-status-board.md)
- Reviews naming rule: [Review Naming Policy](../reviews/review-naming-policy.md)
- Closeouts and evidence: [Planning Closeouts](../closeouts/index.md)
- Diagram hub: [Planning Roadmap Diagrams](../roadmap/diagrams/index.md)
- Planning status artifacts:
  [Governance Document And Rule Inventory](../status/governance-document-rule-inventory.md)
- Implementation truth: [System Delivery Status](../../architecture/system-delivery-status.md)

## Reviews Quick Access

- [Review Status Board](../reviews/review-status-board.md)
- [20260326 DVT Principal Architectural Review](../reviews/architecture-and-governance/20260326-dvt-principal-architectural-review.md)
- [20260314 Domain Cohesion Review](../reviews/architecture-and-governance/20260314-domain-cohesion-review.md)
- [20260331 MVP-A1 Backend Contractual Inventory Review](../reviews/execution-runtime/20260331-mvp-a1-backend-contractual-inventory-review.md)
- [20260330 MVP-B1 Claim-To-Evidence Traceability Matrix](../reviews/event-contract-and-traceability/20260330-mvp-b1-claim-evidence-traceability-matrix.md)
- [20260330 MVP-D1 Residual Risk Baseline Review](../reviews/event-lifecycle-and-retention/20260330-mvp-d1-residual-risk-baseline-review.md)
- [20260402 RC-C2 Operational Friction Intake Review](../reviews/ci-and-delivery/20260402-rc-c2-operational-friction-intake-review.md)

## Recommended Reading Order For Any Planning Task

1. [Planning Control Tower](planning-control-tower.md)
2. Relevant [Agent Lane YAML](agent-lane-a.yaml)
3. [Roadmap Of Record](../roadmap/index.md)
4. [Roadmap By Domain](../roadmap/roadmap-by-domain.md)
5. [Domain Status Board](domain-status-board.md)
6. Relevant proposal or review document for the specific slice
