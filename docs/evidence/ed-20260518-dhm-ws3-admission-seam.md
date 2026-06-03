---
title: DHM-WS3 start-run admission seam injection
status: Accepted
date: 2026-05-18
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts
  - packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
  - packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts
  - apps/api/src/application/services/WorkflowEngineFactory.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts test/architecture/workflowEngineStartRunDecomposition.architecture.test.ts test/services/StartRunApplicationService.test.ts
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test -- test/integration/plannerEngineContract.test.ts
---

# DHM-WS3 Start-Run Admission Seam Injection

## Summary

This slice closes the residual DHM-WS3 admission-construction drift.
`StartRunApplicationService` now depends on `IStartRunAdmissionService`; the
default concrete `StartRunAdmissionService` is assembled by
`buildStartRunApplicationService`.

The public `IWorkflowEngine.startRun` command surface remains unchanged. Runtime
behavior is preserved while the start-run coordinator now treats admission,
intent, execution, and failure as symmetric phase seams.

The Fowler QA pass also removed the residual `policy` dependency from
`BuildStartRunApplicationServiceDeps`. Access policy authority now enters the
start-run graph only through `StartRunAdmissionGuard`. The duplicate
`StartRunExecutionPolicyAdmission` declaration was removed from the guard and
the shared DTO lives only in `StartRunTypes`.

A second QA pass corrected the admission-component guide so the documented
consumer flow matches the code: `StartRunApplicationService` consumes
`IStartRunAdmissionService`; `StartRunAdmissionService` then coordinates guard
admission and plan integrity.

## Validation Evidence

- `pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts test/architecture/workflowEngineStartRunDecomposition.architecture.test.ts test/services/StartRunApplicationService.test.ts`
  - RED first: failed because `IStartRunAdmissionService` did not exist,
    `StartRunApplicationService` still constructed `StartRunAdmissionService`,
    and the injected admission seam was not invoked.
  - GREEN after implementation and QA hardening: passed, 3 files / 13 tests.
- `pnpm --filter @dvt/engine typecheck`
  - Passed.
- `pnpm --filter dvt-api typecheck`
  - Passed.
- `pnpm --filter @dvt/engine test`
  - Passed, 64 files / 451 tests.
- `pnpm --filter dvt-api test -- test/integration/plannerEngineContract.test.ts`
  - Passed, 1 file / 7 tests.
- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineStartRunDecomposition.architecture.test.ts`
  - Passed, 1 file / 3 tests.

## No-Debt Evidence

No compatibility fallback, optional hidden construction path, public command
change, provider behavior change, or intent-log semantic change was introduced.
