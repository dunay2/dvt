---
title: ProviderRef contract hardening and typed start-run reconciliation
status: Accepted
date: 2026-04-09
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
  - apps/api
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - packages/@dvt/engine/src/services/startRun/StartRunExecutionService.ts
  - packages/@dvt/engine/src/core/lifecycle/StartRunTraceContext.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts
  - apps/api/src/application/services/runMetadataToEngineRunRef.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/state-store test
    - pnpm --filter dvt-api test
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

This slice removes the flat provider-ref bag from the runtime boundary and
replaces the old patch seam with a typed, provider-validated
`saveProviderRef(...)` reconciliation flow. `RunMetadata` now persists a
canonical `providerRef: EngineRunRef`, and adapters that implement
`estimateRunRef()` may reconcile same-provider late-bound fields without
allowing cross-provider drift.

## What changed

- Replaced flat provider identity fields in `RunMetadata` with one nested
  discriminated `providerRef`.
- Reintroduced `ProviderRefUpdate` as a discriminated update shape instead of a
  flat bag, and restored `saveProviderRef(...)` on engine/state-store seams.
- Hardened `StartRunExecutionService` so an `estimateRunRef()` mismatch
  reconciles through `saveProviderRef(...)` when the provider discriminator is
  unchanged and fails closed when validation rejects the update.
- Moved `StartRunTraceContext` to `@dvt/engine/src/core/lifecycle` so core and
  start-run services consume one shared seam.
- Updated API and repository mappers, fixtures, and tests to read nested
  `providerRef` instead of flat provider-specific fields.
- Updated canonical architecture and contract docs to describe the new
  provider-ref and start-run protocol.

## Expected effect

- Impossible cross-provider states are no longer type-valid or persistable.
- Provider runtime identity is modeled once, through the canonical
  `EngineRunRef` union.
- Start-run can reconcile same-provider late-bound identifiers without falling
  back to an untyped metadata patch or permitting cross-provider drift.
- Core and application services now share one trace-context type instead of
  drifting duplicated type declarations.
