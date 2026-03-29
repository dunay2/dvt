---
title: Agent Lane A - Contracts And State-Store Boundary
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-26
planning_type: status
---

# Agent Lane A - Contracts And State-Store Boundary

Unassigned lane for parallel work. Use this file when assigning Agent A.

## Goal

Close the state-store boundary and the smallest contract cleanup slice around it.

## Tasks

> Source of truth: `agent-lane-a.yaml`. Edit the YAML and run `pnpm docs:sync`.

- [ ] `P0` `MVP-A1`: inventory the current backend MVP contractual surface (routes, invariants, and explicit boundaries) without adding new runtime behavior.
- [x] `P0` `RC-A6`: align dead-letter signatures with tenant-scoped concrete APIs.
- [x] `P0` `S02`: split IRunStateStore into write/read/maintenance roles.
- [x] `P0` `S18`: make composition-root state-store role bindings explicit instead of reconstructing the aggregate by intersection.
- [x] `P1` `S19`: isolate the maintenance query ownership by moving `listStaleSnapshotRuns` into a dedicated query port.
- [ ] `P2` `S19-F1`: remove the correlated stale-snapshot scan pattern in `listStaleSnapshotRunsSql` to avoid O(N)-per-row behavior at high run concurrency.
- [ ] `P2` `S18-F1`: harden the explicit state-store role bundle into a root-owned boundary and prevent convenience rewiring drift.
- [x] `P1` `schema-migration-rollback`: make storage changes recoverable after S02.
- [x] `P1` `S13`: remove duplicate estimateRunRef declaration.
- [x] `P1` `RC-A5`: replace silent markResolved catch with warning/metric telemetry so intent-resolution failures are observable.
- [ ] `P1` `RC-E3`: replace throw-based engine errors in StartRunAuthorizedFacade with Result<T, EngineError> return type to eliminate the Divergent Change smell.
- [ ] `P1` `DHM`: drive DDD/Hexagonal modularization slices starting with WS5 (test fixture modularization), then WS1, WS3, WS4, WS2, WS6.
- [ ] `P1` `plan-version-reset`: reset planVersion from '2.3' to '1.0' across contracts, registry, and test helpers before go-live.

## Dependencies

- `MVP-A1` is the baseline-first task for roadmap reset and should run before any new deep-dive slice.
- `S02` depends on `RC-A6`.
- `S18` depends on `S02`.
- `S19` depends on `S18`.
- `S19-F1` depends on `S19`.
- `S18-F1` depends on `S18`.
- `Schema migration rollback` depends on `S02`.
- `S13` is independent and can run in parallel.
- `RC-E3` is a prerequisite to S03 or similar; breaking interface change — coordinate with Lane C.
- `RC-E3` closeout deferred until PR #639 is merged to main.
- `DHM` starts with WS5; follow WS1, WS3, WS4, WS2, WS6 dependency order.
- `plan-version-reset` is independent and can run in parallel.

## Expected Outcome

- state-store ownership is explicit
- composition-root wiring names exact roles
- contract drift is reduced
- optional maintenance ownership is explicit
- migration recovery is defined
