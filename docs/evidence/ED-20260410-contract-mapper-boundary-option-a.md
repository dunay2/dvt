---
title: Harden contract mapper boundary with Option A append authority
status: Accepted
date: 2026-04-10
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
  - packages/@dvt/run-domain
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/types/contracts.ts
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - packages/@dvt/engine/src/state/runEventWritePolicy.ts
  - packages/@dvt/engine/src/state/InMemoryRunStateStore.ts
  - packages/@dvt/engine/src/state/InMemoryTxStore.ts
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - packages/@dvt/adapter-postgres/src/runEventEnvelopePolicy.ts
  - packages/@dvt/run-domain/src/mapEventEnvelopeToProjectableEvent.ts
  - docs/planning/proposals/contract-mapper-event-boundary-study-20260409.md
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine test
    - pnpm verify:prepush
---

## Summary

This slice implements the narrow Option A boundary decision for step-failure
evidence ownership.

The append boundary now owns the invariants the projector consumes as trusted
input, while the mapper remains a structural translation seam plus
deterministic `failedAt` derivation from the accepted envelope timestamp.

## Scope

1. `stepId` for step events is now enforced as non-blank at the write boundary.
2. `emittedAt` is now enforced as non-blank at the write boundary.
3. Persisted event records validate `persistedAt` after enrichment in both
   in-memory and Postgres write paths.
4. `StepFailed` mapper cleanup for blank `reason` and `message` was removed so
   semantic repair no longer hides in the read path.
5. Public contract types now use semantic aliases for `stepId`,
   `RunFailureEvidence`, and `activeStepId` instead of leaking raw `string`
   for the fields hardened by this slice.
6. The governing proposal now records the before-state, implemented Option A
   flow, and repository-grounded rationale.

## Residual Considerations

1. Public TypeScript types still express semantic aliases rather than
   schema-branded non-blank strings; a future slice can derive stronger
   compile-time truth directly from schema outputs.
2. `emittedAt` and `persistedAt` remain non-blank boundary facts, not full ISO
   UTC contract proofs, because the active write schema does not yet validate
   full timestamp structure.
3. ARC publication for this branch still requires the corresponding risk entry
   and synced documentation indexes before PR creation.
