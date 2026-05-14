---
title: EA-20260429-06 semantic architecture fitness
status: Accepted
date: 2026-05-14
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
  - packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.test.ts
  - packages/@dvt/engine/test/architecture/workflowEngineFacadeUseCases.architecture.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/architecture/engineArchitectureTestSupport.test.ts
    - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineFacadeUseCases.architecture.test.ts
    - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    - pnpm --filter @dvt/engine typecheck
    - pnpm verify:prepush
---

# EA-20260429-06 Semantic Architecture Fitness

## Summary

This evidence records the first `EA-20260429-06` architecture-fitness slice:
`WorkflowEngine` facade dependency ownership is now asserted with a TypeScript
AST helper instead of only source-string containment.

## Proof

- `engineArchitectureTestSupport.test.ts` proves the AST helper extracts
  constructor parameter-property names and types from real TypeScript source.
- `workflowEngineFacadeUseCases.architecture.test.ts` uses that helper to prove
  `WorkflowEngine` owns a constructor parameter property typed as
  `WorkflowEngineDeps`.
- Existing forbidden-token checks remain textual because they are explicit
  import/API policy guards, not TypeScript-shape proof.

## Validation

The closeout validation for this evidence is the targeted engine architecture
tests, engine typecheck, ARC check, docs synchronization, generated-code status
refresh, and repository pre-push validation.
