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
    - pnpm --filter @dvt/engine test -- SnapshotProjector.transitions.test.ts
    - pnpm --filter dvt-api test -- cancelRunUseCase.test.ts RunEventCancellationReceiptStore.test.ts
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
---

## Decision

The protected `CancelRun` command dispatches cancellation through the canonical
signal rail with the stable identity
`cancel:<tenantId>:<runId>:<logicalAttemptId>`. The Temporal workflow persists
processed signal identities and therefore applies the cancellation effect once
even if the API process terminates after provider acceptance.

After provider acceptance, the command persists `RunCancelSubmitted` before the
per-run command lock is released. Repeated deliveries normally discover that
durable fact; if receipt persistence failed, they safely redeliver the same
provider-deduplicated signal identity.

`RunCancelSubmitted` is command evidence, not a lifecycle transition. It does
not project `CANCELLING`; the runtime-owned `RunCancelRequested` event remains
the sole authority for that state.

## Evidence

Application tests keep provider status at `RUNNING` while concurrent command
deliveries serialize. A crash-window regression also fails the first receipt
write, redelivers the same stable signal, and proves that the provider-side
effect is applied once. Domain projection coverage proves that the receipt
leaves the run snapshot unchanged.
