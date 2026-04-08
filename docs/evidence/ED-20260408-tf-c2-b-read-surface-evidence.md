---
title: TF-C2-B runtime read-surface evidence contract and projection
status: Accepted
date: 2026-04-08
owners:
  - packages/@dvt/contracts
  - packages/@dvt/run-domain
  - packages/@dvt/engine
  - apps/api
arc_level: ARC-2
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/contracts/src/types/contracts.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/run-domain/src/applyRunEvent.ts
  - packages/@dvt/engine/src/core/SnapshotProjector.ts
  - apps/api/src/application/services/getRunStatusUseCase.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/run-domain test
    - pnpm --filter @dvt/engine test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm verify:prepush
---

## Summary

This slice widens the canonical runtime read contract so transformation outcome
evidence can cross the shared boundary without violating ADR-0004 event-sourced
projection or ADR-0015 read-model separation.

## What changed

- Added optional-first TF-C2-B outcome fields to `RunStatusSnapshot`:
  `currentStepId`, `failedStepId`, `errorReason`, and `materialization`.
- Added materialization and failure-diagnostic payload shapes to the canonical
  event validators for `StepCompleted` and `StepFailed`.
- Extended the shared run-domain projector so canonical events can populate the
  new snapshot evidence fields deterministically.
- Extended API run-status responses so `GET /runs/:runId` returns the projected
  TF-C2-B fields when the snapshot carries them.
- Locked the contract with shared-contract, projector, engine, and API tests.

## Architectural intent

- Preserves [ADR-0004](../adr/ADR-0004-event-sourcing-strategy.md): outcome
  evidence is derived from canonical events into projected read state, not
  inferred ad hoc at the route layer.
- Preserves [ADR-0015](../adr/ADR-0015-getRunStatus-read-model-separation.md):
  `GET /runs/:runId` still reads projected state and does not call the provider
  to fabricate diagnostics.
- Makes the runtime read surface ready for TF-C2-A executor payload emission
  without forcing the API or frontend into route-local heuristics.

## Validation run for this slice

- `pnpm --filter @dvt/contracts build` passed.
- `pnpm --filter @dvt/contracts test` passed.
- `pnpm --filter @dvt/run-domain test` passed.
- `pnpm --filter @dvt/engine test` passed.
- `pnpm --filter dvt-api typecheck` passed.
- `pnpm --filter dvt-api test` passed.
- `pnpm verify:prepush` is recorded as the final gate for the branch closeout.
