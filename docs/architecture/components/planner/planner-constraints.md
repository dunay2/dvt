---
title: planner Constraints & Invariants
status: Draft
owner: Planning Domain
last_reviewed: 2026-03-28
---

# planner Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                       | Where Enforced                    | Description                                                                                                          |
| ------------------------------------------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Must comply with PlannerContracts.v2.3.1                     | PlanAggregate / PlanAssembler     | All plan structures, step types, and assembly outputs must conform to the formal contract definitions.               |
| Only interacts with Planning domain components               | PlanAggregate boundary            | Planner must not reach into delivery, infra, or observability domains; it only calls verifier, interpreter, and DSL. |
| Steps must not form circular dependencies                    | GraphBuilder                      | The dependency graph must be a directed acyclic graph (DAG). Cycles are rejected at graph-build time.                |
| All required step parameters must be defined                 | StepFactory / ValidationAggregate | Steps missing required parameters fail validation before the plan reaches the compiled state.                        |
| Plan must pass validation before transitioning to compiled   | PlanAggregate                     | The lifecycle gate from draft → compiled requires a passing ValidationAggregate result.                              |
| Steps must be executable in the topologically sorted order   | TopoSort                          | The assembled plan's step sequence must respect all declared dependency orderings.                                   |
| Input envelope must pass schema validation before processing | InputEnvelopeValidator            | A plan build request with an invalid envelope is rejected before any aggregate is mutated.                           |
| Plan hash must be deterministic                              | PlanAssembler                     | Given identical inputs, PlanAssembler must always produce the same plan hash (content-addressable).                  |

## Validation Examples

- Submitting a plan where step B declares step A as a dependency, and step A declares step B as a dependency, causes GraphBuilder to raise a `CyclicDependencyError`.
- A step of type `task` with a missing `stepTypeConfig` required field fails StepFactory policy resolution with a `MissingRequiredParameterError`.
- Calling `compilePlan` on a plan still in draft state that has not been validated raises a `LifecycleTransitionError`.
- A `PlannerInputEnvelope` whose schema does not match `planner-input.ts` is rejected by InputEnvelopeValidator before any domain object is created.
- Two builds from the same input envelope must produce identical plan hashes from PlanAssembler.

## Key Files

- `packages/@dvt/planner/src/domain/Planner.ts` — Lifecycle gate enforcement
- `packages/@dvt/planner/src/domain/graph/GraphBuilder.ts` — Cycle detection
- `packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts` — Input validation
- `packages/@dvt/planner/src/domain/PlanAssembler.ts` — Hash determinism
- `packages/@dvt/planner/src/domain/policies.ts` — Parameter requirement checks
- `packages/@dvt/planner/docs/contracts/PlannerContracts.v2.3.1.md` — Formal constraint definitions
- `packages/@dvt/contracts/test/planner.contract.test.ts` — Contract-level constraint tests
