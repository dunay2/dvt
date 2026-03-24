---
title: Domain Status Board
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-03-22
planning_type: status
---

# Domain Status Board

Operational board by domain with explicit links to task IDs and roadmap impact.

For full task-level tracking use [Execution Workboard](execution-workboard.md).

## Domain Board

| Domain                          | Current objective                                                                                           | Active task IDs                                                                                                                       | Roadmap lane affected                                                 | Primary blockers                                                                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Execution Runtime`             | Close correctness fixes, state-store split, and ADR-0039 extraction backlog with explicit dependency chain. | `RC-A1`, `RC-A2`, `RC-A5`, `RC-A6`, `RC-D2`, `RC-D3`, `F1`, `F4`, `F5`, `S02`, `S03`, `S05`, `S07`, `S12`, `S13`, `S14`, `S16`, `S17` | [Execution Runtime lane](../roadmap/roadmap-by-domain.md)             | `S02` full sweep gated by `RC-A6`; `S03` depends on `S02`; `F1` C2 closure depends on `S03`; `S16` depends on `RC-A4`; `S12` waits on `S02`; `S11` waits on `S07` |
| `API and Admission`             | Finish Gap 4 sequencing and harden control/health surfaces.                                                 | `G4-PR3`, `G4-PR4`, `G4-PR5`, `A1`, `A2`, `RC-D1`                                                                                     | [API and Admission lane](../roadmap/roadmap-by-domain.md)             | `G4-PR4` waits on `G4-PR3`; `G4-PR5` waits on `G4-PR4`                                                                                                            |
| `Planner and Contracts`         | Close planner lifecycle hardening and explicit plan version/storage ownership.                              | `RC-A4`, `S09`, `S08`, `R3`, `R4`, `R5`, `R6`, `R7`                                                                                   | [Planner and Contracts lane](../roadmap/roadmap-by-domain.md)         | `R3` depends on `RC-A4`; `S08` blocked by `S09`; `R4` depends on `R3`; `R6` depends on `R4` and `R7`                                                              |
| `Event Lifecycle and Retention` | Complete restore and redaction follow-up after archival baseline.                                           | `G5-PR2`, `G5-PR4`                                                                                                                    | [Event Lifecycle and Retention lane](../roadmap/roadmap-by-domain.md) | `G5-PR4` depends on archival policy maturity                                                                                                                      |
| `Traceability`                  | Close lineage runtime boundary and delivery reliability gaps.                                               | `RC-B1`, `RC-B2`, `RC-B5`, `S11`                                                                                                      | [Execution Runtime lane](../roadmap/roadmap-by-domain.md)             | `S11` waits on `S07`; `RC-B2` depends on deployment storage credentials                                                                                           |
| `Documentation Governance`      | Keep single-source planning navigation and prevent tracking drift.                                          | governance sync in each planning PR                                                                                                   | [Documentation Governance lane](../roadmap/roadmap-by-domain.md)      | Drift between review/proposal updates and execution board                                                                                                         |

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
