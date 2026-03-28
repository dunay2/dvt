---
title: planner-aggregates Constraints & Invariants
status: Draft
owner: Planning Domain
last_reviewed: 2026-03-28
---

# planner-aggregates Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                            | Where Enforced                    | Description                                                                                                       |
| ----------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Step dependencies must be acyclic                                 | GraphBuilder                      | The dependency graph must be a valid DAG. GraphBuilder rejects any step set that forms a cycle.                   |
| All required step parameters must be defined                      | StepFactory / ValidationAggregate | Steps missing required parameters as defined in `planner-input.ts` are rejected before plan assembly.             |
| Plan must comply with domain-specific business rules              | ValidationAggregate / policies.ts | All policy-defined constraints must pass validation before the plan is considered valid.                          |
| Steps must be executable in the defined topological order         | TopoSort / PlanAssembler          | The assembled plan's step sequence must be a valid topological ordering of the dependency graph.                  |
| Plan hash must be deterministic and content-addressable           | PlanAssembler                     | Given the same input, PlanAssembler must always produce the same hash; non-deterministic assembly is a violation. |
| Lifecycle transitions must be gated on prior state validity       | PlanAggregate                     | A plan cannot transition from draft to compiled without a passing ValidationAggregate result.                     |
| ValidationAggregate errors must be associated with specific steps | ValidationAggregate               | Generic plan-level errors are insufficient; every constraint violation must be traceable to the offending step.   |
| Input envelope must conform to PlannerInputEnvelopeSchema         | InputEnvelopeValidator            | Plans built from non-conforming envelopes are rejected before any aggregate is mutated.                           |

## Validation Examples

- A plan where step C depends on step D and step D depends on step C causes GraphBuilder to raise a `CyclicDependencyError` referencing both steps.
- A step of type `task` missing its `stepTypeConfig.command` field fails StepFactory with a `MissingRequiredParameterError` before any graph operations begin.
- PlanAssembler called twice on identical inputs must produce byte-identical `ExecutionPlanV2` hashes; if hashes differ, the assembler has a determinism bug.
- Calling `transitionLifecycle(planId, "compiled")` on a draft plan that has ValidationAggregate errors raises a `LifecycleTransitionError`.
- A ValidationAggregate that returns a generic error without a `stepId` association is considered a contract violation and must be corrected.

## Key Files

- `packages/@dvt/planner/src/domain/graph/GraphBuilder.ts` — Cycle detection
- `packages/@dvt/planner/src/domain/stepFactory/StepFactory.ts` — Parameter validation at step creation
- `packages/@dvt/planner/src/domain/PlanAssembler.ts` — Hash determinism
- `packages/@dvt/planner/src/domain/policies.ts` — Business rule resolution
- `packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts` — Input conformance
- `packages/@dvt/planner/src/domain/types.ts` — Aggregate type definitions
- `packages/@dvt/planner/docs/contracts/PlannerContracts.v2.3.1.md` — Formal constraint definitions
- `packages/@dvt/contracts/test/planner.contract.test.ts` — Constraint test cases
- `packages/@dvt/engine/test/contracts/capabilities.contract.test.ts` — Cross-component validation tests
