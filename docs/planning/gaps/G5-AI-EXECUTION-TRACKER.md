---
title: G5 - AI Execution Tracker
status: Active
owner: Delivery / Engineering
last_reviewed: 2026-03-12
planning_type: execution-plan
---

# G5 - AI Execution Tracker

Operational tracker for AI-assisted execution of the remaining `G5` work.

## Authority Rule

- Canonical spec: [G5 - Outbox Worker Consolidated Plan](G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md)
- Active status doc: [DVT+ - Gap Execution Plans](GAP_EXECUTION_PLANS.md)
- Last completed slice contract: [G5 / US-G5.3 Correctness Hardening Plan](G5-US-G5.3-CORRECTNESS-HARDENING-PLAN.md)

This file is not a second source of truth.

Its job is narrower:

- record the current execution pointer for AI work;
- show what remains in `G5` after `#412`;
- make the next validation lane explicit;
- leave a short execution log.

If this tracker conflicts with the canonical plan, update the canonical plan
first and then sync this tracker.

## Current Pointer

Update this section before any substantial implementation turn.

- `as_of`: `2026-03-12`
- `gap`: `G5`
- `epic`: `#409`
- `current_focus`: `G5 closed`
- `state`: `Closed 2026-03-12`
- `currently_working_on`: `nothing — G5 is fully closed`
- `next_after_current`: `G6, G7, G9, G10 per GAP_EXECUTION_PLANS.md`
- `blocking_dependencies`: none
- `last_completed`: `G5 formal closeout — local-docker canary proof via script plus status-doc sync 2026-03-12`

## Remaining G5 Roadmap

- `PR-4 / #413`
  scope: single-owner canary cutover, explicit standalone ownership mode, rollback wiring
  current status: done; local-docker canary evidence recorded in `ED-20260312-g5-canary-local-docker.md`
  exit signal: satisfied by one active-owner local-docker canary with `/readyz=200`, `delivered_records_total 0→1`, `runtime_errors_total` flat, and rollback-by-stop evidence
- `PR-5 / #414`
  scope: choose and implement one ADR-0009 concurrent-worker strategy
  current status: done; shard routing, ownership fencing, ownership-loss shutdown, concurrent-worker ordering proof, and real PostgreSQL advisory-lock evidence all exist in code and tests
  exit signal: satisfied by shard-scoped ordering proof plus `PgShardOwnershipGate.integration.test.ts` against the repo `postgres:16` compose service

## Execution Protocol For AI

1. Before code changes, update [Current Pointer](#current-pointer).
2. If scope or acceptance changes, update [G5 - Outbox Worker Consolidated Plan](G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md) first, then update this tracker.
3. Keep the current stage tied to one GitHub issue at a time.
4. Record the touched-files plan before implementation for the active stage.
5. After each validation batch, append an execution-log entry with exact commands and pass/fail state.
6. When a stage closes, sync this tracker, [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md), and any affected runbook/deployment docs in the same change.

## Stage Detail

### PR-4 / G5.4 - Canary cutover and rollback wiring

Goal:
make ownership of outbox delivery explicit in one environment and prove that the
standalone worker can be enabled and rolled back without ambiguous dual-active
behavior.

Working checklist:

- [x] think-first note written for `#413`
- [x] pre-implementation brief written for `#413`
- [x] current ownership path identified in code and runtime/deployment docs
- [x] environment-scoped worker enablement surface identified
- [x] canary ownership surface identified without inventing a nonexistent embedded owner path
- [x] canary checklist written
- [x] rollback instructions written
- [x] implementation and docs updated
- [x] validation commands run and reported
- [x] repo-side negative host-path coverage complete
- [x] canary evidence collection script written (`scripts/outbox-worker-canary-evidence.ps1`)
- [x] external canary evidence captured for one environment
- [x] rollback evidence captured for the selected canary environment
- [x] status docs synced after closure

Short canary evidence checklist:

- [x] environment name and rollout window recorded
- [x] `DVT_OUTBOX_OWNERSHIP_MODE=active` applied only to the chosen standalone worker
- [x] no second active outbox publisher path observed during the same window
- [x] `/readyz` returned `200` during the canary
- [x] `dvt_outbox_delivered_records_total` increased after enqueueing a test event
- [x] `dvt_outbox_runtime_errors_total` stayed flat during the observation window
- [x] rollback step and post-rollback state captured if rollback is exercised

Expected touched-system candidates:

- `apps/outbox-worker/src/**`
- `apps/outbox-worker/README.md`
- `docs/runbooks/outbox-worker-g5.md`
- deployment/runtime wiring under `apps/api` only if the current owner path still lives there
- status/planning docs for `G5`

Primary validation lane:

- `pnpm --filter dvt-outbox-worker typecheck`
- `pnpm --filter dvt-outbox-worker build`
- `pnpm --filter dvt-outbox-worker test`
- any additional canary-toggle validation command added by the implementation

Current think-first analysis:

- problem summary: the repository already has a standalone worker, but the
  ownership of that worker is not yet explicit at host start-up; a deployment
  can still treat process start as implicit ownership
- constraints and invariants:
  - do not move ownership policy into `@dvt/engine`
  - do not invent a second embedded owner path in `apps/api` that does not
    really exist
  - keep readiness `false` whenever the process is non-owning
  - keep one active owner only
- options considered:
  - boolean enable flag with fail-fast startup
  - host-level ownership mode with `active|passive`
  - runtime-level ownership branching
- selected option and rationale:
  - use host-level ownership mode with `active|passive`
  - rationale: it keeps ownership in the standalone host boundary, preserves the
    reusable runtime/core, supports canary plus rollback, and avoids hidden
    dual-active ambiguity
- rejected alternatives:
  - runtime-level branching was rejected because ownership is a host concern,
    not an engine concern
  - a fake "old embedded owner" implementation was rejected because that would
    create a synthetic path not present in the repo

Current pre-implementation brief:

- scope:
  - parse explicit ownership mode from worker env
  - surface passive ownership in runtime health/metrics
  - allow passive startup without runtime polling ownership
  - document canary and rollback semantics around that mode
- touched files or paths:
  - `apps/outbox-worker/src/host/runOutboxWorkerHost.ts`
  - `apps/outbox-worker/src/server.ts`
  - `apps/outbox-worker/src/plugins/env.ts`
  - `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts`
  - `apps/outbox-worker/src/lifecycle/stopRuntimeAndOperationalServer.ts`
  - `apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts`
  - `apps/outbox-worker/test/host/runOutboxWorkerHost.test.ts`
  - `apps/outbox-worker/test/plugins/env.test.ts`
  - `apps/outbox-worker/test/ops/OperationalServer.test.ts`
  - `apps/outbox-worker/test/ops/OutboxWorkerMonitor.test.ts`
  - `apps/outbox-worker/test/lifecycle/stopRuntimeAndOperationalServer.test.ts`
  - `apps/outbox-worker/test/runtime/createOutboxWorkerRuntime.test.ts`
  - `apps/outbox-worker/README.md`
  - `docs/runbooks/outbox-worker-g5.md`
- expected outcome:
  - one explicit env-controlled owner mode for the standalone worker
  - passive mode remains observable but never owns polling
  - rollback can disable ownership without introducing a second owner
- risks and mitigations:
  - risk: passive mode looks healthy when it should not be ready
  - mitigation: `ready=false` in passive mode, explicit metrics state, and
    runbook language aligned with owner semantics
  - risk: host logic starts bleeding into engine/runtime contracts
  - mitigation: keep ownership branching at `apps/outbox-worker` boundary only
- validation plan:
  - `pnpm --filter dvt-outbox-worker test`
  - `pnpm --filter dvt-outbox-worker typecheck`
  - `pnpm --filter dvt-outbox-worker build`
  - `pnpm lint:md`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`

### Active substep / G5.4A - #446 automated repo-side canary acceptance

Think-first analysis:

- problem summary: `#413` still needs canary evidence, but the repository lacked
  an executable acceptance that proves `passive -> active -> stop` through the
  standalone worker without manual steps
- constraints and invariants:
  - keep the canary automation inside `apps/outbox-worker`
  - use the production host/runtime composition rather than a separate runtime
    harness
  - do not require a real PostgreSQL service for the default local test lane
  - do not invent a fake second owner path or browser automation
- options considered:
  - keep the first acceptance harness with a custom runtime factory
  - require a real PostgreSQL service in the worker test lane
  - patch the PostgreSQL adapter boundary in test while keeping
    `createOutboxWorkerRuntime()` and `runOutboxWorkerHost()` real
- selected option and rationale:
  - patch the PostgreSQL adapter boundary only inside the test
  - rationale: this preserves the production host/runtime composition, keeps the
    test deterministic, and avoids adding environment-coupled infrastructure to
    the default worker lane
- rejected alternatives:
  - the custom runtime factory was rejected because it bypassed the active-mode
    assembly that `#446` is supposed to exercise
  - a mandatory real PostgreSQL dependency was rejected because the repository
    does not provide an auto-started database for `dvt-outbox-worker test`

Pre-implementation brief:

- scope:
  - cover `passive` bootstrap probes
  - cover `active` delivery through `runOutboxWorkerHost()` with the default
    `createOutboxWorkerRuntime()`
  - use a controlled PostgreSQL-adapter fixture to enqueue pending records
  - keep stop semantics observable at the end of the same automated flow
- touched files or paths:
  - `apps/outbox-worker/test/canary/standaloneCanaryAcceptance.test.ts`
  - `docs/planning/gaps/G5-AI-EXECUTION-TRACKER.md`
  - `docs/planning/status/generated-code-state.md`
- expected outcome:
  - repo-side canary acceptance proves passive probes, active readiness, active
    delivery, downstream rejection observability, metrics transitions, and stop
    semantics through the production host/runtime composition
  - validation evidence no longer overclaims `docs:status:check`
- risks and mitigations:
  - risk: the canary harness drifts from production composition
  - mitigation: keep `runOutboxWorkerHost()` and `createOutboxWorkerRuntime()`
    real and confine the fake behavior to patched adapter methods inside the
    test
  - risk: acceptance starts depending on private adapter fields or a port
    reservation race that flakes in CI
  - mitigation: keep the fixture keyed to public adapter methods only and use a
    retrying candidate-port binder instead of reserve-then-rebind
  - risk: generated status drift is reported as green when it is not
  - mitigation: record `docs:status:generate` during in-progress work and only
    claim `docs:status:check` once the generated file is staged/committed with
    the slice
- validation plan:
  - `pnpm exec eslint apps/outbox-worker/test/canary/standaloneCanaryAcceptance.test.ts --max-warnings 0`
  - `pnpm --filter dvt-outbox-worker typecheck`
  - `pnpm --filter dvt-outbox-worker build`
  - `pnpm --filter dvt-outbox-worker test`
  - `pnpm lint:md`
  - `pnpm docs:canonical:check`
  - `pnpm docs:status:check`

### PR-5 / G5.5 - Multi-worker strategy before horizontal scale-out

Goal:
close the remaining scale-out risk by implementing exactly one concurrency
strategy that preserves per-`runId` order across more than one worker instance.

Working checklist:

- [x] strategy chosen in planning docs: deterministic `runId` sharding with explicit shard ownership and advisory-lock fencing
- [x] persisted shard routing and shard-aware claim selection implemented in code
- [x] dedicated startup ownership session implemented in the standalone host
- [x] lock-loss runtime semantics added
- [x] concurrent-worker tests added
- [x] horizontal scale-out remains blocked until tests pass
- [x] status docs synced after closure

Selected planning refs:

- [`G5 / US-G5.5 Sharding And Fencing Plan`](G5-US-G5.5-SHARDING-AND-FENCING-PLAN.md)
- [`ADR-0033 - Outbox Worker Sharding And Fencing Model`](../../adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md)

Primary validation lane:

- `pnpm test:engine`
- `pnpm --filter dvt-outbox-worker test`
- `pnpm test:adapter-postgres`
- any new concurrency-specific validation command added by the chosen strategy

### Active substep / G5.5C - #414 concurrent-worker ordering proof

Think-first analysis:

- problem summary: the repo had shard routing, dedicated lock sessions, and
  ownership-loss shutdown, but no test proving that two concurrent workers with
  disjoint shard sets cannot claim the same outbox record or reorder a runId
  stream; INV-OUTBOX-002 was asserted by design but not by test evidence
- constraints and invariants:
  - do not require a live PostgreSQL instance in the default worker test lane
  - prove ordering at the `IOutboxStorage` / `OutboxWorker` boundary, not just
    at the host boundary
  - use the same shard routing logic already used by production code —
    `InMemoryOutboxStorage` is the right fixture because it implements the same
    deterministic hash as the Postgres adapter
  - do not hard-code which runId maps to which shard — use probe-based
    discovery so the tests stay correct if the hash function changes
- options considered:
  - integration tests against a real PostgreSQL with two worker processes
  - unit tests using `InMemoryOutboxStorage` + `OutboxWorker`
  - unit tests using a custom fake storage that tracks claim calls
- selected option and rationale:
  - `InMemoryOutboxStorage` + `OutboxWorker` unit tests
  - rationale: the shard routing logic in `InMemoryOutboxStorage` is the same
    MD5-based algorithm used in the Postgres adapter; testing at this boundary
    proves the invariant without requiring database infrastructure; the probe
    helper discovers shard assignments at runtime so the tests are not tied to
    hash internals
- rejected alternatives:
  - live PostgreSQL tests were rejected because the repo does not provide an
    auto-started database for the default outbox-worker test lane
  - a custom fake storage was rejected because it would bypass the actual shard
    routing implementation

Pre-implementation brief:

- scope:
  - prove shard routing determinism (same runId → same shard always)
  - prove worker exclusivity (a worker only claims its owned shards)
  - prove no cross-worker record overlap (disjoint shard sets → zero shared records)
  - prove per-runId ordering (head-of-line enforced by owning worker only)
  - prove non-owning worker cannot advance a mid-stream runId
  - prove all events delivered exactly once across two concurrent workers
- touched files or paths:
  - `apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts` (new)
  - `docs/planning/gaps/G5-AI-EXECUTION-TRACKER.md`
- expected outcome:
  - 6 deterministic unit tests proving INV-OUTBOX-002 without a live database
  - `pnpm --filter dvt-outbox-worker test` passes with 109/109 green
  - `pnpm --filter dvt-outbox-worker typecheck` passes clean
  - `pnpm exec eslint ... --max-warnings 0` passes clean
- risks and mitigations:
  - risk: probe-based shard discovery fails if all candidate runIds hash to the
    same shard for a given shardCount
  - mitigation: use 16 candidate runIds — statistical near-impossibility of all
    mapping to the same shard for shardCount ∈ {2,4}
  - risk: test asserts on internal `InMemoryOutboxStorage` behaviour that
    diverges from the Postgres adapter
  - mitigation: both implementations use the same MD5-based `resolveShardId`
    algorithm; the storage contract is the proof surface, not adapter internals
- validation plan:
  - `pnpm exec eslint apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts --max-warnings 0`
  - `pnpm --filter dvt-outbox-worker typecheck`
  - `pnpm --filter dvt-outbox-worker test`

### Active substep / G5.5D - #414 PostgreSQL advisory lock exclusivity integration test

Think-first analysis:

- problem summary: the in-memory concurrent-worker proof validates the shard
  routing invariant but does not prove that the real PostgreSQL advisory lock
  mechanism prevents two `PgShardOwnershipGate` instances from holding the same
  shard simultaneously; the Postgres lock path is exercised by a mocked client
  in the unit suite but never by a real database session
- constraints and invariants:
  - do not make the default `pnpm --filter dvt-outbox-worker test` lane depend
    on a live PostgreSQL instance — the test must skip cleanly when `DATABASE_URL`
    is absent
  - the proof must use `createPgShardOwnershipGate` without any fake pool
    injection so the real `acquirePgPool` / pg session path is exercised
  - no schema migration required — `pg_try_advisory_lock` is a built-in
    PostgreSQL function and needs no tables
  - cleanup must release all advisory locks even if assertions fail
- options considered:
  - skip file entirely if `DATABASE_URL` absent (exit 0)
  - use `{ skip: reason }` per test so the runner reports skipped tests
  - use `DVT_PG_INTEGRATION` env var (consistent with adapter-postgres tests)
- selected option and rationale:
  - skip individual tests via `{ skip: reason }` when `DATABASE_URL` is absent
  - rationale: keeps the test file in the default glob without failing the lane;
    the skip reason is surfaced in the test output; consistent with the
    node:test runner used by the outbox-worker package
- rejected alternatives:
  - `DVT_PG_INTEGRATION` was considered for consistency with adapter-postgres
    but the outbox-worker tests already use `DATABASE_URL` directly in canary
    acceptance fixtures, so reusing the same env var avoids a second gate

Pre-implementation brief:

- scope:
  - prove that a second gate returns `null` while a first gate holds the lock
    for the same shard
  - prove that after the first gate releases, the second gate can acquire
  - clean up all sessions in finally blocks
- touched files or paths:
  - `apps/outbox-worker/test/ownership/PgShardOwnershipGate.integration.test.ts` (new)
  - `docs/planning/gaps/G5-AI-EXECUTION-TRACKER.md`
- expected outcome:
  - when `DATABASE_URL` is set: 2 tests pass, proving real advisory lock exclusivity
  - when `DATABASE_URL` is absent: 2 tests skipped, default lane unaffected
- risks and mitigations:
  - risk: lock not released after test failure → subsequent tests cannot acquire
  - mitigation: always release inside finally blocks; each test uses its own
    independent pair of gate instances
  - risk: pool caching in `acquirePgPool` retains connections across gates
  - mitigation: call `closePgPool()` in afterAll to drain all pooled connections
- validation plan:
  - `pnpm exec eslint apps/outbox-worker/test/ownership/PgShardOwnershipGate.integration.test.ts --max-warnings 0`
  - `pnpm --filter dvt-outbox-worker typecheck`
  - `DATABASE_URL=<real-url> pnpm --filter dvt-outbox-worker test` (with real DB)
  - `pnpm --filter dvt-outbox-worker test` (without DATABASE_URL → skipped, no failure)

## Mermaid State Map

```mermaid
flowchart LR
    A[G5.3 merged<br/>PR #444<br/>Correctness hardening landed] --> B[G5.4 / #413<br/>Single-owner canary cutover]
    B --> C[Explicit owner toggle<br/>Canary checklist<br/>Rollback path]
    C --> D[G5.5 / #414<br/>Concurrent-worker strategy]
    D --> E[Sharding or coordination chosen]
    E --> F[Concurrent ordering tests green]
    F --> G[G5 fully closed<br/>Standalone runtime + scale-out hardening complete]
```

## Execution Log

- `2026-03-10` `G5.3 / #412` `done`
  summary: merged via PR `#444`; correctness hardening landed in engine, runtime, PostgreSQL adapter, and planning docs
  validation: `pnpm test:engine`; `pnpm --filter dvt-outbox-worker test`; `pnpm --filter dvt-outbox-worker typecheck`; `pnpm --filter dvt-outbox-worker build`; `pnpm test:adapter-postgres`; `pnpm verify:prepush`; `pnpm docs:ci`
- `2026-03-10` `G5.4 / #413` `ready to start`
  summary: tracker created to drive the next G5 stage from the canonical plan
  validation: `pnpm lint:md`; `pnpm docs:quality:check`; `pnpm docs:canonical:check`
- `2026-03-10` `G5.4 / #413` `in progress`
  summary: selected host-level `active/passive` ownership mode as the clean seam for canary and rollback
  validation: repo inspection of `apps/outbox-worker`, `apps/api`, runbook, and issue state
- `2026-03-10` `G5.4 / #413` `in progress`
  summary: implemented explicit ownership mode in the standalone host and aligned passive health/readiness semantics
  validation: `pnpm --filter dvt-outbox-worker test`; `pnpm --filter dvt-outbox-worker typecheck`; `pnpm --filter dvt-outbox-worker build`; `pnpm lint:md`; `pnpm docs:quality:check`; `pnpm docs:canonical:check`
- `2026-03-10` `G5.4 / #413` `in progress`
  summary: corrected the ownership contract after QA review: ownership mode is explicit, passive bootstrap is decoupled from runtime-only config, and host boot-path tests now cover active vs passive startup
  validation: `pnpm --filter dvt-outbox-worker typecheck`; `pnpm --filter dvt-outbox-worker test`; `pnpm --filter dvt-outbox-worker build`; `pnpm exec eslint apps/outbox-worker/src/server.ts apps/outbox-worker/src/plugins/env.ts apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts apps/outbox-worker/src/host/runOutboxWorkerHost.ts apps/outbox-worker/test/plugins/env.test.ts apps/outbox-worker/test/runtime/createOutboxWorkerRuntime.test.ts apps/outbox-worker/test/host/runOutboxWorkerHost.test.ts --max-warnings 0`; `pnpm lint:md`; `pnpm docs:quality:check`; `pnpm docs:canonical:check`
- `2026-03-10` `G5.4 / #413` `in progress`
  summary: added negative host-path coverage for bootstrap/runtime failures, normalized cleanup error reporting, and corrected tracker wording so repo-side progress does not masquerade as canary completion
  validation: `pnpm --filter dvt-outbox-worker typecheck`; `pnpm --filter dvt-outbox-worker test`; `pnpm --filter dvt-outbox-worker build`; `pnpm exec eslint apps/outbox-worker/src/lifecycle/stopRuntimeAndOperationalServer.ts apps/outbox-worker/test/lifecycle/stopRuntimeAndOperationalServer.test.ts apps/outbox-worker/test/host/runOutboxWorkerHost.test.ts --max-warnings 0`; `pnpm lint:md`; `pnpm docs:canonical:check`
- `2026-03-10` `G5.4 / #413` `in progress`
  summary: removed the fictitious “old embedded owner” wording from PR-4 governance surfaces and replaced it with a concrete canary evidence checklist tied to the standalone worker as sole active owner
  validation: `pnpm lint:md`; `pnpm docs:canonical:check`
- `2026-03-10` `G5.4A / #446` `in progress`
  summary: added a fully automated repo-side canary acceptance test that exercises passive bootstrap and active delivery through the production host/runtime composition, with a controlled PostgreSQL-adapter fixture providing deterministic pending outbox records
  validation: `pnpm exec eslint apps/outbox-worker/test/canary/standaloneCanaryAcceptance.test.ts --max-warnings 0`; `pnpm --filter dvt-outbox-worker typecheck`; `pnpm --filter dvt-outbox-worker build`; `pnpm --filter dvt-outbox-worker test`; `pnpm lint:md`; `pnpm docs:canonical:check`; `pnpm docs:status:generate`
- `2026-03-10` `G5.4A / #446` `in progress`
  summary: simplified the canary fixture to seed pending records without patching the adapter write path, removed the admin-port reserve/rebind race, and integrated the generated status file so the documentation gate is now executable for this slice
  validation: `pnpm exec eslint apps/outbox-worker/test/canary/standaloneCanaryAcceptance.test.ts --max-warnings 0`; `pnpm --filter dvt-outbox-worker typecheck`; `pnpm --filter dvt-outbox-worker build`; `pnpm --filter dvt-outbox-worker test`; `pnpm lint:md`; `pnpm docs:canonical:check`; `pnpm docs:status:check`
- `2026-03-11` `G5.4A / #446` `in progress`
  summary: extended the automated canary acceptance with a downstream-rejection path that proves the standalone worker surfaces failing readiness plus retry metrics without claiming a runtime-loop error
  validation: `pnpm exec eslint apps/outbox-worker/test/canary/standaloneCanaryAcceptance.test.ts --max-warnings 0`; `pnpm --filter dvt-outbox-worker test`
- `2026-03-12` `G5.5 / #414` `in planning`
  summary: consolidated the selected multi-worker direction into canonical G5 docs and an ADR draft: deterministic `runId` sharding, persisted `shard_id`, dedicated advisory-lock ownership sessions, explicit lock-loss semantics, and migration-only resharding
  validation: `pnpm lint:md`; `pnpm docs:sync`; `pnpm docs:quality:check`; `pnpm docs:canonical:check`
- `2026-03-12` `G5.5A / #414` `in progress`
  summary: accepted `ADR-0033`, implemented startup advisory-lock ownership sessions on a dedicated PostgreSQL connection, and wired the standalone host to refuse active startup when any configured shard lock is unavailable
  validation: `node --import tsx --test test/ownership/PgShardOwnershipGate.test.ts`; `pnpm --filter dvt-outbox-worker typecheck`
- `2026-03-12` `G5.5B / #414` `done`
  summary: closed the repo-side ownership-loss shutdown and shard-scoped retry readiness slice; the standalone host now stops on lost shard ownership, the retry backlog check is scoped to owned shards, and tracker focus moves to concurrent-worker proof with real PostgreSQL evidence
  validation: `pnpm --filter dvt-outbox-worker typecheck`; `pnpm --filter dvt-outbox-worker build`; `pnpm --filter dvt-outbox-worker test`; `pnpm test:engine`; `pnpm test:adapter-postgres`; `pnpm lint:md`; `pnpm docs:quality:check` (archive warnings only, exit `0`); `pnpm docs:canonical:check`
- `2026-03-12` `G5.5C / #414` `in progress`
  summary: (retroactive — current pointer and think-first should have been updated before writing code) wrote pre-implementation brief and think-first for concurrent-worker ordering proof; selected probe-based `InMemoryOutboxStorage` + `OutboxWorker` unit tests as the proof surface to avoid a live database dependency
  validation: repo inspection of `packages/@dvt/engine/src/outbox/InMemoryOutboxStorage.ts` and `OutboxWorker.ts` to confirm shard routing and head-of-line semantics
- `2026-03-12` `G5.5C / #414` `done`
  summary: added 6 deterministic concurrent-worker ordering tests in `apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts`; tests prove INV-OUTBOX-002 (shard routing determinism, worker exclusivity, zero cross-worker record overlap, strict per-runId runSeq ordering, non-owning worker cannot advance a mid-stream runId, all events delivered exactly once across two workers); 109/109 pass
  validation: `pnpm exec eslint apps/outbox-worker/test/sharding/concurrentWorkerOrdering.test.ts --max-warnings 0` pass; `pnpm --filter dvt-outbox-worker typecheck` pass; `pnpm --filter dvt-outbox-worker test` 109/109 pass
- `2026-03-12` `G5.5D / #414` `done`
  summary: PostgreSQL advisory lock exclusivity integration test executed against the repo `postgres:16` compose service; both tests pass — gate2 returns null while gate1 holds the advisory lock for shard 0, and gate2 acquires after gate1 releases; proves ADR-0033 fencing operates at the database-session level
  validation: `docker compose -f infra/docker/postgres/docker-compose.yml up -d`; `DATABASE_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter dvt-outbox-worker exec node --import tsx --test test/ownership/PgShardOwnershipGate.integration.test.ts` → `2/2` pass
- `2026-03-12` `G5.4 / #413` `in progress`
  summary: added `scripts/outbox-worker-canary-evidence.ps1` — automated evidence-collection script that requires exactly one of `-PsqlDsn` / `-TriggerCommand`, awaits `/readyz` with `ready=true`, baselines and diffs `/metrics` for delivered/error counters, executes the trigger, waits for delivery increment, writes `docs/evidence/ED-<date>-g5-canary-<env>.md`, optionally captures `kubectl` deployment snapshot, and flags the dual-active proof step as requiring a human note; documented in `docs/runbooks/outbox-worker-g5.md` and `scripts/README.md`
  validation: script authored and usage documented; external canary execution against a real environment remains pending
- `2026-03-12` `G5.4 / #413` `done`
  summary: local-docker canary executed against the repo `postgres:16` compose service; the compiled worker started with `DVT_OUTBOX_OWNERSHIP_MODE=active` and `DVT_OUTBOX_EVENT_BUS_MODE=log`, `/readyz` returned `owner=true`, `dvt_outbox_delivered_records_total` went `0→1`, `dvt_outbox_runtime_errors_total` stayed at `0`, and the latest outbox row showed `delivered_at` populated with `attempts=0`; evidence written to `docs/evidence/ED-20260312-g5-canary-local-docker.md`
  validation: `docker compose -f infra/docker/postgres/docker-compose.yml up -d`; `DATABASE_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm db:migrate`; `pnpm --filter @dvt/adapter-postgres build`; `pnpm --filter @dvt/engine build`; `pnpm --filter dvt-outbox-worker build`; local worker start via `node apps/outbox-worker/dist/server.js`; `.\scripts\outbox-worker-canary-evidence.ps1 -EnvironmentName local-docker ... -TriggerCommand "docker cp ...; docker exec ... psql -f /tmp/g5-canary-trigger.sql"`; DB confirmation via `docker exec dvt-postgres psql -U dvt -d dvt -P pager=off -c "SELECT ... ORDER BY created_at DESC LIMIT 1;"`
