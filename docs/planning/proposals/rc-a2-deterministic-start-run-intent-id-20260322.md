---
title: RC-A2 Deterministic StartRun Intent ID
status: Proposed
owner: Execution Runtime / Architecture
last_reviewed: 2026-03-22
planning_type: proposal
---

# RC-A2 Deterministic StartRun Intent ID

## Goal

Enforce `INV-INTENT-011` by deriving `intentId` deterministically from
`(tenantId, runId)` for start-run intent creation.

## Dependency

- None (`RC-A2` is unblocked and independent in the execution workboard).

## Scope

In scope:

- contract-compatible idempotency builder extension
- runtime wiring in `WorkflowEngine._createStartRunIntent`
- deterministic intent reconciliation test coverage

Out of scope:

- non-start-run event ID policy changes
- broad refactor of all random UUID call sites

## Work Breakdown

| Item    | Task                                                                                | Output                                    |
| ------- | ----------------------------------------------------------------------------------- | ----------------------------------------- |
| `A2-T1` | Add deterministic intent ID method in idempotency builder interface/implementation. | Stable `intentId(tenantId, runId)` API.   |
| `A2-T2` | Replace random `eventId()` use in start-run intent path.                            | `WorkflowEngine` uses deterministic key.  |
| `A2-T3` | Add reconciliation tests for crash/retry preserving same `intentId`.                | Crash-recovery invariant proof.           |
| `A2-T4` | Update planning traceability links.                                                 | Workboard and proposal index are aligned. |

## File Plan

| Action | Path                                                                                    | Reason                                                                |
| ------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Modify | `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`                               | Extend idempotency builder contract with deterministic intent method. |
| Modify | `packages/@dvt/engine/src/core/idempotency.ts`                                          | Implement deterministic derivation helper.                            |
| Modify | `packages/@dvt/engine/src/core/WorkflowEngine.ts`                                       | Use deterministic intent ID in `_createStartRunIntent`.               |
| Modify | `packages/@dvt/engine/test/services/RunMaintenanceService.intentReconciliation.test.ts` | Ensure restart path uses stable intent identity.                      |
| Create | `packages/@dvt/engine/test/core/WorkflowEngine.intent-id-deterministic.test.ts`         | Focused regression coverage for `INV-INTENT-011`.                     |
| Modify | `docs/planning/state/execution-workboard.md`                                            | Make this proposal the primary source for `RC-A2`.                    |

## Validation Criteria

1. Same `(tenantId, runId)` always yields the same `intentId`.
2. Start-run retry after crash does not create orphaned duplicate pending intents.
3. Existing event ID usage outside start-run intent path remains unaffected.

Validation commands:

- `pnpm --filter @dvt/engine test`
- `pnpm --filter @dvt/engine build`
- `pnpm verify:prepush`

## Exit Criteria

- `RC-A2` status can move from `Queued` to `Review` with deterministic ID tests.
- No governance or hook bypass.

## Compatibility Note

- `IIdempotencyKeyBuilder` now includes `startRunIntentId(tenantId, runId)`.
- This is a backward-compatible additive change for the active major line in-repo,
  but all custom implementations of the interface MUST add this method before
  consuming the updated engine package.
- Derivation inputs are consumed as-is (no trimming/case folding/Unicode
  normalization). Callers are responsible for supplying canonical `tenantId`
  and `runId` values.
