---
title: Component Map
status: Draft
owner: Architecture / Docs
last_reviewed: 2026-03-15
---

# DVT Component Map

## Purpose

This document provides a visual and textual map of the main components in the
DVT system, showing their location in the repository, their domain
association, and their primary responsibilities.

## Visual Map

```mermaid
flowchart LR
  subgraph Planning
    planner[@dvt/planner]
    verifier[@dvt/plan-verifier]
    interpreter[@dvt/plan-interpreter]
    dsl[@dvt/dsl]
  end
  subgraph Execution
    engine[@dvt/engine]
    temporal[@dvt/adapter-temporal]
    postgres[@dvt/adapter-postgres]
  end
  subgraph Delivery
    delivery[@dvt/delivery]
    outbox[dvt-outbox-worker]
  end
  subgraph UI
    web[apps/web]
    dvtweb[@dvt/web]
  end
  subgraph API
    api[apps/api]
  end
  subgraph Shared
    contracts[@dvt/contracts]
    crypto[@dvt/crypto]
    observability[@dvt/observability]
    traceability[@dvt/traceability-service]
  end
  subgraph Infra
    infra[infra/]
    scripts[scripts/]
    tools[tools/]
  end

  planner --> engine
  verifier --> engine
  interpreter --> engine
  dsl --> engine
  engine --> temporal
  engine --> postgres
  engine --> delivery
  delivery --> outbox
  engine --> contracts
  engine --> observability
  engine --> traceability
  api --> engine
  api --> delivery
  web --> api
  web --> engine
  dvtweb --> engine
  contracts --> engine
  contracts --> api
  contracts --> web
  infra --> scripts
  scripts --> engine
  tools --> engine
```

## Component Table

| Component                   | Location                             | Domain             | Main Responsibility                 |
| --------------------------- | ------------------------------------ | ------------------ | ----------------------------------- |
| `@dvt/planner`              | `packages/@dvt/planner`              | Planning           | Plan creation and editing           |
| `@dvt/plan-verifier`        | `packages/@dvt/planner`              | Planning           | Plan integrity validation           |
| `@dvt/plan-interpreter`     | `packages/@dvt/planner`              | Planning           | Plan compilation and interpretation |
| `@dvt/dsl`                  | `packages/@dvt/planner`              | Planning           | DSL for plan definition             |
| `@dvt/engine`               | `packages/@dvt/engine`               | Execution          | Workflow orchestration              |
| `@dvt/adapter-temporal`     | `packages/@dvt/adapter-temporal`     | Execution          | Temporal adapter integration        |
| `@dvt/adapter-postgres`     | `packages/@dvt/adapter-postgres`     | Execution          | Postgres adapter integration        |
| `@dvt/delivery`             | `packages/@dvt/delivery`             | Delivery           | Delivery orchestration              |
| `dvt-outbox-worker`         | `apps/outbox-worker`                 | Delivery           | Outbox worker and event publishing  |
| `apps/web`                  | `apps/web`                           | UI / Visualization | User interface and visualization    |
| `@dvt/web`                  | `packages/@dvt/web`                  | UI / Visualization | UI components and visualization     |
| `apps/api`                  | `apps/api`                           | API / Entry        | HTTP API, routing, and auth         |
| `@dvt/contracts`            | `packages/@dvt/contracts`            | Shared Boundary    | Contracts and types                 |
| `@dvt/crypto`               | `packages/@dvt/crypto`               | Shared Boundary    | Cryptographic operations            |
| `@dvt/observability`        | `packages/@dvt/observability`        | Shared Boundary    | Observability and monitoring        |
| `@dvt/traceability-service` | `packages/@dvt/traceability-service` | Shared Boundary    | Traceability and event tracking     |
| `infra/`                    | `infra/`                             | Infra              | Infrastructure setup                |
| `scripts/`                  | `scripts/`                           | Infra              | Scripts, CI/CD, and tooling         |
| `tools/`                    | `tools/`                             | Infra              | Tooling and CI/CD                   |

## Explanation

- Each component is mapped to its location in the repository.
- The domain column shows which domain the component belongs to (see
  [Domain Map](domain-map.md)).
- The main responsibility column summarizes what the component does.
- For detailed contract and API documentation, follow the links in each domain
  page.

## Navigation

- [Domain Map](domain-map.md)
- [Planning Domain](domain-planning.md)
- [Execution Domain](domain-execution.md)
- [Delivery Domain](domain-delivery.md)
- [UI / Visualization Domain](domain-ui.md)
- [API / Entry Domain](domain-api.md)
- [Shared Boundary Domain](domain-shared.md)
- [Infra Domain](domain-infra.md)
