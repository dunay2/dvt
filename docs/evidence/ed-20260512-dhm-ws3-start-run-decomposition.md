---
title: DHM-WS3 start-run application decomposition
status: Accepted
date: 2026-05-12
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
  - packages/@dvt/engine/src/services/startRun/StartRunExecutionService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunFailurePolicy.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineStartRunDecomposition.architecture.test.ts test/services/StartRunApplicationService.test.ts
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter @dvt/engine test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test -- test/integration/plannerEngineContract.test.ts
---

# DHM-WS3 Start-Run Application Decomposition

## Summary

`DHM-WS3` moves concrete start-run execution and failure-policy construction out
of `StartRunApplicationService` and into the explicit
`buildStartRunApplicationService` composition helper.

The public `IWorkflowEngine.startRun` command surface is unchanged. Runtime
behavior is preserved while the application service now depends on
`IStartRunExecutionService`, `IStartRunFailurePolicy`, and
`IPlanIntegrityValidator` seams.

## Validation Evidence

- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineStartRunDecomposition.architecture.test.ts test/services/StartRunApplicationService.test.ts`
  - RED first: failed because `StartRunApplicationService` still constructed
    concrete collaborators, start-run seam interfaces did not exist, component
    docs were missing, and injected execution was not used.
  - GREEN after implementation: passed, 9 tests.
- `pnpm --filter @dvt/engine typecheck`
  - Passed.
- `pnpm --filter @dvt/engine test`
  - Passed: 50 files, 394 tests.
- `pnpm --filter dvt-api typecheck`
  - Passed.
- `pnpm --filter dvt-api test -- test/integration/plannerEngineContract.test.ts`
  - Passed: 1 file, 7 tests.

## No-Debt Evidence

No compatibility fallback was left in `StartRunApplicationService`. No public
engine API, API route behavior, provider adapter behavior, or intent-log
semantics changed.
