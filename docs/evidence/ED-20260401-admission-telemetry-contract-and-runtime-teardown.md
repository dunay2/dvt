---
title: Admission telemetry contract restore and protected runtime teardown resilience
status: Accepted
date: 2026-04-01
owners:
  - apps/api
  - packages/@dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.ts
  - apps/api/src/modules/buildProtectedRuntimeModule.ts
  - apps/api/src/modules/buildProviderAdapters.ts
  - apps/api/test/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.test.ts
  - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
evidence:
  tests:
    - pnpm --filter dvt-api test
    - pnpm verify:prepush
---

## Summary

This slice restores runtime compatibility with the `AdmissionTelemetry` port
and hardens protected runtime shutdown to attempt every closer before reporting
failure.

## What changed

- `ObservabilityAdmissionTelemetry` now implements `record(...)`, matching the
  `AdmissionTelemetry` interface used by `BackpressureAwareStartRunUseCase`.
- Infrastructure tests switched from `recordDecision(...)` to `record(...)` to
  lock the interface contract.
- Protected runtime teardown moved from sequential `await` calls to
  `Promise.allSettled(...)` aggregation via `closeAllClosers(...)`.
- Provider adapter teardown now follows the same all-closer attempt model.

## Validation

- `pnpm --filter dvt-api test` passed after contract + teardown changes.
- `pnpm verify:prepush` passed, including changed-file lint/format gates.
