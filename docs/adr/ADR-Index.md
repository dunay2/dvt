# Architecture Decision Records (ADR) Index

This document is the main entry point for architecture decisions in the DVT+ repository.

## Specification Decisions vs ADRs

**Specification Decisions** are the canonical, versioned baseline for product and technical rules. They define the core contracts, invariants, and system-wide requirements. These documents are stable and serve as the foundation for all architectural work.

**ADRs (Architecture Decision Records)** extend, refine, or adapt Specification Decisions for specific implementation, migration, integration, or governance needs. ADRs never contradict Specification Decisions; they clarify, detail, or evolve the architecture in response to real-world requirements.

**Relationship:**

- Specification Decisions are the "what" and "why" of the system.
- ADRs are the "how" and "when" for architectural choices and changes.
- ADRs must reference Specification Decisions when relevant, and always respect their baseline.

**Navigation:**

- Use Specification Decisions for canonical rules and contracts.
- Use ADRs for implementation details, migrations, and architectural history.

---

## Canonical Specification Decisions

- [Specification Decisions (Latest)](../decisions/SPECIFICATION_DECISIONS.md)
- DVT+ — Specification Decisions (Canonical Specs) — v1

Specification decisions are the canonical baseline. ADRs below extend or refine those decisions over time.

---

## ADR Catalog

| ADR Number | Title                                                            | Status   | Date       | File                                                                                                                                       |
| ---------- | ---------------------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ADR-0000   | Code Generation with Enforced Normative Traceability (Automated) | Accepted | 2026-02-14 | [ADR-0000-Code-generation-with-normative-traceability-required.en.md](ADR-0000-Code-generation-with-normative-traceability-required.en.md) |
| ADR-0001   | Temporal Integration Test Policy                                 | Accepted | 2026-02-14 | [ADR-0001-temporal-integration-test-policy.md](ADR-0001-temporal-integration-test-policy.md)                                               |
| ADR-0002   | Neo4j as Central Knowledge Graph Repository                      | Accepted | 2026-02-16 | [ADR-0002-neo4j-knowledge-graph-context-repository.md](ADR-0002-neo4j-knowledge-graph-context-repository.md)                               |
| ADR-0003   | Execution Model Sovereignty                                      | Accepted | 2026-02-16 | [ADR-0003-execution-model.md](ADR-0003-execution-model.md)                                                                                 |
| ADR-0004   | Event Sourcing Strategy                                          | Accepted | 2026-02-16 | [ADR-0004-event-sourcing-strategy.md](ADR-0004-event-sourcing-strategy.md)                                                                 |
| ADR-0005   | Contract Formalization Tooling                                   | Accepted | 2026-02-16 | [ADR-0005-contract-formalization-tooling.md](ADR-0005-contract-formalization-tooling.md)                                                   |
| ADR-0006   | Contract Tooling Governance                                      | Accepted | 2026-02-16 | [ADR-0006-contract-tooling-governance.md](ADR-0006-contract-tooling-governance.md)                                                         |
| ...        | ...                                                              | ...      | ...        | ...                                                                                                                                        |
| ADR-0030   | Pre-Dispatch Intent Log for startRun Crash Consistency           | Accepted | 2026-03-03 | [ADR-0030-pre-dispatch-intent-log.md](ADR-0030-pre-dispatch-intent-log.md)                                                                 |
| ADR-0031   | Storage Adapter Tenant Isolation Strategy                        | Accepted | 2026-03-03 | [ADR-0031-adapter-tenant-isolation.md](ADR-0031-adapter-tenant-isolation.md)                                                               |

_Update this table whenever an ADR is added, renamed, or superseded._

---

## Usage Rules

- New ADRs MUST use the next sequential identifier.
- ADR filenames MUST be lowercase kebab-case (except the ADR-XXXX prefix).
- ADR content SHOULD follow the structure used by [ADR-0000-Code-generation-with-normative-traceability-required.en.md](ADR-0000-Code-generation-with-normative-traceability-required.en.md).
- This index MUST be updated whenever an ADR is added, renamed, or superseded.
- SPECIFICATION_DECISIONS.md MUST be updated whenever a new specification-decisions version is accepted.

---

## References

- [ADR Implementation Status](ADR-Implementation%20Status.md)
- [ADR Template](ADR-0000-Code-generation-with-normative-traceability-required.en.md)

---

_Last updated: 2026-03-03_
