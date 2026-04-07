---
title: @dvt/observability
status: Draft
owner: Shared Boundary Domain
last_reviewed: 2026-03-15
---

# @dvt/observability

## Component Map

```mermaid
flowchart LR
  observability[@dvt/observability]
  contracts[@dvt/contracts]
  engine[@dvt/engine]
  observability --> contracts
  observability --> engine
```

## Location

- packages/@dvt/observability

## Domain

- [Shared Boundary Domain](../domain-shared.md)

## Main Responsibilities

- Observability, monitoring, metrics collection
- Root: ObservabilityAggregate (central observability model)
- Aggregates: MetricsAggregate, LogAggregate
- Ensures monitoring, metrics, and log management

## Explanation

@dvt/observability is responsible for observability and monitoring:

- **Root:** [ObservabilityAggregate](observability.md#observabilityaggregate) — represents the central observability model, owning metrics and log management.
- **Aggregates:** [MetricsAggregate](observability.md#metricsaggregate), [LogAggregate](observability.md#logaggregate).
- **Responsibilities:**
  - Collect and manage metrics.
  - Collect and manage logs.
  - Report observability status to shared boundary.

**Interactions:**

- **[Contracts](contracts.md):** Uses observability for validation.
- **[Engine](engine.md):** Uses observability for workflow monitoring.

Observability coordinates these interactions to ensure monitoring, metrics, and log management.

## ObservabilityAggregate

Represents the central observability model, owning metrics and log management. Responsible for:

- Managing metrics collection
- Managing log collection
- Reporting observability status

## MetricsAggregate

Represents metrics management for observability. Responsible for:

- Storing metrics
- Managing metrics operations
- Reporting metrics status

## LogAggregate

Represents log management for observability. Responsible for:

- Storing logs
- Managing log operations
- Reporting log status

## Restrictions

- Must comply with observability standards and contract governance
- Only interacts with Shared Boundary domain, contracts, and engine

## Related Documentation

- [Component Map](../component-map.md)
- [Shared Boundary Domain](../domain-shared.md)

## Detailed Documentation

- [DDD Structure](observability-ddd.md)
- [Functionalities](observability-functional.md)
- [Constraints & Invariants](observability-constraints.md)
- [Sequence Diagrams](observability-sequence.md)
