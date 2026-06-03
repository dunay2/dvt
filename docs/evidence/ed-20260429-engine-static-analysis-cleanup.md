---
title: Engine and Temporal static analysis cleanup for admission and activity seams
status: Accepted
date: 2026-04-29
owners:
  - dvt/engine
  - dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/domain/IRunRecoveryService.ts
  - packages/@dvt/engine/src/core/WorkflowEngine.ts
  - packages/@dvt/engine/src/application/RecoverRunApplicationService.ts
  - packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/contracts/errors/errorMessages.ts
  - packages/@dvt/engine/src/services/startRun/RunExecutionContextAdmissionPolicy.ts
  - packages/@dvt/adapter-temporal/test/activities.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter @dvt/engine test -- WorkflowEngine.test.ts WorkflowEngine.planRef.test.ts errorI18n.contract.test.ts
    - pnpm --filter @dvt/engine test -- StartRunApplicationService.test.ts errorI18n.contract.test.ts
    - pnpm --filter @dvt/engine test -- RunExecutionContextAdmissionPolicy.acceptance.test.ts RunExecutionContextAdmissionPolicy.plugin-requirements.test.ts RunExecutionContextAdmissionPolicy.provenance.test.ts RunExecutionContextAdmissionPolicy.compatibility.test.ts
    - pnpm --filter @dvt/adapter-temporal test -- activities.test.ts
    - pnpm --filter @dvt/engine test
    - pnpm verify:prepush
---

This ARC-2 evidence records a behavior-preserving cleanup of engine application,
run-execution-context admission, and Temporal activity test seams after
static-analysis review.

The change keeps admission policy behavior, recovery delegation, and default
engine error messages stable while replacing high-argument and large-method
shapes with typed request objects, named test setup options, and small renderer
functions behind an exhaustive registry. No compatibility shim, placeholder, or
runtime bypass was introduced.
