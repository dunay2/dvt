---
title: 20260330 Snapshot Staleness PR-671 Code Review
status: Draft
owner: Architecture
last_reviewed: 2026-03-30
planning_type: review
---

# 20260330 Snapshot Staleness PR-671 Code Review

## Scope

Code and CI flow review of PR #671 (`feat(api): Expose snapshot staleness in run status route`),
branch `lane-c/snapshot-staleness-api`. Review was conducted after all CI checks were brought
to green. No correctness bugs were found in the final merged state. Observations are improvement
candidates for follow-up work.

Files examined:

- `packages/@dvt/contracts/src/engine/IRunSnapshotStalenessQuery.v1.ts`
- `packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuery.ts`
- `packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuerySql.ts`
- `packages/@dvt/adapter-postgres/test/PostgresSnapshotStalenessQuery.test.ts`
- `packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts`
- `apps/api/src/application/ports/runtime.ts`
- `apps/api/src/application/services/getRunStatusUseCase.ts`
- `apps/api/src/infrastructure/telemetry/SafeRunSnapshotStalenessReader.ts`
- `apps/api/src/infrastructure/telemetry/ObservabilityRunStatusStalenessTelemetry.ts`
- `apps/api/src/modules/stateStoreRoles.ts`
- `apps/api/test/application/services/getRunStatusUseCase.test.ts`
- `apps/api/test/infrastructure/telemetry/SafeRunSnapshotStalenessReader.test.ts`

## Correctness

No correctness bugs were found in the code as it stands after the fix commits. The feature
introduces a tri-state staleness signal (`FRESH | STALE | UNKNOWN`) on `GET /runs/:runId`,
backed by a dedicated `IRunSnapshotStalenessQuery` contract, a
`SafeRunSnapshotStalenessReader` fail-soft wrapper, and an
`ObservabilityRunStatusStalenessTelemetry` side-channel for observability.

## Bug History

Five distinct defects were introduced in the original PR and resolved during triage:

| ID  | Description                                                                                               | Fix                                                            |
| --- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| B1  | `staleness` role missing from test mock in `modules.test.ts`                                              | Added `staleness: {} as never`                                 |
| B2  | `listStaleSnapshotRuns` referenced in type that no longer exposes it (`StateStoreRoleSource`)             | Removed stale reference from test                              |
| B3  | Merge conflict with PR #680 (22 files) obscured the `staleness` → `snapshotStaleness` rename              | Resolved with `--theirs` strategy + re-run of `pnpm docs:sync` |
| B4  | `is_stale` mock key in `PostgresSnapshotStalenessQuery.test.ts` — SQL alias is `is_snapshot_stale`        | Updated mock row key                                           |
| B5  | `AS is_stale` assertion in `PostgresStateStoreAdapter.sharding.test.ts` — SQL uses `AS is_snapshot_stale` | Updated assertion string                                       |

## Code Observations

### LATENCY-1 — Sequential staleness query after engine status fetch

`GetRunStatusUseCase.execute` runs the snapshot fetch and the staleness query back-to-back.
Both are independent Postgres reads with no data dependency between them.

Location: `apps/api/src/application/services/getRunStatusUseCase.ts:38-44`

Current flow:

```
engine.getRunStatus(runRef) → (await) → stalenessReader.isSnapshotStale(...) → (await) → return
```

Both could run concurrently:

```ts
const [snapshot, snapshotStaleness] = await Promise.all([
  query.enriched ? this.engine.enrichRunStatus(runRef) : this.engine.getRunStatus(runRef),
  this.resolveSnapshotStaleness(context.scope.tenantId.value, query.runId),
]);
```

Impact: reduces `GET /runs/:runId` latency by one Postgres round-trip on every call.
Risk: low — both reads are independent and stateless from each other's perspective.

---

### SQL-1 — Per-run staleness check bypasses `run_event_heads` cache

`listStaleSnapshotRunsSql` uses `run_event_heads` as a cheap sequence cache and falls back
to `run_events` only when the heads row is absent. `isSnapshotStaleSql` always hits
`run_events` directly via a LATERAL join ordered by `run_seq DESC LIMIT 1`.

Location: `packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuerySql.ts:54-73`

On a hot `run_events` table the per-run path always performs a full index scan by
`(run_id, tenant_id, run_seq DESC)`. The batch path only does this when the heads cache
misses. The divergence is not documented, which makes the intent unclear for future
maintainers.

Options:

- Add a comment explaining the LATERAL is intentional because the per-run path is always
  scoped by primary key and the heads cache would not save an index lookup at this selectivity.
- Or rewrite to use `run_event_heads` first (mirrors batch path, saves the index scan when
  heads are current).

---

### SAFE-WARN-1 — `SafeRunSnapshotStalenessReader` drops context from failure log

When the underlying query throws, the reader logs `run_status.snapshot_staleness_query_failed`
without attaching `tenantId` or `runId`.

Location: `apps/api/src/infrastructure/telemetry/SafeRunSnapshotStalenessReader.ts:17`

```ts
safeWarn(this.observability.logs, 'run_status.snapshot_staleness_query_failed', error);
```

The `ObservabilityRunStatusStalenessTelemetry.reportUnknown` call-site correctly attaches
both identifiers. The reader should do the same so that the failure log is self-contained
when the telemetry path is not wired.

---

### TEST-1 — `await Promise.resolve()` used to flush fire-and-forget side effects

Two tests in `getRunStatusUseCase.test.ts` use a single microtask yield to assert that
fire-and-forget telemetry was called.

Location: `apps/api/test/application/services/getRunStatusUseCase.test.ts:185, 294`

```ts
await Promise.resolve();
expect(telemetry.reportUnknown).toHaveBeenCalledWith('query_not_wired', ...);
```

A single `Promise.resolve()` flush works only if the internal promise chain is exactly one
hop deep. If an intermediate await is added inside `reportUnknown` (or its async scheduler),
this assertion will silently pass before the call occurs, causing a false-negative in future
refactors.

Reliable alternatives:

- `vi.useFakeTimers()` + `await vi.runAllMicrotasksAsync()` (Vitest 3.x)
- Expose a `flush()` seam in the use case for tests
- Make the telemetry spy synchronous and skip the flush entirely

---

### TYPE-1 — `RunSnapshotStalenessCandidate` is exported but unused

Location: `packages/@dvt/contracts/src/engine/IRunSnapshotStalenessQuery.v1.ts:28`

```ts
export type RunSnapshotStalenessCandidate = Pick<RunMetadata, 'runId' | 'tenantId' | 'createdAt'>;
```

Nothing in the feature (or the broader codebase as of this review) imports
`RunSnapshotStalenessCandidate`. It appears to have been scaffolded for a planned caller
that was deferred. It should either be used or removed to prevent false documentation of
the contract surface.

---

### CI-2 — SQL alias is a magic string duplicated across impl and test

The alias `is_snapshot_stale` is written as a string literal in the SQL template
(`PostgresSnapshotStalenessQuerySql.ts:71`) and repeated as a string literal in both test
files. B4 and B5 above were caused by this duplication — the original tests used `is_stale`,
which passed until the alias diverged in the implementation.

Exporting the alias as a named constant would allow tests to import it:

```ts
// PostgresSnapshotStalenessQuerySql.ts
export const IS_SNAPSHOT_STALE_ALIAS = 'is_snapshot_stale' as const;
```

This eliminates future drift between SQL definition and test assertion.

## CI Flow Observations

### CI-F1 — Merge conflict masked type errors until late in the review cycle

The 22-file conflict with PR #680 hid the three TypeScript errors related to the
`staleness` → `snapshotStaleness` rename. The errors only surfaced after the merge was
resolved. A required rebase gate (or a pre-merge CI step that rebases and re-runs
type-check) would surface this class of error earlier.

### CI-F2 — No PR-level check validates SQL alias consistency

The SQL alias mismatch (B4, B5) was caught only by the Postgres smoke test, which runs
in a job that starts ~1 minute into the CI run. Extracting the alias to a constant (CI-2
above) would make it a type-checked value rather than a string, promoting the detection to
the type-check step.

### CI-F3 — `reportUnknown` fire-and-forget pattern requires microtask-flush in tests

See TEST-1 above. This is a CI robustness issue as well: if the flush is wrong the test
passes even when the assertion condition is not yet true, giving false confidence on green.

## Proposals

| ID          | Priority | Effort  | Proposal                                                                                                                                      |
| ----------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| LATENCY-1   | Medium   | Low     | Parallelize `engine.getRunStatus` and `stalenessReader.isSnapshotStale` with `Promise.all` in `GetRunStatusUseCase.execute`                   |
| SQL-1       | Low      | Low     | Add comment to `isSnapshotStaleSql` explaining why `run_event_heads` is not used, or rewrite to use it for consistency with batch path        |
| SAFE-WARN-1 | Low      | Low     | Attach `tenantId` and `runId` to the `safeWarn` call in `SafeRunSnapshotStalenessReader`                                                      |
| TEST-1      | Medium   | Low     | Replace `await Promise.resolve()` flush with `vi.runAllMicrotasksAsync()` or a synchronous telemetry spy to remove microtask-order dependency |
| TYPE-1      | Low      | Trivial | Remove or use `RunSnapshotStalenessCandidate` from the contracts file                                                                         |
| CI-2        | Medium   | Low     | Extract `'is_snapshot_stale'` to a named export constant and import it in both test files                                                     |
