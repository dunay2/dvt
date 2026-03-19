---
title: Gap 4 PR2 Raw Snapshot Store
status: Proposed
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

## Checklist

- [ ] raw snapshot contract returns tenant active, tenant stuck, global active
- [ ] global shared metric excludes tenants already locally overloaded
- [ ] duplicate probe backed by persisted state
- [ ] query timeout is explicit and tested
- [ ] SQL fixtures include poison-event scenario
- [ ] SQL fixtures include noisy-tenant scenario
- [ ] no write-path schema mutation is required yet

## Resolution Table

| Item                           | Status   | Notes                                             |
| ------------------------------ | -------- | ------------------------------------------------- |
| Raw snapshot source            | Proposed | Bootstrap source only, not the final steady state |
| Active or stuck classification | Proposed | Admission math excludes stuck backlog             |
| Duplicate lookup backend       | Proposed | Query-backed before engine delegation             |
| Review readiness               | Proposed | Must remain green without cache or projection     |
