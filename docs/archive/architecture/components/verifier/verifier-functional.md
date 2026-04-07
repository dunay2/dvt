---
title: Plan Verifier Functionalities
status: Draft
owner: Planning Domain
last_reviewed: 2026-03-28
---

# Plan Verifier Functionalities

## Functionalities

| #   | Functionality             | Description                                                                                                                                          |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Plan Structure Validation | Validates that an incoming ExecutionPlan conforms to required structural constraints — step ordering, required fields, dependency graph consistency. |
| 2   | Constraint Checking       | Checks plan-level and step-level constraints as defined in PlannerContracts.v2.3.1, rejecting plans that violate hard invariants.                    |
| 3   | Error Tracking            | Records each validation error with its associated step reference and error code in the ErrorAggregate.                                               |
| 4   | Warning Tracking          | Records non-blocking warnings (e.g., deprecated fields, soft constraint violations) in the WarningAggregate.                                         |
| 5   | Result Aggregation        | Aggregates all errors and warnings into a single ValidationResult returned to the planner.                                                           |
| 6   | Engine Gate Enforcement   | Ensures only plans that pass validation reach `@dvt/engine` for execution, acting as a hard gate.                                                    |

## Main Methods

- `validatePlan(plan: ExecutionPlan): ValidationResult`: Entry point for plan validation. Runs all structural and constraint checks, populates error/warning aggregates, and returns a consolidated result.
- `trackErrors(errors: ValidationError[]): void`: Stores a batch of validation errors into ErrorAggregates, associating each error with its originating step.
- `trackWarnings(warnings: ValidationWarning[]): void`: Stores a batch of validation warnings into WarningAggregates.
- `returnResults(): ValidationResult`: Constructs and returns the final ValidationResult containing all errors, warnings, and a pass/fail verdict.
- `associateWithStep(stepId: string): void`: (ErrorAggregate / WarningAggregate) Links an error or warning record to a specific plan step by ID.

## Key Files

- `packages/@dvt/planner/src/domain/VerifierAggregate.ts`
- `packages/@dvt/planner/src/domain/ErrorAggregate.ts`
- `packages/@dvt/planner/src/domain/WarningAggregate.ts`
- `packages/@dvt/planner/src/domain/types.ts`
- `packages/@dvt/planner/docs/contracts/PlannerContracts.v2.3.1.md`
