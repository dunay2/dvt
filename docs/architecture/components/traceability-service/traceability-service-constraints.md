---
title: Traceability Service Constraints & Invariants
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-28
---

# Traceability Service Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                                            | Where Enforced                                       | Description                                                                                                                         |
| --------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Every tracked event must conform to contract definitions                          | TraceabilityAggregate / `@dvt/contracts` integration | Events are validated against contract schemas before being stored; non-conforming events are rejected.                              |
| TraceabilityAggregate is the sole entry point for event tracking                  | TraceabilityAggregate (aggregate root pattern)       | No external component may write directly to EventAggregate; all writes must flow through the root.                                  |
| Only Shared Boundary domain, contracts, and engine may interact with this service | Architecture boundary policy                         | The service does not expose interfaces to Planning, Execution, or UI domain components directly.                                    |
| Event records are immutable once stored                                           | EventAggregate invariant                             | Stored events may not be mutated; corrections require a new compensating event.                                                     |
| Traceability standards compliance                                                 | CI/CD governance gate                                | All event schemas and traceability records must comply with the project's traceability standards as defined in contract governance. |

## Validation Examples

- Attempting to store an event with a missing `runId` field fails validation at the TraceabilityAggregate level before any persistence is attempted.
- A call from a Planning domain component directly to EventAggregate is rejected at the architecture boundary; the call must route through TraceabilityAggregate.
- An event that does not match a registered contract schema in `@dvt/contracts` is rejected with a contract violation error.

## Key Files

- `packages/@dvt/traceability-service/src/domain/TraceabilityAggregate.ts`
- `packages/@dvt/traceability-service/src/domain/EventAggregate.ts`
- `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`
