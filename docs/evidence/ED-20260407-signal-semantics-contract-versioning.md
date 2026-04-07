---
title: Signal semantics contract versioning for engine and adapters
status: Accepted
date: 2026-04-07
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
arc_level: ARC-2
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/contracts/src/contracts/engine/SignalSemantics.v1.ts
  - packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts
  - packages/@dvt/contracts/src/index.ts
  - packages/@dvt/engine/src/adapters/IProviderAdapter.ts
  - packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts
  - packages/@dvt/engine/src/services/signal/SignalTransitionGuard.ts
  - packages/@dvt/engine/src/adapters/mock/MockAdapter.ts
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts
  - packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts
  - packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts
  - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - packages/@dvt/engine/test/adapters/MockAdapter.cancel.test.ts
  - packages/@dvt/contracts/test/signalSemantics.test.ts
  - packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts
  - packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/engine test -- test/core/WorkflowEngineCoreService.test.ts test/adapters/MockAdapter.cancel.test.ts
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/integration.time-skipping.test.ts -t "deduplicates stale PAUSE signal ids across a pause-resume cycle"
    - pnpm verify:prepush
---

## Summary

This slice moves signal-to-event derivation into a versioned contract under
`@dvt/contracts` and wires engine/adapters to use declared semantics versions
instead of hardcoded mapping tables in engine internals. It also corrects the
current `PAUSE/RESUME` ownership defect by making the runtime the sole producer
of realized pause/resume lifecycle events in the current semantics version.

## What changed

- Added `SignalSemantics.v1` contract with:
  - `CURRENT_SIGNAL_SEMANTICS_VERSION`
  - versioned registry
  - helpers to resolve semantics and derive run events by signal type
- Simplified the active contract to a single `1.0.0` semantics line with no
  engine-derived pause/resume mapping.
- Exposed signal semantics contract via `@dvt/contracts` public exports.
- Added adapter declaration hook `signalSemanticsVersions()` in provider
  adapter contracts (contracts and engine boundary).
- Updated engine core signal flow to derive event mapping from contract helpers.
- Kept `SignalTransitionGuard` responsible for transition validation while
  decoupling it from engine-side realized lifecycle emission.
- Removed hardcoded signal mapping constants from engine lifecycle constants.
- Updated built-in adapters (mock, temporal stub, conductor stub) to declare
  supported signal semantics versions.
- Updated the mock runtime path to emit `RunPaused` / `RunResumed` as
  runtime-owned lifecycle events with `signalId`-scoped idempotency, so stale
  replays are deduplicated while legitimate `PAUSE -> RESUME -> PAUSE` cycles
  remain appendable in the same logical attempt.
- Updated the Temporal adapter to forward `signalId` for `PAUSE/RESUME` and the
  workflow runtime to deduplicate processed control-signal ids across the run
  lifetime and across continue-as-new rollover.
- Added tests for contract mapping, runtime-owned pause/resume emission, and
  engine no-derive behavior for current semantics.
- Added Temporal coverage for signal-id forwarding, continue-as-new state carry,
  and stale `PAUSE` replay after a `PAUSE -> RESUME` cycle.

## Expected operational effect

- Signal evolution is governed by contract versioning.
- Adapters explicitly declare supported signal semantics versions.
- The active semantics version no longer allows the engine to append realized
  `RunPaused` or `RunResumed` events.
- Temporal runtime now preserves `PAUSE/RESUME` idempotency by `signalId` even
  after the run returns to `RUNNING`.
- Mock runtime now preserves the same `signalId` dedupe rule and no longer
  collapses legitimate repeated pause cycles behind a single `RunPaused`
  idempotency key.
- Engine no longer encodes signal mapping rules in private constants, reducing
  redeploy pressure for mapped-signal evolution.
