---
title: planner Constraints and Invariants
status: Active
owner: Planning Domain / Architecture
last_reviewed: 2026-04-07
---

# planner Constraints and Invariants

## Active invariants

| Invariant                                  | Where enforced                                   | Description                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract-first boundary                    | `PlannerFacade` + `@dvt/contracts` parsers       | Public planner input and output are governed by `PlannerInputEnvelopeV1` and `ExecutionPlanV1`.                                              |
| Cycle detection is fail-closed             | `GraphBuilder` and planner cycle docs            | Planner graph construction must reject cycles rather than degrade into partial execution semantics.                                          |
| `stepKind` is authoritative                | planner domain + `IStepTypeRegistry`             | Planner logic must not silently remap back to legacy `resourceType` semantics.                                                               |
| Policy precedence is explicit              | planner step factories                           | Governance policy values override conflicting node-local settings where the planner contract requires it.                                    |
| Retry ownership is explicit                | `resolvePolicies` + step factories               | Planner materializes top-level `ExecutionStep.retryPolicy`; adapters consume that governed field instead of inventing local retry ownership. |
| Compatibility ingress is normalized        | envelope mapper + manifest derivation seam       | `manifest` and `nodes` compatibility paths must normalize before core planner logic executes.                                                |
| Deterministic plan assembly                | `PlanAssembler`                                  | Equivalent planner input must yield the same canonical plan core payload.                                                                    |
| Planner does not own runtime execution     | package boundary                                 | Planner emits a plan artifact; runtime acceptance and execution stay outside `@dvt/planner`.                                                 |
| Private behavior ports stay owner-local    | planner private behavior-port architecture tests | Planner-private ports live in `@dvt/planner`; shared serializable vocabulary for those ports remains in `@dvt/contracts`.                    |
| Custom policy namespace registry is frozen | planner private behavior-port architecture tests | `ICustomPolicyNamespaceRegistry` remains a compatibility-only seam until a real consumer and ADR-backed reactivation exist.                  |

## Validation examples

- Invalid envelope shape is rejected before graph derivation starts.
- Cyclic graph input fails closed instead of emitting a partial plan.
- Unknown or invalid `stepKind` configuration is rejected at planner build time.
- Canonical output shape is governed by `ExecutionPlan.v1.ts`, not by planner-local schema copies.
- Invalid per-step retry profiles are rejected by shared `ExecutionPlan` schema validation before runtime consumption.
- Planner-private behavior-port modules import shared vocabulary with
  `import type` and do not import peer domains or concrete adapters.
- Custom policy namespace registry modules do not add registry implementation,
  registration, validation, or runtime authorization behavior while frozen.

## Current code anchors

- `packages/@dvt/planner/src/application/PlannerFacade.ts`
- `packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts`
- `packages/@dvt/planner/src/domain/graph/GraphBuilder.ts`
- `packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/PlannerInputEnvelopeV1.schema.json`
- `packages/@dvt/planner/src/contracts/PlanExecutabilityValidation.ts`
- `packages/@dvt/planner/src/contracts/ExecutionBindingVerification.ts`
- `packages/@dvt/planner/src/contracts/CustomPolicyNamespaceRegistry.ts`

## Canonical references

- [Planner component entry](./index.md)
- [Planner private behavior ports component](./planner-private-behavior-ports-component.md)
- [Planner contracts](../../../contracts/planner/index.md)
- [Planner cycle detection technical manual](../../../guides/planner-cycle-detection-technical-manual-20260404.md)
