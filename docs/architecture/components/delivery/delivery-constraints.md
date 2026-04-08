---
title: Delivery Constraints & Invariants
status: Active
owner: Delivery / Docs
last_reviewed: 2026-04-07
topics:
  - Constraints & Invariants
  - Runtime Boundaries
  - Key Files & References
---

# Delivery Constraints & Invariants

The active delivery package is runtime-oriented, not aggregate-oriented.

## Current invariants

| Constraint                                       | Code surface                                        | Why it matters                                                                       |
| ------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Delivery workers stay outside engine ownership   | `application/*.ts` runtimes                         | downstream emission and projection must not reclaim execution authority              |
| Admission helpers remain explicit                | `backpressure/StartRunAdmissionGuard.ts`            | API admission policy can evolve without moving delivery logic into planner or engine |
| Outbox and lineage processing remain retry-aware | `OutboxWorkerRuntime.ts`, `LineageWorkerRuntime.ts` | delayed delivery must not mutate canonical execution truth                           |

## Code anchors

- [OutboxWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/OutboxWorkerRuntime.ts)
- [ProjectorWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts)
- [LineageWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts)
- [StartRunAdmissionGuard.ts](../../../../packages/@dvt/delivery/src/backpressure/StartRunAdmissionGuard.ts)
