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
  - packages/@dvt/contracts/src/contracts/engine/RunExecutionContext.v1.ts
  - packages/@dvt/contracts/src/contracts/engine/RunExecutionPolicy.v1.ts
  - packages/@dvt/contracts/src/types/contracts.ts
  - packages/@dvt/contracts/src/utils/contractPrimitives.ts
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - packages/@dvt/engine/src/state/runEventWritePolicy.ts
  - packages/@dvt/engine/src/state/InMemoryOutboxState.ts
  - packages/@dvt/engine/src/state/InMemoryRunStateStore.ts
  - packages/@dvt/engine/src/state/InMemoryTxStore.ts
  - packages/@dvt/engine/src/services/startRun/StartRunEventFactory.ts
  - packages/@dvt/engine/src/adapters/mock/MockAdapter.ts
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - packages/@dvt/engine/src/core/SnapshotProjector.ts
  - packages/@dvt/engine/src/core/WorkflowEngine.ts
  - packages/@dvt/engine/src/utils/clock.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.mappers.ts
  - packages/@dvt/adapter-postgres/src/runEventEnvelopePolicy.ts
  - packages/@dvt/adapter-temporal/src/WorkflowMapper.ts
  - packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
  - packages/@dvt/planner/src/domain/PlanAssembler.ts
  - packages/cli/validate-contracts.cjs
  - packages/@dvt/run-domain/src/mapEventEnvelopeToProjectableEvent.ts
  - apps/api/src/runtime/intentReconcilerRuntime.ts
  - scripts/sync-docs.cjs
  - docs/planning/proposals/contract-mapper-event-boundary-study-20260409.md
evidence:
  tests:
    - pnpm type-check
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/run-domain test
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/engine test
    - pnpm docs:sync
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
2. `emittedAt` is now enforced as strict ISO UTC at the write boundary.
3. Persisted event records validate `persistedAt` after enrichment in both
   in-memory and Postgres write paths.
4. `StepFailed` mapper cleanup for blank `reason` and `message` was removed so
   semantic repair no longer hides in the read path.
5. Public contract types now use schema-aligned branded primitives for
   `stepId`, trusted failure evidence fields, envelope timestamps, plan refs,
   run execution context compatibility fingerprints, execution-policy
   capability declarations, signal ids, and provider run references instead of
   leaking raw `string` through the hardened boundary surface.
6. Canonical primitive helpers now centralize non-blank, step-id, ISO UTC, and
   SHA-256 fingerprint branding so planner, engine, adapters, and projectors do
   not need scattered casts or schema-specific parsing for the same boundary
   facts.
7. Temporal provider refs now treat `taskQueue` as absent-or-nonblank
   everywhere; empty strings are rejected at factory, state-store, and Postgres
   row-materialization seams instead of being preserved as meaningful runtime
   state.
8. The governing proposal now records the before-state, implemented Option A
   flow, and repository-grounded rationale.
9. Documentation index generation now includes YAML risk records and resolves
   duplicate risk ids to a single canonical entry so ARC risk navigation stays
   visible without split authority between `.md` and `.yaml` records.

## Residual Considerations

1. The planner and ancillary runtime surfaces still use some legacy plain
   `string` timestamp contracts outside this narrow run-event boundary slice.
2. Some engine/internal stores outside this slice still carry local timestamp
   helpers that can be converged further on the canonical contracts utility.
3. Existing risk-register sections still contain mixed legacy markdown and YAML
   records; the generator now prefers a single canonical entry, but historical
   content normalization remains a separate documentation cleanup slice.
