---
title: Plan Verifier Sequence
status: Draft
owner: Planning Domain
last_reviewed: 2026-03-28
---

# Plan Verifier Sequence

## Main Flow: validatePlan

```mermaid
sequenceDiagram
  participant Planner as @dvt/planner
  participant VerifierAggregate
  participant ErrorAggregate
  participant WarningAggregate
  participant Engine as @dvt/engine

  Planner->>VerifierAggregate: validatePlan(executionPlan)
  VerifierAggregate->>VerifierAggregate: checkStructure(executionPlan)
  VerifierAggregate->>ErrorAggregate: storeError(validationErrors)
  VerifierAggregate->>WarningAggregate: storeWarning(validationWarnings)
  VerifierAggregate->>VerifierAggregate: returnResults()
  alt Plan is valid
    VerifierAggregate-->>Planner: ValidationResult (pass)
    Planner->>Engine: submitPlan(executionPlan)
  else Plan has errors
    VerifierAggregate-->>Planner: ValidationResult (fail)
    Planner-->>Planner: abort submission
  end
```

## Global Flow Position

`@dvt/plan-verifier` (located within `@dvt/planner`) sits between the Planner and the Engine in the Planning Domain. The planner constructs an ExecutionPlan and passes it to the verifier before any engine interaction. The verifier acts as a hard gate: only plans that receive a passing ValidationResult are forwarded to `@dvt/engine` for execution. The verifier does not call the engine itself — it returns results to the planner, which makes the final forwarding decision. No UI, Infra, or Shared Boundary component calls the verifier directly.

## Key Files

- `packages/@dvt/planner/src/domain/VerifierAggregate.ts`
- `packages/@dvt/planner/src/domain/ErrorAggregate.ts`
- `packages/@dvt/planner/src/domain/WarningAggregate.ts`
- `packages/@dvt/planner/src/domain/types.ts`
