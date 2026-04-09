---
title: DVT+ - Architectural Gap Remediation Tasks (2026-02-26)
status: Historical
owner: docs
last_reviewed: 2026-03-06
planning_type: review
---

# DVT+ - Architectural Gap Remediation Tasks (2026-02-26)

Updated execution view aligned with current implementation status on 2026-03-06.

- Primary status source: [`../gaps/GAP_EXECUTION_PLANS.md`](../gaps/GAP_EXECUTION_PLANS.md)
- Parallel execution source: [`../gaps/GAP_PARALLEL_EXECUTION_TRACKS.md`](../gaps/GAP_PARALLEL_EXECUTION_TRACKS.md)

## Objective

Close architectural gaps with verifiable, CI-backed delivery while minimizing merge contention through parallel tracks.

## Current Status Snapshot (2026-03-06)

| Gap | Title                                     | Phase     | Current state                                                 |
| --- | ----------------------------------------- | --------- | ------------------------------------------------------------- |
| G1  | Temporal adapter real                     | Phase 1   | In progress                                                   |
| G2  | Postgres state store complete             | Phase 1   | Closed                                                        |
| G3  | Start-run intent store + scheduler        | Phase 1   | Implemented in code, documentation closure pending            |
| G4  | compiledCodeRef ownership                 | Phase 1   | In progress (`T4-2` done, `T4-3` pending, `T4-4` in progress) |
| G5  | Independent outbox worker                 | Phase 1.5 | Pending                                                       |
| G6  | OpenLineage mapping tests + schema pin    | Phase 1.5 | Pending                                                       |
| G7  | Read models + standalone projector        | Phase 1.5 | Pending                                                       |
| G8  | Real auth in `apps/api`                   | Phase 1.5 | Pending                                                       |
| G9  | StepTypeRegistry + typed `stepTypeConfig` | Phase 2   | Pending                                                       |
| G10 | `outbox_lineage` worker + fail-open DLQ   | Phase 2   | Pending                                                       |

## Confirmed Progress Since Initial Draft

1. `G1` advanced:
   - `lookupRunRef` implemented and tested.
   - Temporal worker lifecycle quality gate added.
2. `G2` closed:
   - `listEvents(options)` paging/cursor behavior completed.
   - `listRuns(status)` implemented in adapter.
3. `G3` delivered in code:
   - Durable Postgres intent store, reconciler worker, API runtime wiring.
4. `G4` partially delivered:
   - `T4-2` planner storage/enrichment completed.
   - `T4-4` traceability core module and unit tests added (in progress, integration pending).

## Parallelization-First Execution Plan

### Track A - compiledCodeRef lane (`G4`)

- Scope: `T4-1`, `T4-3`, `T4-4`
- Priority: Highest
- Current focus:
  - Finish `T4-3` (adapter-temporal propagation to `StepStarted.payload`)
  - Complete `T4-4` integration on top of `T4-3`

### Track B - Runtime reliability lane (`G1` + `G3`)

- Scope:
  - Close remaining `G1` integration/ops quality gates
  - Finalize `G3` evidence/status closure
- Priority: High
- Dependency: Independent from `G4` internals

### Track C - Phase 1.5 platform lane (`G5` to `G8`)

- Scope:
  - `G5` outbox worker
  - `G6` OpenLineage CI tests + schema pin
  - `G7` read models/projector
  - `G8` auth
- Priority: Starts immediately after `G4` closure

## Recommended Merge Order

1. `G4-T3` (adapter-temporal propagation).
2. `G4-T4` integration completion (rebased on `T4-3`).
3. Remaining `G1` closure PR.
4. `G3` documentation/evidence closure PR.
5. Phase 1.5 parallel PRs: `G5` and `G6`, then `G7` and `G8`.

## Exit Criteria

Phase 1 is considered closed only when:

- `G4` is fully closed (`T4-1`/`T4-3`/`T4-4` complete with CI evidence).
- `G1` quality gates are green in CI and operationally validated.
- `G3` status is fully synchronized across task spec, evidence, and gap plans.

## References

- Master gap plan: [`../gaps/GAP_EXECUTION_PLANS.md`](../gaps/GAP_EXECUTION_PLANS.md)
- Parallel tracks: [`../gaps/GAP_PARALLEL_EXECUTION_TRACKS.md`](../gaps/GAP_PARALLEL_EXECUTION_TRACKS.md)
- G4 task spec: [`../gaps/G4-TASK-SPECIFICATION.md`](../gaps/G4-TASK-SPECIFICATION.md)
- G3 task spec: [`../gaps/G3-TASK-SPECIFICATION.md`](../gaps/G3-TASK-SPECIFICATION.md)
