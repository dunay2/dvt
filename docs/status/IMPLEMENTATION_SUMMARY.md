# Contract Testing Pipeline - Implementation Status

## Overview

This document tracks implementation progress for contract validation and golden-path determinism checks.

The baseline infrastructure is in place and aligned with the monorepo layout.

## Implemented Foundation

### Root Scripts

- `validate:contracts`
- `golden:validate`
- `node scripts/compare-hashes.cjs`

### Package/Test Paths

- Plans and fixtures: `packages/@dvt/engine/test/contracts/`
- Results: `packages/@dvt/engine/test/contracts/results/`
- Baseline hashes: `.golden/hashes.json`

### CI Alignment

- `.github/workflows/contracts.yml`
- `.github/workflows/golden-paths.yml`
- `.github/workflows/test.yml`

## Current State

- Core contract/golden-path tooling is functional.
- Scripts and workflows reference package-scoped paths.
- Determinism hash comparison is wired into CI checks.

## Issue #6 Status Update (2026-02-19)

- `@dvt/adapter-postgres` moved from in-memory foundation to real PostgreSQL persistence.
- SQL migration baseline added for `run_metadata`, `run_events`, and `outbox` in [`packages/@dvt/adapter-postgres/migrations/001_init.sql`](../../packages/@dvt/adapter-postgres/migrations/001_init.sql).
- Migration execution implemented in [`scripts/db-migrate.cjs`](../../scripts/db-migrate.cjs) (ordered SQL, schema placeholder replacement, migration tracking table).
- Adapter runtime now uses `pg` queries and transactional append+enqueue behavior in [`PostgresStateStoreAdapter`](../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts).
- Integration tests now support real DB validation via `DVT_PG_INTEGRATION=1` in [`packages/@dvt/adapter-postgres/test/smoke.test.ts`](../../packages/@dvt/adapter-postgres/test/smoke.test.ts).
- Validation evidence:
  - `pnpm --filter @dvt/adapter-postgres typecheck` ✅
  - `pnpm db:migrate` (with `DATABASE_URL`) ✅
  - `pnpm --filter @dvt/adapter-postgres test` with `DVT_PG_INTEGRATION=1` ✅ (3/3)

## Open Issues Summary

### Functional Work Still Open

- Adapter completion and parity validation (Temporal/Conductor tracks).
- Full runtime boundary validation coverage across all entry points.
- Golden-path matrix expansion and fixture hardening.

## Issue Audit Snapshot (2026-02-14)

Repository audit was reconciled against active package paths (`packages/*`) and issue comments were updated with concrete evidence.

### Closures applied during this audit pass

- #92 **Closed**: documentation corrected in [`docs/guides/QUALITY.md`](../guides/QUALITY.md) to reflect real Vitest configs in package scope and current watch command usage.
- #91 **Closed**: [`eslint.config.cjs`](../../eslint.config.cjs) normalized to a single active flat-config export.

### Tracker comments updated (state refinement without closure)

- #68: evidence posted for active Temporal adapter implementation in [`packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`](../../packages/@dvt/adapter-temporal/src/TemporalAdapter.ts), workflows/activities, and tests; left as near-closure pending checklist alignment.
- #14: evidence posted for engine core and projector implementation in [`packages/@dvt/engine/src/core/WorkflowEngine.ts`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts) and [`packages/@dvt/engine/src/core/SnapshotProjector.ts`](../../packages/@dvt/engine/src/core/SnapshotProjector.ts); left open pending checklist/API wording refresh.

### Updated in GitHub (2026-02-19 18:43 UTC)

- #67: **Closed** (runtime boundary validation delivered on active API boundaries).
- #68: **Closed** (closure track finalized with CI alignment and canonical tracker publication).
- #69: **Not started** (Conductor adapter package not present; engine Conductor adapter stub only).
- #70: **Implemented and merged** (fixtures + baseline hashes + validation flow integrated via PR #201; GitHub issue remains open pending manual closure/update).
- #71: **Blocked / not started** (depends on non-stub Conductor foundation).
- #72: **Not started on active path** (version-binding enforcement currently visible in legacy area, not active runtime path).
- #73: **Partial** (determinism tests for engine + mock exist; cross-adapter determinism still blocked mainly by Conductor gaps).
- #14: **Mostly implemented** in active engine path; issue checklist should be refreshed to current API names and remaining deltas.
- #15: **In progress** (Temporal interpreter now includes deterministic DAG-layer planning with declaration-order fallback; remaining scope includes full parity items like continue-as-new thresholds and broader acceptance scenarios).
- #5: **Superseded scope** by #68 for active monorepo implementation tracking.
- #6: **Foundation implemented and merged** in active adapter package (MVP base via PR #202 with `PostgresStateStoreAdapter`, contract-compatible types, and smoke coverage); follow-up required for full PostgreSQL persistence/runtime hardening.
- #76 and #79: active repository-governance tracking for monorepo/path normalization and stale local reference cleanup.

### Suggested canonical execution order (updated 2026-02-19 18:43 UTC)

1. Complete #6 foundation (Postgres active implementation + closure evidence).
2. Complete #70 fixtures and executable golden-path runs.
3. Progress #69 and #71 (Conductor + draining policies).
4. Finalize #72 and expand #73 cross-adapter determinism.

### Quality Debt Still Open

- Workspace lint debt (concrete backlog):
  - `packages/adapters-legacy/src/**` — normalize import order and unresolved references; target gate: `eslint --max-warnings 0` on package scope.
  - `packages/@dvt/adapter-postgres/test/**` — align parser project boundaries and test-lint rules; target gate: package test-lint clean run.
  - `packages/@dvt/engine/legacy-top-level-engine/**` — legacy lint drift cleanup or archive decision with explicit owner.
- Docs/path normalization backlog (explicit files):
  - `docs/REPO_STRUCTURE_SUMMARY.md` — reconcile active vs legacy package maps after latest adapter/engine changes.
  - `docs/planning/ISSUE_5_TEMPORAL_ADAPTER_STATUS_AND_IMPLEMENTATION_PROPOSAL.md` — refresh status links to current PR/issue trail.
  - `docs/knowledge/ROADMAP_AND_ISSUES_MAP.md` — align issue state transitions (`#68` closed, `#15` multi-slice in progress).
  - `docs/INDEX.md` — ensure discoverability links include current status/debt records.

## Next Work Focus

1. Stabilize lint/type boundaries package-by-package.
2. Complete runtime boundary validation for adapter-facing entry points.
3. Expand deterministic golden-path coverage and keep baseline hashes synchronized.
4. Continue documentation normalization until all repository docs are fully consistent and English-only.

## Recent Low-Priority Completed Task (2026-02-14)

- Issue [#82](https://github.com/dunay2/dvt/issues/82) closed.
- Change applied in [`validateStepShape()`](packages/@dvt/adapter-temporal/src/activities/stepActivities.ts:172): hoisted allowed step fields to module-level constant to avoid per-call `Set` allocation.
- Validation evidence: `pnpm --filter @dvt/adapter-temporal test` passed (19 tests).

## Recent High-Priority Completed Task (2026-02-17)

- Scope: align logical attempts vs infrastructure attempts in Temporal activity event emission.
- Problem addressed: `logicalAttemptId` defaulted to infrastructure attempt under retries, risking duplicate logical events and non-canonical idempotency behavior.
- Runtime changes:
  - [`emitEvent()`](../../packages/@dvt/adapter-temporal/src/activities/stepActivities.ts:92) now defaults `logicalAttemptId` to `1` (unless explicitly provided).
  - [`resolveTemporalAttemptFromContext()`](../../packages/@dvt/adapter-temporal/src/activities/stepActivities.ts:140) centralizes safe extraction of Temporal activity attempt for `engineAttemptId` only.
  - [`EventIdempotencyInput`](../../packages/@dvt/adapter-temporal/src/engine-types.ts:112) no longer includes `engineAttemptId`, reinforcing idempotency derivation from logical attempt dimensions.
- Regression tests added/updated:
  - [`activities.test.ts`](../../packages/@dvt/adapter-temporal/test/activities.test.ts:221) now validates:
    - logical attempt defaults to `1` even when engine attempt > 1,
    - dedupe remains stable across infrastructure retries with unchanged logical attempt,
    - explicit logical attempt remains independent from engine attempt.
  - [`integration.time-skipping.test.ts`](../../packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts:41) test idempotency fixture aligned with logical-attempt-based derivation.
- Validation evidence:
  - `pnpm --filter @dvt/adapter-temporal test` ✅
  - Result: 4 test files passed, 24 tests passed.

### Residual Risks / Follow-up

- Engine package (`packages/engine`) still emits fixed attempt values in several paths ([`WorkflowEngine.emitRunEvent*`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts:307)); this task only closes the active Temporal activity emission gap.
- Conductor path remains pending and should adopt the same logical-vs-engine-attempt invariants before parity testing.

## Recent High-Priority Progress Slice (2026-02-17)

- Scope: `#15` incremental interpreter upgrade with deterministic DAG-layer scheduling primitives.
- Problem addressed: workflow execution was strictly sequential with no explicit DAG dependency planning path.
- Runtime changes:
  - Added optional DAG dependency support (`dependsOn`) in adapter-local execution plan typing via [`ExecutionPlan`](../../packages/@dvt/adapter-temporal/src/engine-types.ts:64).
  - Extended step validation in [`validateStepShape()`](../../packages/@dvt/adapter-temporal/src/activities/stepActivities.ts:182) to allow and validate `dependsOn` arrays.
  - Added deterministic DAG-layer planner in [`planExecutionLayers()`](../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:213), including validation for duplicate step IDs, unknown dependencies, self-dependencies, invalid dependency values, and cycles.
  - Updated [`runPlanWorkflow()`](../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:92) to execute by deterministic layers (parallelizable frontier via `Promise.all`) while preserving declaration-order fallback for legacy plans.
- Tests added/updated:
  - New scheduler-focused unit suite in [`workflow-dag-scheduler.test.ts`](../../packages/@dvt/adapter-temporal/test/workflow-dag-scheduler.test.ts:1) covering linear fallback, layered DAG ordering, and invalid-graph error paths.
  - Extended activity validation coverage in [`activities.test.ts`](../../packages/@dvt/adapter-temporal/test/activities.test.ts:278) for `dependsOn` acceptance and invalid-shape rejection.
- Validation evidence:
  - `pnpm --filter @dvt/adapter-temporal exec vitest run test/workflow-dag-scheduler.test.ts` ✅
  - `pnpm --filter @dvt/adapter-temporal test` ✅
  - Result: 5 test files passed, 35 tests passed.

### Residual Risks / Follow-up (Issue #15)

- Canonical contract alignment for execution plan dependencies is now promoted in engine contracts for active runtime paths; remaining follow-up is cross-package validation/schema parity in all consumers.
- `continueAsNew` policy/threshold and long-run compaction behavior remain unimplemented in the workflow.
- Full end-to-end DAG parity acceptance (including richer dispatch semantics) remains open and should continue in follow-up slices.

## Recent High-Priority Progress Slice 2 (2026-02-17)

- Scope: continue `#15` by promoting DAG dependency shape (`dependsOn`) from adapter-local typing to shared engine contract surfaces.
- Runtime changes:
  - Added optional `dependsOn?: string[]` to shared engine execution plan contract in [`ExecutionPlan`](../../packages/@dvt/engine/src/contracts/executionPlan.ts:1).
  - Updated mock adapter step validation in [`validateMockStep()`](../../packages/@dvt/engine/src/adapters/mock/MockAdapter.ts:157) to accept/validate `dependsOn`.
- Tests:
  - Added engine contract regression coverage in [`engine.test.ts`](../../packages/@dvt/engine/test/contracts/engine.test.ts:37) with a DAG-shaped plan using `dependsOn`.
- Validation evidence:
  - `pnpm --filter @dvt/contracts build` ✅
  - `pnpm --filter @dvt/engine test -- --run test/contracts/engine.test.ts` ✅
  - Result: engine suite passed (7 files, 42 tests).

## Recent High-Priority Progress Slice 3 (2026-02-17)

- Scope: add deterministic continue-as-new policy to Temporal interpreter workflow (`#15`).
- Runtime changes:
  - Added adapter config parameter `continueAsNewAfterLayerCount` in [`TemporalAdapterConfig`](../../packages/@dvt/adapter-temporal/src/config.ts:1), sourced from `TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS` with safe default `0` (disabled).
  - Workflow input/state upgraded in [`RunPlanWorkflow`](../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:29) with resume cursor and `continuedAsNewCount` tracking.
  - Added deterministic rollover policy helper [`shouldTriggerContinueAsNew()`](../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:278) and integrated `continueAsNew(...)` trigger after configured layer threshold.
  - Adapter start payload now passes threshold to workflow in [`TemporalAdapter.startRun()`](../../packages/@dvt/adapter-temporal/src/TemporalAdapter.ts:52).
- Tests added/updated:
  - New policy tests in [`workflow-continue-as-new.test.ts`](../../packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts:1).
  - Config coverage extended in [`smoke.test.ts`](../../packages/@dvt/adapter-temporal/test/smoke.test.ts:68).
- Validation evidence:
  - `pnpm --filter @dvt/adapter-temporal test` ✅
  - Result: adapter-temporal suite passed (6 files, 39 tests).

## Recent High-Priority Progress Slice 4+6 (2026-02-17)

- Scope: complete Option A parity closure for `#15` with retry/error handling + E2E golden-path coverage.
- Runtime changes:
  - Added controlled failure simulation in [`executeStep()`](../../packages/@dvt/adapter-temporal/src/activities/stepActivities.ts:85) via `simulateError: 'transient' | 'permanent'` for deterministic retry/error-path testing.
  - Expanded step validation allowlist in [`validateStepShape()`](../../packages/@dvt/adapter-temporal/src/activities/stepActivities.ts:200) to accept `simulateError` in test plans.
  - Updated workflow activity retry policy in [`runPlanWorkflow()`](../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:88) to:
    - `maximumInterval: '60s'`
    - `maximumAttempts: 3`
    - `nonRetryableErrorTypes: ['PermanentStepError']`
  - Added explicit activity error mapping in [`runPlanWorkflow()`](../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts:205) to convert terminal activity failures into deterministic `StepFailed` + `RunFailed` event emission.
- Tests added/updated:
  - Added failure-simulation unit coverage in [`activities.test.ts`](../../packages/@dvt/adapter-temporal/test/activities.test.ts:351) for transient and permanent error branches.
  - Added linear 3-step golden-path E2E in [`integration.time-skipping.test.ts`](../../packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts:417) asserting deterministic event order and `runSeq` continuity.
  - Added permanent-failure E2E in [`integration.time-skipping.test.ts`](../../packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts:476) asserting deterministic `StepFailed` + `RunFailed` terminal path.
- Validation evidence:
  - `pnpm --filter @dvt/adapter-temporal test -- --run test/integration.time-skipping.test.ts` ✅
  - `pnpm --filter @dvt/adapter-temporal test` ✅
  - Result: adapter-temporal suite passed (6 files, 43 tests).

## Operational Notes

When behavior changes affect deterministic execution:

1. Regenerate golden-path results.
2. Compare against `.golden/hashes.json`.
3. Update baseline hashes intentionally.
4. Document changes in `CHANGELOG.md`.

## Post-Closure Direction (2026-02-18)

- `#15` is considered closed for MVP runtime parity after Slice 4+6 completion and validation.
- Next product-delivery focus is `#10` (Golden Paths) to capitalize on the now-stable interpreter runtime.
- Immediate sequencing recommendation:
  1. dbt project parser
  2. lineage/DAG builder from dbt metadata
  3. SQL preview + end-to-end execution demo flow
- Retry policy rationale and constraints for the current MVP baseline are formalized in [`ADR-0007`](../decisions/ADR-0007-temporal-retry-policy-mvp.md).
- Observability, determinism linting, and heartbeat strategy remain explicit debt and are intentionally deferred to hardening iterations.

---

**Status**: Active and usable (with audited gaps tracked)
**Last updated**: 2026-02-19 18:32 UTC

## PostgreSQL Hardening Slice (2026-02-19 18:32 UTC)

Scope executed as a prioritized hardening pass for `@dvt/adapter-postgres` and engine integration points.

### P0 completed

- Removed unused transactional parameter from adapter+engine transactional path:
  - [`appendAndEnqueueTx()`](../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
  - [`WorkflowEngine.persistEvent()`](../../packages/@dvt/engine/src/core/WorkflowEngine.ts)
  - [`InMemoryTxStore.appendAndEnqueueTx()`](../../packages/@dvt/engine/src/state/InMemoryTxStore.ts)
- Added safe pending-outbox claiming in [`listPending()`](../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts) using `FOR UPDATE SKIP LOCKED` with stale-claim recovery (`claimed_at` timeout policy).

### P1 completed

- Added explicit integration schema teardown in [`packages/@dvt/adapter-postgres/test/smoke.test.ts`](../../packages/@dvt/adapter-postgres/test/smoke.test.ts) via `afterAll` and `DROP SCHEMA ... CASCADE`.
- CI now executes Postgres integration smoke tests in [`contract-hashes` job](../../.github/workflows/contracts.yml) with PostgreSQL service and integration env flags.

### P2 completed

- Removed redundant index-creation path for `run_events(run_id, run_seq)` in adapter schema initialization (PK already covers access path).
- Type-drift decision documented in [`packages/@dvt/adapter-postgres/src/types.ts`](../../packages/@dvt/adapter-postgres/src/types.ts): keep adapter-local transactional types for now; do not alias current `@dvt/contracts` state-store contracts yet because those represent canonical snapshot/projection contracts, not transactional outbox persistence semantics.

### Validation evidence

- `pnpm --filter @dvt/engine build` ✅
- `pnpm --filter @dvt/adapter-postgres build` ✅
- `pnpm --filter @dvt/adapter-postgres exec vitest run test/smoke.test.ts --config vitest.config.cjs` with `DVT_PG_INTEGRATION=1` + `DATABASE_URL` ✅ (3/3)

### Current status

- Hardening slice scope completed for requested P0/P1/P2 items.
- Remaining higher-level track is full non-stub golden-path execution parity publication for issue-level closure criteria.

### Type-drift strategy review (2026-02-19 18:37 UTC)

Context: [`packages/@dvt/adapter-postgres/src/types.ts`](../../packages/@dvt/adapter-postgres/src/types.ts) currently defines local transactional adapter types while the package also depends on [`@dvt/contracts`](../../packages/@dvt/contracts/index.ts).

Evaluated strategies:

1. **Direct import/alias from `@dvt/contracts` now**
   - Pros: single source of truth for shared names.
   - Cons: current exported contracts in [`packages/@dvt/contracts/src/types/state-store.ts`](../../packages/@dvt/contracts/src/types/state-store.ts) model canonical event projection (`appendEvent`, `fetchEvents`, snapshots), not transactional outbox persistence (`appendEventsTx`, `appendAndEnqueueTx`, claim/delivery lifecycle).
   - Risk: forced casts and semantic mismatch.

2. **Keep fully local adapter types (current state)**
   - Pros: clean separation and no false coupling.
   - Cons: long-term drift risk on overlapping fields (`eventType`, `RunMetadata`, envelope shape).

3. **Introduce a dedicated shared transactional contract module (recommended)**
   - Add a new contract surface in `@dvt/contracts` specifically for transactional state-store + outbox behavior.
   - Adapter and engine import from that module while canonical snapshot/projection contracts stay separate.
   - Preserves decoupling-by-boundary while eliminating duplicated type definitions.

Decision at this timestamp:

- Keep local types for now.
- Plan a follow-up to extract **transactional** shared contracts into `@dvt/contracts` and migrate [`packages/@dvt/adapter-postgres/src/types.ts`](../../packages/@dvt/adapter-postgres/src/types.ts) and engine call sites together in one compatibility slice.
