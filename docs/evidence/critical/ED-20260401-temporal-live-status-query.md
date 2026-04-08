---
title: Temporal adapter live status query removal of projection dependencies
status: Accepted
date: 2026-04-01
owners:
  - packages/@dvt/adapter-temporal
  - apps/api
arc_level: ARC-2
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/adapter-temporal/src/WorkflowMapper.ts
  - packages/@dvt/adapter-temporal/src/index.ts
  - apps/api/src/modules/buildProviderAdapters.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal test:integration
    - pnpm --filter dvt-api typecheck
    - pnpm verify:prepush
---

## Summary

This change removes snapshot projection dependencies from the Temporal adapter
status read path. `TemporalAdapter.getRunStatus()` now queries the live Temporal
workflow `status` query and returns provider-native status details instead of
rebuilding an engine snapshot locally.

## What changed

- Removed `IRunStateStoreReadLike` and `SnapshotProjectorLike` from
  `TemporalAdapterDeps`.
- Changed `TemporalAdapter.getRunStatus()` to call the Temporal workflow query
  API and map `WorkflowState` directly into a provider-native
  `RunStatusSnapshot`.
- Added `toRunStatusSnapshotFromWorkflowState()` to keep the workflow-state to
  adapter-status translation explicit and reusable.
- Removed Temporal adapter projection wiring from
  `apps/api/src/modules/buildProviderAdapters.ts`; `stateStore` and `projector`
  remain there only for `MockAdapter`.
- Added regression coverage for workflow-query status reads and for the
  unsupported-query failure mode.

## Architectural intent

- Aligns with [ADR-0015](../../adr/ADR-0015-getRunStatus-read-model-separation.md):
  the authoritative run status remains the event-log projection on the engine
  path, while provider reads are enrichment-only and provider-native.
- Keeps the adapter focused on provider concerns instead of duplicating engine
  snapshot authority inside the adapter boundary.

## Validation run for this slice

- `pnpm --filter @dvt/adapter-temporal test` passed.
- `pnpm --filter @dvt/adapter-temporal test:integration` was executed and
  currently fails before adapter assertions run because the Temporal
  time-skipping harness hits an existing Node package export error:
  `ERR_PACKAGE_PATH_NOT_EXPORTED` for `eslint-scope/lib/referencer`.
- Remaining slice validation is recorded in the task closeout.
