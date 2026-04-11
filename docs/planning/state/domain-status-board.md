---
title: Domain Status Board
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-04-10
planning_type: status
---

# Domain Status Board

Operational board by domain with explicit links to task IDs and roadmap impact.

For full task-level tracking use the lane YAML registry linked from
[Planning Control Tower](./planning-control-tower.md).

## Domain Board

### `Execution Runtime`

- Current objective: fix Temporal cancel semantics first, then close the
  run-reference and worker-runtime boundary cleanup while keeping the
  PostgreSQL-backed transformation runtime vertical truthful.
- Active task IDs: `AR-C6`, `WE-HX`, `WE-HX-5`, `WE-HX-6`, `TF-C2`, `TF-C2-A`,
  `TF-C2-B`, `AR-A12`, `AR-A7`
- Roadmap lane affected:
  [Execution Runtime lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: `T-01` remains open today; `EngineRunRef` still leaks
  provider coordinates; downstream provenance and evidence convergence also
  remains open.

### `API and Admission`

- Current objective: keep `POST /plans/preview` truthful as the preview-persist
  boundary and converge callers onto the real `PlanRef` contract.
- Active task IDs: `TF-C1`, `TF-C1-A`, `TF-C1-B`
- Roadmap lane affected:
  [API and Admission lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: Lane A/B contract formalization and
  transformation-profile caller adoption are still open.

### `Planner and Contracts`

- Current objective: freeze `DesignGraphDraft`, `GitArtifactRef`, and compiler
  mapping while continuing shared-kernel cleanup without reopening closed
  payload-version work.
- Active task IDs: `S08`, `TF-A1`, `TF-A1-A`, `TF-A1-B`, `RC-G1-B`
- Roadmap lane affected:
  [Planner and Contracts lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: the contract pack is still queued and engine-owned ports
  still sit in `@dvt/contracts`.

### `Event Lifecycle and Retention`

- Current objective: add repeatable PostgreSQL proof-environment reset
  discipline and make default retention wiring non-optional without regressing
  the shipped baseline.
- Active task IDs: `run event log retention + TTL`, `AR-D8`, `TF-D1`
- Roadmap lane affected:
  [Event Lifecycle and Retention lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: the canonical proof wrapper is landed, but reset
  discipline and default-retention health alerts still need end-to-end closure.

### `UI / Frontend`

- Current objective: close the explicit transformation
  `Design -> Plan -> Run -> Result` loop on governed contracts and
  backend-owned evidence.
- Active task IDs: `TF-E1`, `TF-E1-A`, `TF-E1-B`, `TF-E1-C`, `F-23`
- Roadmap lane affected:
  [UI and Frontend lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: Lane A contract freeze and Lane C runtime evidence are
  still missing; `F-23` also waits on `F-06` and `F-17-B`.

### `Traceability`

- Current objective: define the Git-first provenance chain from graph and SQL
  artifacts to persisted plan and runtime outcome for the new vertical.
- Active task IDs: `TF-B1`, `TF-B1-A`, `TF-B1-B`
- Roadmap lane affected:
  [Planner and Contracts lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: no executable provenance contract exists yet for the
  transformation flow.

### `CI / Infrastructure`

- Current objective: institutionalize shared preflight and keep docs/code
  validation loops cheap enough to sustain the active lane tempo.
- Active task IDs: `RC-C2`, `GOV-S2`
- Roadmap lane affected:
  [Documentation Governance lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: `RC-C2` still needs qualifying Lane C cycles, and metadata
  noise still hides semantic drift.

### `Documentation Governance`

- Current objective: keep canonical status, archive boundaries, domain boards,
  and generated planning surfaces synchronized with mainline truth.
- Active task IDs: `GOV-S2`, `DOC-ARCH-01`
- Roadmap lane affected:
  [Documentation Governance lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: active surfaces drift after merges unless archive moves,
  lane refresh, and generators run together.

## Canonical Anchors

- [Planning Control Tower](./planning-control-tower.md)
- [Roadmap Of Record](../roadmap/index.md)
- [Roadmap By Domain](../roadmap/roadmap-by-domain.md)
- [System Delivery Status](../../architecture/system-delivery-status.md)

## Reading Order

1. [Planning Control Tower](./planning-control-tower.md)
2. [Roadmap Of Record](../roadmap/index.md)
3. [Roadmap By Domain](../roadmap/roadmap-by-domain.md)
4. [Domain Views](../domains/index.md)
