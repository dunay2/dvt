---
title: Plan Verifier Constraints & Invariants
status: Draft
owner: Planning Domain
last_reviewed: 2026-03-28
---

# Plan Verifier Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                                       | Where Enforced                                   | Description                                                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Only plans conforming to PlannerContracts.v2.3.1 may pass validation         | VerifierAggregate contract check                 | Plans are validated against the canonical contract definition; any deviation causes a PlanValidationFailed event.   |
| VerifierAggregate is the sole aggregate root for validation results          | VerifierAggregate (aggregate root pattern)       | ErrorAggregate and WarningAggregate may not be populated without a validation pass initiated by VerifierAggregate.  |
| Engine must not receive unvalidated plans                                    | Architecture boundary policy enforced by planner | The planner only forwards a plan to `@dvt/engine` after receiving a passing ValidationResult from the verifier.     |
| Error records are immutable once stored                                      | ErrorAggregate invariant                         | Validation errors cannot be modified after being stored; re-validation requires a new VerifierAggregate pass.       |
| Only Planning and Execution domain components may interact with the verifier | Architecture boundary policy                     | UI, Infra, and Shared Boundary domain components must not call verifier APIs directly.                              |
| A plan with any hard error must not proceed to execution                     | VerifierAggregate validation logic               | If ErrorAggregate is non-empty after validation, `returnResults()` marks the result as failed and blocks execution. |

## Validation Examples

- A plan missing required `stepId` fields on one or more steps is rejected with an error associated to each offending step, and `PlanValidationFailed` is emitted.
- A plan using a deprecated field triggers a `ValidationWarningRaised` event but still receives a passing verdict, allowing execution to proceed.
- A plan with a circular step dependency graph is caught during structural validation and results in a `PlanValidationFailed` event before any engine interaction.

## Key Files

- `packages/@dvt/planner/src/domain/VerifierAggregate.ts`
- `packages/@dvt/planner/src/domain/types.ts`
- `packages/@dvt/planner/docs/contracts/PlannerContracts.v2.3.1.md`
