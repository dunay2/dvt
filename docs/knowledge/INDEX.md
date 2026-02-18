# DVT Knowledge Base — Index

This index centralizes operational/technical knowledge for the repository to accelerate:

- onboarding
- impact analysis
- issue planning
- traceability between ADR ↔ documentation ↔ code

---

## 1) System overview

- [Repository map and layers](./REPOSITORY_MAP.md)
- [Roadmap, status, and issues](./ROADMAP_AND_ISSUES_MAP.md)

## 2) Architecture and contracts

- [Engine architecture (index)](../architecture/engine/INDEX.md)
- [Frontend architecture (index)](../architecture/frontend/INDEX.md)
- [Contracts automation](../CONTRACTS_AUTOMATION_INDEX.md)

## 3) Architecture Decision Records (ADR)

- [ADR-0001: Temporal integration test policy](../decisions/ADR-0001-temporal-integration-test-policy.md)
- [ADR-0002: Neo4j knowledge graph context repository](../decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md)

## 4) Knowledge graph (Neo4j)

- Compose: [`docker-compose.neo4j.yml`](../../docker-compose.neo4j.yml)
- Base Cypher: [`scripts/neo4j/base-schema.cypher`](../../scripts/neo4j/base-schema.cypher)
- Seed: [`scripts/neo4j/neo4j-seed.cjs`](../../scripts/neo4j/neo4j-seed.cjs)
- Context query: [`scripts/neo4j/neo4j-query-context.cjs`](../../scripts/neo4j/neo4j-query-context.cjs)
- JSON → prompt: [`scripts/neo4j/neo4j-json-to-prompt.cjs`](../../scripts/neo4j/neo4j-json-to-prompt.cjs)

## 5) Packages (workspace)

- [`packages/contracts`](../../packages/contracts)
- [`packages/engine`](../../packages/engine)
- [`packages/adapter-temporal`](../../packages/adapter-temporal)
- [`packages/adapter-postgres`](../../packages/adapter-postgres)
- [`packages/cli`](../../packages/cli)

## 6) Operational status

- [Implementation summary](../status/IMPLEMENTATION_SUMMARY.md)
- [Quality pack temporal/engine](../status/DVT_PLUS_ENGINE_TEMPORAL_QUALITY_PACK_2026-02-14.md)
