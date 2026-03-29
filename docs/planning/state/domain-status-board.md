---
title: Domain Status Board
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-03-29
planning_type: status
---

# Domain Status Board

Operational board by domain with explicit links to task IDs and roadmap impact.

For full task-level tracking use [Execution Workboard](execution-workboard.md).

## Domain Board

| Domain                          | Current objective                                                                                      | Active task IDs                                  | Roadmap lane affected                                                 | Primary blockers                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `Execution Runtime`             | Freeze and document the current backend control-plane runtime baseline (no feature deep dives).        | `MVP-A1`, `MVP-C1`                               | [Execution Runtime lane](../roadmap/roadmap-by-domain.md)             | Baseline inventory must match real runtime routes and invariants                 |
| `API and Admission`             | Stabilize current operability surfaces (start, query, signal, cancel, health, readiness) as MVP truth. | `MVP-A1`, `MVP-B1`, `MVP-C1`                     | [API and Admission lane](../roadmap/roadmap-by-domain.md)             | Claims must be backed by executable tests and command evidence                   |
| `Planner and Contracts`         | Keep only contract-level inventory needed by current MVP backend baseline.                             | `MVP-A1`                                         | [Planner and Contracts lane](../roadmap/roadmap-by-domain.md)         | Avoid introducing new planner/runtime behavior in this reset slice               |
| `Event Lifecycle and Retention` | Mark non-MVP lifecycle/retention depth as deferred backlog with explicit residual risk ownership.      | `MVP-D1`                                         | [Event Lifecycle and Retention lane](../roadmap/roadmap-by-domain.md) | Deferred posture must be explicit and non-blocking for MVP baseline              |
| `Traceability`                  | Build claim-to-evidence traceability matrix for every MVP backend capability statement.                | `MVP-B1`                                         | [Execution Runtime lane](../roadmap/roadmap-by-domain.md)             | Missing proof links between claims and tests                                     |
| `CI / Infrastructure`           | Keep only baseline validation needed to prove operability claims for MVP.                              | `MVP-B1`, `MVP-C1`                               | [Documentation Governance lane](../roadmap/roadmap-by-domain.md)      | Validation drift between documented command set and actual package/test coverage |
| `Documentation Governance`      | Keep roadmap, domain board, and lane state synchronized around MVP backend operability baseline.       | `MVP-A1`, `MVP-B1`, `MVP-C1`, `MVP-D1`, `MVP-E1` | [Documentation Governance lane](../roadmap/roadmap-by-domain.md)      | Planning surfaces diverging from code truth or from each other                   |

## Canonical Anchors

- [Execution Workboard](execution-workboard.md)
- [Gap Execution Route](gap-execution-route.md)
- [Gap Execution Plans](../gaps/GAP_EXECUTION_PLANS.md)
- [Roadmap Of Record](../roadmap/index.md)

## Reading Order

1. [Execution Workboard](execution-workboard.md)
2. [Gap Execution Route](gap-execution-route.md)
3. [Roadmap Of Record](../roadmap/index.md)
4. [Domain Views](../domains/index.md)
