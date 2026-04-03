---
title: Agent Lane A - Contracts And State-Store Boundary
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-04-03
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
- Verified on: `2026-04-03`
- Total tasks: `37`
- Total effort points: `140`
- Completed weighted points: `66.36`
- Lane progress: `47%`
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
- [ ] `P0` `S08` `in_progress` `L` `8pt` `55%`: formalize the plan-record and plan-store model without reintroducing shared-kernel drift, dual plan identity, or repository-shaped CQRS collapse.
- [x] `P0` `S08-3` `done` `S` `2pt` `100%` parent:`S08`: introduce TenantId, RunId, PlanId branded/nominal types in @dvt/contracts and propagate to all port signatures to prevent silent parameter swapping and enforce tenant isolation at compile time.
- [ ] `P0` `S08-4` `queued` `M` `5pt` `0%` parent:`S08`: add per-StepKind JSON Schema validation in @dvt/plan-verifier so that stepTypeConfig is validated against a kind-specific schema before the plan reaches the adapter.
- [ ] `P0` `MW-A1` `queued` `L` `8pt` `0%`: create a StepKindRegistry with per-kind schema validation, adapter-to-kind mapping, and a documented extension protocol so that adding a new StepKind is a governed, testable operation.
- [ ] `P0` `MW-A2` `queued` `L` `8pt` `0%`: create a GenericGraphSource format that allows defining DAGs without dbt manifests, so the planner can accept workflow definitions from any source (Spark, Python, API, custom ETL).
- [ ] `P1` `AR-A3` `queued` `M` `5pt` `0%`: extract enrichRunStatus from IWorkflowEngine into a separate IRunEnrichmentService interface to keep the engine contract pure and remove adapter availability dependency from the read path.
- [ ] `P1` `MW-A3` `queued` `M` `5pt` `0%`: generalize compiledCodeRef to StepArtifactRef — not every step produces SQL; the artifact model must be step-kind-agnostic to support Python scripts, Spark jobs, API calls, etc.
- [ ] `P1` `MW-A4` `queued` `S` `3pt` `0%`: document a governed 'How to add a new StepKind' guide covering schema definition, adapter implementation, activity registration, policy mapping, and contract test requirements.
- [ ] `P2` `AR-A4` `queued` `S` `1pt` `0%`: remove or freeze the custom policy namespace registry (CustomPolicyNamespaceRegistry.v1.ts) until a real consumer exists to reduce speculative extensibility maintenance cost.
- [ ] `P2` `AR-A5` `queued` `S` `1pt` `0%`: verify that createdAtIso is excluded from the planCore JCS input for planId computation; if included, the same logical plan at different times produces different identity.
- [ ] `P2` `AR-A6` `queued` `S` `2pt` `0%`: add snapshot projection concurrency requirement to IRunStateStore contract so that mutual exclusion during rebuild is a contract invariant, not an implementation detail of advisory locks.
- [ ] `P2` `AR-A7` `queued` `M` `5pt` `0%`: split @dvt/delivery into domain rules (backpressure policy, admission guard) and runtime orchestration (worker runtime, polling loop) to maintain hexagonal architecture purity.
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
- `S08` is now explicitly owned by Lane A as a planner-contracts plus artifacts-boundary workstream; documentation truth-correction, ownership ADR, and artifacts-owned ports are delivered while migration and admission slices remain open.
- `S08-3/4/5/6` are explicit subtasks under `S08`; `S08-3` is closed and `S08-4` is now the next execution slice for Postgres migration compatibility.
- `plan-version-reset` is closed and remains independent.
- `AR-A1` through `AR-A7` originate from the 2026-04-02 deep architectural review; they address branded types (P0), stepTypeConfig validation (P0), enrichRunStatus extraction (P1), custom policy cleanup (P2), planId determinism (P2), snapshot concurrency contract (P2), and delivery package split (P2).
- `MW-A1` through `MW-A4` are multi-workflow generalization tasks: StepKindRegistry (P0), GenericGraphSource (P0), StepArtifactRef (P1), and step-kind extension guide (P1). MW-A1 depends on AR-A2; MW-A3 depends on MW-A1.

## Expected Outcome

- state-store ownership is explicit
- contract ownership routing is explicit
- composition-root wiring names exact roles
- contract drift is reduced
- optional maintenance ownership is explicit
- migration recovery is defined
- governance startup routing is explicit
