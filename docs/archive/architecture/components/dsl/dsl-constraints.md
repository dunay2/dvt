---
title: dsl Constraints & Invariants
status: Draft
owner: Planning Domain
last_reviewed: 2026-03-28
---

# dsl Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                       | Where Enforced                             | Description                                                                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Must comply with PlannerContracts.v2.3.1                     | DSLAggregate / contract reference          | All parsed plan output shapes must conform to the contract definitions in `PlannerContracts.v2.3.1.md`; deviations require a contract version bump. |
| Only interacts with Planning and Execution domain components | Package boundary (`packages/@dvt/planner`) | DSL may only import from `@dvt/contracts` and other Planning Domain packages; direct imports from adapter or API packages are forbidden.            |
| Syntax validation must precede parsing                       | DSLAggregate pipeline ordering             | `ParserAggregate.parsePlanDefinition` must never be called with a plan definition that has not first passed `SyntaxAggregate.validatePlanSyntax`.   |
| Parsed plans are immutable once returned                     | ParserAggregate output                     | A `ParsedPlan` object returned to the planner must not be mutated after creation; consumers must create new plans for any modifications.            |
| Syntax errors must include field-level context               | SyntaxAggregate error reporting            | All `SyntaxValidationFailed` events must carry the offending field path and a human-readable description to support authoring tooling.              |
| DSL grammar rules must be versioned                          | SyntaxAggregate rule store                 | Grammar rule sets must carry a version identifier so that plan definitions can be validated against the rule version active at authoring time.      |

## Validation Examples

- A plan definition referencing an undefined step type triggers a `SyntaxValidationFailed` event with `field: "steps[2].type"` and `message: "Unknown step type 'fooBar'"` before any parsing occurs.
- Calling `parsePlanDefinition` directly without first calling `validatePlanSyntax` raises an `UnvalidatedPlanError` invariant violation in `DSLAggregate`.
- A parsed plan with a missing required `planId` field is rejected at the `PlannerContracts.v2.3.1` validation layer and never reaches the engine.

## Key Files

- `packages/@dvt/planner/src/dsl/DSLAggregate.ts`
- `packages/@dvt/planner/src/dsl/SyntaxAggregate.ts`
- `packages/@dvt/planner/src/dsl/ParserAggregate.ts`
