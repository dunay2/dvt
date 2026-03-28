---
title: 20260328 Lineage Outbox Fowler QA Hard Review
status: Draft
owner: adapters
last_reviewed: 2026-03-28
planning_type: review
---

# 20260328 Lineage Outbox Fowler QA Hard Review

## Scope

- `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts`
- `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStoreSql.ts`
- `packages/@dvt/adapter-postgres/migrations/005_lineage_outbox.sql`
- `packages/@dvt/adapter-postgres/migrations/010_lineage_outbox_retry_claim_schedule.sql`
- `packages/@dvt/adapter-postgres/test/PostgresLineageOutboxStore.test.ts`

## Findings (ordered by criticality)

1. **[High] Tenant isolation risk in lineage storage**
   - `lineage_outbox` and `lineage_dead_letter` do not include `tenant_id`, and runtime operations are keyed by global `id`.
   - References:
     - `packages/@dvt/adapter-postgres/migrations/005_lineage_outbox.sql:1`
     - `packages/@dvt/adapter-postgres/migrations/005_lineage_outbox.sql:19`
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:116`
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:123`

1. **[High] Claim fencing is incomplete**
   - `listPending` stamps `claimed_at`, but `markDelivered`, `markFailed`, and `deadLetter` do not verify claim ownership, enabling stale-worker write races.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStoreSql.ts:36`
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:116`
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:123`
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:150`

1. **[High] Unbounded/invalid limit path in dead-letter reads**
   - `listDeadLetter` does not normalize/cap `limit`; negative or excessive values are not guarded before SQL execution.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:173`
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStoreSql.ts:97`

1. **[High] Missing index for dominant dead-letter ordering**
   - Query orders by `dead_lettered_at DESC`, but migration creates only `run_id` index, creating scale risk.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStoreSql.ts:96`
     - `packages/@dvt/adapter-postgres/migrations/005_lineage_outbox.sql:29`

1. **[High] Raw error strings persisted without sanitization**
   - Worker sends raw `Error.message` directly to persistence (`last_error`), risking sensitive leakage and inconsistent observability payloads.
   - References:
     - `packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts:151`
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:128`
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:167`

1. **[Medium] Row typing mismatch in `deadLetter` delete-return path**
   - Query returns a narrow set of columns but is typed as full `LineageOutboxRow`, masking schema drift and mapper mistakes.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:153`
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStoreSql.ts:80`

1. **[Medium] Input validation asymmetry**
   - `normalizeLineageOutboxClaimTimeoutMs` is strict, but `listPending(limit)` only clamps to `>=0`; non-finite and non-integer values are not rejected.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:71`
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:103`

1. **[Medium] `status` column is mostly inert in behavior**
   - Read path filters by `status='pending'`, but lifecycle is effectively encoded in `claimed_at`/`next_attempt_at` and delete semantics; domain model is inconsistent.
   - References:
     - `packages/@dvt/adapter-postgres/migrations/005_lineage_outbox.sql:8`
     - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStoreSql.ts:25`

1. **[Medium] Tests overfit SQL string assertions and mocks**
   - Tests mainly validate SQL fragments through `RecordingClient` instead of concurrency/transaction semantics on real Postgres behavior.
   - References:
     - `packages/@dvt/adapter-postgres/test/PostgresLineageOutboxStore.test.ts:15`
     - `packages/@dvt/adapter-postgres/test/PostgresLineageOutboxStore.test.ts:33`

1. **[Medium] Negative coverage gaps remain in dead-letter path**
   - No tests assert `listDeadLetter` ordering/limit behaviors, and no positive-path `deadLetter` insertion assertion is present.
   - References:
     - `packages/@dvt/adapter-postgres/test/PostgresLineageOutboxStore.test.ts:61`
     - `packages/@dvt/adapter-postgres/test/PostgresLineageOutboxStore.test.ts:257`

## Additional findings (post-review gap analysis — 2026-03-28)

These four risks were identified by cross-referencing the review findings against the full changeset,
including `LineageWorkerRuntime.ts`, `ILineageSink.v1.ts`, and migration 010.

11. **[Medium] Index NULLS ordering mismatch in migration 010**
    - `010_lineage_outbox_retry_claim_schedule.sql` creates the pending index as
      `(next_attempt_at, created_at, claimed_at)` with default `ASC NULLS LAST`.
      The claim query uses `ORDER BY o.next_attempt_at ASC NULLS FIRST`, which the index cannot
      satisfy without an external sort on large tables.
    - References:
      - `packages/@dvt/adapter-postgres/migrations/010_lineage_outbox_retry_claim_schedule.sql:9`
      - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStoreSql.ts:31`

12. **[Medium] `lagCount` is batch-capped, not true queue depth**
    - `LineageWorkerRuntime._lagCount` is assigned from `store.listPending(this.batchSize)`.
      When the queue exceeds `batchSize` (default 50) the metric is always 50, masking the real
      backlog. The risk register entry `R-20260328-LINEAGE-RETRY-SCHEDULING-01` cites lag
      visibility as a mitigation but does not acknowledge this measurement distortion.
    - References:
      - `packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts:113`
      - `packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts:58`

13. **[Low] `listDeadLetter` is optional in the contract but unconditional in the implementation**
    - `ILineageOutboxStore.listDeadLetter?` is declared optional (the `?` suffix).
      `PostgresLineageOutboxStore` implements it without guarding. Any callsite typed to
      `ILineageOutboxStore` must null-check before invoking it; no contract-level
      documentation or runtime guard enforces this.
    - References:
      - `packages/@dvt/contracts/src/contracts/lineage/ILineageSink.v1.ts:33`
      - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:173`

14. **[Low] `deadLetter()` force path has no caller in `LineageWorkerRuntime`**
    - `PostgresLineageOutboxStore.deadLetter()` is implemented and unit-tested structurally,
      but `LineageWorkerRuntime` never calls `this.store.deadLetter(...)`. All DLQ promotion
      flows through `markFailed`. The method is dead code in the current integration path,
      with no operational exerciser.
    - References:
      - `packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts` (no call site)
      - `packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts:150`

---

## Solution plan for Berta

### Rationale and slice structure

The 14 findings split into two dependency layers.

**Layer 1 — Schema and contracts (must land first).**
Tenant isolation (finding 1) requires new columns in both tables; those columns must exist before
any behavioral fix can filter or key by `tenant_id`. Index corrections (findings 4 and 11) are
also schema-only and carry no behavioral risk on their own.

**Layer 2 — Behavioral corrections (unblocked in parallel once Layer 1 is deployed).**
Claim fencing (finding 2), input validation (findings 3 and 7), error sanitization (finding 5),
type safety (finding 6), and domain-model cleanup (findings 8 and 14) are all code changes whose
scope does not depend on one another. They can be parallelized across two assignees or two
sequential PRs with no ordering constraint between them.

**Layer 3 — Observability and contract alignment.**
`lagCount` (finding 12) and `listDeadLetter` optionality (finding 13) touch the worker runtime
and the contract boundary. They should land after the behavioral corrections are stable to avoid
merge conflicts.

**Layer 4 — Test hardening (must be last).**
Integration tests and dead-letter coverage (findings 9 and 10) must validate the corrected
behavior. They cannot be written until the Layer 2 fixes exist, or the tests will assert against
broken semantics.

---

### Slices

#### Slice S-1 — Schema foundation

**Findings addressed:** 1, 4, 11

| Item                                 | Action                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `tenant_id` on `lineage_outbox`      | Add `tenant_id TEXT NOT NULL` column; backfill strategy TBD per ADR-0031 |
| `tenant_id` on `lineage_dead_letter` | Same                                                                     |
| Index on `dead_lettered_at`          | `CREATE INDEX … ON lineage_dead_letter (dead_lettered_at DESC)`          |
| Pending index NULLS order            | Recreate with `(next_attempt_at ASC NULLS FIRST, created_at ASC)`        |

**Rationale:** Schema changes are the one hard dependency. Nothing in Layer 2 can be meaningfully
tested without `tenant_id` present. Fixing the index ordering now avoids a second migration later.

---

#### Slice S-2 — Claim fencing and input validation

**Findings addressed:** 2, 3, 7
**Depends on:** S-1 (for tenant-aware WHERE clauses)

| Item                         | Action                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `markDelivered` fencing      | Add `AND claimed_at IS NOT NULL` or worker-id guard to DELETE                      |
| `markFailed` fencing         | Add `AND claimed_at IS NOT NULL` to UPDATE                                         |
| `deadLetter` fencing         | Add `AND claimed_at IS NOT NULL` to DELETE RETURNING                               |
| `listDeadLetter` limit guard | Reject non-finite / non-positive integer; cap at a system maximum                  |
| `listPending` limit guard    | Align with `normalizeLineageOutboxClaimTimeoutMs` pattern: reject NaN and Infinity |

**Rationale:** Fencing is a correctness invariant under the ADR-0033 sharding model.
Input validation belongs in the same slice to minimize migration count and keep the test surface
coherent.

---

#### Slice S-3 — Error surface and type safety

**Findings addressed:** 5, 6, 13
**Depends on:** S-1 (none strictly; can run in parallel with S-2)

| Item                         | Action                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error sanitization           | Introduce `sanitizeErrorForPersistence(err)` helper in `LineageWorkerRuntime`; strip stack frames and PII-adjacent tokens before passing to `markFailed` / `deadLetter` |
| `deadLetter` type            | Replace `query<LineageOutboxRow>` with a narrow `DeadLetterDeleteRow` interface matching the RETURNING columns                                                          |
| `listDeadLetter` optionality | Either promote the method to required in `ILineageOutboxStore` or add a null-guard wrapper in all callers and document the optional contract                            |

**Rationale:** These are contained, low-blast-radius changes. Doing them before the test slice
ensures tests cover the sanitized error surface, not the raw one.

---

#### Slice S-4 — Domain model and observability

**Findings addressed:** 8, 12, 14
**Depends on:** S-2, S-3 (behavioral baseline must be stable)

| Item                  | Action                                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status` column       | Either remove the column and simplify queries to `claimed_at`/delete semantics, or make it a true state machine (`pending → claimed → deleted`); document the choice |
| `lagCount` accuracy   | Replace `pending.length` with a separate `COUNT(*)` query (no LIMIT) on eligible rows; expose it as `pendingCount` alongside the tick metric                         |
| `deadLetter()` caller | Either wire `deadLetter()` into `LineageWorkerRuntime` as an explicit operator-triggered force path, or remove the method from the contract and the store            |

**Rationale:** `status` and `lagCount` are domain model questions; resolving the behavioral layer
first means this slice cannot introduce regressions in claim semantics.

---

#### Slice S-5 — Integration test coverage

**Findings addressed:** 9, 10
**Depends on:** S-1, S-2, S-3, S-4

| Item                            | Action                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Replace `RecordingClient` tests | Add real Postgres integration tests for claim fencing race, retry backoff schedule, and dead-letter promotion |
| `listDeadLetter` coverage       | Positive-path insertion assertion; ordering/limit boundary tests                                              |
| `deadLetter` positive path      | Assert DLQ row is created and outbox row is removed atomically                                                |

**Rationale:** Tests written against the corrected implementation are the only meaningful signal.
Writing them before the fixes would require asserting broken behavior.

---

### Dependency and parallelization diagram

```mermaid
flowchart TD
    S1["S-1\nSchema foundation\n(findings 1, 4, 11)"]
    S2["S-2\nClaim fencing + validation\n(findings 2, 3, 7)"]
    S3["S-3\nError surface + type safety\n(findings 5, 6, 13)"]
    S4["S-4\nDomain model + observability\n(findings 8, 12, 14)"]
    S5["S-5\nIntegration test coverage\n(findings 9, 10)"]

    S1 --> S2
    S1 --> S3
    S2 --> S4
    S3 --> S4
    S4 --> S5

    style S1 fill:#d32f2f,color:#fff
    style S2 fill:#f57c00,color:#fff
    style S3 fill:#f57c00,color:#fff
    style S4 fill:#fbc02d,color:#000
    style S5 fill:#388e3c,color:#fff
```

S-2 and S-3 are fully parallel after S-1 merges.
S-4 waits for both S-2 and S-3 to avoid domain conflicts.
S-5 is the final gate and should not open until S-4 is merged.

---

## Commit review — 0ac73b7

**`fix(adapters): Harden lineage outbox tenant scope and claim fencing`**
18 files, +1381/−112 lines — reviewed 2026-03-28.

### Coverage of the 14 findings

| #   | Finding                                          | Status                                                                                                                                                               |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tenant isolation — no `tenant_id`                | Closed — migration 011 + SchemaManager `core_014` add column, backfill from `payload->>'tenantId'` + `run_metadata`, fallback `'__unknown_tenant__'`                 |
| 2   | Claim fencing incomplete                         | Closed — `deleteLineageOutboxByIdsSql` and `updateLineageOutboxFailureSql` add `AND status = 'claimed' AND claimed_at IS NOT NULL AND claimed_at >= (now - timeout)` |
| 3   | `listDeadLetter` unbounded limit                 | Closed — `normalizeLineageQueryLimit` rejects NaN, float, negative; cap `MAX_LINEAGE_QUERY_LIMIT = 1000`                                                             |
| 4   | Missing index on `dead_lettered_at`              | Closed — `lineage_dead_letter_tenant_dead_lettered_idx` on `(tenant_id, dead_lettered_at DESC)`                                                                      |
| 5   | Raw `err.message` persisted                      | Closed — `sanitizeErrorForPersistence`: redacts tokens/passwords, collapses whitespace, truncates to 512 chars                                                       |
| 6   | Type mismatch in `deadLetter`                    | Closed — `deadLetter()` removed from contract; `markFailed` uses precise `LineageMarkFailedRow`                                                                      |
| 7   | Asymmetric `listPending` limit validation        | Closed — `listPending` now uses same `normalizeLineageQueryLimit`                                                                                                    |
| 8   | `status` column inert                            | Closed — `status` now transitions: `'pending'` → `'claimed'` (on listPending) → `'dead_lettered'` (on markFailed max attempts) → DELETE                              |
| 9   | Tests overfit SQL mocks                          | Partial — tests expanded and improved; still `RecordingClient`-only; no real Postgres integration tests                                                              |
| 10  | Dead-letter coverage gaps                        | Closed — tests for `listDeadLetter` (tenant required, filter, invalid limits) and markFailed DLQ path                                                                |
| 11  | NULLS ordering mismatch in index 010             | Closed — index recreated with explicit `ASC NULLS FIRST` in 011 and SchemaManager                                                                                    |
| 12  | `lagCount` batch-capped                          | Closed — `countPending()` runs `COUNT(*)` with no LIMIT; runtime uses `countPending?.()` with fallback                                                               |
| 13  | `listDeadLetter?` optional vs unconditional impl | Closed — `listDeadLetter` now required in contract (no `?`), signature `(limit, tenantId)`                                                                           |
| 14  | `deadLetter()` force path with no caller         | Closed — method removed from contract and store                                                                                                                      |

**Score: 13/14 closed, 1 partial (finding 9 — real Postgres integration tests)**

### New risks introduced by this commit

**[Medium] `markDelivered` silent no-op at claim timeout boundary**

`deleteLineageOutboxByIdsSql` (line 68–73) adds:

```sql
AND claimed_at >= ($2::timestamptz - ($3::bigint * INTERVAL '1 millisecond'))
```

If processing a record takes longer than `claimTimeoutMs`, the DELETE is a silent no-op — the
method returns `void` with no feedback. The next worker reclaims and retries the same record,
risking duplicate publication to the sink.

**[Medium] Orphaned row if DELETE fails after `status = 'dead_lettered'` is written**

In `updateLineageOutboxFailureSql`, when `attempts + 1 >= MAX`, the UPDATE sets
`status = 'dead_lettered'`; the TypeScript then issues a second DELETE in the same transaction.
If that DELETE rolls back (crash, network), the row sits with `status = 'dead_lettered'` and
`claimed_at = NULL`. `listPending` filters `status = 'pending'`, so the row is permanently
orphaned — never reprocessed, never reaching the DLQ.

**[Medium] In-flight rows break `markDelivered` at upgrade time**

Rows with `claimed_at IS NOT NULL` and `status = 'pending'` (claimed under the old code, which
did not set `status = 'claimed'`) will fail the `AND status = 'claimed'` guard in
`deleteLineageOutboxByIdsSql`. Delivery silently fails; the row is reclaimed after timeout and
retried. Short window but real in rolling deployments.

**[Low] `run_metadata` assumed in migration 011 backfill**

`011_lineage_tenant_scope_hardening.sql` line 7–17 joins on `__SCHEMA__.run_metadata`. If that
table does not exist or lacks `tenant_id` in the target schema, the migration fails with no
automatic rollback path.

**[Low] Breaking contract changes on `ILineageSink.v1.ts` without version bump**

`markFailed` signature changed (new return type), `deadLetter` removed, `listDeadLetter` made
required with a new `tenantId` parameter. These are breaking changes on a `v1` file. Under
ADR-0005 and ADR-0006, breaking contract changes require a version bump or explicit ADR backing;
this commit provides neither.

### Open items for Berta after this commit

1. S-5 — integration tests against real Postgres (finding 9 still partial)
2. Harden `markDelivered` timeout boundary — add return count or raise on no-op
3. Ensure dead-letter atomicity — move `status = 'dead_lettered'` inside the same delete
   transaction or use a single atomic SQL statement
4. Migration upgrade path for in-flight `status = 'pending'` rows with `claimed_at` set
5. ADR decision or version bump for `ILineageSink.v1.ts` breaking changes

---

---

## Second Fowler QA review — adapter layer (2026-03-28)

### Scope

- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
- `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts`
- `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSessionSql.ts`
- `packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts`
- `packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuery.ts`
- `packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuerySql.ts`
- `packages/@dvt/adapter-postgres/src/PostgresBackpressureSnapshotReader.ts`

### Findings (ordered by criticality)

1. **[High] `bootstrapRunTx` wraps all `23505` unique violations as `RUN_ALREADY_EXISTS`**
   - `isUniqueViolation` checks for Postgres error code `23505` globally. Any unique constraint
     violation raised inside the transaction — including a duplicate `(run_id, idempotency_key)`
     from `run_events`, or a conflicting insert into `outbox` — is silently re-typed as
     `RUN_ALREADY_EXISTS`. Callers get an incorrect diagnosis; the real cause is masked.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts:98`
     - `packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts:138`

2. **[Medium] `resolveAndSetTenantContext` forwards unvalidated tenant to RLS setter**
   - `resolveTenantWithClient` returns the raw `tenant_id` from `run_metadata`. The result is
     passed directly to `setTenantContext` without asserting it is a non-empty string. A metadata
     corruption or schema inconsistency that yields an empty or null tenant would call
     `PostgresSchemaManager.setTenantContext(client, '')`, potentially disabling row-level security
     for the transaction.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts:113`
     - `packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts:72`

3. **[Medium] `lineageOutboxStore` is a public field — bypasses `ready()` guard and adapter delegation**
   - `lineageOutboxStore` is declared `readonly` public on `PostgresStateStoreAdapter` (line 99),
     while all other sub-components (`outboxStore`, `runStateCoordinator`, `snapshotStalenessQuery`)
     are private. Callers accessing `adapter.lineageOutboxStore.enqueue(...)` directly skip the
     `this.ready()` check and the adapter's boundary contract. No delegation methods for the
     lineage store exist on the adapter itself.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:99`
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:357`

4. **[Medium] Correlated subquery in `listStaleSnapshotRunsSql` — N+1 scan risk**
   - The staleness query uses a correlated subquery `SELECT MAX(e.run_seq) FROM run_events WHERE
e.run_id = m.run_id` in the WHERE clause, evaluated once per row from `run_metadata`.
     On large tables without a covering index on `run_events(run_id, run_seq DESC)`, this forces a
     sequential scan of `run_events` for every metadata row. PostgreSQL may inline it as a hash
     join under favorable statistics, but there is no guarantee. Production scale risk.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuerySql.ts:16`

5. **[Medium] `listStaleSnapshotRuns` passes `batchSize` to LIMIT without input validation**
   - `batchSize` is forwarded directly as `$1` to `LIMIT $1` with no guard against NaN, negative
     values, or non-integer inputs. This is the same class of defect as findings 3 and 7 in the
     outbox review; the pattern is inconsistent across the adapter layer.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuery.ts:22`
     - `packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuerySql.ts:11`

6. **[Low] `abortPendingOperations` is declared `async` but executes synchronously**
   - The method contains no `await` and performs only synchronous work (setting a flag, iterating
     a Set, calling `releaseClient`). The `async` modifier wraps the return in a resolved Promise,
     misleading callers into believing they are waiting for an asynchronous cleanup operation.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts:38`

7. **[Low] `enqueueTx` name and contract ambiguity**
   - `PostgresRunStateCoordinator.enqueueTx` resolves tenant, sets RLS context, and enqueues
     pre-built `EventEnvelope[]` objects — but does not append to the event log or update the
     snapshot. It is a re-enqueue recovery path, but its name suggests parity with
     `appendAndEnqueueTx`. No docstring or ADR reference distinguishes the two. Callers could
     use it as a primary enqueue path and silently skip the append.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts:106`
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:309`

8. **[Low] `PostgresBackpressureSnapshotReader` has inline SQL, inconsistent with `*Sql.ts` convention**
   - Every other component introduced in this PR (`PostgresAdapterClientSession`,
     `PostgresSnapshotStalenessQuery`, `PostgresLineageOutboxStore`) centralizes SQL in a
     companion `*Sql.ts` file. `PostgresBackpressureSnapshotReader` holds a 40-line inline query
     inside the class method, breaking the pattern and making the SQL untestable in isolation.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresBackpressureSnapshotReader.ts:77`

---

## Review — `PostgresRunStateCoordinator.test.ts` (untracked, 2026-03-28)

### Context

The test file arrived after the production code already incorporated fixes for findings 1 and 2
from the second Fowler QA review. The working-tree version of `PostgresRunStateCoordinator.ts`
already contains:

- `isRunMetadataUniqueViolation` — scopes the 23505 guard to `table === 'run_metadata'` or
  `constraint.startsWith('run_metadata_')`.
- `requireTenantId(...)` — called in `resolveAndSetTenantContext` and directly in
  `bootstrapRunTx` (line 89); throws `TENANT_SCOPE_REQUIRED` for empty or whitespace tenant.
- A clarifying docstring on `enqueueTx` distinguishing it from the primary append path.

**All three tests pass against the updated production code.**

### Coverage gaps

1. **`bootstrapRunTx` with empty tenant is not tested.**
   `bootstrapRunTx` calls `requireTenantId(input.metadata.tenantId)` (line 89) — a separate
   code path from the one exercised by test 3 (`appendAndEnqueueTx` via
   `resolveAndSetTenantContext`). A test injecting `tenantId: ''` into `makeBootstrapInput()`
   would close this.

2. **`enqueueTx` has no tests** — no happy path, no empty-tenant assertion, no outbox call
   verification.

3. **No happy-path test for any method.**
   No test verifies that `insertWithClient`, `append`, `updateWithClient`, and `enqueueWithClient`
   are all called in the correct order within the same transaction. A sequence-capture mock
   (recording call order) would close this.

4. **Tests 1 and 2 throw from the `withTransaction` wrapper, not from inside `fn`.**
   In production, the `23505` violation comes from `insertWithClient` within the transaction
   body. The current mocks bypass `fn` entirely and throw from the wrapper. The error-
   classification logic is exercised correctly, but the internal propagation path from the
   failing operation to the catch block is not.

5. **Test 2 uses `.toBe(error)` (object identity), not `.toMatchObject`.**
   If the coordinator ever copies or re-wraps the error before re-throwing (without converting to
   `RUN_ALREADY_EXISTS`), the identity check fails even though behavior is correct.
   `.toMatchObject({ code: '23505', table: 'run_events' })` would be more resilient.

---

## Fourth Fowler QA review — in-progress refactor (2026-03-28)

### Scope

Working-tree changes not yet committed. Files reviewed:

- `PostgresStateStoreAdapter.ts` (M)
- `PostgresStateStoreRuntime.ts` (M)
- `PostgresAdapterClientSession.ts` (M)
- `PostgresSnapshotStalenessQuerySql.ts` (M)
- `PostgresSnapshotStalenessQuery.ts` (M)
- `PostgresBackpressureSnapshotReader.ts` (M)
- `PostgresAdapterConstants.ts` (??)
- `PostgresAdapterClientSessionConstants.ts` (??)
- `PostgresAdapterConnectionString.ts` (??)
- `PostgresStateStoreRuntimeConfig.ts` (??)
- `PostgresStateStoreRuntimeComposer.ts` (??)

### What this change does

Construction of `PostgresStateStoreRuntime` is extracted into a pure function
`composePostgresStateStoreRuntime`. Schema management methods (`migrate`,
`planSchemaRollback`, `rollbackSchemaTo`) are moved from the base class to the
`PostgresStateStoreAdapter` subclass. A `maintenanceMode` gate is added to
`PostgresAdapterClientSession` to prevent new connections during `rollbackSchemaTo`.
The correlated subquery in `listStaleSnapshotRunsSql` is replaced with a CTE.
The localhost connection-string fallback is replaced with a fail-fast error.
Error message strings are centralised in constants files.

### Findings (ordered by criticality)

1. **[High] CTE full-table scan is not unambiguously better than the correlated subquery it replaces**
   - `listStaleSnapshotRunsSql` now materialises `MAX(run_seq) GROUP BY tenant_id, run_id` over
     the entire `run_events` table before joining to `run_metadata`. For a table with N events and
     a batch of M stale runs (M ≪ N), the correlated subquery used M index seeks; the CTE forces
     an O(N) aggregate scan followed by a hash join. PostgreSQL will not elide the aggregate even
     with a partial index unless the planner can push the LIMIT into the CTE, which it cannot do
     here. The fix for finding 4 from the second review trades one pathology for another on large
     deployments. A scoped CTE (`WHERE e.run_id IN (SELECT m.run_id FROM run_metadata m ORDER BY
m.created_at ASC LIMIT $1)`) would preserve the index-seek path while still eliminating the
     correlated evaluation.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuerySql.ts:11`

2. **[High] `cause`/`operationCause` rename in `createTransactionRollbackError` is a silent breaking change**
   - Before: `.cause` held the original operation error; `.rollbackCause` held the rollback
     failure. After: `.cause` holds the rollback failure (wrapped); `.operationCause` holds the
     original operation error. Any existing caller that reads `.cause` to recover the underlying
     business error now silently gets the rollback failure instead. No migration path, no
     deprecation comment.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts:130`

3. **[Medium] `rollbackSchemaTo` maintenance gate has a TOCTOU window for in-flight connections**
   - `withMaintenanceMode` sets the flag synchronously, then the callback checks
     `hasActiveClients()`. A caller that passed `throwIfClientAcquisitionBlocked()` and then
     awaited `pool.connect()` before the flag was set will be rejected inside `connect()` after
     the pool resolves — it is never added to `activeClients`. This means `hasActiveClients()` can
     return 0 while a connection is still in progress. The rollback proceeds and the in-flight
     caller gets a `SESSION_MAINTENANCE_MODE_ACTIVE` error once `pool.connect()` resolves. The DDL
     and the in-flight caller's session are effectively concurrent for the duration of
     `pool.connect()`. This window is milliseconds, but DDL in Postgres takes table locks.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts:98`
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:52`

4. **[Medium] `beginMaintenanceMode` and `endMaintenanceMode` are public, enabling permanent session lockout**
   - The safe API is `withMaintenanceMode(fn)`. Exposing `beginMaintenanceMode()` and
     `endMaintenanceMode()` as public methods allows a caller to enter maintenance mode and never
     exit — permanently blocking all new connections on the session. The test exercises
     `beginMaintenanceMode`/`endMaintenanceMode` directly, which means downstream tests depend on
     the unsafe API. Both methods should be `private` or removed; `withMaintenanceMode` is
     sufficient.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts:43`
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts:47`

5. **[Medium] `PostgresStateStoreRuntime` exposes 10 implementation details as `protected` fields**
   - `PostgresStateStoreAdapter` directly accesses only `schemaManager` and `clientSession`.
     The other eight fields (`outboxStore`, `metadataRepo`, `runEventRepository`,
     `snapshotStore`, `runStateCoordinator`, `snapshotStalenessQuery`, `lineageOutboxStore`,
     `ownsPool`) are `protected` without a current subclass consumer. `protected` is a
     permanant public API commitment to all future subclasses; it cannot be tightened without a
     breaking change. Fields not needed by the subclass should remain `private` on the base class,
     with the base class methods accessing them directly.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntime.ts:39`

6. **[Medium] Fail-fast on missing connection string is a silent breaking change with no migration path**
   - `resolvePostgresConnectionString` now throws `POSTGRES_CONNECTION_STRING_REQUIRED` at
     construction time if neither `config.connectionString`, `DVT_PG_URL`, nor `DATABASE_URL` is
     present. Any existing test, integration environment, or CI setup that relied on the implicit
     `postgresql://dvt:dvt@localhost:5432/dvt` fallback will throw immediately. This is the
     correct final behavior (finding 7 from the second review), but it is undocumented as a
     breaking change and no deprecation window is offered.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterConnectionString.ts:6`

7. **[Low] 16 inline `type =` alias declarations instead of grouped `import type` in the adapter**
   - `PostgresStateStoreAdapter.ts` replaces a single grouped `import type { … }` block with 16
     individual `type X = import('…').X` declarations. This pattern is valid TypeScript but
     unusual in this codebase, not idiomatic, and adds no functional benefit visible in the diff.
     If it exists to avoid a circular-import cycle, that cycle is an architectural signal worth
     documenting; if not, the pattern should be reverted to match the rest of the codebase.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:13`

8. **[Low] `PostgresStateStoreRuntime` docstring still claims it is a "Foundation adapter" rather than a base class**
   - After the refactor, `PostgresStateStoreRuntime` is no longer a standalone adapter — it is an
     abstract base class. Its docstring (`Foundation adapter for issue #6`) and the live comment
     (`DDL is no longer run at construction time`) from the previous design remain unchanged.
     Documentation that describes a removed design is actively misleading.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntime.ts:29`

### What this change closes from the second review

| Finding                                                 | Status                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 4 — Correlated subquery N+1                             | Partial — correlated query is gone, but CTE introduces a full-table scan risk (see finding 1 above) |
| 5 — `listStaleSnapshotRuns` no input validation         | Closed — `normalizeStaleSnapshotBatchSize` added                                                    |
| 6 — `abortPendingOperations` `async` signature mismatch | Open — method is still declared `async` with no awaitable work                                      |
| 7 — Hardcoded localhost fallback                        | Closed — `resolvePostgresConnectionString` throws on missing config                                 |
| 8 — `BackpressureSnapshotReader` inline SQL             | Closed — extracted to `PostgresBackpressureSnapshotReaderSql.ts`                                    |
| 3 — `lineageOutboxStore` public field                   | Not addressed — field remains `protected` on the runtime base class                                 |

## Assumption

- This review assumes ADR-0031 tenant-isolation expectations apply to lineage persistence surfaces unless explicitly exempted.

---

## Third Fowler QA review — strict adapter critique (2026-03-28)

### Scope

- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
- `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts`
- `packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts`
- `packages/@dvt/adapter-postgres/src/PostgresBackpressureSnapshotReader.ts`
- `packages/@dvt/adapter-postgres/src/PostgresBackpressureSnapshotReaderSql.ts`
- `packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuery.ts`

### Findings (ordered by criticality)

1. **[High] God object still present in adapter facade (SRP breach)**
   - `PostgresStateStoreAdapter` still owns wiring, lifecycle, schema migration, transaction delegation,
     snapshot access, outbox orchestration, and lineage access. This keeps too many reasons to change in one type.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:82`
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:101`
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:217`

2. **[Medium] Concrete lineage implementation leaks through facade boundary**
   - `getLineageOutboxStore()` returns `PostgresLineageOutboxStore` (concrete), not a stable port contract.
     This couples callers to adapter internals and weakens DIP/DDD boundaries.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:347`
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:99`

3. **[Medium] Tenant validation remains inconsistent across adapter surfaces**
   - `PostgresRunStateCoordinator` enforces `requireTenantId`, but
     `PostgresBackpressureSnapshotReader.getTenantSnapshot` does not validate tenant input.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresBackpressureSnapshotReader.ts:71`
     - `packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts:180`

4. **[Medium] Transaction rollback error shape is ambiguous**
   - On rollback failure, `PostgresTransactionError` stores operation failure in `cause`
     and rollback failure in a non-standard `rollbackCause`. Consumers reading only `cause`
     may miss the rollback failure signal.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts:113`
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts:116`

5. **[Medium] Missing dedicated tests for `PostgresAdapterClientSession`**
   - No focused test suite validates `withTransaction` commit/rollback/rollback-failure semantics
     or direct `close()`/`abortPendingOperations()` behavior at this component boundary.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts:46`

6. **[Low] Async signature mismatch in facade interruption API**
   - `PostgresStateStoreAdapter.abortPendingOperations()` is declared `async` but executes synchronously.
     Signature implies awaitable I/O work that is not present.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:217`

7. **[Low] Hardcoded localhost fallback can hide misconfiguration**
   - Both adapter and reader default to `postgresql://dvt:dvt@localhost:5432/dvt` when env/config is missing,
     which can mask deployment configuration errors.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:117`
     - `packages/@dvt/adapter-postgres/src/PostgresBackpressureSnapshotReader.ts:58`

### Validation evidence

- Command: `pnpm vitest packages/@dvt/adapter-postgres/test/PostgresRunStateCoordinator.test.ts`
- Result: passed (`7` tests, `1` file)

---

## Fifth Fowler QA review — deep mechanics (2026-03-28)

### Scope

Full working-tree read of all in-progress files, focused on areas not covered by reviews 1–4.
Files examined in depth: `PostgresAdapterClientSession.ts`, `PostgresStateStoreRuntimeComposer.ts`,
`PostgresStateStoreRuntime.ts`, `PostgresStateStoreAdapter.ts`, `PostgresSnapshotStalenessQuery.ts`,
`PostgresAdapterConnectionString.ts`, `PostgresAdapterClientSessionConstants.ts`.

### Corrections to review 4

**Finding 2 withdrawn.** The current code sets `.cause = operationError` (original op error)
— not a swap. Incorrect in review 4.

**Finding 3 closed.** `inFlightClientAcquisitions` is incremented synchronously before
`await pool.connect()` with no intervening `await`. In JS's single-threaded model the gap
between `throwIfClientAcquisitionBlocked()` and `+= 1` cannot be observed by another
coroutine. `hasActiveClients()` correctly includes in-flight counts. TOCTOU is closed.

### New findings

1. **[High] `.cause` and `.operationCause` are identical; ES2022 cause chain is semantically inverted**
   - `createTransactionRollbackError` sets both `.cause = operationError` and
     `.operationCause = operationError` to the same object, making one redundant.
     Under the ES2022 `Error.cause` convention, the `cause` of `TRANSACTION_ROLLBACK_FAILED`
     should be the error that caused the rollback to fail (the rollback error), not the original
     operation error. A consumer walking the `.cause` chain to find the root error will
     traverse into the original operation error immediately, skipping the rollback error
     entirely. Correct layout: `.cause = asError(rollbackError)`,
     `.operationCause = operationError`.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts:174`

2. **[High] `statementTimeoutMs` silently becomes `NaN` on non-numeric env var**
   - Composer line 45: `Number(process.env[C.statementTimeoutEnvVar] ?? C.defaultTimeoutMs)`.
     If `DVT_PG_STATEMENT_TIMEOUT_MS='abc'`, `Number('abc') = NaN`. The session guard
     `this.statementTimeoutMs > C.statementTimeoutDisabledMs` evaluates `NaN > 0 = false`,
     silently disabling the timeout. A misconfigured env var disables a production safety
     feature with no error, log, or observable signal.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntimeComposer.ts:44`
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts:73`

3. **[Medium] `constructor(config = {})` default is now a lying API**
   - `new PostgresStateStoreAdapter()` now throws `POSTGRES_CONNECTION_STRING_REQUIRED` at
     construction. The `= {}` default implies zero-argument construction is valid; it is not.
     The default argument should be removed or the type narrowed so that `pool` or
     `connectionString` is required at the type level. All existing tests and documentation
     that relied on the implicit localhost fallback now break silently at runtime, not at
     the type boundary.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntime.ts:62`

4. **[Medium] `close()` does not wait for in-flight acquisitions before `pool.end()`**
   - `abortPendingOperations()` is synchronous. It releases all `activeClients` but does not
     await connections still counted in `inFlightClientAcquisitions` (those inside
     `await pool.connect()`). `pool.end()` is called immediately after. In node-postgres,
     `pool.end()` terminates idle connections and waits for checked-out connections, but its
     behavior with a pending `pool.connect()` queued for a slot is unspecified. An in-flight
     acquisition could resolve after `pool.end()` returns, leaving an orphaned connection
     that gets the abort flag, releases itself with destroy=true, but against an already-ended
     pool.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts:34`

5. **[Medium] `composePostgresStateStoreRuntime` has no tests**
   - The composer is the single point responsible for the entire service wiring graph. No
     isolation test verifies that closures capture the correct `clientSession` instance, that
     `assumeSchemaReady` calls `schemaManager.markReady()`, or that `runStateCoordinator` is
     wired to the correct `outboxStore` and `metadataRepo`. A misclosure would only surface in
     integration tests if the relevant scenario is exercised. The function is pure and
     straightforwardly testable with a mock pool.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntimeComposer.ts:39`

6. **[Low] `PostgresStateStoreRuntimeServices` returns concrete types — permanent coupling**
   - The return type of the composer names every concrete implementation.
     The runtime base class stores these as `protected readonly` fields of concrete types.
     Any future need to inject test doubles at the runtime level requires either modifying
     the entire inheritance chain or reconstructing the services object. Port interfaces
     already defined elsewhere in the codebase would decouple the base class from
     concrete implementations without changing the wiring function.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntimeComposer.ts:26`
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntime.ts:40`

7. **[Low] `resolvePostgresConnectionString` returns untrimmed string after trim-based guard**
   - The guard is `resolved.trim().length === 0` but the function returns `resolved` (not
     `resolved.trim()`). A connection string with leading/trailing whitespace passes the
     guard and is forwarded verbatim to `new Pool({ connectionString })`. Node-postgres passes
     it to libpq, which fails with a cryptic parse error instead of the clear
     `POSTGRES_CONNECTION_STRING_REQUIRED` message.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresAdapterConnectionString.ts:10`
