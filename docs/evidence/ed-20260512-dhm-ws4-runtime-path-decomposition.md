---
title: DHM-WS4 runtime path decomposition
status: Accepted
date: 2026-05-12
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/domain/IRunCommandService.ts
  - packages/@dvt/engine/src/domain/IRunSignalService.ts
  - packages/@dvt/engine/src/services/runControl/RunCommandService.ts
  - packages/@dvt/engine/src/services/runControl/RunSignalService.ts
  - packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/core/WorkflowEngineCoreService.test.ts
    - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/core/WorkflowEngineCoreService.test.ts test/application/workflowEngineUseCases.factory.test.ts
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter dvt-api typecheck
---

# DHM-WS4 Runtime Path Decomposition

## Summary

`DHM-WS4` separates the residual runtime-control seam into a cancel-command
path and a runtime-signal path. `RunCommandService` now owns cancel dispatch,
while `RunSignalService` owns signal validation, adapter dispatch, idempotency,
and signal-derived event emission.

`WorkflowEngineCoreService` remains as a compatibility adapter over the two
dedicated services so existing `buildRunControlService` callers are not broken.
The public `IWorkflowEngine` contract and API route behavior are unchanged.

## Validation Evidence

- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/core/WorkflowEngineCoreService.test.ts`
  - RED first: failed because command and signal ports/services did not exist,
    facade use cases still depended on one `runControlService`, docs were
    missing, and `WorkflowEngineCoreService` still owned adapter dispatch.
  - GREEN after implementation: passed, 12 tests.
- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/core/WorkflowEngineCoreService.test.ts test/application/workflowEngineUseCases.factory.test.ts`
  - Passed, 18 tests.
- `pnpm --filter @dvt/engine typecheck`
  - Passed after correcting exact-optional `timeouts` forwarding in the
    compatibility adapter.
- `pnpm --filter dvt-api typecheck`
  - Passed.

## No-Debt Evidence

No public engine contract, API route behavior, provider adapter behavior, or
signal semantics changed. No compatibility fallback hides mixed ownership:
the retained `WorkflowEngineCoreService` delegates to explicit command and
signal services.
