---
title: S05 envelope boundary hardening for payloadVersion gating
status: Accepted
date: 2026-04-02
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts
  - packages/@dvt/engine/src/state/runEventWritePolicy.ts
  - packages/@dvt/engine/test/state/bootstrapRunTx.atomicity.test.ts
  - packages/@dvt/adapter-postgres/src/runEventEnvelopePolicy.ts
  - packages/@dvt/adapter-postgres/test/PostgresRunEventStore.test.ts
  - packages/@dvt/adapter-postgres/test/smoke.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- compiled-code-ref.contract.test.ts
    - pnpm --filter @dvt/engine test -- bootstrapRunTx.atomicity.test.ts
    - pnpm --filter @dvt/adapter-postgres test -- PostgresRunEventStore.test.ts
    - pnpm --filter @dvt/adapter-postgres test -- smoke.test.ts
    - pnpm verify:prepush
---

# ED-20260402 S05 envelope boundary hardening

## Decision captured

This evidence closes the `S05-part-1` hardening slice at the real write
boundaries by enforcing the full run-event envelope contract, including
`payloadVersion`, before in-memory or Postgres write-path logic proceeds, and
by restoring canonical rejection of whitespace-only `runId` values.

## What this evidence proves

1. The canonical write schema still requires `payloadVersion: 1` at the
   envelope level in `@dvt/contracts`.
2. Engine in-memory write policy now treats schema parsing as the first gate,
   rather than relying on ad hoc field checks before contract validation.
3. Postgres write-boundary tests now explicitly reject write envelopes that omit
   `payloadVersion`, not only envelopes that use the wrong version value.
4. The shared contract now rejects whitespace-only `runId` values instead of
   relying on one engine-local guard.
5. Both write boundaries preserve fail-closed behavior and reject invalid
   envelopes before any event persistence occurs.

## Validation results

- `pnpm --filter @dvt/contracts test -- compiled-code-ref.contract.test.ts`
  - Passed.
- `pnpm --filter @dvt/engine test -- bootstrapRunTx.atomicity.test.ts`
  - Passed.
- `pnpm --filter @dvt/adapter-postgres test -- PostgresRunEventStore.test.ts`
  - Passed.
- `pnpm --filter @dvt/adapter-postgres test -- smoke.test.ts`
  - Executed successfully.
  - Result: `33` tests skipped because `DVT_PG_INTEGRATION` was not enabled in
    this environment.
- `pnpm verify:prepush`
  - Passed.
