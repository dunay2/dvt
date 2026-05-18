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
  - packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
  - packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts test/services/StartRunApplicationService.test.ts
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

## Validation Evidence

- `pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts test/services/StartRunApplicationService.test.ts`
  - RED first: failed because `IStartRunAdmissionService` did not exist,
    `StartRunApplicationService` still constructed `StartRunAdmissionService`,
    and the injected admission seam was not invoked.
  - GREEN after implementation: passed, 2 files / 10 tests.

## No-Debt Evidence

No compatibility fallback, optional hidden construction path, public command
change, provider behavior change, or intent-log semantic change was introduced.
