---
title: ED-20260316 - G7.3 provider run-id reconciliation
status: accepted
owners: engine
date: 2026-03-16
gap: G7
arc: ARC-1
arc_level: ARC-1
breaking: false
code_refs:
  - packages/@dvt/engine/src/core/WorkflowEngine.ts
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - packages/@dvt/engine/src/state/InMemoryRunStateStore.ts
  - packages/@dvt/engine/src/state/InMemoryTxStore.ts
  - packages/@dvt/engine/test/core/WorkflowEngine.test.ts
evidence:
  - WorkflowEngine reconciles provider run-id after pre-bootstrap start when the returned provider ref differs from the estimate.
  - The storage primitive is tenant-scoped through saveProviderRef.
  - Persistence failure in the reconciliation path is fail-soft and logged instead of failing the live run.
---

# ED-20260316 - G7.3 provider run-id reconciliation

## Summary

This slice closes `G7.3`.

In the pre-bootstrap `estimateRunRef()` path, `WorkflowEngine.startRun()` now
reconciles `run_metadata.providerRunId` after `adapter.startRun()` returns the
real provider reference. If the provider-assigned run id differs from the
estimated ref written during `bootstrapRunTx()`, the engine calls the optional
tenant-scoped `saveProviderRef()` storage primitive.

The reconciliation is fail-soft. If metadata persistence fails after the
provider workflow is already live, the engine logs a warning and continues
without converting the run into a lifecycle failure.

## Governing sources

- [ADR-0004 - Event Sourcing Strategy](../adr/ADR-0004-event-sourcing-strategy.md)
- [ADR-0013 - run-state-store bootstrapRunTx](../adr/ADR-0013-run-state-store-bootstrapRunTx.md)
- [ADR-0015 - getRunStatus read-model separation](../adr/ADR-0015-getRunStatus-read-model-separation.md)
- [ADR-0030 - pre-dispatch intent log](../adr/ADR-0030-pre-dispatch-intent-log.md)
- [ADR-0031 - adapter tenant isolation](../adr/ADR-0031-adapter-tenant-isolation.md)
- [G7 - AI Execution Tracker](../planning/gaps/G7-AI-EXECUTION-TRACKER.md)

## Changes

| Path                                                      | Change                                                                                                               |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `packages/@dvt/engine/src/ports/IRunStateStore.ts`        | Added `ProviderRefUpdate` and optional `saveProviderRef?(tenantId, runId, update)`                                   |
| `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts` | Mirrored the `ProviderRefUpdate` contract and optional method                                                        |
| `packages/@dvt/engine/src/state/InMemoryRunStateStore.ts` | Unified `saveProviderRef` signature and enforced tenant scoping                                                      |
| `packages/@dvt/engine/src/state/InMemoryTxStore.ts`       | Unified `saveProviderRef` signature for the transactional test store                                                 |
| `packages/@dvt/engine/src/core/WorkflowEngine.ts`         | Calls `saveProviderRef` fail-soft when `adapter.startRun()` returns a different provider ref than `estimateRunRef()` |
| `packages/@dvt/engine/test/core/WorkflowEngine.test.ts`   | Added targeted coverage for reconcile, no-op, and fail-soft paths                                                    |

## Acceptance evidence

- The engine now consumes `saveProviderRef` in the only code path where the
  metadata drift could occur.
- The reconcile call is tenant-scoped and does not widen the state-store
  contract beyond `providerWorkflowId`, `providerRunId`, and existing provider
  metadata fields.
- Fail-soft handling avoids the earlier bug pattern where a post-start
  persistence failure could be misreported as a lifecycle failure.

## Validation commands

| Command                                                                  | Result                                               |
| ------------------------------------------------------------------------ | ---------------------------------------------------- |
| `pnpm --filter @dvt/contracts build`                                     | PASS                                                 |
| `pnpm --filter @dvt/engine test`                                         | PASS (`238/238`)                                     |
| `pnpm --filter @dvt/adapter-postgres exec vitest run test/smoke.test.ts` | SKIPPED (`18 skipped`; integration gate not enabled) |
