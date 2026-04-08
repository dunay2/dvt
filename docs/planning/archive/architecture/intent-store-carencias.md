---
title: Intent Store and Reconciliation Gaps
status: Draft
last_reviewed: 2026-03-15
owner: engine
---

# Intent Store and Reconciliation Gaps

This document records gaps and improvement opportunities identified in the
implementation and modeling of the intent store (`PostgresStartRunIntentStore`)
and the reconciliation process around start-run intents.

## Gaps Identified

### 1. Aggregate modeling

- A formal aggregate for the intent log and reconciliation flow is still missing.
- There is no explicit aggregate for the relationship between intents, run metadata, and provider verification.

### 2. Reconciliation and crash consistency

- The reconciliation process is not yet modeled as an explicit aggregate.
- Documentation is still thin on how crash recovery guarantees are maintained.
- The full lifecycle of intents (`PENDING`, `DISPATCHED`, `RESOLVED`, `EXPIRED`) is not yet formalized as an aggregate.

### 3. Provider verification

- Provider verification (`lookupRunRef`, intent resolution) remains under-modeled.
- Orphaned intent detection and resolution are not yet documented clearly enough.

### 4. Audit and traceability

- There is no aggregate dedicated to auditing intent transitions.
- Documentation does not yet explain how intent state changes are queried and reviewed.

### 5. Tenant isolation

- Formal modeling of tenant isolation in the intent store is still missing.
- Enforcement and cross-tenant validation mechanisms are not yet documented clearly.

### 6. Error handling and transitions

- Transition errors (`IntentInvalidTransitionError`, `IntentNotFoundError`) are not described as part of a coherent failure model.
- Compensation and failure-path handling remain under-documented.

### 7. Outbox and DLQ

- Formal integration with the outbox and dead letter queue remains open for failed or unreconciled intents.

### 8. Dispatcher idempotency - Closed 2026-03-15

- It was previously unspecified what happens when the scheduler emits the same intent more than once after a crash or retry.
- `InMemoryStartRunIntentStore` did not mirror the active unique index on `(tenant_id, run_id)` that already exists in Postgres.
- **Resolution**: `INV-INTENT-011` was added to ADR-0030, `createIntent()` now documents deterministic `intentId` requirements, `IntentActiveConflictError` was added to `@dvt/contracts`, and `InMemoryStartRunIntentStore` now enforces the active uniqueness rule with negative tests.

## Improvement Opportunities

- Formalize an `IntentAggregate` and its lifecycle.
- Document reconciliation and crash recovery as an aggregate behavior.
- Integrate audit, tenant isolation, and error handling into the aggregate model.
- Define explicit relationships between intents, run metadata, provider verification, outbox, and DLQ.

---

## Think-First and Pre-Implementation Brief - Gap #8 (Dispatcher Idempotency)

### Phase 1: Think-First Analysis

**Problem summary:**
The scheduler can restart after a crash and generate a new `intentId` for the same `(tenantId, runId)`. Postgres rejects the second insert through `start_run_intents_active_run_uniq`, but that failure used to surface as an untyped constraint error. `InMemoryStartRunIntentStore` did not mirror the restriction, so adapter parity was broken and tests stayed blind to the problem.

**Root cause:**
`createIntent()` was idempotent on `intentId`, but not on the operation identity `(tenantId, runId)`. The scheduler had no contractual obligation to reuse the same `intentId` after restart. Without that rule, the real Postgres protection existed outside the documented contract and outside the in-memory implementation.

**Constraints and invariants:**

- **ADR-0030 INV-INTENT-001 through INV-INTENT-010**: `createIntent()` is pre-dispatch and already mandates `intentId`-based idempotency.
- **ADR-0008**: signal idempotency keys are derived deterministically from operation identity; the same pattern applies here.
- **ADR-0013**: `bootstrapRunTx()` remains atomic at the state-store layer, not the intent-store layer.

**Options considered:**

| Option                   | Description                                                                                                                                                             | Verdict                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A - Deterministic caller | The scheduler derives a stable `intentId` from `(tenantId, runId)`. The contract documents the obligation. In-memory storage mirrors the active unique rule for parity. | Selected                                                                                     |
| B - Contract upsert      | `createIntent()` returns the existing active intent for `(tenantId, runId)` regardless of `intentId`.                                                                   | Rejected because it hides caller bugs and muddies semantics.                                 |
| C - Typed conflict only  | Add `IntentActiveConflictError` and force callers to handle retries explicitly.                                                                                         | Rejected as the main strategy because deterministic identity is still the cleaner invariant. |
| D - Documentation only   | Record the constraint without changing code.                                                                                                                            | Rejected because parity would remain broken.                                                 |

**Selected option:**
Option A. The contract adds `INV-INTENT-011` requiring deterministic `intentId` derivation. `InMemoryStartRunIntentStore` enforces the active uniqueness rule on `(tenantId, runId)` and throws `IntentActiveConflictError`, matching Postgres behavior closely enough for meaningful adapter parity.

**Rejected alternatives:**
Option B was too ambiguous. Option C is still useful as a typed error surface, but not as the primary design. Option D was insufficient.

---

### Phase 2: Pre-Implementation Brief

- **Mode:** Full (new exported error, new contract invariant, and new in-memory behavior)
- **Scope:** Close the in-memory/Postgres parity gap in `createIntent()` and formalize the caller obligation.
- **Touched files:**
  - `packages/@dvt/contracts/src/errors.ts`
  - `packages/@dvt/contracts/src/contracts/engine/IStartRunIntentStore.v1.ts`
  - `packages/@dvt/engine/src/state/InMemoryStartRunIntentStore.ts`
  - `docs/adr/ADR-0030-pre-dispatch-intent-log.md`
  - `packages/@dvt/engine/test/state/InMemoryStartRunIntentStore.test.ts`
- **Expected outcome:** In-memory storage mirrors the Postgres uniqueness behavior, the contract documents the deterministic caller obligation, and the failure is typed.
- **Risks and mitigations:** The in-memory change is additive but introduces a new error path. Existing tests remain valid unless they rely on creating two active intents for the same `(tenantId, runId)`.
- **Out-of-scope:** Changes to `PostgresStartRunIntentStore`, extra migrations, or scheduler-specific implementation changes.
- **Validation plan:** `pnpm --filter @dvt/contracts build` and `pnpm --filter @dvt/engine test`
- **Test coverage plan:**
  - Happy path: repeated `createIntent()` with the same `intentId` returns the existing record.
  - Negative path: different `intentId` with the same active `(tenantId, runId)` throws `IntentActiveConflictError`.
  - Edge case: the same `(tenantId, runId)` is allowed again after `RESOLVED` or `EXPIRED`.
- **Libraries evaluated:** None evaluated - no third-party library was needed.

---

Update this document as new gaps are formalized or closed.
