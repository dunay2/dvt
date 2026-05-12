---
title: WE-HX-3 start-run application decomposition
status: Accepted
date: 2026-05-12
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunIntentService.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
    - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
---

# WE-HX-3 Start-Run Application Decomposition Evidence

This evidence records the ARC-2 proof for the WE-HX-3 engine decomposition
slice. The slice adds internal phase services for start-run admission and
intent creation, updates the application coordinator to delegate those phases,
and adds semantic architecture coverage to prevent drift.

The public `IWorkflowEngine` and start-run boundary contracts are unchanged.
