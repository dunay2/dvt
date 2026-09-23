---
title: Domain - Execution Runtime
status: Review
owner: Architecture / Engine / Docs
last_reviewed: 2026-09-10
planning_type: reference
---

# Domain - Execution Runtime

Execution runtime planning surfaces for engine behavior, run lifecycle, and
runtime hardening.

## Canonical Sources

- [Architecture Surface Inventory](../../architecture/architecture-surface-inventory-20260402.md)
- [System Delivery Status](../../architecture/system-delivery-status.md)
- [Canonical Doc Code Matrix](../status/canonical-doc-code-matrix.md)
- [Governance Document And Rule Inventory](../status/governance-document-rule-inventory.md)

## Active Planning Inputs

- [WorkflowEngine hexagonal derivation plan 2026-04-03](../proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md)
- [TF-C3 production plugin host composition plan 2026-04-14](../proposals/mandatory/runtime-and-contracts/tf-c3-production-plugin-host-composition-plan-20260414.md)
- [Transformation Flow Delivery Plan 2026-04-05](../proposals/mandatory/runtime-and-contracts/transformation-flow-delivery-plan-20260405.md)
- [Runtime Review Canon Plan 2026-05-23](../proposals/mandatory/runtime-and-contracts/runtime-review-canon-plan-20260523.md)

## Active Runbooks

- [Temporal worker DBT runtime runbook 2026-04-14](../../runbooks/temporal-worker-dbt-plugin-runtime-20260414.md)

## Relevant Reviews And Closeouts

- [20260322 DDD and Hexagonal Port Audit](../reviews/architecture-and-governance/20260322-ddd-hexagonal-port-audit-review.md)
- [20260414 TF-C3 production plugin host composition closeout](../closeouts/20260414-tf-c3-production-plugin-host-composition-closeout.md)
- [AR-C10 protected runtime rail closure closeout 2026-05-05](../closeouts/20260505-ar-c10-protected-runtime-rail-closure-closeout.md)

## Runtime Review Canon

Runtime/API review documents are rationale and intake, not an execution queue.
`C-REV-RUNTIME-CANON` routes active review findings through the
`ClassifyRuntimeReviewDisposition` query and the `RecordRuntimeReviewCanon`
command before implementation. Use the local component guide for public API,
invariants, transitions, consumers, and semantic fitness-function expectations:

- [Runtime review canon component](../../architecture/components/api/runtime-review-canon-component.md)
- [Runtime review canon user stories](../../architecture/components/api/runtime-review-canon-user-stories.md)

## Diagram Sources

- [DVT System Map God Diagram](../execution-model/dvt-system-map-god-diagram.md)
- [DVT Dependency Risk Map](../execution-model/dvt-dependency-risk-map.md)
- [Planning Domain Map](../roadmap/diagrams/planning-domain-map.md)
- [Gap Execution Dependency Graph](../roadmap/diagrams/gap-execution-dependency-graph.md)
- [Gap Execution Parallel Lanes](../roadmap/diagrams/gap-execution-parallel-lanes.md)
- [Execution Runtime Architecture Delta](../roadmap/diagrams/execution-runtime-architecture-delta.md)
