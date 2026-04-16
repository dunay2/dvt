---
title: Temporal provider-native status view via handle.describe()
status: Accepted
date: 2026-04-09
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/adapter-temporal/src/WorkflowMapper.ts
  - packages/@dvt/adapter-temporal/src/index.ts
  - packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts
  - packages/@dvt/adapter-temporal/test/smoke.test.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter @dvt/adapter-temporal test
---

## Summary

`TemporalAdapter.getProviderStatusView()` previously queried the DVT-owned
`WorkflowState` via `workflow.query('status')` and mapped it through
an adapter-local workflow-state mapper. This returned DVT lifecycle concepts
(`PAUSED`, `CANCELLING`) as if they were Temporal-native runtime statuses.

After this change, the method calls `handle.describe()` - the same Temporal SDK
primitive already used by `lookupRunRef` - and extracts the Temporal-native
execution status (`status.name`). The result is mapped through the existing
`toProviderRunStatusView` function as a provider-diagnostic string.

## What changed

1. **WorkflowMapper.ts** - Added `CONTINUED_AS_NEW` to `TemporalRuntimeStatus`.
   Added `extractRuntimeStatusFromDescribe()` to safely extract the runtime
   status token from the untyped `describe()` result. Missing `status.name`
   still fails closed; unknown future Temporal tokens are preserved as
   provider diagnostics instead of throwing.
2. **TemporalAdapter.ts** - `getProviderStatusView()` now uses
   `handle.describe()` + `extractRuntimeStatusFromDescribe()` +
   `toProviderRunStatusView()` instead of `workflow.query('status')` +
   the old workflow-state mapper.
3. **Tests** - Updated to verify `describe()` is called, Temporal-native
   statuses are returned, missing status shape is rejected, and unknown
   provider tokens survive as diagnostics.
4. **Public surface** - Removed the old workflow-state mapper from the adapter
   barrel so the published API no longer offers a second DVT-owned
   pseudo-provider status path.

## Semantic separation achieved

| Plane               | Source                            | Statuses                                                          |
| ------------------- | --------------------------------- | ----------------------------------------------------------------- |
| Canonical (DVT)     | Event-sourced snapshot projection | RUNNING, PAUSED, COMPLETED, FAILED, CANCELLED + substatus         |
| Provider (Temporal) | `handle.describe()` runtime probe | RUNNING, COMPLETED, FAILED, CANCELLED, TERMINATED, TIMED_OUT, ... |

The `providerView` in `RunStatusEnrichment` now genuinely represents the
Temporal runtime perspective, not a second DVT read model.
