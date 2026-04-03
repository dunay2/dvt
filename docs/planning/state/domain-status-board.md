---
title: Domain Status Board
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-04-03
planning_type: status
---

# Domain Status Board

Operational board by domain with explicit links to task IDs and roadmap impact.

For full task-level tracking use the lane YAML registry linked from
[Planning Control Tower](planning-control-tower.md).

## Domain Board

| Domain                          | Current objective                                                                                                           | Active task IDs                                                          | Roadmap lane affected                                                 | Primary blockers                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `Execution Runtime`             | Freeze and document the current backend control-plane runtime baseline without reintroducing legacy gap framing.            | `MVP-A1`, `MVP-C1`                                                       | [Execution Runtime lane](../roadmap/roadmap-by-domain.md)             | Baseline inventory must match real runtime routes and invariants                                                |
| `API and Admission`             | Stabilize current operability surfaces (start, query, signal, cancel, health, readiness) as MVP truth.                      | `MVP-A1`, `MVP-B1`, `MVP-C1`                                             | [API and Admission lane](../roadmap/roadmap-by-domain.md)             | Claims must be backed by executable tests and command evidence                                                  |
| `Planner and Contracts`         | Keep only contract-level inventory needed by the current runtime baseline and active remediation boards.                    | `MVP-A1`, `S08`                                                          | [Planner and Contracts lane](../roadmap/roadmap-by-domain.md)         | Avoid introducing new planner/runtime behavior in the documentation reset slice                                 |
| `Event Lifecycle and Retention` | Mark non-MVP lifecycle and retention depth as deferred backlog with explicit residual-risk ownership.                       | `MVP-D1`                                                                 | [Event Lifecycle and Retention lane](../roadmap/roadmap-by-domain.md) | Deferred posture must be explicit and non-blocking for the MVP baseline                                         |
| `UI / Frontend`                 | Converge `apps/web` on real runtime contracts, explicit mock-versus-api boundaries, and an operational run-monitoring flow. | `MVP-E1`, `F-03`, `F-04`, `F-05`, `F-06`, `F-07`, `F-12`, `F-13`, `F-14` | [UI and Frontend lane](../roadmap/roadmap-by-domain.md)               | Runtime route drift, god-store state ownership, inconsistent query patterns, and no governed frontend test lane |
| `Traceability`                  | Maintain claim-to-evidence traceability for every MVP backend capability statement.                                         | `MVP-B1`                                                                 | [Execution Runtime lane](../roadmap/roadmap-by-domain.md)             | Missing proof links between claims and tests                                                                    |
| `CI / Infrastructure`           | Keep only the validation baseline needed to prove operability claims and docs coherence.                                    | `MVP-B1`, `MVP-C1`, `RC-C2`                                              | [Documentation Governance lane](../roadmap/roadmap-by-domain.md)      | Validation drift between documented command set and actual package/test coverage                                |
| `Documentation Governance`      | Keep roadmap, domains, boards, and architecture status surfaces synchronized around the live repository truth.              | `MVP-A1`, `MVP-B1`, `MVP-C1`, `MVP-D1`, `DOC-ARCH-01`                    | [Documentation Governance lane](../roadmap/roadmap-by-domain.md)      | Planning surfaces diverging from code truth or from each other                                                  |

## Canonical Anchors

- [Planning Control Tower](planning-control-tower.md)
- [Roadmap Of Record](../roadmap/index.md)
- [Roadmap By Domain](../roadmap/roadmap-by-domain.md)
- [System Delivery Status](../../architecture/system-delivery-status.md)

## Reading Order

1. [Planning Control Tower](planning-control-tower.md)
2. [Roadmap Of Record](../roadmap/index.md)
3. [Roadmap By Domain](../roadmap/roadmap-by-domain.md)
4. [Domain Views](../domains/index.md)
