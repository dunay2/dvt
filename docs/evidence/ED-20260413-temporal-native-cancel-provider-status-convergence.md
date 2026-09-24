---
title: Converge Temporal native cancel provider status with canonical cancellation
status: Accepted
date: 2026-04-13
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
  - docs/architecture/components/engine/adapters/temporal/EnginePolicies.md
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal ci:test:integration
    - pnpm --filter @dvt/engine test
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:status:generate
    - pnpm verify:prepush
---

## Summary

This slice closes the remaining native-cancel gap in `AR-C6`.

Before this change, `TemporalAdapter.cancelRun()` already used
`WorkflowHandle.cancel()`, and the workflow already persisted the canonical
`RunCancelRequested -> RunCancelled` ordering. The remaining mismatch was that
`RunPlanWorkflow` returned normally after native cancellation cleanup, so
Temporal could report provider-live terminal status `COMPLETED` even when the
canonical event log had already reached `CANCELLED`.

## Resolution

The workflow now persists ordered canonical cancellation events inside a
non-cancellable cleanup scope and then rethrows the original native
cancellation. That keeps event-log truth intact while allowing Temporal to
settle on provider-native terminal status `CANCELLED`.

## Scope

1. `RunPlanWorkflow` finalizes native cancellation and rethrows it instead of
   returning a normal workflow result.
2. Time-skipping integration coverage now proves:
   - `cancelRun()` reaches provider status `CANCELLED`
   - canonical event ordering remains `RunCancelRequested -> RunCancelled`
   - the finalization-race case also converges to provider status `CANCELLED`
3. Active Temporal policy docs now describe native and cooperative cancel paths
   separately.

## Residual considerations

- Provider-live status remains diagnostic only.
- Cooperative `signal(CANCEL)` is still a distinct workflow-owned path and may
  finish with provider token `COMPLETED` because it does not request
  provider-native workflow cancellation.
