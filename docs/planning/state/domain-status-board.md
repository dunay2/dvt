---
title: Domain Status Board
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-04-14
planning_type: status
---

# Domain Status Board

Operational board by domain with explicit links to task IDs and roadmap impact.

For full task-level tracking use the lane YAML registry linked from
[Planning Control Tower](./planning-control-tower.md).

## Domain Board

### `Execution Runtime`

- Current objective: keep the shipped PostgreSQL-backed transformation runtime
  vertical stable while finishing `WE-HX` hardening and the remaining runtime
  observability or operations follow-through.
- Active task IDs: `WE-HX`, `WE-HX-0`, `AR-C2-T2`, `AR-C2-T3`, `RC-C2`
- Roadmap lane affected: [Execution Runtime lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: the first PostgreSQL runtime vertical is now accepted, but
  dashboard and alert evidence for runtime SLAs still remain under
  `AR-C2-T2/T3`, and broader boundary hardening continues under `WE-HX` while
  Lane D now owns only post-vertical retention follow-through rather than basic
  proof repeatability.

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

- Current objective: keep the shipped retention baseline explicit and move the
  remaining focus to default-retention enforcement after the proof lifecycle
  closure.
- Active task IDs: `AR-D8`
- Roadmap lane affected:
  [Event Lifecycle and Retention lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: the canonical proof wrapper now owns reset, cleanup, and
  rerun discipline, but default-retention health alerts and mandatory
  retention-by-default posture still remain open under `AR-D8`.

### `UI / Frontend`

- Current objective: keep the first SQL-first transformation
  `Design -> Plan -> Run -> Result` loop code-grounded in Lane E while the
  parent vertical remains open on upstream Lane A and Lane C dependency truth.
- Active task IDs: `TF-E1`, `F-23`, `F-24`, `F-25`
- Roadmap lane affected: [UI and Frontend lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: Lane E now ships the authoring, persisted preview or
  start-run handoff, and result UX pieces for the first operator loop, but the
  parent vertical still depends on open Lane A or Lane C closure under `TF-A1`
  and `TF-C1`. Broader UI work also remains: `F-23` still waits on `F-06` and
  `F-17-B`, while `F-24` and `F-25` continue the workbench and plugin
  professionalization chain.

### `Traceability`

- Current objective: keep the first transformation vertical caller-visible and
  shift the remaining Lane B attention back to append-boundary closeout and
  determinism hardening after making the consistency story explicit.
- Active task IDs: `AR-B1`, `AR-B1-E`, `AR-B3`
- Roadmap lane affected: [Planner and Contracts lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: the first SQL-first provenance chain is now caller-visible
  and the distributed consistency model is now documented, but append-boundary
  closeout and determinism hardening still remain.

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
