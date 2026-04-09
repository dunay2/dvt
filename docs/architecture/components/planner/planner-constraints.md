---
title: planner Constraints and Invariants
status: Active
owner: Planning Domain / Architecture
last_reviewed: 2026-04-07
---

# planner Constraints and Invariants

## Active invariants

| Invariant                              | Where enforced                             | Description                                                                                               |
| -------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Contract-first boundary                | `PlannerFacade` + `@dvt/contracts` parsers | Public planner input and output are governed by `PlannerInputEnvelopeV1` and `ExecutionPlanV1`.           |
| Cycle detection is fail-closed         | `GraphBuilder` and planner cycle docs      | Planner graph construction must reject cycles rather than degrade into partial execution semantics.       |
| `stepKind` is authoritative            | planner domain + `IStepTypeRegistry`       | Planner logic must not silently remap back to legacy `resourceType` semantics.                            |
| Policy precedence is explicit          | planner step factories                     | Governance policy values override conflicting node-local settings where the planner contract requires it. |
| Compatibility ingress is normalized    | envelope mapper + manifest derivation seam | `manifest` and `nodes` compatibility paths must normalize before core planner logic executes.             |
| Deterministic plan assembly            | `PlanAssembler`                            | Equivalent planner input must yield the same canonical plan core payload.                                 |
| Planner does not own runtime execution | package boundary                           | Planner emits a plan artifact; runtime acceptance and execution stay outside `@dvt/planner`.              |

## Validation examples

- Invalid envelope shape is rejected before graph derivation starts.
- Cyclic graph input fails closed instead of emitting a partial plan.
- Unknown or invalid `stepKind` configuration is rejected at planner build time.
- Canonical output shape is governed by `ExecutionPlan.v1.ts`, not by planner-local schema copies.

## Current code anchors

- `packages/@dvt/planner/src/application/PlannerFacade.ts`
- `packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts`
- `packages/@dvt/planner/src/domain/graph/GraphBuilder.ts`
- `packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/PlannerInputEnvelopeV1.schema.json`

## Canonical references

- [Planner component entry](./index.md)
- [Planner contracts](../../../contracts/planner/index.md)
- [Planner cycle detection technical manual](../../../guides/planner-cycle-detection-technical-manual-20260404.md)
