---
title: Workflow-owned cancellation lifecycle ordering and maintenance alignment
status: Accepted
date: 2026-04-01
owners:
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
  - apps/api
arc_level: ARC-2
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts
  - packages/@dvt/engine/src/adapters/mock/MockAdapter.ts
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - packages/@dvt/engine/test/services/RunMaintenanceService.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test -- test/services/RunMaintenanceService.test.ts
    - pnpm --filter @dvt/engine test
    - pnpm verify:prepush
---

## Summary

This slice aligns cancellation ownership with ADR-0007 under the
workflow/provider-owned model. The engine no longer serves as event owner for
`RunCancelRequested` and runtime owners emit ordered cancellation lifecycle
events.

## What changed

- Engine cancel and `signal(CANCEL)` paths dispatch to adapters without
  appending `RunCancelRequested`.
- Mock adapter owns cancellation lifecycle append and emits
  `RunCancelRequested` before `RunCancelled`.
- Temporal adapter/workflow cancellation path is aligned to workflow-owned
  intent processing.
- API/runtime wiring supplies required dependencies for mock cancellation
  lifecycle writes and runtime clock usage.
- Maintenance tests were aligned to construct explicit cancelling-state intent
  events instead of relying on engine-side emission.

## Architectural intent

- Preserve deterministic event ordering for cancellation lifecycle replay.
- Keep event ownership at runtime boundaries that actually observe and process
  cancel intent.
- Avoid status misclassification from transport-layer assumptions and preserve
  projector determinism.
