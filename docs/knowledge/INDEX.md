# DVT Knowledge Index

This index centralizes operational and technical repository knowledge for:

- onboarding,
- impact analysis,
- delivery planning,
- ADR-to-code traceability.

---

## 1) System overview

- [Repository map and layers](./REPOSITORY_MAP.md)
- [Roadmap, status and issues](./ROADMAP_AND_ISSUES_MAP.md)

## 2) Architecture and contracts

- [Architecture index](../architecture/index.md)
- [Engine architecture](../architecture/engine/index.md)
- [Contracts index](../contracts/index.md)

## 3) Architecture decisions

- [ADR index](../adr/index.md)
- [ADR-0001: Temporal integration test policy](../adr/ADR-0001-temporal-integration-test-policy.md)
- [ADR-0002: Neo4j knowledge graph context repository (superseded)](../adr/ADR-0002-neo4j-knowledge-graph-context-repository.md)

## 4) Repository knowledge strategy

- Repository maps and ADRs are the active knowledge sources.
- Traceability is manifest-first and repository-local.
- Neo4j graph tooling was retired on 2026-03-07 and is not part of the active toolchain.

## 5) Workspace packages

- [`packages/@dvt/contracts`](../../packages/@dvt/contracts)
- [`packages/@dvt/engine`](../../packages/@dvt/engine)
- [`packages/@dvt/adapter-temporal`](../../packages/@dvt/adapter-temporal)
- [`packages/@dvt/adapter-postgres`](../../packages/@dvt/adapter-postgres)
- [`packages/@dvt/cli`](../../packages/@dvt/cli)
- [`packages/@dvt/traceability-service`](../../packages/@dvt/traceability-service)
