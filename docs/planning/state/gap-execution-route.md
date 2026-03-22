---
title: Gap Execution Route
status: Review
owner: Architecture / Delivery / Docs
last_reviewed: 2026-03-22
planning_type: status
---

# Gap Execution Route

Explicit execution route for dependencies, blockers, sequencing, and parallel
tracks across gap-oriented work.

This page complements, but does not replace:

- [DVT+ Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md)
- [Roadmap Of Record](../roadmap/index.md)
- [Execution Workboard](execution-workboard.md)

## Tracking Precedence

Use this order for execution tracking:

1. [Execution Workboard](execution-workboard.md) for active tasks, objectives,
   blockers, and roadmap-lane impact.
2. [Gap Execution Route](gap-execution-route.md) for dependency and parallelism
   rules.
3. [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md) for canonical gap
   posture and close criteria.

## Current Context

- All G1..G10 gaps are currently marked `Closed` in
  [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md).
- The route below defines the operational ordering to use when new slices are
  opened, reopened, or split into follow-up PR lanes.

## Dependency Order

Execution dependency chain to apply for new slices:

1. `Foundation lane`
   G1, G2, G3, G4
2. `Runtime lane`
   G5 -> G7
3. `Traceability lane`
   G6 -> G10
4. `API and access lane`
   G8 (can run in parallel with G6/G7 after G3 and G4 contracts are stable)
5. `Typed planner/runtime lane`
   G9 (gates typed configuration before downstream hardening)

Detailed graph:

- [Gap Execution Dependency Graph](../roadmap/diagrams/gap-execution-dependency-graph.md)

## Parallelism Model

Use these parallel tracks after foundation gates are satisfied:

- `Track A: Runtime`
  G5, G7 lifecycle, and retention slices.
- `Track B: API and Admission`
  Gap 4 PR1..PR5 sequence.
- `Track C: Planner and Contracts`
  G9-compatible planner/contract evolution.
- `Track D: Traceability`
  G6 and G10 lineage/contract artifacts.

Synchronization gates:

1. `Gate F`: G3 + G4 stable before Tracks A/B/C split.
2. `Gate R`: G5 ownership/runtime checks green before G7 projector advances.
3. `Gate C`: contract/version compatibility checks green before API rollout.
4. `Gate P`: prepush and docs governance checks pass before closeout.

Parallel lane diagram:

- [Gap Execution Parallel Lanes](../roadmap/diagrams/gap-execution-parallel-lanes.md)

## Blocker Register

- `B1: Contract drift`
  Trigger: planner/runtime schema or planVersion changes.
  Mitigation: lock with ADR and compatibility matrix updates before merge.
- `B2: Runtime ownership ambiguity`
  Trigger: outbox/projector ownership or fencing uncertainty.
  Mitigation: enforce shard/ownership tests and closeout evidence first.
- `B3: Status and roadmap divergence`
  Trigger: proposal says active, status says closed (or inverse).
  Mitigation: sync `GAP_EXECUTION_PLANS`, `system-delivery-status`, and
  closeout docs in the same slice.
- `B4: Test lane instability`
  Trigger: failing package tests or prepush governance checks.
  Mitigation: do not advance track; fix lane or split PR scope.

## Proposal Bundles By Lane

- `Gap 4 bundle (API admission)`
  [Gap 4 Design](../proposals/gap4-backpressure-admission-design-20260319.md),
  [PR1](../proposals/gap4-backpressure-admission-pr1-foundation-20260319.md),
  [PR2](../proposals/gap4-backpressure-admission-pr2-raw-store-20260319.md),
  [PR3](../proposals/gap4-backpressure-admission-pr3-resilience-20260319.md),
  [PR4](../proposals/gap4-backpressure-admission-pr4-operability-20260319.md),
  [PR5](../proposals/gap4-backpressure-admission-pr5-projected-read-model-20260319.md)
- `Gap 5 bundle (event lifecycle)`
  [Gap 5 Sequence](../proposals/gap-5-sequence-and-module-design-20260319.md),
  [PR1](../proposals/gap-5-pr1-minimal-usable-archival-20260319.md),
  [PR2](../proposals/gap-5-pr2-deferred-deletion-and-restore-20260319.md),
  [PR3](../proposals/gap-5-pr3-delivery-buffer-retention-20260319.md),
  [PR4](../proposals/gap-5-pr4-redaction-adr-follow-up-20260319.md)
- `Planner/contract bundle`
  [Planner Target State Roadmap](../proposals/planner-target-state-roadmap-20260320.md),
  [Principal Architecture Review Execution Plan](../proposals/principal-architecture-review-execution-plan-20260317.md)

## Domain Architecture Delta Diagrams

- [Execution Runtime Architecture Delta](../roadmap/diagrams/execution-runtime-architecture-delta.md)
- [API and Admission Architecture Delta](../roadmap/diagrams/api-admission-architecture-delta.md)
- [Planner and Contracts Architecture Delta](../roadmap/diagrams/planner-contracts-architecture-delta.md)
- [Event Lifecycle and Retention Architecture Delta](../roadmap/diagrams/event-lifecycle-retention-architecture-delta.md)
- [Documentation Governance Architecture Delta](../roadmap/diagrams/documentation-governance-architecture-delta.md)
