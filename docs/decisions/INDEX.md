# Architecture Decision Records (ADR) Index

This document is the main entry point for all ADRs in the repository.

## ADR Catalog

| ADR      | Title                                                       | Status   | Date       | File                                                                                                                                                               |
| -------- | ----------------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ADR-0000 | Generación de código con trazabilidad normativa obligatoria | Accepted | 2026-02-16 | [`ADR-0000-Generación de código con trazabilidad normativa obligatoria.md`](./ADR-0000-Generación%20de%20código%20con%20trazabilidad%20normativa%20obligatoria.md) |
| ADR-0001 | Temporal Integration Test Policy                            | Accepted | 2026-02-14 | [`ADR-0001-temporal-integration-test-policy.md`](./ADR-0001-temporal-integration-test-policy.md)                                                                   |
| ADR-0002 | Neo4j as Central Knowledge Graph Repository                 | Accepted | 2026-02-16 | [`ADR-0002-neo4j-knowledge-graph-context-repository.md`](./ADR-0002-neo4j-knowledge-graph-context-repository.md)                                                   |
| ADR-0003 | Execution Model Sovereignty                                 | Accepted | 2026-02-16 | [`ADR-0003-execution-model.md`](./ADR-0003-execution-model.md)                                                                                                     |
| ADR-0004 | Event Sourcing Strategy                                     | Accepted | 2026-02-16 | [`ADR-0004-event-sourcing-strategy.md`](./ADR-0004-event-sourcing-strategy.md)                                                                                     |
| ADR-0005 | Contract Formalization Tooling                              | Accepted | 2026-02-16 | [`ADR-0005-contract-formalization-tooling.md`](./ADR-0005-contract-formalization-tooling.md)                                                                       |
| ADR-0006 | Contract Tooling Governance                                 | Accepted | 2026-02-16 | [`ADR-0006-contract-tooling-governance.md`](./ADR-0006-contract-tooling-governance.md)                                                                             |
| ADR-0007 | Temporal Retry Policy for MVP Interpreter Runtime           | Accepted | 2026-02-18 | [`ADR-0007-temporal-retry-policy-mvp.md`](./ADR-0007-temporal-retry-policy-mvp.md)                                                                                 |
| ADR-0008 | Source Import Wizard (Warehouse → dbt Sources)              | Accepted | 2026-02-18 | [`ADR-0008-source-import-wizard-warehouse-to-dbt-sources.md`](./ADR-0008-source-import-wizard-warehouse-to-dbt-sources.md)                                         |

---

## Usage Rules

1. New ADRs MUST use the next sequential identifier.
2. ADR filenames MUST be lowercase kebab-case (except the `ADR-XXXX` prefix).
3. ADR content SHOULD follow the structure used by [`ADR-0001-temporal-integration-test-policy.md`](./ADR-0001-temporal-integration-test-policy.md).
4. This index MUST be updated whenever an ADR is added, renamed, or superseded.
