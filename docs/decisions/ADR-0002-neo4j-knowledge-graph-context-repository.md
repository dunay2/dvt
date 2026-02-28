# ADR-0002: Neo4j as Central Knowledge Graph Repository

- **Status**: Accepted
- **Date**: 2026-02-16
- **Owners**: Architecture, Engine, Tooling maintainers
- **Related files**:
  - [`docs/INDEX.md`](../INDEX.md)
  - [`docker-compose.neo4j.yml`](../../docker-compose.neo4j.yml)
  - [`scripts/neo4j/base-schema.cypher`](../../scripts/neo4j/base-schema.cypher)
  - [`scripts/neo4j/neo4j-seed.cjs`](../../scripts/neo4j/neo4j-seed.cjs)
  - [`scripts/neo4j/neo4j-query-context.cjs`](../../scripts/neo4j/neo4j-query-context.cjs)
  - [`scripts/neo4j/neo4j-json-to-prompt.cjs`](../../scripts/neo4j/neo4j-json-to-prompt.cjs)

---

## Context

The repository has many modules, contracts, and cross-cutting dependencies. Operational context is fragmented across code, ADRs, docs, and team memory.

During day-to-day work with AI assistants, context windows are limited and continuity is lost between sessions. This causes friction in maintenance, refactoring, onboarding, and impact analysis.

The project needs a queryable source of truth to extract focused subgraphs by task, file, module, or ADR.

---

## Decision

Adopt **Neo4j** (Community 5.x locally, or AuraDB free tier) as the central architectural and code knowledge repository.

### 1) Graph scope

The graph MUST store at least:

- modules, files, classes, functions
- artifact dependencies
- architecture decisions (ADRs) linked to code
- ownership/domain metadata
- retrieval metadata for AI context serialization

### 2) Tooling baseline

The baseline stack includes:

- Neo4j database
- Node.js driver (`neo4j-driver`)
- VS Code extension for Cypher exploration
- serialization scripts (subgraph JSON → prompt text)

### 3) Data model baseline

Minimum graph model:

- nodes: `Module`, `File`, `Function`, `Decision`, `Person`
- relations: `CONTAINS`, `DEFINES`, `DEPENDS`, `IMPLEMENTS_DECISION`, `CONSULTED`

### 4) Operating workflow

1. Start Neo4j instance.
2. Seed baseline graph.
3. Ingest repository metadata.
4. Query subgraph by scope.
5. Serialize context for AI workflows.

---

## Consequences

### Positive

- High-precision context retrieval for engineering tasks.
- Better continuity across AI-assisted sessions.
- Scalable architectural traceability.

### Trade-offs

- Initial modeling and ingestion overhead.
- Ongoing discipline required to keep graph up to date.

---

## Acceptance Criteria

1. A working Neo4j instance is available for the team (local or AuraDB).
2. Seeding and query scripts exist and run from the monorepo.
3. A structured prompt can be generated from Cypher query output.
4. At least one real workflow demonstrates reproducible context extraction.

---

## References

- [`ADR-0001-temporal-integration-test-policy.md`](./ADR-0001-temporal-integration-test-policy.md)
- Neo4j docs: <https://neo4j.com/docs/>
- Neo4j JavaScript Driver: <https://neo4j.com/docs/javascript-manual/current/>
