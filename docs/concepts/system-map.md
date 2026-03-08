---
title: DVT System Map
status: Active
owner: Docs / Architecture
last_reviewed: 2026-03-08
---

# DVT System Map

This page is the conceptual orientation map for the repository.

It answers one question first: what are the main system parts and where should a
reader go next?

## Top-Level Layers

### Entry layer

- `apps/api`: API and runtime-facing entrypoint for execution-adjacent flows
- `apps/web`: web UI and visualization surface

### Planning layer

- `@dvt/planner`: plan construction and compilation concerns
- `@dvt/plan-verifier`: plan integrity and verification utilities
- `@dvt/plan-interpreter`: deterministic DAG analysis shared by runtimes
- `@dvt/dsl`: gateway expression parsing and evaluation

### Execution layer

- `@dvt/engine`: core execution logic and invariants
- `@dvt/adapter-temporal`: Temporal runtime implementation
- `@dvt/adapter-postgres`: Postgres state and persistence implementation

### Shared boundary layer

- `@dvt/contracts`: shared contracts and types
- `@dvt/crypto`: canonicalization and hashing helpers
- `@dvt/observability`: observability abstractions
- `@dvt/observability-otel`: OpenTelemetry implementation path
- `@dvt/cli`: script-driven validation and golden-path tooling
- `@dvt/traceability-service`: traceability and lineage-adjacent service code

## Canonical Reading Order

1. [Glossary](glossary.md)
2. [Domain Language](domain-language.md)
3. [Architecture Index](../architecture/index.md)
4. [Contracts Index](../contracts/index.md)
5. [System Delivery Status](../architecture/system-delivery-status.md)
6. [Planning Index](../planning/index.md)

## Where To Go By Question

- "What does this term mean?" -> [Glossary](glossary.md)
- "What belongs to which subsystem?" -> [Architecture Index](../architecture/index.md)
- "What do the small shared packages do?" -> [Shared Package Architecture](../architecture/shared/index.md)
- "What code area is responsible?" -> [Repository Map](../knowledge/REPOSITORY_MAP.md)
- "What is true in the current implementation?" -> [System Delivery Status](../architecture/system-delivery-status.md)
- "What is planned or still open?" -> [Planning](../planning/index.md)
- "What decision governs this?" -> [ADRs](../adr/index.md)
