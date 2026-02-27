# Traceability Service (DVT+) — Design

## Objective

Transform ADR traceability from a manual convention into an automated governance subsystem.

## Core responsibilities

- Parse governed file headers (baseline/decision/consequence/version/date)
- Validate against ADR catalog (`docs/adr`) and status `Accepted`
- Generate manifest (module release unit)
- Publish traceability graph to Neo4j (idempotent)
- Provide impact queries (ADR blast radius) and drift detection (Phase 2)

## Canonical graph semantics

- Store only canonical edges:
  - (:File)-[:BASELINED_ON]->(:ADR)
  - (:Module)-[:CONTAINS]->(:File)
- Derive “implemented_by” in queries and manifests.

## Deployment modes

- **CLI-first** for CI (MVP)
- Optional always-on API later (webhooks, dashboard)

## OSS dependencies

- glob scanning: https://www.npmjs.com/package/glob
- Neo4j driver: https://github.com/neo4j/neo4j-javascript-driver
