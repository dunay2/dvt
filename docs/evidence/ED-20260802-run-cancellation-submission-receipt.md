---
title: Durable run cancellation submission receipt
status: Accepted
date: 2026-08-02
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/engine/RunStateVocabulary.v1.ts
  - packages/@dvt/contracts/src/schema-packs/run-events.ts
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - apps/api/src/application/services/cancelRunUseCase.ts
  - apps/api/src/infrastructure/runControl/RunEventCancellationReceiptStore.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/run-domain test -- applyRunEvent.test.ts
    - pnpm --filter dvt-api test -- cancelRunUseCase.test.ts RunEventCancellationReceiptStore.test.ts
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
---

## Decision

The protected `CancelRun` command persists `RunCancelSubmitted` after the
runtime provider accepts cancellation and before the per-run command lock is
released. Repeated deliveries discover that durable fact and do not dispatch a
second provider cancellation.

`RunCancelSubmitted` is command evidence, not a lifecycle transition. It does
not project `CANCELLING`; the runtime-owned `RunCancelRequested` event remains
the sole authority for that state.

## Evidence

Application tests keep provider status at `RUNNING` while concurrent command
deliveries serialize, proving that deduplication depends on the durable receipt
rather than an opportunistic runtime status update. Domain projection coverage
proves that the receipt leaves the run snapshot unchanged.
