---
title: 20260329 Run Event Retention TTL Kickoff Review
status: Review
owner: Architecture / Runtime / Data
last_reviewed: 2026-03-29
planning_type: review
---

# 20260329 Run Event Retention TTL Kickoff Review

## Scope

Lane D task: `run event log retention + TTL` (P1).

Target outcome:

- bound unbounded growth of hot `run_events`
- automate archival trigger from hot store to archive units
- keep public API contract unchanged

Out of scope for this slice:

- restore flow and deferred deletion orchestration (`G5-PR2`)
- redaction model (`G5-PR4`)
- partitioning/read-replica strategy (P2 backlog)

## Current Baseline (Code-Grounded)

Implemented and available:

- archive lifecycle domain and ports in `@dvt/state-store`
  - `RunArchiveCoordinator`
  - `RunEventRetentionPolicy`
  - `IRunArchiveStore`
- postgres adapter support in `@dvt/adapter-postgres`
  - `PostgresRunArchiveStore`
  - archive catalog schema and lifecycle columns (`delete_after`, archive state)
- delivery-buffer purge runtime already wired in `apps/outbox-worker`
  - periodic scheduler + env policy wiring

Observed gap:

- no active runtime wiring in `apps/outbox-worker` that periodically calls
  `RunArchiveCoordinator.archiveEligibleHotData(policy)` with a retention policy.
- retention policy exists at domain level but not yet operationalized by worker env.

## Root Cause

The repository shipped archive domain primitives and adapter capabilities first,
but operational runtime wiring was only completed for delivery-buffer retention.
`run_events` retention was left as a queued lane task.

This is a composition gap at the application runtime boundary, not a missing
domain model.

## Architectural Intent (DDD / Hexagonal / SRP)

- Domain/Application (`@dvt/state-store`): keep retention semantics and archive
  orchestration policy pure and reusable.
- Adapter (`@dvt/adapter-postgres`): keep SQL/data access in adapter stores.
- App runtime (`apps/outbox-worker`): own scheduling, env configuration, and
  dependency composition.

SRP target:

- runtime scheduler handles only loop/start-stop behavior
- coordinator handles archive orchestration only
- store handles persistence only

## First Delivery Slice (This Lane Kickoff)

1. Add outbox-worker runtime wiring for run-event retention archival trigger.
2. Introduce explicit env configuration for this runtime slice:
   - enable flag
   - interval
   - hot retention days
   - archive bucket count
   - terminal snapshot pin toggle
3. Keep behavior opt-in (disabled by default) to avoid contract/regression risk.

## TDD Plan (RED -> GREEN -> REFACTOR)

RED:

- env tests:
  - defaults for archival runtime flags
  - reject invalid retention config values
- createOutboxWorkerRuntime tests:
  - retention runtime starts when enabled
  - retention runtime is not started when disabled
  - stop path closes retention runtime even when outbox runtime stops with error

GREEN:

- implement env schema fields
- implement runtime composition in `createOutboxWorkerRuntime`
- implement small periodic runtime wrapper for archive trigger execution

REFACTOR:

- remove duplicated scheduler concerns if overlap with existing purge runtime
- keep naming explicit (`run event retention`) instead of generic `shared`

## Validation Baseline For This Slice

- `pnpm --filter dvt-outbox-worker test -- test/plugins/env.test.ts`
- `pnpm --filter dvt-outbox-worker test -- test/runtime/createOutboxWorkerRuntime.test.ts`
- `pnpm --filter dvt-outbox-worker typecheck`
- `pnpm verify:prepush`

## Risks And Controls

- Risk: retention runtime can add load spikes.
  - Control: low-frequency interval + bounded per-cycle archival policy.
- Risk: accidental behavior change in existing outbox loop.
  - Control: retention runtime isolated and independently stoppable.
- Risk: partial wiring without coverage.
  - Control: tests on env + runtime composition before implementation closure.

## Decision

Proceed with runtime composition slice first, then continue with `G5-PR2` once
retention trigger is operational and covered.
