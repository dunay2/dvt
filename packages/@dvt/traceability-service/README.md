# @dvt/traceability-service (DVT+)

Traceability governance subsystem implementing **ADR-0000**.

## What this is

A service + CLI (initially CLI-first) that:

- Scans governed files for traceability headers
- Validates ADR existence and `Status: Accepted`
- Generates a traceability manifest (machine-readable)
- Publishes the architecture traceability graph to **Neo4j** (idempotent MERGE)
- Enables impact queries (ADR blast radius) and drift detection (Phase 2)

## Why a service (not just scripts)

Scripts enforce rules in one repo. A service turns traceability into architecture intelligence:

- Org-wide governance (multi-module / multi-repo)
- Central audit history (optional Postgres adapter later)
- Queryable impact analysis through Neo4j
- Deterministic enforcement in CI

## Quick start (local)

### 1) Install

```bash
pnpm i
pnpm -C packages/@dvt/traceability-service build
```

### 2) Configure

Copy config:

```bash
cp packages/@dvt/traceability-service/traceability.config.example.json traceability.config.json
```

### 3) Run (validate + publish)

```bash
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USER="neo4j"
export NEO4J_PASSWORD="password"

pnpm -C packages/@dvt/traceability-service trace validate-and-publish \
  --repoRoot . \
  --component "@dvt/contracts" \
  --componentVersion "1.0.0" \
  --repoSha "local" \
  --moduleName "@dvt/contracts" \
  --modulePath "packages/@dvt/contracts" \
  --config "./traceability.config.json"
```

## Neo4j bootstrap

Run constraints once (see `docs/neo4j/constraints.cypher`).

## CI

See `docs/ci/github-actions.yml`.

## References

- Neo4j: https://neo4j.com/docs/
- Cypher: https://neo4j.com/docs/cypher-manual/current/
- Neo4j JS Driver: https://github.com/neo4j/neo4j-javascript-driver
- C4 Model: https://c4model.com/
