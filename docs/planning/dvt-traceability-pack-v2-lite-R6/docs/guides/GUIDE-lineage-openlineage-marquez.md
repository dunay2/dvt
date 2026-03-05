---
title: Guide — Lineage Integration (OpenLineage + Marquez)
status: Guide
tags: [openlineage, marquez, lineage, dbt]
---

# Lineage Integration (OpenLineage + Marquez)

DVT+ integrates with OpenLineage and Marquez. Lineage emission is not the same as domain events.

Use when changes affect:

- lineage event emission
- dataset naming conventions
- dbt artifact ingestion for lineage facets
- lineage outbox/transport

## 1) Separation principle

- Domain events are authoritative for system state.
- OpenLineage events are **telemetry/lineage**, delivered via a separate channel (lineage outbox).

## 2) Failure isolation

Lineage delivery failure MUST NOT block:

- domain event persistence
- run status updates
- engine execution

## 3) Mapping dbt artifacts to lineage

- Use dbt artifacts (`manifest.json`, `run_results.json`, `catalog.json`) to populate facets where possible.
- Handle partial catalogs: do not interpret missing schema info as "non-existent".

## 4) Naming and identity

Define stable dataset identity rules:

- platform, namespace, name
- environment/tenant scoping rules

## 5) Verification

- Unit tests for dataset naming
- Golden vectors for OL event payloads (if stable)
- Integration test: lineage outbox emits OL events even under transient delivery failure

References:

- OpenLineage: https://openlineage.io/
- Marquez: https://marquezproject.ai/
