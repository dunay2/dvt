# Engine Documentation Navigation Guide

This guide describes the navigation structure for all pages and files in the `engine` folder. It includes a complete list of documents and recommendations for cross-linking and coherent navigation.

---

## Navigation Principles

- Every main page (core, adapters, workflows, security, operations, contracts, capabilities) must link to:
  - All other main pages
  - Key documents in their topic area
  - Relevant subfolders and specifications
  - [C4 Engine Diagram](c4-engine.md)
- The `index.md` page is the entry point and must link to all main pages and the most important documents.
- Use relative links for portability.
- Cross-reference between related documents (e.g., adapters ↔ contracts, security ↔ ops).
- Include a brief purpose and navigation section in every page.

---

## Main Pages

- [index.md](index.md) — Engine main navigation
- [core.md](core.md) — Orchestration, state management, constraints, DDD, functional overview, sequence diagrams, metrics, [VERSIONING.md](VERSIONING.md)
- [adapters.md](adapters.md) — Integration specs: [Temporal](adapters/temporal/TemporalAdapter.spec.md), [Conductor](adapters/conductor/ConductorAdapter.spec.md), [State Store](adapters/state-store/postgres/StateStoreAdapter.md), [State Store](adapters/state-store/snowflake/StateStoreAdapter.md)
- [workflows.md](workflows.md) — Workflow models, event contracts, signals, sequence diagrams
- [security.md](security.md) — Threat model, invariants, authorization, audit, plugin policies, tenant isolation tests
- [operations.md](operations.md) — Observability, SLOs, runbooks, incident response
- [contracts.md](contracts.md) — Event contracts, interfaces, capabilities, security, state store, schemas, glossary
- [capabilities.md](capabilities.md) — Capability schemas, adapter matrices, validation reports
- [c4-engine.md](c4-engine.md) — C4 context, container and component views

---

## Subfolders and Key Documents

### adapters/

- [adapters/temporal/TemporalAdapter.spec.md](adapters/temporal/TemporalAdapter.spec.md)
- [adapters/temporal/EnginePolicies.md](adapters/temporal/EnginePolicies.md)
- [adapters/conductor/ConductorAdapter.spec.md](adapters/conductor/ConductorAdapter.spec.md)
- [adapters/state-store/postgres/StateStoreAdapter.md](adapters/state-store/postgres/StateStoreAdapter.md)
- [adapters/state-store/snowflake/StateStoreAdapter.md](adapters/state-store/snowflake/StateStoreAdapter.md)

### contracts/

- [contracts/engine/IWorkflowEngine.v1.md](contracts/engine/IWorkflowEngine.v1.md)
- [contracts/engine/ExecutionSemantics.v1.md](contracts/engine/ExecutionSemantics.v1.md)
- [contracts/engine/RunEventCatalog.v1.md](contracts/engine/RunEventCatalog.v1.md)
- [contracts/engine/GlossaryContract.v1.md](contracts/engine/GlossaryContract.v1.md)
- [contracts/engine/IProviderAdapter.v1.md](contracts/engine/IProviderAdapter.v1.md)
- [contracts/state-store/IRunStateStore.v1.md](contracts/state-store/IRunStateStore.v1.md)
- [contracts/state-store/IRunStateStore.v2.0.md](contracts/state-store/IRunStateStore.v2.0.md)
- [contracts/security/IAuthorization.v1.md](contracts/security/IAuthorization.v1.md)
- [contracts/security/AuditLog.v1.md](contracts/security/AuditLog.v1.md)
- [contracts/capabilities/README.md](contracts/capabilities/README.md)
- [contracts/capabilities/capabilities.schema.json](contracts/capabilities/capabilities.schema.json)
- [contracts/capabilities/adapters.capabilities.json](contracts/capabilities/adapters.capabilities.json)
- [contracts/capabilities/validation-report.schema.json](contracts/capabilities/validation-report.schema.json)

### dev/

- [dev/determinism-tooling.md](dev/determinism-tooling.md)
- [dev/CONTRACT_TOOLING_PROPOSAL.v1.md](dev/CONTRACT_TOOLING_PROPOSAL.v1.md)

### ops/

- [ops/observability.md](ops/observability.md)
- [ops/SLOs.md](ops/SLOs.md)
- [ops/runbooks/incident_response.md](ops/runbooks/incident_response.md)
- [ops/runbooks/severity_matrix.md](ops/runbooks/severity_matrix.md)

### roadmap/

- [roadmap/engine-phases.md](roadmap/engine-phases.md)

### schemas/

- [schemas/signal/Cancel.v1.json](schemas/signal/Cancel.v1.json)
- [schemas/signal/EmergencyStop.v1.json](schemas/signal/EmergencyStop.v1.json)
- [schemas/signal/EscalateAlert.v1.json](schemas/signal/EscalateAlert.v1.json)
- [schemas/signal/InjectOverride.v1.json](schemas/signal/InjectOverride.v1.json)
- [schemas/signal/Pause.v1.json](schemas/signal/Pause.v1.json)
- [schemas/signal/Resume.v1.json](schemas/signal/Resume.v1.json)
- [schemas/signal/RetryRun.v1.json](schemas/signal/RetryRun.v1.json)
- [schemas/signal/RetryStep.v1.json](schemas/signal/RetryStep.v1.json)
- [schemas/signal/SkipStep.v1.json](schemas/signal/SkipStep.v1.json)
- [schemas/signal/UpdateParams.v1.json](schemas/signal/UpdateParams.v1.json)
- [schemas/signal/UpdateTarget.v1.json](schemas/signal/UpdateTarget.v1.json)

### security/

- [security/PLUGIN_PROVENANCE_POLICY.v1.md](security/PLUGIN_PROVENANCE_POLICY.v1.md)
- [security/SECURITY_INVARIANTS.v1.md](security/SECURITY_INVARIANTS.v1.md)
- [security/TENANT_ISOLATION_TESTS.v1.md](security/TENANT_ISOLATION_TESTS.v1.md)
- [security/THREAT_MODEL.md](security/THREAT_MODEL.md)

### delivery-gaps/

- [delivery-gaps/aggregate-model.md](delivery-gaps/aggregate-model.md)
- [delivery-gaps/intent-schema-migration-carencias.md](delivery-gaps/intent-schema-migration-carencias.md)
- [delivery-gaps/intent-store-carencias.md](delivery-gaps/intent-store-carencias.md)
- [delivery-gaps/RunPlanWorkflow_Refactor_Analysis.md](delivery-gaps/RunPlanWorkflow_Refactor_Analysis.md)

### structure/

- [structure/metrics-catalog.md](structure/metrics-catalog.md)
- [structure/engine-constraints.md](structure/engine-constraints.md)
- [structure/engine-ddd.md](structure/engine-ddd.md)
- [structure/engine-functional.md](structure/engine-functional.md)
- [structure/engine-sequence.md](structure/engine-sequence.md)

---

## Other Key Documents

- [engine-constraints.md](engine-constraints.md)
- [engine-ddd.md](engine-ddd.md)
- [engine-functional.md](engine-functional.md)
- [engine-sequence.md](engine-sequence.md)
- [metrics-catalog.md](metrics-catalog.md)
- [VERSIONING.md](VERSIONING.md)

---

## Recommendations for Navigation

- Always provide a navigation section at the top of each page.
- Link to the C4 diagram and main pages from every thematic page.
- Reference key contracts, schemas, and specs in context.
- Use cross-links between related documents and folders.
- Keep README.md in each subfolder for context and quick navigation.
- Update this guide as new documents are added.

---

_Last updated: 2026-03-15_
