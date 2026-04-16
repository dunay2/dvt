---
title: Close AR-A12-B canonical status and provider diagnostic split
status: Accepted
date: 2026-04-13
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - apps/web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/types/contracts.ts
  - packages/@dvt/contracts/src/validation.ts
  - packages/@dvt/engine/src/contracts/types.ts
  - packages/@dvt/engine/src/contracts/engine/ExecutionSemantics.v1.ts
  - packages/@dvt/engine/test/types/engine-types.test.ts
  - apps/web/src/app/views/canvas/useCanvasOverlayModel.ts
  - docs/planning/closeouts/20260413-ar-a12-b-status-model-split-closeout.md
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web test
    - pnpm exec eslint --max-warnings 0 packages/@dvt/contracts/src/types/contracts.ts packages/@dvt/engine/src/contracts/types.ts packages/@dvt/engine/src/contracts/engine/ExecutionSemantics.v1.ts packages/@dvt/engine/test/types/engine-types.test.ts
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

`AR-A12-B` closes the status-model split by making the active public line carry
only three semantic planes:

1. `CanonicalRunStatus` for DVT-owned lifecycle authority
2. `ProviderRunStatusView` for provider-native diagnostic data
3. `RunStatusEnrichment` for optional derived read-side context

The slice removes the last active shared-contract aliases that blurred those
planes and aligns the web/runtime/docs surfaces to the same model.

## What changed

1. `@dvt/contracts` removed `RunStatusSnapshot` from the active shared
   contracts and stopped exporting the `AdapterScopedSubstatus` helper as a
   public semantic type.
2. `@dvt/engine` removed the same retired helper from its active re-exports and
   updated public type tests so provider-native substatus values remain plain
   diagnostic strings on `ProviderRunStatusView`.
3. `apps/web` now consumes `CanonicalRunStatus` for overlay and plugin runtime
   state instead of relying on the retired mixed snapshot contract.
4. Active architecture, execution-model, planning, review, and closeout docs
   now describe the canonical/provider/enrichment split as shipped behavior
   rather than as pending follow-up.

## Residual risk posture

The remaining risk is consumer drift outside the guarded surfaces: downstream
code may still import retired helper exports or interpret provider-native
diagnostic strings as canonical lifecycle authority. That residual is tracked in
the linked quality-risk entry for follow-up review.
