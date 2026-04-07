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
  - packages/@dvt/engine/src/adapters/mock/MockAdapter.ts
  - packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts
  - packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts
  - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - packages/@dvt/contracts/test/signalSemantics.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine test -- test/core/WorkflowEngineCoreService.test.ts
    - pnpm verify:prepush
---

## Summary

This slice moves signal-to-event derivation into a versioned contract under
`@dvt/contracts` and wires engine/adapters to use declared semantics versions
instead of hardcoded mapping tables in engine internals.

## What changed

- Added `SignalSemantics.v1` contract with:
  - `CURRENT_SIGNAL_SEMANTICS_VERSION`
  - versioned registry
  - helpers to resolve semantics and derive run events by signal type
- Exposed signal semantics contract via `@dvt/contracts` public exports.
- Added adapter declaration hook `signalSemanticsVersions()` in provider
  adapter contracts (contracts and engine boundary).
- Updated engine core signal flow to derive event mapping from contract helpers.
- Removed hardcoded signal mapping constants from engine lifecycle constants.
- Updated built-in adapters (mock, temporal stub, conductor stub) to declare
  supported signal semantics versions.
- Added tests for contract mapping and engine retry-signal behavior.

## Expected operational effect

- Signal evolution is governed by contract versioning.
- Adapters explicitly declare supported signal semantics versions.
- Engine no longer encodes signal mapping rules in private constants, reducing
  redeploy pressure for mapped-signal evolution.
