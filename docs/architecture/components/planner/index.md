---
title: @dvt/planner
status: Active
owner: Planning Domain / Architecture / Docs
last_reviewed: 2026-04-10
---

# @dvt/planner

## Canonical reading order

1. [Planner current state assessment](../../../planning/status/planner-current-state-assessment.md)
2. [Planner contracts](../../../contracts/planner/index.md)
3. [Workspace authoring draft aggregate](./workspace-authoring-draft-aggregate.md)
4. [Executable subgraph derivation component](./executable-subgraph-derivation-component.md)
5. [Transformation flow compiler mapping v1](../../../contracts/planner/TransformationFlowCompiler.v1.md)
6. [GenericGraphSource technical manual](../../../guides/generic-graph-source-technical-manual-20260404.md)
7. [GenericGraphSource user manual](../../../guides/generic-graph-source-user-manual-20260404.md)
8. [Planner cycle detection technical manual](../../../guides/planner-cycle-detection-technical-manual-20260404.md)
9. [Planner cycle detection user manual](../../../guides/planner-cycle-detection-user-manual-20260404.md)
10. [MW-A2 GenericGraphSource plan](../../../planning/proposals/mandatory/runtime-and-contracts/mw-a2-generic-graph-source-plan-20260404.md)

## Scope and location

- package: `packages/@dvt/planner`
- domain: [Planning domain](../../domain-planning.md)
- public contract surfaces: `packages/@dvt/contracts/src/contracts/planner/**`

## Current truth

- public boundary: `PlannerFacade`
- public envelope: `PlannerInputEnvelopeV1`
- canonical input source: `graphSource`
- planner-owned selected-closure derivation now lives behind
  `PlannerFacade#deriveExecutableSubgraph`
- the first SQL-first preview profile now freezes one compiler-governed
  `graphSource` mapping into `PREPARE_POSTGRES_TRANSFORM ->
POSTGRES_SQL_TRANSFORM -> CAPTURE_MATERIALIZATION_EVIDENCE`
- source-native adaptation happens before planner admission
- canonical plan artifact: `ExecutionPlan.v1.ts`
- canonical per-step retry ownership: `ExecutionStep.retryPolicy`
- plan version source: `CURRENT_EXECUTION_PLAN_VERSION`
- retained manifest normalization utility: `derivePlannerGraphSourceFromManifest`

## Target truth

- `graphSource` remains the canonical typed planner input boundary
- the SQL-first transformation profile is expressed as a typed compiler mapping
  inside `graphSource`, not as a second planner ingress
- source-native refs such as DBT manifest artifacts stay outside the planner
  package and do not appear in the canonical planner ingress
- planner component pages stay summary-only and point back to canonical planner docs

## Component map

```mermaid
flowchart LR
  Caller["API or integrator"] --> Facade["PlannerFacade"]
  Facade --> Mapper["PlannerEnvelopeMapper"]
  Facade --> Planner["Planner domain service"]
  Facade --> Deriver["ExecutableSubgraphDeriver"]
  Planner --> Validator["InputEnvelopeValidator"]
  Planner --> Graph["GraphBuilder"]
  Planner --> Selector["NodeSelector"]
  Deriver --> Graph
  Planner --> Registry["IStepTypeRegistry"]
  Planner --> Assembler["PlanAssembler"]
  Assembler --> Plan["ExecutionPlanV1 + canonicalPlanCoreJson"]
  Deriver --> Subgraph["ExecutableSubgraph"]
```

## Primary code anchors

- [PlannerFacade.ts](../../../../packages/@dvt/planner/src/application/PlannerFacade.ts)
- [ExecutableSubgraphDeriver.ts](../../../../packages/@dvt/planner/src/application/ExecutableSubgraphDeriver.ts)
- [PlannerEnvelopeMapper.ts](../../../../packages/@dvt/planner/src/application/PlannerEnvelopeMapper.ts)
- [Planner.ts](../../../../packages/@dvt/planner/src/domain/Planner.ts)
- [PlanAssembler.ts](../../../../packages/@dvt/planner/src/domain/PlanAssembler.ts)
- [ExecutionPlan.v1.ts](../../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts)

## Supporting component pages

- [Functional surface](./planner-functional.md)
- [Constraints and invariants](./planner-constraints.md)
- [Structure and module map](./planner-ddd.md)
- [Build sequence](./planner-sequence.md)
- [Workspace authoring draft aggregate](./workspace-authoring-draft-aggregate.md)
- [Executable subgraph derivation component](./executable-subgraph-derivation-component.md)

## Notes

- The shipped planner is service-oriented. It does not expose a mutable
  draft-edit-compile lifecycle or long-lived `PlanAggregate` API.
- If this page and another planner doc disagree, use the documents in
  "Canonical reading order" as the source of truth.
