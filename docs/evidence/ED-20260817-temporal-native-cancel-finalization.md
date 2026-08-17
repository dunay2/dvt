---
title: Preserve canonical events when native cancellation races finalization
status: Accepted
date: 2026-08-17
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.cancellation.ts
  - packages/@dvt/adapter-temporal/test/runPlanWorkflow.cancellation.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/runPlanWorkflow.cancellation.test.ts test/runPlanWorkflow.layers.order.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/integration.time-skipping.test.ts -t "native Temporal handle cancellation"
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm verify:prepush
---

## Summary

A provider-native cancellation could reach Temporal after the final step and
before `RunCompleted`, close the workflow as `CANCELLED`, and still leave the
canonical DVT event stream at `RunCancelSubmitted`. The Runs read model then
remained `RUNNING` with cancellation pending because neither
`RunCancelRequested` nor `RunCancelled` had been persisted.

## Resolution

The workflow catch-path finalizer now classifies a native cancellation when
either Temporal recognizes the caught error or the current workflow
`CancellationScope` is already considered cancelled. It returns the recognized
error or normalizes the scope-only case to Temporal's `CancelledFailure` before
the workflow rethrows it. Canonical terminal events remain runtime-owned and
are emitted in the existing non-cancellable scope.

No API, Engine, UI, contract, store, planner, or provider-reconciliation path
was added. Provider status remains diagnostic rather than canonical authority.

## Regression boundary

Focused unit tests fix the observed edge case—a cancelled workflow scope whose
caught error shape is not recognized by `isCancellation`—and prove that the
workflow boundary rethrows the normalized cancellation. Existing cooperative
and recognized native cancellation cases retain their semantics.
