---
title: @dvt/dsl
status: Draft
owner: Planning Domain
last_reviewed: 2026-03-15
---

# @dvt/dsl

## Component Map

```mermaid
flowchart LR
  planner[@dvt/planner]
  dsl[@dvt/dsl]
  engine[@dvt/engine]
  planner --> dsl
  dsl --> engine
```

## Location

- packages/@dvt/planner

## Domain

- [Planning Domain](../domain-planning.md)

## Main Responsibilities

- DSL for plan definition
- Root: DSLAggregate (central DSL model)
- Aggregates: SyntaxAggregate, ParserAggregate
- Ensures flexible plan creation, syntax validation

## Explanation

@dvt/dsl is responsible for providing a domain-specific language for plan definition:

- **Root:** [DSLAggregate](dsl.md#dslaggregate) — represents the central DSL model, owning syntax and parser logic.
- **Aggregates:** [SyntaxAggregate](dsl.md#syntaxaggregate), [ParserAggregate](dsl.md#parseraggregate).
- **Responsibilities:**
  - Enable flexible and expressive plan creation.
  - Validate syntax and parse plans.
  - Return parsed plans to planner.

**Interactions:**

- **[Planner](planner.md):** Receives parsed plans for editing and validation.
- **[Interpreter](interpreter.md):** Uses parsed plans for compilation.

DSL coordinates these interactions to ensure plans are defined, parsed, and ready for compilation.

## DSLAggregate

Represents the central DSL model, owning syntax and parser logic. Responsible for:

- Managing DSL syntax and parsing
- Validating plan definitions
- Returning parsed plans to planner

## SyntaxAggregate

Represents syntax validation for DSL. Responsible for:

- Storing syntax rules
- Validating plan syntax
- Reporting syntax errors

## ParserAggregate

Represents parser logic for DSL. Responsible for:

- Parsing plan definitions
- Associating parsed output with planner
- Reporting parser status

## Restrictions

- Must comply with contract definitions in [PlannerContracts.v2.3.1.md](../../packages/@dvt/planner/docs/contracts/PlannerContracts.v2.3.1.md)
- Only interacts with Planning and Execution domain components

## Related Documentation

- [Component Map](../component-map.md)
- [Planning Domain](../domain-planning.md)
- [Planner Contracts](../../packages/@dvt/planner/docs/contracts/PlannerContracts.v2.3.1.md)
