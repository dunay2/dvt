---
title: Agent Lane C - Runtime Safety And Admission
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-24
planning_type: status
---

# Agent Lane C - Runtime Safety And Admission

Unassigned lane for parallel work. Use this file when assigning Agent C.

## Goal

Harden runtime behavior, admission checks, and caller-visible freshness.

## Tasks

> Source of truth: `agent-lane-c.yaml`. Edit the YAML and run `pnpm docs:sync`.

- [ ] `P0` `S09`: decide retry ownership across planner, engine, and adapters.
- [ ] `P0` `RC-D2`: make the outbox claim timeout configurable.
- [ ] `P0` `RC-D3`: normalize Temporal not-found error code comparison.
- [ ] `P1` `RC-D1`: surface reconciler degradation in API health.
- [ ] `P1` `RC-D1A`: add health compatibility and watchdog integration tests.
- [ ] `P1` `RBAC at operation level`: enforce tenant-aware start/signal/cancel rules.
- [ ] `P1` `snapshot staleness in API`: expose freshness to callers.
- [ ] `P2` `read-your-writes contract`: set a measurable staleness SLO.
- [ ] `P2` `granular RBAC`: split CANCEL and PAUSE privileges.

## Dependencies

- `RC-D1A` depends on `RC-D1`.
- `RBAC at operation level` depends on `S09`.
- `Read-your-writes contract` depends on `snapshot staleness in API`.

## Expected Outcome

- runtime failures are explicit
- claim semantics are safe under concurrency
- API consumers can reason about freshness
