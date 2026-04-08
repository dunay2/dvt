---
title: Traceability Service Sequence
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-28
---

# Traceability Service Sequence

## Main Flow: trackEvent

```mermaid
sequenceDiagram
  participant Engine as @dvt/engine
  participant TraceabilityAggregate
  participant EventAggregate
  participant Contracts as @dvt/contracts

  Engine->>TraceabilityAggregate: trackEvent(domainEvent)
  TraceabilityAggregate->>Contracts: validate(domainEvent)
  Contracts-->>TraceabilityAggregate: validationResult
  TraceabilityAggregate->>EventAggregate: storeEvent(domainEvent)
  EventAggregate-->>TraceabilityAggregate: EventStatus
  TraceabilityAggregate-->>Engine: TraceabilityStatus
```

## Global Flow Position

`@dvt/traceability-service` sits at the shared boundary layer of the DVT system. It is called by `@dvt/engine` during workflow execution to record every significant step and state transition. It validates incoming events against `@dvt/contracts` before persisting them. It does not initiate calls to the Planning, Execution, or UI domains — it is a passive receiver that provides traceability guarantees to the rest of the system. The lineage worker (`apps/lineage-worker`) and projector worker (`apps/projector-worker`) may query traceability data to build read models and emit OpenLineage events downstream.

## Key Files

- `packages/@dvt/traceability-service/src/domain/TraceabilityAggregate.ts`
- `packages/@dvt/traceability-service/src/domain/EventAggregate.ts`
- `packages/@dvt/traceability-service/src/application/TraceabilityService.ts`
- `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`
