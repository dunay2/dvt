---
title: Runtime And Shared-Kernel Risk Triage Review
status: Active
date: 2026-04-10
owner: Architecture
planning_type: review
---

# Runtime And Shared-Kernel Risk Triage Review

Corrected triage of five recurring architecture and runtime claims:

1. `@dvt/contracts` as an oversized shared kernel
2. `EngineRunRef` leaking provider details into shared contracts
3. Temporal cancel bug `T-01`
4. delivery worker runtime duplication
5. retention, event-schema versioning, and SLA closure posture

This review is not a new roadmap. It records what is true now, routes each
finding to an existing or newly created task anchor, and separates real risks
from over-broad claims.

## Scope

- code truth under `packages/@dvt/contracts`, `@dvt/adapter-temporal`, and
  `@dvt/delivery`
- current architecture truth in
  [System Delivery Status](../../../architecture/system-delivery-status.md)
  and
  [Implementation Architecture Diagrams](../../../architecture/diagrams/implementation-architecture-diagrams.md)
- active planning posture in Lane A, Lane C, and Lane D

## Corrected Risk Table

| Risk                                                                            | Verdict        | Severity | Likelihood | What is true now                                                                                                                                                                                                                                         | Mitigation                                                                                                                                                                                                                         | Planning linkage                                     |
| ------------------------------------------------------------------------------- | -------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `@dvt/contracts` shared-kernel surface is oversized                             | Real           | High     | High       | `@dvt/contracts` still combines shared types, schemas, and runtime parsing. The active architecture diagrams still call out shared-kernel surface area as a concern rather than a closed decision.                                                       | Keep shrinking the shared surface and continue ownership migration out of `@dvt/contracts` for non-shared behavioral ports. Evaluate a `contracts-types` versus `contracts-schemas` split only after ownership routing is cleaner. | `RC-G1-B`                                            |
| `EngineRunRef` mixes logical run identity with provider coordinates             | Real           | High     | High       | `EngineRunRef` remains a discriminated union in shared contracts with provider-specific fields such as Temporal `namespace`, `workflowId`, and `taskQueue`. The architecture diagrams still call this out as a design concern.                           | Separate logical run identity from provider-owned execution references and stop widening the shared union as more provider details appear.                                                                                         | `AR-A12`                                             |
| Temporal cancel bug `T-01` remains open                                         | Real           | High     | High       | `TemporalAdapter.cancelRun()` still forwards `WorkflowSignals.CANCEL` instead of provider-native cancellation. The architecture diagrams still classify `T-01` as an identified bug.                                                                     | Fix cancel semantics at the adapter boundary and prove the cooperative versus provider-native cancellation path with integration coverage.                                                                                         | `AR-C6`                                              |
| Outbox, projector, and lineage runtimes are copy-paste                          | Partially real | Medium   | High       | The three runtime classes repeat the same control-loop skeleton (`start`, `stop`, loop, wait, backoff, abort handling), but they are not literal copies because each carries different work semantics.                                                   | Extract a shared runtime harness or split domain rules from runtime orchestration so loop mechanics are not reimplemented three times.                                                                                             | `AR-A7`                                              |
| Retention, event-schema migration strategy, and SLA definitions are all missing | Over-broad     | Medium   | Medium     | This is not true as a single statement. Retention baseline exists, `payloadVersion` work exists and is partially status-drifted across surfaces, and SLA definitions already exist. What remains open is operational closure and status truth alignment. | Treat these as separate follow-ups: retain `AR-D8` and `TF-D1` for retention operations, reconcile the `S05` status drift, and close `AR-C2-T2/T3/T4` for dashboards, alerts, and sustained evidence.                              | `AR-D8`, `TF-D1`, `AR-C2-T2`, `AR-C2-T3`, `AR-C2-T4` |

## Priority Order

1. `AR-C6`
   - `T-01` is the only concrete runtime bug in this set.
   - It affects a live adapter boundary, not just design hygiene.
2. `AR-A12`
   - `EngineRunRef` keeps coupling the shared kernel to provider execution
     coordinates.
   - Delaying this makes later provider work harder to unwind.
3. `RC-G1-B`
   - shared-kernel reduction is still correct, but it should follow explicit
     ownership cleanup rather than lead it.
4. `AR-A7`
   - runtime-loop duplication is real but is maintainability debt, not the
     first correctness risk.
5. `AR-D8`, `TF-D1`, `AR-C2-T2/T3/T4`
   - these remain operational-closure tasks, not evidence that the underlying
     retention or SLA definitions are absent.

## Routing Notes

- `RC-G1-B` already exists and remains the main anchor for shrinking
  non-shared ownership out of `@dvt/contracts`.
- `AR-A7` already exists and is the best current hook for the duplicated worker
  runtime loop problem.
- `AR-C2-T2`, `AR-C2-T3`, and `AR-C2-T4` already exist and are the correct
  closure path for SLA wiring and evidence.
- `AR-A12` and `AR-C6` are added because this review found no explicit lane
  task owning `EngineRunRef` separation or the Temporal `cancelRun` semantics
  bug.

## Code And Doc Anchors

- Shared-kernel concern:
  [Implementation Architecture Diagrams](../../../architecture/diagrams/implementation-architecture-diagrams.md)
- `EngineRunRef` definition:
  [contracts.ts](../../../../packages/@dvt/contracts/src/types/contracts.ts)
- Temporal cancel bug:
  [TemporalAdapter.ts](../../../../packages/@dvt/adapter-temporal/src/TemporalAdapter.ts)
- Worker runtime loop duplication:
  [OutboxWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/OutboxWorkerRuntime.ts),
  [ProjectorWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts),
  [LineageWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts)
- Retention and SLA current posture:
  [System Delivery Status](../../../architecture/system-delivery-status.md),
  [Execution Workboard](../../state/execution-workboard.md)

## Conclusion

The corrected posture is:

- three risks are unequivocally real now:
  - oversized shared kernel
  - `EngineRunRef` provider leakage
  - Temporal cancel bug `T-01`
- one is real but overstated:
  - worker runtimes repeat a structural loop, but are not literal copies
- one is false as a bundled claim:
  - retention, payload-version governance, and SLA definitions are not all
    missing; they are in different closure states and must stay separated in
    planning and risk language
