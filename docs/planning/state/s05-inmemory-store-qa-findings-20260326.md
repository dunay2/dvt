---
title: S05 InMemory Store QA Findings
status: In Progress
owner: Engine
last_reviewed: 2026-03-26
planning_type: state
---

# S05 InMemory Store QA Findings (2026-03-26)

## Scope

- `packages/@dvt/engine/src/state/InMemoryTxStore.ts`
- `packages/@dvt/engine/src/state/InMemoryRunStateStore.ts`
- related contract-validation paths for run-event writes
- `packages/@dvt/adapter-postgres/src/PostgresRunEventStore.ts`

## Findings

| ID  | Severity | Status    | Finding                                                                                                                                                           | Evidence                                                                                                                                                                                            |
| --- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | High     | Completed | `bootstrapRunTx` can leave partial state if `firstEvents` validation fails after metadata/snapshot write.                                                         | Fixed by pre-validating all `firstEvents` before any state mutation in both in-memory stores, plus contract test coverage for no partial writes on failure.                                         |
| F2  | High     | Completed | Invariant mismatch: `InMemoryRunStateStore.appendAndEnqueueTx` does not enforce run existence precondition.                                                       | Fixed: `InMemoryRunStateStore` now asserts run existence and fails with `RunNotFoundError` consistently before append.                                                                              |
| F3  | Medium   | Open      | Static contract is wider than runtime contract (`payloadVersion: number` vs schema literal `1`).                                                                  | Write-side parser accepts only literal `1`; TS allows broader values.                                                                                                                               |
| F4  | Medium   | Open      | In-memory write boundaries can leak raw validation errors instead of stable domain error shape.                                                                   | `parseRunEventWrite` exceptions bubble directly from store layer.                                                                                                                                   |
| F5  | Low      | Completed | Missing explicit negative test for Postgres write-boundary reject path.                                                                                           | Added integration coverage for `runId` mismatch rejection in adapter-postgres smoke suite.                                                                                                          |
| F6  | High     | Completed | `InMemoryTxStore.saveProviderRef` did not enforce tenant boundary.                                                                                                | Method now validates `current.tenantId === tenantId` before update, aligned with other stores.                                                                                                      |
| F7  | High     | Completed | Postgres event append accepted payloads with `event.runId` different from target `runId`.                                                                         | Added explicit runId boundary guard in `PostgresRunEventStore.insertAndDedupEvents`.                                                                                                                |
| F8  | Medium   | Completed | Postgres consumed `runSeq` slots for deduped events inside the same batch (sequence gaps).                                                                        | `nextRunSeq` now increments only on actual append (`inserted === true`).                                                                                                                            |
| F9  | Medium   | Completed | In-memory append path could leave partial state if projector/outbox step failed after commit.                                                                     | In-memory stores now stage snapshot projection before commit; TxStore commits outbox before persisting state and bootstrap performs rollback on failure.                                            |
| F10 | High     | Completed | In-memory write-policy still throws generic `Error` with string codes (`INVALID_EVENT`, `RUN_SEQUENCE_OVERFLOW`) instead of project-standard typed domain errors. | Replaced with typed domain errors (`InvalidRunEventInputError`, `RunSequenceOverflowError`, `InvalidRunIdError`) wired to engine error code/messageKey contract and covered in i18n contract tests. |
| F11 | Medium   | Open      | Retry-lineage checkpoint/rollback logic is duplicated between `InMemoryTxStore` and `InMemoryRunStateStore`.                                                      | Same `captureRetryLineageCheckpoint` and `restoreRetryLineageCheckpoint` pattern appears in both stores.                                                                                            |
| F12 | Medium   | Open      | Regression-critical Postgres checks are only in integration smoke tests that are skipped unless `DVT_PG_INTEGRATION=1`.                                           | New runId-mismatch and dedupe-seq assertions live in `adapter-postgres/test/smoke.test.ts`, not in always-on tests.                                                                                 |
| F13 | High     | Open      | `PostgresRunEventStore` still emits string-coded generic `Error` for runId mismatch instead of typed/stable domain error shape.                                   | `PostgresRunEventStore.assertEnvelopeRunIdMatchesBatchRunId` throws `new Error(\"INVALID_EVENT: ...\")`.                                                                                            |
| F14 | Medium   | Open      | `PostgresRunEventStore` violates SRP by mixing validation policy, sequencing/dedupe rules, SQL IO, and lock orchestration in one class.                           | Single class owns append policy and low-level query composition/execution.                                                                                                                          |
| F15 | Medium   | Open      | SQL statements are embedded inline in behavior methods, increasing coupling and reducing focused testability.                                                     | Large SQL blocks in `listEvents` and `tryInsertEvent` within service class logic.                                                                                                                   |
| F16 | Low      | Open      | Unsafe cast (`as EventEnvelope`) hides type guarantees in envelope enrichment path.                                                                               | `enrichEnvelopeWithSeq` returns casted object instead of fully typed construction/factory.                                                                                                          |

## Execution Order

1. F1 atomic bootstrap guarantee
2. F2 run-existence invariant alignment
3. F3 static/runtime contract narrowing
4. F4 error surface stabilization
5. F5 adapter negative-path test
6. F6 tenant boundary consistency for saveProviderRef
7. F7 Postgres runId boundary enforcement
8. F8 Postgres runSeq continuity under dedupe
9. F9 stronger in-memory transactional staging
10. F10 typed domain errors instead of generic string-coded Error in in-memory write policy
11. F11 remove duplicated retry-lineage transaction mechanics between stores
12. F12 move/duplicate critical Postgres regression checks into always-on test surface
13. F13 replace generic string-coded Error in Postgres run-event boundary with typed/stable error
14. F14 split PostgresRunEventStore responsibilities (policy vs repository)
15. F15 extract SQL composition/query execution from service behavior methods
16. F16 remove cast-based envelope construction in Postgres append path

## Validation Evidence For F1

- `pnpm --filter @dvt/engine test` (passed; rerun with escalated execution after sandbox `spawn EPERM`)
- `pnpm --filter @dvt/engine build` (passed; rerun with escalated execution after sandbox `spawn EPERM`)
- `pnpm --filter @dvt/adapter-postgres test` (passed; smoke integration suite skipped when `DVT_PG_INTEGRATION` is not set)
- `pnpm verify:prepush` (passed on 2026-03-26 after fixing `PostgresStartRunIntentStore` type-guarding and rerunning outside sandbox for `check-changed`)

## Refactor Evidence (Fowler Style)

- Shared write-policy module extracted to eliminate duplication and drift:
  - `packages/@dvt/engine/src/state/runEventWritePolicy.ts`
- Both in-memory stores now depend on that single policy for:
  - event input guards
  - bootstrap runId consistency checks
  - default snapshot creation
  - run-sequence overflow guard
- Regression test added for invariant `run must exist before append`:
  - `packages/@dvt/engine/test/state/InMemoryRunStateStore.appendInvariants.test.ts`
