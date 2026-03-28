---
title: @dvt/adapter-temporal
status: Draft
owner: Execution Domain
last_reviewed: 2026-03-15
---

# @dvt/adapter-temporal

## Component Map

```mermaid
flowchart LR
  engine[@dvt/engine]
  temporal[@dvt/adapter-temporal]
  engine --> temporal
```

## Location

- packages/@dvt/adapter-temporal

## Domain

- [Execution Domain](../domain-execution.md)

## Main Responsibilities

- Temporal adapter integration
- Root: TemporalAdapterAggregate (central temporal adapter model)
- Aggregates: WorkflowAggregate
- Ensures workflow execution, adapter management

## Explanation

@dvt/adapter-temporal is responsible for integrating Temporal workflows:

- **Root:** [TemporalAdapterAggregate](adapter-temporal.md#temporaladapteraggregate) — represents the central temporal adapter model, owning workflow execution.
- **Aggregates:** [WorkflowAggregate](adapter-temporal.md#workflowaggregate).
- **Responsibilities:**
  - Execute Temporal workflows.
  - Manage adapter connections.
  - Report workflow status to engine.

**Interactions:**

- **[Engine](engine.md):** Receives workflow execution results.

Temporal adapter coordinates these interactions to ensure reliable workflow execution and adapter management.

## TemporalAdapterAggregate

Represents the central temporal adapter model, owning workflow execution. Responsible for:

- Managing workflow execution
- Managing adapter connections
- Reporting workflow status

## WorkflowAggregate

Represents workflow management for temporal adapter. Responsible for:

- Storing workflow definitions
- Managing workflow execution
- Reporting workflow status

## Restrictions

- Must comply with Temporal adapter contracts and integration requirements
- Only interacts with Execution domain and engine

## Related Documentation

- [Component Map](../component-map.md)
- [Execution Domain](../domain-execution.md)

## Detailed Documentation

- [DDD Structure](adapter-temporal-ddd.md)
- [Functionalities](adapter-temporal-functional.md)
- [Constraints & Invariants](adapter-temporal-constraints.md)
- [Sequence Diagrams](adapter-temporal-sequence.md)
