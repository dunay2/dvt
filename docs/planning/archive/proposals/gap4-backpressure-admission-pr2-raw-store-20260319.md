---
title: Gap 4 PR2 Raw Snapshot Store
status: In Progress
owner: Architecture / API / Delivery / Adapter Postgres
last_reviewed: 2026-03-19
planning_type: proposal
---

# Gap 4 PR2 Raw Snapshot Store

## Goal

Provide the first production snapshot source over existing tables, while
separating active backlog from stuck backlog.

## Scope

This PR adds:

- `RawSqlBackpressureStore`
- active versus stuck classification
- first SQL-backed `DuplicateRunProbe`
- query timeout policy
- baseline index review and SQL fixtures

## In Scope

- reads over `outbox` and `run_metadata`
- `stuckEventAgeThresholdMs`
- tenant and shared snapshot fields
- tests with realistic Postgres fixtures

## Out Of Scope

- cache and circuit breaker
- persisted fallback
- shared projected snapshot table
- dynamic throughput projection

## File Areas

- `packages/@dvt/adapter-postgres/*`
- `apps/api/src/infrastructure/*`
- integration tests under API or adapter-postgres

## Verification Target

- `pnpm --filter @dvt/adapter-postgres test`
- `pnpm --filter dvt-api test`
- query tests for:
  active backlog, stuck backlog, multi-tenant fairness, duplicate lookup

## Implementation Notes

- `PostgresBackpressureSnapshotReader` lives in `@dvt/adapter-postgres` and
  returns the richer SQL snapshot needed by this slice:
  tenant active, tenant stuck, global active, and shared oldest age
- `RawSqlBackpressureStore` lives in API infrastructure and adapts that richer
  snapshot to the current `@dvt/delivery` guard contract without changing the
  delivery package yet
- `PostgresDuplicateRunProbe` is query-backed from `run_metadata` and
  `start_run_intents`
- `buildProtectedRuntimeModule.ts` now wires real SQL-backed duplicate and
  backpressure collaborators, while runtime admission still defaults to
  `off` unless env enables it
- schema scope and query-timeout configuration now flow through the protected
  runtime module consistently

## Checklist

- [x] raw snapshot contract returns tenant active, tenant stuck, global active
- [x] global shared metric excludes tenants already locally overloaded
- [x] duplicate probe backed by persisted state
- [x] query timeout is explicit and tested
- [x] SQL fixtures include poison-event scenario
- [x] SQL fixtures include noisy-tenant scenario
- [x] no write-path schema mutation is required yet

## Resolution Table

| Item                           | Status              | Notes                                             |
| ------------------------------ | ------------------- | ------------------------------------------------- |
| Raw snapshot source            | Implemented locally | Bootstrap source only, not the final steady state |
| Active or stuck classification | Implemented locally | Admission math excludes stuck backlog             |
| Duplicate lookup backend       | Implemented locally | Query-backed from persisted state                 |
| Review readiness               | Green locally       | Both targeted suites pass locally                 |
