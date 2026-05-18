---
title: DHM-WS3 admission seam closeout
status: Draft
owner: Architecture / Engine
last_reviewed: 2026-05-18
planning_type: closeout
---

# DHM-WS3 Admission Seam Closeout

## Think-First Analysis

`DHM-WS3` already extracted start-run execution and failure collaborators from
`StartRunApplicationService`. The remaining residual was an asymmetric
admission phase: `StartRunAdmissionService` existed, but the coordinator still
constructed it and accepted plan-integrity dependencies that belong to
admission.

The root cause was a half-extracted service. The previous cut moved plan
integrity out of private coordinator methods but did not make admission a
first-class injected phase seam.

## Fowler Opportunity Matrix

| Scenario                               | Opportunity   | Fowler pattern                                            | DDD owner                                        | Rail                                        | Tests                                                                                         |
| -------------------------------------- | ------------- | --------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Coordinator constructs admission phase | SRP/DIP drift | Constructor Injection, Application Service, Policy Object | StartRunApplicationFlow / StartRunAdmissionPhase | Existing `IWorkflowEngine.startRun` command | `startRunApplicationDecomposition.architecture.test.ts`, `StartRunApplicationService.test.ts` |

## Work Performed

- Added `IStartRunAdmissionService` to the start-run phase contracts.
- Moved admission request/result/guard-port contracts to `StartRunTypes`.
- Updated `StartRunAdmissionService` to implement the admission seam.
- Updated `StartRunApplicationService` to receive the admission seam instead
  of constructing `StartRunAdmissionService`.
- Moved default admission construction into `buildStartRunApplicationService`.
- Updated component guide, user stories, feature mechanization, ARC evidence,
  and risk register material.

## Red / Green

RED:

```bash
pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts test/services/StartRunApplicationService.test.ts
```

Failed because `IStartRunAdmissionService` did not exist,
`StartRunApplicationService` still constructed `StartRunAdmissionService`, and
the injected admission seam was not invoked.

GREEN:

```bash
pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts test/services/StartRunApplicationService.test.ts
```

Passed: 2 files / 10 tests.

## No Debt

No stubs, placeholders, TODO/FIXME markers, skipped hooks, relaxed rules, or
fake implementations were introduced. No public command/query rail changed.

## Residual Follow-Up

`StartRunAdmissionGuard` still coordinates access, rate limit, provider
resolution, capability validation, and run-execution-context policy. This slice
does not split those policies further; it only prevents the application
coordinator from owning admission construction.
