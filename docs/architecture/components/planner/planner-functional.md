---
title: planner Functional Surface
status: Active
owner: Planning Domain / Architecture
last_reviewed: 2026-04-07
---

# planner Functional Surface

## Functional responsibilities

| #   | Functionality                    | Description                                                                                                           |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Boundary normalization           | `PlannerFacade` accepts contract input, resolves referenced graph artifacts, and maps them into planner domain input. |
| 2   | Envelope validation              | `InputEnvelopeValidator` rejects structurally invalid planner input before graph construction begins.                 |
| 3   | Compatibility derivation         | dbt `manifest` and `manifestRef` flows normalize into graph-source input through dedicated derivation seams.          |
| 4   | Graph construction and selection | `GraphBuilder` and `NodeSelector` build the dependency graph and apply selection rules before assembly.               |
| 5   | Step materialization             | Planner step creation stays `stepKind`-driven and validates per-kind config through `IStepTypeRegistry`.              |
| 6   | Plan assembly                    | `PlanAssembler` produces the canonical `ExecutionPlanV1` artifact and `canonicalPlanCoreJson`.                        |
| 7   | Deterministic output             | Identical input must produce the same canonical plan shape and the same integrity-relevant core payload.              |
| 8   | Explicit boundary stop           | Planner stops at plan construction; runtime admission, execution, and provider dispatch live outside the package.     |

## Main entrypoints

- `PlannerFacade.buildPlan(input)`
- `PlannerEnvelopeMapper.toDomainBaseInput(input)`
- `derivePlannerGraphSourceFromManifest(...)`
- `InputEnvelopeValidator.validate(input)`
- `GraphBuilder.execute(command)`
- `NodeSelector.execute(command)`
- `PlanAssembler.execute(command)`

## Current code anchors

- `packages/@dvt/planner/src/application/PlannerFacade.ts`
- `packages/@dvt/planner/src/application/PlannerEnvelopeMapper.ts`
- `packages/@dvt/planner/src/application/derivePlannerGraphSourceFromManifest.ts`
- `packages/@dvt/planner/src/domain/Planner.ts`
- `packages/@dvt/planner/src/domain/graph/GraphBuilder.ts`
- `packages/@dvt/planner/src/domain/PlanAssembler.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`

## Canonical references

- [Planner component entry](index.md)
- [Planner contracts](../../../contracts/planner/index.md)
- [Planner current state assessment](../../../planning/status/planner-current-state-assessment.md)
