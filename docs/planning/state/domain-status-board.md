---
title: Domain Status Board
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-04-08
planning_type: status
---

# Domain Status Board

Operational board by domain with explicit links to task IDs and roadmap impact.

For full task-level tracking use the lane YAML registry linked from
[Planning Control Tower](./planning-control-tower.md).

## Domain Board

| Domain                          | Current objective                                                                                                                              | Active task IDs                                              | Roadmap lane affected                                                 | Primary blockers                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Execution Runtime`             | Close the workflow-engine boundary cleanup and open the PostgreSQL-backed transformation runtime vertical without regressing signal semantics. | `WE-HX`, `WE-HX-5`, `WE-HX-6`, `TF-C2`, `TF-C2-A`, `TF-C2-B` | [Execution Runtime lane](../roadmap/roadmap-by-domain.md)             | PostgreSQL executor wiring and caller-visible read-surface evidence are not implemented yet                    |
| `API and Admission`             | Keep `POST /plans/preview` truthful as the preview-persist boundary and converge callers onto the real `PlanRef` contract.                     | `TF-C1`, `TF-C1-A`, `TF-C1-B`                                | [API and Admission lane](../roadmap/roadmap-by-domain.md)             | Lane A/B contract formalization and transformation-profile caller adoption are still open                      |
| `Planner and Contracts`         | Freeze `DesignGraphDraft`, `GitArtifactRef`, and compiler mapping so the transformation vertical stops depending on UI-local assumptions.      | `S08`, `TF-A1`, `TF-A1-A`, `TF-A1-B`                         | [Planner and Contracts lane](../roadmap/roadmap-by-domain.md)         | The contract pack is still queued, so downstream lanes retain temporary generic-preview bridges                |
| `Event Lifecycle and Retention` | Add repeatable PostgreSQL proof-environment reset discipline without regressing the shipped retention baseline.                                | `run event log retention + TTL`, `AR-D8`, `TF-D1`            | [Event Lifecycle and Retention lane](../roadmap/roadmap-by-domain.md) | `TF-C2-A` has not started, so proof-environment lifecycle and default-retention alerts cannot close end to end |
| `UI / Frontend`                 | Close the explicit transformation `Design -> Plan -> Run -> Result` loop on governed contracts and backend-owned evidence.                     | `TF-E1`, `TF-E1-A`, `TF-E1-B`, `TF-E1-C`, `F-23`             | [UI and Frontend lane](../roadmap/roadmap-by-domain.md)               | Lane A contract freeze and Lane C runtime evidence are still missing; `F-23` also waits on `F-06` and `F-17-B` |
| `Traceability`                  | Define the Git-first provenance chain from graph and SQL artifacts to persisted plan and runtime outcome for the new vertical.                 | `TF-B1`, `TF-B1-A`, `TF-B1-B`                                | [Planner and Contracts lane](../roadmap/roadmap-by-domain.md)         | No executable provenance contract exists yet for the transformation flow                                       |
| `CI / Infrastructure`           | Institutionalize shared preflight and keep docs/code validation loops cheap enough to sustain the active lane tempo.                           | `RC-C2`, `GOV-S2`                                            | [Documentation Governance lane](../roadmap/roadmap-by-domain.md)      | `RC-C2` still needs qualifying Lane C cycles, and metadata noise still hides semantic drift                    |
| `Documentation Governance`      | Keep canonical status, archive boundaries, domain boards, and generated planning surfaces synchronized with mainline truth.                    | `GOV-S2`, `DOC-ARCH-01`                                      | [Documentation Governance lane](../roadmap/roadmap-by-domain.md)      | Active surfaces drift after merges unless archive moves, lane refresh, and generators run together             |

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
