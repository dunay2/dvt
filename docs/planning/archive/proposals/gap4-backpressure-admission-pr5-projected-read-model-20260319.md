---
title: Gap 4 PR5 Projected Read Model
status: Proposed
owner: Architecture / API / Delivery / Adapter Postgres
last_reviewed: 2026-03-19
planning_type: proposal
---

# Gap 4 PR5 Projected Read Model

## Goal

Replace the bootstrap raw query path with the steady-state shared read model
used for admission and future dynamic retry guidance.

## Scope

This PR adds:

- `delivery_backpressure_snapshot`
- incremental snapshot maintenance
- projection lag metrics
- throughput persistence for future dynamic `Retry-After`
- switch of enforcement source from raw SQL to projected snapshot

## In Scope

- schema and migration for projected snapshot
- projector or updater implementation
- projection freshness SLA checks
- throughput fields in snapshot
- enforcement cutover tests

## Out Of Scope

- event-weighted backlog unless evidence already proves it necessary
- tenant-specific override policy

## File Areas

- adapter-postgres schema and migrations
- delivery-side projection updater
- API adapter switching from raw to projected source

## Verification Target

- projection freshness tests
- enforcement parity tests between raw and projected source
- `pnpm --filter @dvt/adapter-postgres test`
- `pnpm verify:prepush`

## Checklist

- [ ] projected snapshot table exists
- [ ] snapshot captures tenant and global throughput
- [ ] projection lag metrics exist
- [ ] projection freshness SLA is asserted in tests
- [ ] enforcement source can switch from raw to projected safely
- [ ] fixed `Retry-After` can later evolve without changing error shape
- [ ] rollout path from raw to projected source is documented

## Resolution Table

| Item                   | Status   | Notes                                       |
| ---------------------- | -------- | ------------------------------------------- |
| Projected snapshot     | Proposed | Final steady-state source for admission     |
| Throughput persistence | Proposed | Precondition for future dynamic Retry-After |
| Projection SLA         | Proposed | Freshness must be measurable and enforced   |
| Review readiness       | Proposed | Final PR before long-tail tuning            |
