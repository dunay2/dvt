---
title: dsl Sequence
status: Draft
owner: Planning Domain
last_reviewed: 2026-03-28
---

# dsl Sequence

## Main Flow: Parsing a Plan Definition

```mermaid
sequenceDiagram
  participant Planner as @dvt/planner
  participant DSL as DSLAggregate
  participant Syntax as SyntaxAggregate
  participant Parser as ParserAggregate
  participant Engine as @dvt/engine

  Planner->>DSL: manageSyntaxAndParsing(rawPlan)
  DSL->>Syntax: validatePlanSyntax(rawPlan)
  alt Syntax valid
    Syntax-->>DSL: ValidationResult { valid: true }
    DSL->>Parser: parsePlanDefinition(rawPlan)
    Parser->>Parser: transformToTypedPlan(rawPlan)
    Parser-->>DSL: ParsedPlan
    DSL-->>Planner: ParsedPlan (PlanParsed event)
    Planner->>Engine: submitPlan(parsedPlan)
    Engine-->>Planner: RunId
  else Syntax invalid
    Syntax-->>DSL: ValidationResult { valid: false, errors }
    DSL-->>Planner: SyntaxValidationFailed (errors)
  end
```

## Global Flow Position

`@dvt/dsl` (located within `packages/@dvt/planner`) sits at the plan authoring boundary of the Planning Domain. It is called by `@dvt/planner` when a raw plan definition needs to be validated and transformed into a typed object. After parsing, the planner forwards the result to `@dvt/engine` for execution. The DSL itself does not call the engine directly. Upstream: `@dvt/planner`. Downstream: parser output is consumed by `@dvt/planner` and subsequently passed to `@dvt/engine` and the interpreter.

## Key Files

- `packages/@dvt/planner/src/dsl/DSLAggregate.ts`
- `packages/@dvt/planner/src/dsl/SyntaxAggregate.ts`
- `packages/@dvt/planner/src/dsl/ParserAggregate.ts`
