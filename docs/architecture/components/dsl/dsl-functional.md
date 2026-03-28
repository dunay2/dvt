---
title: dsl Functionalities
status: Draft
owner: Planning Domain
last_reviewed: 2026-03-28
---

# dsl Functionalities

## Functionalities

| #   | Functionality            | Description                                                                                                                                              |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Plan Definition Parsing  | Transforms a raw DSL plan definition (string or object) into a structured, typed `ParsedPlan` ready for further processing by the planner.               |
| 2   | Syntax Validation        | Validates that a plan definition conforms to the DSL grammar rules before any parsing is attempted, providing early and precise error feedback.          |
| 3   | Expressive Plan Creation | Provides a high-level, human-readable DSL API that allows plan authors to define complex execution plans without writing raw JSON or TypeScript objects. |
| 4   | Parser Status Reporting  | Reports parser execution status (success, failure, warnings) back to the calling planner for logging and observability.                                  |
| 5   | Syntax Rule Management   | Stores and maintains the set of DSL grammar rules used for validation, allowing rule updates without breaking existing parsed plan consumers.            |

## Main Methods

- `manageSyntaxAndParsing(rawPlan: string): ParsedPlan`: Orchestrates the full DSL pipeline — syntax validation followed by parsing — and returns the structured plan.
- `validatePlanDefinition(rawPlan: string): ValidationResult`: Runs the plan definition through `SyntaxAggregate` rules and returns a result with any syntax errors found.
- `returnParsedPlan(rawPlan: string): ParsedPlan`: Delegates to `ParserAggregate` to transform a validated plan definition into a typed `ParsedPlan` object.
- `storeSyntaxRules(rules: SyntaxRule[]): void`: Registers or updates the set of DSL grammar rules maintained by `SyntaxAggregate`.
- `parsePlanDefinition(rawPlan: string): ParsedPlan`: Low-level parse call executed by `ParserAggregate` to transform a syntactically valid plan string into a structured output.

## Key Files

- `packages/@dvt/planner/src/dsl/DSLAggregate.ts`
- `packages/@dvt/planner/src/dsl/SyntaxAggregate.ts`
- `packages/@dvt/planner/src/dsl/ParserAggregate.ts`
