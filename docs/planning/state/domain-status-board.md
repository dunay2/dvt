---
title: Domain Status Board
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-04-13
planning_type: status
---

# Domain Status Board

Operational board by domain with explicit links to task IDs and roadmap impact.

For full task-level tracking use the lane YAML registry linked from
[Planning Control Tower](./planning-control-tower.md).

## Domain Board

### `Execution Runtime`

- Current objective: keep the provider-native Temporal cancellation slice
  narrow while finishing the PostgreSQL-backed transformation runtime vertical
  without regressing runtime semantics.
- Active task IDs: `AR-C6`, `WE-HX`, `WE-HX-5`, `WE-HX-6`, `TF-C2`, `TF-C2-A`
- Roadmap lane affected: [Execution Runtime lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: downstream provider-live versus persisted-terminal-status
  convergence and the delivery runtime harness extraction still sit ahead of
  full runtime closure; TF-C2-B read-surface evidence is now accepted.

### `API and Admission`

- Current objective: keep `POST /plans/preview` truthful as the
  preview-persist boundary and converge callers onto the real `PlanRef`
  contract.
- Active task IDs: `TF-C1`, `TF-C1-A`, `TF-C1-B`
- Roadmap lane affected: [API and Admission lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: Lane A or B contract formalization and
  transformation-profile caller adoption are still open.

### `Planner and Contracts`

- Current objective: finish the remaining contract-pack and shared-kernel
  formalization work after the engine read-boundary reset, then freeze
  `DesignGraphDraft`, `GitArtifactRef`, and compiler mapping so the
  transformation vertical stops depending on UI-local assumptions.
- Active task IDs: `AR-A12`, `AR-A12-A`, `AR-A12-B`, `RC-G1-B`, `S08`,
  `TF-A1`, `TF-A1-A`, `TF-A1-B`
- Roadmap lane affected: [Planner and Contracts lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: the engine facade read-boundary split is now closed, but
  the broader contract-pack reset and shared-kernel ownership work are still
  open under `AR-A12-A`, `AR-A12-B`, and `RC-G1-B`, while the transformation
  contract freeze remains queued behind that formalization work.

### `Event Lifecycle and Retention`

- Current objective: add repeatable PostgreSQL proof-environment reset
  discipline without regressing the shipped retention baseline.
- Active task IDs: `run event log retention + TTL`, `AR-D8`, `TF-D1`
- Roadmap lane affected:
  [Event Lifecycle and Retention lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: the canonical proof wrapper is landed, but reset
  discipline and default-retention health alerts still need end-to-end
  closure.

### `UI / Frontend`

- Current objective: close the explicit transformation
  `Design -> Plan -> Run -> Result` loop on governed contracts and
  backend-owned evidence.
- Active task IDs: `TF-E1`, `TF-E1-A`, `TF-E1-B`, `TF-E1-C`, `F-23`
- Roadmap lane affected: [UI and Frontend lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: Lane A contract freeze and the remaining preview/result UX
  completion under `TF-E1-B` and `TF-E1-C` are still open; `F-23` also waits
  on `F-06` and `F-17-B`.

### `Traceability`

- Current objective: keep the first transformation vertical caller-visible and
  shift the remaining Lane B attention back to append-boundary, consistency,
  and determinism hardening.
- Active task IDs: `AR-B1`, `AR-B1-E`, `AR-B2`, `AR-B3`
- Roadmap lane affected: [Planner and Contracts lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: the first SQL-first provenance chain is now caller-visible,
  but broader Lane B work still has open consistency and determinism closure.

### `CI / Infrastructure`

- Current objective: institutionalize shared preflight and keep docs and code
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
