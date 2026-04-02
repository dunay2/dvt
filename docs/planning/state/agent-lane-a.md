---
title: Agent Lane A - Contracts And State-Store Boundary
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-04-02
planning_type: status
---

You are Anne, architect for contracts and ownership boundaries. You focus on DDD, hexagonal design, and interface consistency.

## Mandatory Principles

- Minimal shared kernel: only cross-domain surfaces belong in contracts
- Contracts-first: do not change runtime behavior without a verifiable contract
- Explicit ownership: every port has a clear owner and boundary
- Disciplined composition root: no convenience rewiring
- Zero drift: docs, types, and tests must describe the same truth

## Working Style

- Define the domain boundary and contract
- Adjust root wiring without mixing responsibilities
- Validate with contract tests and negative regression coverage

## Constraints

- Do not move domain contracts into `@dvt/contracts` unless they are shared
- Do not add silent compatibility shortcuts
- Do not introduce hidden debt or TODO placeholders

# Agent Lane A - Contracts And State-Store Boundary

Generated from the verified lane registry `agent-lane-a.yaml`. Use this file when assigning Agent A.

## Goal

Close the state-store boundary, retire contract ownership drift, and keep governance startup executable.

## Verification Summary

- Status model: `evidence-backed lane registry`
- Done rule: `done only with accepted evidence or equivalent verifiable closure`
- Verified on: `2026-04-02`
- Total tasks: `34`
- Total effort points: `135`
- Completed weighted points: `65.86`
- Lane progress: `49%`
- Notes: Weighted progress uses effort_points. Parent umbrella tasks with subtasks carry coordination-only effort.

## Tasks

> Verified registry source: `agent-lane-a.yaml`. Edit the YAML and run `pnpm docs:planning:lanes:generate` plus `pnpm docs:workboard:generate`.

- [x] `P0` `MVP-A1` `done` `M` `5pt` `100%`: inventory the current backend MVP contractual surface (routes, invariants, and explicit boundaries) without adding new runtime behavior.
- [x] `P0` `RC-A6` `done` `S` `3pt` `100%`: align dead-letter signatures with tenant-scoped concrete APIs.
- [x] `P0` `S02` `done` `L` `8pt` `100%`: split IRunStateStore into write/read/maintenance roles.
- [x] `P0` `S18` `done` `M` `5pt` `100%`: make composition-root state-store role bindings explicit instead of reconstructing the aggregate by intersection.
- [x] `P1` `S19` `done` `M` `3pt` `100%`: isolate the maintenance query ownership by moving `listStaleSnapshotRuns` into a dedicated query port.
- [ ] `P2` `S19-F1` `in_progress` `L` `2pt` `70%`: remove the correlated stale-snapshot scan pattern in `listStaleSnapshotRunsSql` to avoid O(N)-per-row behavior at high run concurrency.
- [x] `P2` `S19-F1-A` `done` `M` `3pt` `100%` parent:`S19-F1`: replace the correlated stale-snapshot polling query with a run_event_heads-backed path.
- [x] `P2` `S19-F1-B` `done` `M` `3pt` `100%` parent:`S19-F1`: add snapshot_work_queue push-based projector discovery and queue claim wiring.
- [ ] `P2` `S19-F1-C` `queued` `M` `5pt` `0%` parent:`S19-F1`: close the remaining performance proof and claim-semantics risk for the snapshot work queue path.
- [ ] `P2` `S18-F1` `queued` `M` `1pt` `0%`: harden the explicit state-store role bundle into a root-owned boundary and prevent convenience rewiring drift.
- [ ] `P2` `S18-F1-A` `queued` `S` `2pt` `0%` parent:`S18-F1`: lock the explicit role bundle behind a stricter root-owned boundary.
- [ ] `P2` `S18-F1-B` `queued` `S` `2pt` `0%` parent:`S18-F1`: add regression guards against convenience rewiring of state-store roles.
- [ ] `P2` `S18-F1-C` `queued` `M` `3pt` `0%` parent:`S18-F1`: close the bundle contract shape with explicit export semantics and negative-path tests.
- [x] `P1` `schema-migration-rollback` `done` `M` `5pt` `100%`: make storage changes recoverable after S02.
- [x] `P1` `S13` `done` `S` `2pt` `100%`: remove duplicate estimateRunRef declaration.
- [ ] `P1` `RC-G1` `in_progress` `L` `2pt` `25%`: retire contract ownership drift across `engine`, `planner`, and `shared`.
- [x] `P1` `RC-G1-A` `done` `M` `3pt` `100%` parent:`RC-G1`: freeze the ownership matrix and the `stay shared` versus `move to owner` taxonomy.
- [ ] `P1` `RC-G1-B` `queued` `L` `5pt` `0%` parent:`RC-G1`: move non-shared engine ports out of `@dvt/contracts` and into `@dvt/engine`.
- [ ] `P1` `RC-G1-C` `queued` `L` `5pt` `0%` parent:`RC-G1`: move non-shared delivery, traceability, and artifacts ports to their owner packages.
- [ ] `P1` `RC-G1-D` `queued` `L` `5pt` `0%` parent:`RC-G1`: move planner-private ports to `@dvt/planner` and close the final shared-kernel cleanup.
- [x] `P2` `GOV-S1` `done` `S` `2pt` `100%`: add a quick-start governance router so startup no longer requires a deep inventory read.
- [x] `P1` `RC-A5` `done` `M` `3pt` `100%`: replace silent markResolved catch with warning/metric telemetry so intent-resolution failures are observable.
- [x] `P1` `RC-E3` `done` `M` `3pt` `100%`: replace throw-based engine errors in StartRunAuthorizedFacade with Result<T, EngineError> return type to eliminate the Divergent Change smell.
- [ ] `P1` `DHM` `in_progress` `L` `2pt` `52%`: drive DDD/Hexagonal modularization slices starting with WS5 (test fixture modularization), then WS1, WS3, WS4, WS2, WS6.
- [x] `P1` `DHM-WS5-A` `done` `M` `3pt` `100%` parent:`DHM`: modularize the first WS5 engine fixture slice around intent-log tests using shared builders.
- [x] `P1` `DHM-WS5-B` `done` `M` `5pt` `100%` parent:`DHM`: finish the remaining WS5 helper-heavy engine test fixture modularization.
- [x] `P1` `DHM-WS1` `done` `L` `8pt` `100%` parent:`DHM`: execute the WS1 DDD modularization slice after WS5 fixture extraction is complete.
- [ ] `P1` `DHM-WS3` `queued` `M` `5pt` `0%` parent:`DHM`: execute the WS3 modularization slice for the next bounded DDD seam.
- [ ] `P1` `DHM-WS4` `queued` `M` `5pt` `0%` parent:`DHM`: execute the WS4 modularization slice after WS3.
- [ ] `P1` `DHM-WS2` `queued` `L` `8pt` `0%` parent:`DHM`: execute the WS2 modularization slice after WS4.
- [ ] `P1` `DHM-WS6` `queued` `M` `5pt` `0%` parent:`DHM`: close the final WS6 modularization stream after the preceding workstreams land.
- [ ] `P0` `S08` `in_progress` `L` `8pt` `25%`: formalize the plan-record and plan-store model without reintroducing shared-kernel drift, dual plan identity, or repository-shaped CQRS collapse.
- [ ] `P1` `DOC-ARCH-01` `in_progress` `M` `3pt` `90%`: reconcile repository-wide architecture docs with current code, simplify overlapping architecture surfaces, and archive stale snapshots that no longer describe the shipped runtime.
- [x] `P1` `plan-version-reset` `done` `S` `3pt` `100%`: reset planVersion from '2.3' to '1.0' across contracts, registry, and test helpers before go-live.

## Dependencies

- `MVP-A1` is now closed as the contractual MVP baseline through the reviewed proposal plus the accepted evidence artifact dated 2026-03-31.
- `S02` depends on `RC-A6` and is now code-grounded by the split role contracts plus composition-root wiring.
- `S18` and `S19` are verified as closed slices; `S19-F1` is now decomposed into phase-level subtasks.
- `S19-F1-A` and `S19-F1-B` are delivered; `S19-F1-C` remains the benchmark and residual-risk closeout slice.
- `S18-F1` is decomposed into boundary hardening, anti-rewiring guards, and export/negative-path contract closure.
- `schema-migration-rollback` remains dependent on `S02` and is already closed with a concrete adapter rollback path.
- `DHM` is now split into WS5-A, WS5-B, WS1, WS3, WS4, WS2, and WS6 so remaining modularization work is schedulable.
- `DHM-WS5-B` and `DHM-WS1` are now closed; `DHM-WS3` is the next modularization slice in sequence.
- `RC-G1` is now the active Lane A tracker for contract ownership drift; `RC-G1-A` is closed and `RC-G1-B/C/D` define the remaining execution sequence.
- `GOV-S1` is closed with the startup card/router now published in the governance inventory.
- `S08` is now explicitly owned by Lane A as a planner-contracts plus artifacts-boundary workstream; the documentation truth-correction and ownership package are in progress while implementation slices remain queued behind that baseline.
- `DOC-ARCH-01` is the active architecture-documentation reconciliation tracker; it starts by freezing canonical sources, then truth-corrects active docs before any archive cleanup.
- `plan-version-reset` is closed and remains independent.

## Expected Outcome

- state-store ownership is explicit
- contract ownership routing is explicit
- composition-root wiring names exact roles
- contract drift is reduced
- optional maintenance ownership is explicit
- migration recovery is defined
- governance startup routing is explicit
