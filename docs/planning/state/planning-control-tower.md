---
title: Planning Control Tower
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-22
planning_type: operational
---

# Planning Control Tower

Single operational entry point for all planning documentation.

Use this page first when a task affects planning, roadmap, gaps, proposals,
reviews, or closeouts.

## Mandatory Update Map By Task Type

| If the task does this                                         | Update these documents                                                                                                                                                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starts, re-scopes, or changes an active work item             | [Execution Workboard](execution-workboard.md)                                                                                                                                                                               |
| Changes sequencing, dependencies, blockers, or parallel lanes | [Gap Execution Route](gap-execution-route.md), [Gap Execution Dependency Graph](../roadmap/diagrams/gap-execution-dependency-graph.md), [Gap Execution Parallel Lanes](../roadmap/diagrams/gap-execution-parallel-lanes.md) |
| Changes domain priorities or active objective focus           | [Domain Status Board](domain-status-board.md), [Roadmap by Domain](../roadmap/roadmap-by-domain.md)                                                                                                                         |
| Introduces or updates a plan/proposal                         | corresponding file under `docs/planning/proposals/` and its linked work item in [Execution Workboard](execution-workboard.md)                                                                                               |
| Produces review findings that require execution               | corresponding file under `docs/planning/reviews/` and the `Review Intake To Workboard` section in [Execution Workboard](execution-workboard.md)                                                                             |
| Closes implementation work                                    | corresponding file under `docs/planning/closeouts/`, status in [Execution Workboard](execution-workboard.md), and canonical status surfaces if closure changes posture                                                      |
| Changes roadmap classification or canonical roadmap posture   | [Roadmap Of Record](../roadmap/index.md)                                                                                                                                                                                    |
| Changes official gap posture                                  | [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md), [Gap Execution Status](gap-execution-status.md), [System Delivery Status](../../architecture/system-delivery-status.md)                                              |

## Gap Versus Slice Rule

- `G1..G10` means canonical execution gaps (authority:
  [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md)).
- IDs like `G4-PRx` and `G5-PRx` are proposal slices and execution lanes, not a
  change of canonical gap closure state.
- If a canonical gap is reopened, it must be updated first in
  [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md) and then synchronized to
  [Gap Execution Status](gap-execution-status.md) and
  [System Delivery Status](../../architecture/system-delivery-status.md).

## Canonical Planning Navigation

- Strategy and classification: [Roadmap Of Record](../roadmap/index.md)
- Cross-domain roadmap view: [Roadmap by Domain](../roadmap/roadmap-by-domain.md)
- Task execution tracking: [Execution Workboard](execution-workboard.md)
- Dependency and blockers route: [Gap Execution Route](gap-execution-route.md)
- Gap authority: [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md)
- Domain views: [Planning Domains](../domains/index.md)
- Proposals: [Planning Proposals](../proposals/index.md)
- Reviews: [Planning Reviews](../reviews/index.md)
- Reviews naming rule: [Review Naming Policy](../reviews/review-naming-policy.md)
- Closeouts and evidence: [Planning Closeouts](../closeouts/index.md)
- Diagram hub: [Planning Roadmap Diagrams](../roadmap/diagrams/index.md)
- Planning status artifacts: [Planning Status](../status/index.md)
- Implementation truth: [System Delivery Status](../../architecture/system-delivery-status.md)

## Reviews Quick Access

- [Planning Reviews Index](../reviews/index.md)
- [Review Status Board](../reviews/review-status-board.md)
- [20260326 DVT Principal Architectural Review](../reviews/architecture-and-governance/20260326-dvt-principal-architectural-review.md)
- [20260314 Domain Cohesion Review](../reviews/architecture-and-governance/20260314-domain-cohesion-review.md)
- [20260331 MVP-A1 Backend Contractual Inventory Review](../reviews/execution-runtime/20260331-mvp-a1-backend-contractual-inventory-review.md)
- [20260330 MVP-B1 Claim-To-Evidence Traceability Matrix](../reviews/event-contract-and-traceability/20260330-mvp-b1-claim-evidence-traceability-matrix.md)
- [20260330 MVP-D1 Residual Risk Baseline Review](../reviews/event-lifecycle-and-retention/20260330-mvp-d1-residual-risk-baseline-review.md)
- [20260402 RC-C2 Operational Friction Intake Review](../reviews/ci-and-delivery/20260402-rc-c2-operational-friction-intake-review.md)

## Recommended Reading Order For Any Planning Task

1. [Open Task Route](open-task-route.md)
2. [Execution Workboard](execution-workboard.md)
3. [Gap Execution Route](gap-execution-route.md)
4. [Roadmap Of Record](../roadmap/index.md)
5. [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md)
6. [Domain Status Board](domain-status-board.md)
7. Relevant proposal or review document for the specific slice
