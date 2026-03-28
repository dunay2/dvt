---
title: @dvt/adapter-postgres
status: Draft
owner: Execution Domain
last_reviewed: 2026-03-15
---

# @dvt/adapter-postgres

## Component Map

```mermaid
flowchart LR
  engine[@dvt/engine]
  postgres[@dvt/adapter-postgres]
  engine --> postgres
```

## Location

- packages/@dvt/adapter-postgres

## Domain

- [Execution Domain](../domain-execution.md)

## Main Responsibilities

- Postgres adapter integration
- Root: PostgresAdapterAggregate (central postgres adapter model)
- Aggregates: StateAggregate
- Ensures state management, adapter integration

## Explanation

@dvt/adapter-postgres is responsible for integrating Postgres persistence:

- **Root:** [PostgresAdapterAggregate](adapter-postgres.md#postgresadapteraggregate) — represents the central postgres adapter model, owning state management.
- **Aggregates:** [StateAggregate](adapter-postgres.md#stateaggregate).
- **Responsibilities:**
  - Manage workflow state.
  - Integrate adapter connections.
  - Report state status to engine.

**Interactions:**

- **[Engine](engine.md):** Receives state management results.

Postgres adapter coordinates these interactions to ensure reliable state management and adapter integration.

## PostgresAdapterAggregate

Represents the central postgres adapter model, owning state management. Responsible for:

- Managing workflow state
- Managing adapter connections
- Reporting state status

## StateAggregate

Represents state management for postgres adapter. Responsible for:

- Storing workflow state
- Managing state operations
- Reporting state status

## Restrictions

- Must comply with Postgres adapter contracts and integration requirements
- Only interacts with Execution domain and engine

## Related Documentation

- [Component Map](../component-map.md)
- [Execution Domain](../domain-execution.md)

## Detailed Documentation

- [DDD Structure](adapter-postgres-ddd.md)
- [Functionalities](adapter-postgres-functional.md)
- [Constraints & Invariants](adapter-postgres-constraints.md)
- [Sequence Diagrams](adapter-postgres-sequence.md)
