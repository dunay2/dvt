---
title: planner Functional Surface
status: Active
owner: Planning Domain / Architecture
last_reviewed: 2026-04-10
---

# planner Functional Surface

## Functional responsibilities

1. `Boundary normalization`:
   `PlannerFacade` accepts canonical contract input and maps `graphSource`
   into planner domain input.
2. `Envelope validation`:
   `InputEnvelopeValidator` rejects structurally invalid planner input before
   graph construction begins.
3. `Explicit boundary stop`:
   Source-native adaptation happens before planner admission; the planner
   package does not resolve DBT manifest refs or other source-native ingress
   forms.
4. `Graph construction and selection`:
   `GraphBuilder` and `NodeSelector` build the dependency graph and apply
   selection rules before assembly.
5. `Step materialization`:
   Planner step creation stays `stepKind`-driven and validates per-kind config
   through `IStepTypeRegistry`, while canonical retry ownership is materialized
   on top-level `ExecutionStep.retryPolicy`. Built-in DBT step configs no
   longer carry retry metadata inside `stepTypeConfig`.
6. `Plan assembly`:
   `PlanAssembler` produces the canonical `ExecutionPlanV1` artifact and
   `canonicalPlanCoreJson`, including governed per-step retry/backoff metadata.
7. `Deterministic output`:
   Identical semantic input must produce the same canonical plan core and the
   same `planId`.
8. `Protected runtime handoff`:
   Planner-backed runtime admission, plan persistence, and provider dispatch
   live in `apps/api`, not in `@dvt/planner`.

## Main entrypoints

- `PlannerFacade.buildPlan(input)`
- `PlannerEnvelopeMapper.toDomainBaseInput(input)`
- `InputEnvelopeValidator.validate(input)`
- `GraphBuilder.execute(command)`
- `NodeSelector.execute(command)`
- `PlanAssembler.execute(command)`

## Current code anchors

- [PlannerFacade.ts](../../../../packages/@dvt/planner/src/application/PlannerFacade.ts)
- [PlannerEnvelopeMapper.ts](../../../../packages/@dvt/planner/src/application/PlannerEnvelopeMapper.ts)
- [Planner.ts](../../../../packages/@dvt/planner/src/domain/Planner.ts)
- [GraphBuilder.ts](../../../../packages/@dvt/planner/src/domain/graph/GraphBuilder.ts)
- [PlanAssembler.ts](../../../../packages/@dvt/planner/src/domain/PlanAssembler.ts)
- [ExecutionPlan.v1.ts](../../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts)

## Canonical references

- [Planner component entry](./index.md)
- [Planner contracts](../../../contracts/planner/index.md)
- [Planner current state assessment](../../../planning/status/planner-current-state-assessment.md)
