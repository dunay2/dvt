---
title: G4-T3 - Sonar Refactor Plan
status: Review
owner: docs
last_reviewed: 2026-03-06
planning_type: proposal
---

# G4-T3 - Sonar Refactor Plan

Refactor plan to eliminate static-analysis debt introduced around `compiledCodeRef` propagation in `@dvt/adapter-temporal`.

## Context

- Gap: `G4-T3` (`adapter-temporal` propagation to `StepStarted.payload`)
- Baseline implementation: done and tested
- Current problem: Sonar flags complexity and code-smell regressions in:
  - `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
  - `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
  - `packages/@dvt/adapter-temporal/test/activities.test.ts`

## Architectural Goal

Keep `G4-T3` behavior while improving code quality with:

1. **Hexagonal boundaries**: activity layer consumes only ports (`RunStateCommandPort`), not legacy adapters.
2. **SOLID**:
   - `S`: split parsing/validation/payload-mapping responsibilities.
   - `O`: extend by composable helper functions, not giant branching blocks.
   - `D`: depend on stable contracts, not deprecated fields.
3. **DDD tactical clarity**:
   - treat event envelope construction as explicit domain mapping.
   - treat compiled-code payload extraction as a dedicated policy.

## Sonar Findings to Address

| File                 | Finding family                      | Refactor action                                        |
| -------------------- | ----------------------------------- | ------------------------------------------------------ |
| `stepActivities.ts`  | duplicate imports                   | consolidate imports per module                         |
| `stepActivities.ts`  | deprecated usage (`stateStore`)     | remove fallback path and require command port          |
| `stepActivities.ts`  | complex methods                     | extract pure helper functions for execution/validation |
| `stepActivities.ts`  | generic `Error` in type checks      | use `TypeError` for schema/type violations             |
| `stepActivities.ts`  | `hasOwnProperty` style              | switch to `Object.hasOwn()`                            |
| `stepActivities.ts`  | negated/undefined style warnings    | simplify conditions and direct `undefined` checks      |
| `RunPlanWorkflow.ts` | cognitive complexity                | split orchestration into cohesive helpers              |
| `RunPlanWorkflow.ts` | empty object / nullish style smells | remove useless object creations, prefer `??` patterns  |
| `activities.test.ts` | duplicate imports                   | consolidate import statements                          |

## Refactor Sequence

1. **Activity boundary cleanup**
   - Make `runStateCommandPort` mandatory in `ActivityDeps`.
   - Remove runtime dependency on deprecated `stateStore` fallback path.
2. **Complexity decomposition**
   - Extract step execution branching (`transient/permanent/gateway`) into dedicated helpers.
   - Extract event envelope assembly into dedicated mapper.
3. **Workflow decomposition**
   - Keep deterministic behavior but split layer processing logic into smaller functions.
   - Keep side effects exclusively in activities.
4. **Validation and docs**
   - Re-run adapter-temporal test suite.
   - Update `G4` docs with refactor notes/evidence.

## Acceptance Criteria

- No behavioral regression in `G4-T3`:
  - valid `compiledCodeRef` still reaches `StepStarted.payload`
  - invalid/absent `compiledCodeRef` remains fail-open
- `@dvt/adapter-temporal` tests pass.
- Sonar flagged smells above are resolved or reduced with explicit rationale.
