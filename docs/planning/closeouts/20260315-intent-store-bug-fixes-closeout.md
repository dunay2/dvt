---
slice: intent-store-bug-fixes
date: 2026-03-15
last_reviewed: 2026-03-15
gap: G3
author: AI (GPT-5)
---

# Closeout: Intent Store Bug Fixes

## Think-First Analysis

### Problem summary

The start-run intent state machine still had two correctness gaps in active code:
`markDispatched()` was not safely idempotent for a repeated dispatch with the
same `engineRunRef`, and orphan detection used the wrong time basis for
`DISPATCHED` intents.

### Root cause

The contract and implementations modeled intent status transitions, but they did
not distinguish an identical repeated dispatch from a conflicting second
dispatch. In parallel, `listOrphaned()` treated `createdAt` as the age source for
both `PENDING` and `DISPATCHED`, even though a dispatched intent should be judged
by its last state transition time.

### Constraints and invariants

- `ADR-0030`: pre-dispatch intent log crash consistency and orphan reconciliation
  semantics are normative.
- `ADR-0031`: adapter behavior must remain storage-safe and deterministic.
- `AGENTS.md`: no stubs, no hidden debt, and real validation only.
- Shared-kernel rules from `ADR-0018`: contract changes in `@dvt/contracts`
  must propagate cleanly to engine and adapter consumers.

### Options considered

- Add explicit conflict/idempotency semantics to the intent contract and update
  both in-memory and Postgres stores.
- Keep the contract unchanged and patch only `PostgresStartRunIntentStore`.
- Libraries evaluated: None. This is a repo-local domain contract and store
  behavior fix, not a gap suited to an external library.

### Selected option and rationale

Update the shared contract, error vocabulary, both store implementations, and the
focused tests together. That keeps the state machine coherent across in-memory
and Postgres behavior and aligns the ADR with the actual invariant.

### Rejected alternatives

- Adapter-only fix. Rejected because tests and in-memory behavior would still
  disagree with the canonical contract.
- Silent no-op without conflict error. Rejected because dispatching a different
  `engineRunRef` into an already `DISPATCHED` intent is a real correctness bug,
  not an idempotent retry.

## Changes made

| File                                                                      | Change                                                                                                      | Why                                                                                    |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `packages/@dvt/contracts/src/errors.ts`                                   | Added `IntentActiveConflictError` and `IntentDispatchConflictError`                                         | Canonicalize the new intent-store error vocabulary at the shared boundary              |
| `packages/@dvt/contracts/src/contracts/engine/IStartRunIntentStore.v1.ts` | Documented `INV-INTENT-011` and active-intent conflict semantics                                            | Make the contract explicit instead of leaving behavior implicit in implementations     |
| `packages/@dvt/engine/src/contracts/intentErrors.ts`                      | Re-exported the new intent errors                                                                           | Keep engine and adapters aligned on one canonical error set                            |
| `packages/@dvt/engine/src/state/InMemoryStartRunIntentStore.ts`           | Enforced active `(tenantId, runId)` uniqueness, dispatch idempotency, and correct orphan timing             | Match the ADR-backed lifecycle semantics in the unit-test store                        |
| `packages/@dvt/engine/test/state/InMemoryStartRunIntentStore.test.ts`     | Added negative-path tests for active conflict, dispatch conflict, and dispatched orphan timing              | Cover the corrected non-happy paths explicitly                                         |
| `packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts`       | Mapped active unique-index violations to `IntentActiveConflictError` and kept dispatch/orphan logic aligned | Prevent storage-level leakage and keep Postgres semantics consistent with the contract |
| `packages/@dvt/adapter-postgres/src/index.ts`                             | Exported the new intent conflict errors                                                                     | Keep the adapter package boundary complete                                             |
| `packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts` | Hardened the integration contract expectations                                                              | Verify conflict/idempotency semantics at the adapter boundary                          |
| `docs/adr/ADR-0030-pre-dispatch-intent-log.md`                            | Added `INV-INTENT-011`                                                                                      | Align ADR text with shipped contract semantics                                         |
| `docs/evidence/critical/ED-20260315-intent-store-bug-fixes.md`            | Added validation evidence for the slice                                                                     | Provide auditable proof of the behavior and checks run                                 |

## Libraries evaluated

None evaluated -- shared contract and store semantics only.

## Docs synced

- [x] `docs/planning/closeouts/20260315-intent-store-bug-fixes-closeout.md` -- think-first and final evidence for this slice
- [x] `docs/evidence/critical/ED-20260315-intent-store-bug-fixes.md` -- evidence aligned with shipped behavior
- [x] `docs/adr/ADR-0030-pre-dispatch-intent-log.md` -- invariant text updated to match the corrected contract

## Test evidence

| Command                                                                                        | Result                                                        |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `pnpm --filter @dvt/contracts build`                                                           | PASS                                                          |
| `pnpm --filter @dvt/engine exec vitest run test/state/InMemoryStartRunIntentStore.test.ts`     | PASS (`21/21`)                                                |
| `pnpm --filter @dvt/adapter-postgres typecheck`                                                | PASS                                                          |
| `pnpm --filter @dvt/adapter-postgres exec vitest run test/PostgresStartRunIntentStore.test.ts` | SKIPPED (`6` skipped; `DVT_PG_INTEGRATION` not enabled)       |
| `pnpm docs:sync`                                                                               | PASS                                                          |
| `pnpm docs:quality:check`                                                                      | PASS (warnings preexisting outside this slice)                |
| `pnpm docs:canonical:check`                                                                    | PASS                                                          |
| `pnpm exec prettier --check ...`                                                               | PASS                                                          |
| `pnpm verify:prepush`                                                                          | PASS                                                          |
| `pnpm exec eslint ...`                                                                         | FAILED (worktree toolchain missing transitive module `debug`) |
| `pnpm exec markdownlint-cli2 ...`                                                              | FAILED (worktree toolchain missing transitive module `fastq`) |

## Debt introduced

None.
