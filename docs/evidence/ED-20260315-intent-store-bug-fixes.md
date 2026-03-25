---
title: ED-20260315 - Intent store bug fixes
status: accepted
date: 2026-03-15
owners: Engineering
arc_level: ARC-1
breaking: false
gap: G3
code_refs:
  - packages/@dvt/contracts/src/errors.ts
  - packages/@dvt/contracts/src/contracts/engine/IStartRunIntentStore.v1.ts
  - packages/@dvt/engine/src/contracts/intentErrors.ts
  - packages/@dvt/engine/src/state/InMemoryStartRunIntentStore.ts
  - packages/@dvt/engine/test/state/InMemoryStartRunIntentStore.test.ts
  - packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts
  - packages/@dvt/adapter-postgres/src/index.ts
  - packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts
evidence:
  tests: []
  notes:
    - createIntent now rejects a different active intent for the same tenantId and runId with IntentActiveConflictError
    - markDispatched is idempotent for the same engineRunRef and conflicts on a different engineRunRef
    - listOrphaned uses createdAt for PENDING and updatedAt for DISPATCHED
    - 21/21 InMemoryStartRunIntentStore tests passed
    - '@dvt/contracts build passed'
    - '@dvt/adapter-postgres typecheck passed'
---

# ED-20260315 - Intent store bug fixes

## Purpose

Closes three correctness gaps in the start-run intent store contract and its
implementations:

- active-intent uniqueness for `(tenantId, runId)`
- idempotent repeated dispatch with the same `engineRunRef`
- orphan detection for `DISPATCHED` intents based on `updatedAt`

## Shipped behavior

### Active intent uniqueness

`createIntent()` remains idempotent on `intentId`, but it no longer accepts a
different active intent for the same `(tenantId, runId)`.

- Same `intentId` -> return the existing record unchanged
- Different `intentId` with active `PENDING` or `DISPATCHED` intent ->
  `IntentActiveConflictError`
- Different `intentId` after `RESOLVED` or `EXPIRED` -> allowed

This behavior is now aligned across the shared contract, the in-memory store,
and the Postgres store. The Postgres implementation maps the
`start_run_intents_active_run_uniq` unique index to
`IntentActiveConflictError` instead of leaking a storage-level error.

### Dispatch transition semantics

`markDispatched()` now distinguishes retry from conflict:

- already `DISPATCHED` with the same `engineRunRef` -> no-op
- already `DISPATCHED` with a different `engineRunRef` ->
  `IntentDispatchConflictError`
- terminal statuses still reject with `IntentInvalidTransitionError`

### Orphan detection semantics

`listOrphaned()` now uses the correct age source by status:

- `PENDING` -> compare `createdAt`
- `DISPATCHED` -> compare `updatedAt`

That avoids flagging a recently dispatched intent as orphaned just because it
was originally created long ago.

## Systems affected

### `@dvt/contracts`

- adds `IntentActiveConflictError`
- adds `IntentDispatchConflictError`
- documents `INV-INTENT-011` on `IStartRunIntentStore`

### `@dvt/engine`

- re-exports the canonical intent errors
- hardens `InMemoryStartRunIntentStore`
- adds negative-path tests for active conflict, dispatch conflict, and
  dispatched-orphan timing

### `@dvt/adapter-postgres`

- hardens `PostgresStartRunIntentStore`
- exports the new intent conflict errors from the package boundary
- updates the integration test to expect `IntentActiveConflictError`

## Validation run

Executed on 2026-03-15:

```text
pnpm --filter @dvt/contracts build
  PASS

pnpm --filter @dvt/engine exec vitest run test/state/InMemoryStartRunIntentStore.test.ts
  PASS (21/21)

pnpm --filter @dvt/adapter-postgres typecheck
  PASS

pnpm --filter @dvt/adapter-postgres exec vitest run test/PostgresStartRunIntentStore.test.ts
  SKIPPED (integration gate not enabled; 6 skipped)
```

## Traceability

- Governing ADR: `docs/adr/ADR-0030-pre-dispatch-intent-log.md`
- Contract surface: `packages/@dvt/contracts/src/contracts/engine/IStartRunIntentStore.v1.ts`
- Shared errors: `packages/@dvt/contracts/src/errors.ts`
