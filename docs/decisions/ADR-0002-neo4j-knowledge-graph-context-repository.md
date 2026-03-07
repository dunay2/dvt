```markdown
# ADR-0002: Neo4j as Central Knowledge Graph Repository

- **Status**: Superseded
- **Date**: 2026-02-16
- **Updated**: 2026-03-07
- **Owners**: Architecture, Engine, Tooling maintainers
- **Related files**:
  - [`docs/adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md`](../adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md)
  - [`packages/@dvt/traceability-service/README.md`](../../packages/@dvt/traceability-service/README.md)
  - [`packages/@dvt/traceability-service/src/service.ts`](../../packages/@dvt/traceability-service/src/service.ts)

---

## Context

The repository evaluated Neo4j as a central knowledge graph to improve impact analysis,
ADR traceability, and AI context retrieval.

The implementation added repository graph scripts, Cypher snapshots, and a Neo4j-backed
publisher in the traceability service.

---

## Decision

The Neo4j knowledge graph approach is retired.

The repository will keep the useful part of the workflow:

1. trace header scanning,
2. ADR validation,
3. deterministic manifest generation.

The repository will not maintain:

- Neo4j runtime infrastructure,
- Cypher graph generation snapshots,
- graph publication from the traceability service,
- CI hooks coupled to repository graph refresh.

---

## Rationale

Neo4j did not provide enough operational or architectural value to justify:

- tooling maintenance cost,
- extra CI and local workflow complexity,
- duplicated repository metadata,
- drift between source code and graph artifacts.

Manifest-first traceability keeps the governance signal while removing unused infrastructure.

---

## Consequences

### Positive

- Less tooling and CI surface area.
- No graph artifact drift.
- Traceability remains deterministic and repository-local.

### Negative

- No graph-based ad hoc impact queries.
- Historical Neo4j experiments remain only as ADR history, not as active tooling.

---

## Follow-up

- Remove `scripts/neo4j/` and related package scripts.
- Remove Neo4j dependencies from active packages.
- Keep ADR-0002 as a historical record of a superseded approach.
```
