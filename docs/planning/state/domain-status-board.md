---
title: Domain Status Board
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-05-07
planning_type: status
---

# Domain Status Board

Operational board by domain with explicit links to task IDs and roadmap impact.

For full task-level tracking use the lane YAML registry linked from
[Planning Control Tower](./planning-control-tower.md).

## Domain Board

### `Execution Runtime`

- Current objective: keep the shipped PostgreSQL-backed transformation runtime
  vertical stable while finishing `WE-HX` hardening, the remaining runtime
  observability follow-through, and the first workflow-payload scale hardening
  cut.
- Active task IDs: `WE-HX`, `WE-HX-0`, `AR-C2-T2`, `AR-C2-T3`, `RC-C2`, `AR-D-PLAN-POINTER`
- Roadmap lane affected: [Execution Runtime lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: the first PostgreSQL runtime vertical is now accepted, but
  dashboard and alert evidence for runtime SLAs still remain under
  `AR-C2-T2/T3`, broader boundary hardening continues under `WE-HX`, and Lane D
  now owns the pointer-based workflow input hardening plus the post-vertical
  retention follow-through rather than only proof repeatability. The branch
  review also made explicit that DBT remains partially embedded in the default
  `@dvt/adapter-temporal` package surface even though it is no longer part of
  engine-kernel semantics, so that coupling now remains visible as runtime
  hardening debt instead of hidden cleanup.

### `API and Admission`

- Current objective: keep the shipped preview-persist boundary truthful and use
  it as the fixed ingress while `TF-C3` closes the remaining rollout and
  acceptance prerequisites for the now-landed plugin-backed dbt runtime path,
  without allowing compile-time and admission-time adapter truth to drift apart
  again.
- Active task IDs: `TF-C3`, `TF-C3-E`
- Roadmap lane affected: [API and Admission lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: the SQL-first preview-persist boundary is now closed in
  code and planning. `TF-C3` now includes shared artifact-backed reader
  convergence, a standalone `apps/temporal-worker` composition root, and an
  adapter-owned DBT CLI host behind `DbtPluginRunner`, so the remaining
  blockers are rollout/runbook acceptance and environment proof for that worker
  path plus the broader runtime-boundary hardening tracked in `WE-HX`. The
  plan-compile seam now reuses the canonical `startRun` adapter set, but
  broader shared provider vocabulary still needs repo-level cleanup.

### `Planner and Contracts`

- Current objective: keep the frozen first SQL-first transformation contract
  pack stable now that `TF-A1-C` has closed its seam split, while the
  remaining shared-kernel and plan-record hardening continues.
- Active task IDs: `RC-G1`, `RC-G1-B`, `S08`
- Roadmap lane affected: [Planner and Contracts lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: the engine contract-pack reset and the SQL-first
  transformation pack are now closed semantically and structurally; the
  remaining blockers are the broader shared-kernel ownership migration and
  plan-record hardening under `RC-G1-B` and `S08`.

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
  `Design -> Plan -> Run -> Result` loop stable now that the upstream Lane A
  and Lane C contract dependencies are closed, while broader frontend
  professionalization continues.
- Active task IDs: `TF-E1`, `F-23`, `F-24`, `F-25`
- Roadmap lane affected: [UI and Frontend lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: Lane E now ships the authoring, persisted preview or
  start-run handoff, and result UX pieces for the first operator loop; the
  remaining work is parent closeout consolidation for `TF-E1` plus the broader
  UI follow-through under `F-23`, `F-24`, and `F-25`.

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
- Active task IDs: `RC-C2`
- Roadmap lane affected:
  [Documentation Governance lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: `RC-C2` still needs qualifying Lane C cycles. `GOV-S2` is
  closed as the doc-driven operating framework umbrella; future query-store or
  generated-artifact work must route through concrete follow-up tasks.

### `Documentation Governance`

- Current objective: keep canonical status, archive boundaries, domain boards,
  and generated planning surfaces synchronized with mainline truth without
  reopening closed umbrella work.
- Active task IDs: none; use concrete Lane A governance follow-up tasks when new
  implementation work is accepted.
- Roadmap lane affected:
  [Documentation Governance lane](../roadmap/roadmap-by-domain.md)
- Primary blockers: active surfaces can still drift after merges unless archive
  moves, lane refresh, governance refresh, and query-store checks run together,
  but `DOC-ARCH-01` and `GOV-S2` are no longer active blockers.

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
