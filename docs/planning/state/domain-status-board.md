---
title: Domain Status Board
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-03-26
planning_type: status
---

# Domain Status Board

Operational board by domain with explicit links to task IDs and roadmap impact.

For full task-level tracking use [Execution Workboard](execution-workboard.md).

## Domain Board

| Domain                          | Current objective                                                                                                 | Active task IDs                                                          | Roadmap lane affected                                                 | Primary blockers                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Execution Runtime`             | Close correctness fixes, start-run orchestration extraction, and ADR-0039 backlog with explicit dependency chain. | `RC-E1`, `RC-E2`, `S03`, `S05`, `S07`, `S17`, `S18-F1`, `F1`, `F4`, `F5` | [Execution Runtime lane](../roadmap/roadmap-by-domain.md)             | `F1` C2 closure depends on `S03`; `RC-E1`/`RC-E2` depend on `S16` merge                            |
| `API and Admission`             | Finish Gap 4 sequencing and harden control/health surfaces.                                                       | `G4-PR4`, `G4-PR5`, `A1`, `A2`, `RC-D1A`, `RC-E3`                        | [API and Admission lane](../roadmap/roadmap-by-domain.md)             | `G4-PR5` waits on `G4-PR4`; `RC-E3` is a breaking-contract follow-up                               |
| `Planner and Contracts`         | Close planner lifecycle hardening and explicit plan version/storage ownership.                                    | `S08`, `S16`, `R3`, `R4`, `R5`, `R6`, `R7`                               | [Planner and Contracts lane](../roadmap/roadmap-by-domain.md)         | `S08` unblocked after `S09` closure (PR #595); `R4` depends on `R3`; `R6` depends on `R4` and `R7` |
| `Event Lifecycle and Retention` | Complete restore and redaction follow-up after archival baseline.                                                 | `G5-PR2`, `G5-PR4`                                                       | [Event Lifecycle and Retention lane](../roadmap/roadmap-by-domain.md) | `G5-PR4` depends on archival policy maturity                                                       |
| `Traceability`                  | Close lineage runtime boundary and delivery reliability gaps.                                                     | `RC-B5`, `S11`                                                           | [Execution Runtime lane](../roadmap/roadmap-by-domain.md)             | `S11` waits on `S07`                                                                               |
| `CI / Infrastructure`           | Remove workflow path-policy drift and keep adapter-postgres CI scope deterministic.                               | `RC-F2`                                                                  | [Documentation Governance lane](../roadmap/roadmap-by-domain.md)      | None                                                                                               |
| `Documentation Governance`      | Keep single-source planning navigation and prevent tracking drift.                                                | governance sync in each planning PR                                      | [Documentation Governance lane](../roadmap/roadmap-by-domain.md)      | Drift between review/proposal updates and execution board                                          |

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
