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
- Removed the unused `policy` pass-through from
  `BuildStartRunApplicationServiceDeps`; the guard remains the single access
  policy owner for start-run admission.
- Removed the duplicate `StartRunExecutionPolicyAdmission` declaration from
  `StartRunAdmissionGuard` so the phase DTO is declared only in
  `StartRunTypes`.
- Updated component guide, user stories, feature mechanization, ARC evidence,
  and risk register material.
- Second QA pass corrected admission-component consumer and diagram drift:
  `StartRunApplicationService` consumes `IStartRunAdmissionService`, while
  `StartRunAdmissionService` owns the guard and plan-integrity handoff.

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

QA hardening:

```bash
pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts test/architecture/workflowEngineStartRunDecomposition.architecture.test.ts test/services/StartRunApplicationService.test.ts
pnpm --filter @dvt/engine typecheck
pnpm --filter dvt-api typecheck
pnpm --filter @dvt/engine test
pnpm --filter dvt-api test -- test/integration/plannerEngineContract.test.ts
pnpm --filter @dvt/engine test -- test/architecture/workflowEngineStartRunDecomposition.architecture.test.ts
```

Passed after removing the builder policy drift and duplicate admission DTO.
The second QA pass also passed after guarding the admission-component consumer
diagram against stale direct-guard wording.

## No Debt

No stubs, placeholders, TODO/FIXME markers, skipped hooks, relaxed rules, or
fake implementations were introduced. No public command/query rail changed.

## Residual Follow-Up

`StartRunAdmissionGuard` still coordinates access, rate limit, provider
resolution, capability validation, and run-execution-context policy. This slice
does not split those policies further; it only prevents the application
coordinator from owning admission construction.
