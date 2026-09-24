---
title: Roadmap By Domain
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-09-12
planning_type: proposal
---

# Roadmap By Domain

Domain-oriented roadmap overlay for the canonical roadmap of record.

This file complements, but does not replace, [Roadmap Of Record](./index.md).
Read it with [Strategic Product Roadmap](strategic-product-roadmap.md) when the
question is not just sequence, but why the current domains matter to product
direction.

## Domain Lanes

```mermaid
flowchart LR
  R[Roadmap Of Record] --> E[Execution Runtime]
  R --> A[API And Admission]
  R --> P[Planner And Contracts]
  R --> L[Event Lifecycle And Retention]
  R --> U[UI And Frontend]
  R --> D[Documentation Governance]

  E --> E1[Runtime hardening boards]
  E --> E2[Execution model cleanup]
  A --> A1[Admission and query hardening]
  P --> P1[Plan record and contract model]
  P --> P2[Stage 1.1 canonicalization]
  L --> L1[Archival and restore]
  L --> L2[Retention and purge controls]
  U --> U1[Contract and data-boundary convergence]
  U --> U2[Operational run-monitoring flow]
  D --> D1[Doc governance checks]
  D --> D2[Index and taxonomy maintenance]
```

## Sequencing By Lane

- `Execution Runtime`
  Current sources: [Execution Runtime domain view](../domains/execution-runtime.md),
  [Engine Roadmap](../../architecture/components/engine/roadmap/engine-phases.md),
  [WorkflowEngine hexagonal derivation plan 2026-04-03](../proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md),
  [Transformation Flow Delivery Plan 2026-04-05](../proposals/mandatory/runtime-and-contracts/transformation-flow-delivery-plan-20260405.md),
  [Runtime hardening, shared-kernel, and operations roadmap 2026-04-10](../proposals/mandatory/runtime-and-contracts/runtime-hardening-shared-kernel-and-operations-roadmap-20260410.md)
  Near-term target: keep the landed `TF-C2` PostgreSQL runtime vertical stable,
  keep the accepted `TF-C3` plugin-backed DBT runtime path aligned with its
  runbook and canary evidence, and close the remaining `WE-HX` hardening waves,
  while the broader
  contract-pack reset and
  shared-kernel ownership cleanup continue under the Planner and Contracts
  lane, the delivery/runtime harness extraction (`AR-A7`) now continues from a
  partially landed delivery split rather than a blank starting point, the
  lineage-runtime decomposition follow-up (`AR-B5`) keeps worker parity moving
  without blurring ownership, and Conductor cleanup stays scoped as truthfulness
  debt (`AR-A8`) rather than a second-provider phase, while the first explicit
  scale hardening cut on workflow payload shape is now closed through
  `AR-D-PLAN-POINTER` with PlanRef capacity, continuation safety, DBT package
  extraction, and semantic-fitness evidence. Remaining runtime scale work now
  routes through retention, worker-scaling, and broader open scale tasks instead
  of being hidden under the PlanRef payload line.
- `API and Admission`
  Current sources: [API and Admission domain view](../domains/api-and-admission.md),
  [Transformation Flow Architecture And Contracts 2026-04-05](../proposals/mandatory/runtime-and-contracts/transformation-flow-architecture-and-contracts-20260405.md),
  [Transformation Flow Delivery Plan 2026-04-05](../proposals/mandatory/runtime-and-contracts/transformation-flow-delivery-plan-20260405.md),
  [Closeout: TF-C3 production plugin host composition](../closeouts/20260414-tf-c3-production-plugin-host-composition-closeout.md)
  Near-term target: keep the now-closed preview-persist boundary truthful as
  the fixed protected ingress, build on the landed `runExecutionContext`
  artifact wiring, the standalone `apps/temporal-worker` composition root, the
  adapter-owned DBT CLI host, and the accepted DBT-enabled canary evidence under
  `TF-C3`, without reopening caller-profile or `PlanRef` drift or pushing DBT
  semantics into the kernel.
- `Planner and Contracts`
  Current sources: [Planner and Contracts domain view](../domains/planner-and-contracts.md),
  [Transformation Flow Product Decisions 2026-04-05](../proposals/mandatory/runtime-and-contracts/transformation-flow-product-decisions-20260405.md),
  [Transformation Flow Architecture And Contracts 2026-04-05](../proposals/mandatory/runtime-and-contracts/transformation-flow-architecture-and-contracts-20260405.md),
  [20260417 DVT artifacts review](../reviews/architecture-and-governance/20260417-dvt-artifacts-review.md),
  [Contract pack and read boundary reset plan 2026-04-10](../proposals/mandatory/runtime-and-contracts/contract-pack-and-read-boundary-reset-plan-20260410.md),
  [TF-A1-C SRP and extensibility hardening plan 2026-04-14](../proposals/mandatory/runtime-and-contracts/tf-a1-c-srp-and-extensibility-hardening-plan-20260414.md),
  [Runtime hardening, shared-kernel, and operations roadmap 2026-04-10](../proposals/mandatory/runtime-and-contracts/runtime-hardening-shared-kernel-and-operations-roadmap-20260410.md)
  Near-term target: complete #2600 by removing the remaining SQL-first runtime
  handlers after the preview/contract hard cut. VTX2 Substrait remains the sole
  DVT authoring authority, while the shared generic preview and stored-plan
  rails retain planner and execution sovereignty.
- `Event Lifecycle and Retention`
  Current sources: [Event Lifecycle and Retention domain view](../domains/event-lifecycle-and-retention.md),
  [Transformation Flow Delivery Plan 2026-04-05](../proposals/mandatory/runtime-and-contracts/transformation-flow-delivery-plan-20260405.md)
  Near-term target: keep the shipped retention baseline explicit now that the
  repeatable Docker PostgreSQL reset/cleanup lifecycle is canonical, and shift
  the remaining operational follow-through to default-retention enforcement and
  health alerts under `AR-D8`.
- `UI and Frontend`
  Current sources: [web component](../../architecture/components/web/index.md),
  [Read subsystem](../../architecture/system/subsystems/read/index.md),
  [Frontend subsystem architecture](../../architecture/components/web/index.md),
  [UI / Visualization Domain](../../architecture/domain-ui.md),
  [20260417 DVT artifacts review](../reviews/architecture-and-governance/20260417-dvt-artifacts-review.md),
  [Documentation and UX implementation guide](../../architecture/components/web/ux-implementation-guide.md),
  [Transformation Flow Delivery Plan 2026-04-05](../proposals/mandatory/runtime-and-contracts/transformation-flow-delivery-plan-20260405.md)
  Near-term target: keep the canonical Substrait authoring and persisted Canvas
  semantic-revision path stable while current GitHub Issues own the remaining
  UI/frontend convergence, especially the one-Canvas/product-vocabulary hard
  cut (#2902), native Canvas Preview/Run/result integration (#3021), and bounded
  workbench, expression, and plugin professionalization.
- `Documentation Governance`
  Current sources: [Governance Inventory](../status/governance-document-rule-inventory.md),
  [Documentation maintenance guide](../../guides/documentation-maintenance-guide-20260407.md),
  [Documentation information architecture current vs target 2026-04-07](../status/documentation-information-architecture-current-vs-target-20260407.md)
  Near-term target: keep GitHub issue lifecycle, roadmaps, and generated
  documentation synchronized with mainline truth, and reduce `docs:doctor` noise
  so it signals semantic drift instead of missing metadata.

## Related Diagrams

- [Strategic Product Roadmap](strategic-product-roadmap.md)
- [Planning Domain Map](./diagrams/planning-domain-map.md)
- [Execution Runtime Architecture Delta](./diagrams/execution-runtime-architecture-delta.md)
- [Engine Roadmap](../../architecture/components/engine/roadmap/engine-phases.md)
- [Execution Model Index](../execution-model/index.md)
