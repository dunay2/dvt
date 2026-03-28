---
title: interpreter Constraints & Invariants
status: Draft
owner: Planning Domain
last_reviewed: 2026-03-28
---

# interpreter Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                       | Where Enforced                | Description                                                                                                          |
| ------------------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Must comply with PlannerContracts.v2.3.1                     | InterpreterAggregate          | All interpretation behaviour and artifact shapes must conform to the formal contract definition.                     |
| Only interacts with Planning and Execution domain components | InterpreterAggregate boundary | The interpreter must not reach into unrelated domains; it only receives from the planner and delivers to the engine. |
| Artifacts must reference a valid plan step                   | ArtifactAggregate             | Every artifact produced must be associated with a known, existing step in the compiled plan.                         |
| Plan must pass validation before interpretation              | InterpreterAggregate          | The interpreter will not compile a plan that has not been validated by the planner/verifier pipeline.                |
| Interpretation is deterministic                              | InterpreterAggregate          | Given the same input plan, the interpreter must always produce identical artifacts (referential transparency).       |

## Validation Examples

- Submitting a plan that failed validation to `compilePlan` raises an `InvalidPlanError` — the interpreter refuses unverified plans.
- Calling `associateWithStep` with a stepId not present in the compiled plan raises a `StepNotFoundError` from ArtifactAggregate.
- An artifact with an unresolvable dependency reference is rejected at compilation time, not at engine execution time.
- Interpretation of a plan whose schema does not match `PlannerContracts.v2.3.1` must fail with a `ContractViolationError`.

## Key Files

- `packages/@dvt/planner/src/domain/types.ts` — Interpreter and artifact type definitions
- `packages/@dvt/planner/docs/contracts/PlannerContracts.v2.3.1.md` — Formal contract definitions
