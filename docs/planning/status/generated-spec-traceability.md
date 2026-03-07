---
title: Generated Spec Traceability
status: Active
owner: docs
last_reviewed: 2026-03-07
planning_type: status
---

# Generated Spec Traceability

Generated automatically from repository documentation and source-code signals on 2026-03-07.

## Summary

| Metric                            | Value     |
| --------------------------------- | --------- |
| Canonical docs scanned            | 190       |
| Canonical docs with code links    | 13 (7%)   |
| Canonical docs with ADR links     | 19 (10%)  |
| Code files scanned                | 343       |
| Code files with ADR baseline tags | 103 (30%) |
| Code files with explicit doc refs | 0 (0%)    |

## Canonical Doc Coverage By Section

| Section       | Docs | Docs With Code Links | Docs With ADR Links |
| ------------- | ---- | -------------------- | ------------------- |
| adr           | 32   | 6 (19%)              | 11 (34%)            |
| architecture  | 64   | 1 (2%)               | 6 (9%)              |
| contracts     | 4    | 0 (0%)               | 0 (0%)              |
| evidence      | 3    | 1 (33%)              | 0 (0%)              |
| guides        | 3    | 1 (33%)              | 1 (33%)             |
| planning      | 76   | 4 (5%)               | 1 (1%)              |
| risk-register | 7    | 0 (0%)               | 0 (0%)              |
| runbooks      | 1    | 0 (0%)               | 0 (0%)              |

## Source Traceability By Workspace

| Workspace                          | Files | Files With ADR Baselines | Files With Doc Refs |
| ---------------------------------- | ----- | ------------------------ | ------------------- |
| apps/api                           | 12    | 0 (0%)                   | 0 (0%)              |
| apps/web                           | 79    | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/adapter-postgres     | 10    | 7 (70%)                  | 0 (0%)              |
| packages/@dvt/adapter-temporal     | 22    | 11 (50%)                 | 0 (0%)              |
| packages/@dvt/canonical            | 3     | 2 (67%)                  | 0 (0%)              |
| packages/@dvt/cli                  | 2     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/contracts            | 36    | 13 (36%)                 | 0 (0%)              |
| packages/@dvt/dsl                  | 5     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/engine               | 77    | 55 (71%)                 | 0 (0%)              |
| packages/@dvt/engine-contracts     | 1     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/observability        | 6     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/observability-otel   | 3     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/plan-interpreter     | 5     | 5 (100%)                 | 0 (0%)              |
| packages/@dvt/plan-verifier        | 6     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/planner              | 43    | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/planner-contracts    | 1     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/state-contracts      | 1     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/state-store          | 4     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/traceability-service | 26    | 10 (38%)                 | 0 (0%)              |
| packages/test                      | 1     | 0 (0%)                   | 0 (0%)              |

## Canonical Docs Missing Code Links

| Section      | Document                                                                                                                                                     | Status |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| adr          | [ADR Drafts](../../adr/_drafts/index.md)                                                                                                                     | Draft  |
| adr          | [ADR Status Board — DVT+ (Extensive Governance Version)](../../adr/ADR_Status_Board_Extensive.md)                                                            | -      |
| adr          | [ADR-0000: Code Generation with Enforced Normative Traceability (Automated)](../../adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md)  | -      |
| adr          | [ADR-0003: Execution Model Sovereignty](../../adr/ADR-0003-execution-model.md)                                                                               | -      |
| adr          | [ADR-0004: Event Sourcing Strategy (Extended)](../../adr/ADR-0004-event-sourcing-strategy.md)                                                                | -      |
| adr          | [ADR-0005: Contract Formalization Tooling](../../adr/ADR-0005-contract-formalization-tooling.md)                                                             | -      |
| adr          | [ADR-0007: Run Cancellation Semantics and Event Ownership](../../adr/ADR-0007_RunCancellation.md)                                                            | -      |
| adr          | [ADR-0008: Signal Idempotency Key Derivation](../../adr/ADR-0008_Signal_Idempotency.md)                                                                      | -      |
| adr          | [ADR-0009: Outbox Publication Ordering Guarantees](../../adr/ADR-0009_Outbox_Ordering.md)                                                                    | -      |
| adr          | [ADR-0010 — Run Event Envelope Split, Idempotency, and Runtime Integrity Governance (Comprehensive Version)](../../adr/ADR-0010-run-event-envelope-split.md) | -      |
| adr          | [ADR-0011 — RunStarted Ownership](../../adr/ADR-0011-run-started-ownership.md)                                                                               | -      |
| adr          | [ADR-0012 — Plan Integrity Ownership](../../adr/ADR-0012-plan-integrity-ownership.md)                                                                        | -      |
| adr          | [ADR-0012a — Canonical Plan Error Code Strategy](../../adr/ADR-0012a_Canonical_Error_Code_Strategy.md)                                                       | -      |
| adr          | [ADR-0013 — IRunStateStore.bootstrapRunTx](../../adr/ADR-0013-run-state-store-bootstrapRunTx.md)                                                             | -      |
| adr          | [ADR-0014 — Run-Driven Adapter Model](../../adr/ADR-0014-run-driven-adapter-model.md)                                                                        | -      |
| adr          | [ADR-0015 — getRunStatus Read Model Separation](../../adr/ADR-0015-getRunStatus-read-model-separation.md)                                                    | -      |
| adr          | [ADR-0016 — logicalAttemptId Ownership by Adapter](../../adr/ADR-0016-logicalAttemptId-adapter-ownership.md)                                                 | -      |
| adr          | [ADR-0017: ExecutionPlan Schema Versioning & Compatibility](../../adr/ADR-0017_ExecutionPlan_Schema_Versioning.md)                                           | -      |
| adr          | [ADR-0018 — Shared Kernel Ownership Governance (`@dvt/contracts`)](../../adr/ADR-0018_Shared_Kernel_Ownership_Governance.md)                                 | -      |
| adr          | [ADR-0019 — Adapter Equivalence and Maintenance Boundary](../../adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.en.md)                             | -      |
| adr          | [ADR-0019 — Adapter Equivalence and Maintenance Boundary](../../adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.md)                                | -      |
| adr          | [ADR-0029 — Run Maintenance Service Extraction](../../adr/ADR-0029-run-maintenance-service.md)                                                               | -      |
| adr          | [ADR-0031 - Storage Adapter Tenant Isolation Strategy](../../adr/ADR-0031-adapter-tenant-isolation.md)                                                       | -      |
| adr          | [Architecture Decision Records (ADR) Index](../../adr/ADR-Index.md)                                                                                          | -      |
| adr          | [ADRs](../../adr/index.md)                                                                                                                                   | Active |
| architecture | [DVT+ Architecture Atlas (Code-Aligned)](../../architecture/atlas/architecture/architecture_atlas.md)                                                        | -      |
| architecture | [DVT+ Engineering Playbook (Code-Aligned)](../../architecture/atlas/engineering/engineering_playbook.md)                                                     | -      |
| architecture | [DVT Architecture Atlas](../../architecture/atlas/index.md)                                                                                                  | -      |
| architecture | [DVT Architecture Atlas](../../architecture/atlas/README.md)                                                                                                 | -      |
| architecture | [DVT+ Code Completion Assessment (2026-03-06)](../../architecture/atlas/status/code_completion_assessment_2026-03-06.md)                                     | -      |
| architecture | [ConductorAdapter Specification (DRAFT v0.8 — Phase 2)](../../architecture/engine/adapters/conductor/ConductorAdapter.spec.md)                               | -      |
| architecture | [Postgres State Store Adapter](../../architecture/engine/adapters/state-store/postgres/StateStoreAdapter.md)                                                 | -      |
| architecture | [Snowflake State Store Adapter](../../architecture/engine/adapters/state-store/snowflake/StateStoreAdapter.md)                                               | -      |
| architecture | [Temporal Engine Policies](../../architecture/engine/adapters/temporal/EnginePolicies.md)                                                                    | -      |
| architecture | [TemporalAdapter Specification (Normative v1.0)](../../architecture/engine/adapters/temporal/TemporalAdapter.spec.md)                                        | -      |
| architecture | [Capabilities: Executable Contracts](../../architecture/engine/contracts/capabilities/README.md)                                                             | -      |
| architecture | [Contract Template (v1)](../../architecture/engine/contracts/CONTRACT_TEMPLATE.v1.md)                                                                        | -      |
| architecture | [Decision & Risk Log — Contracts v2.0.0](../../architecture/engine/contracts/DECISION_AND_RISK_LOG_v2.0.0.md)                                                | -      |
| architecture | [Agnostic Event Layer Strategy (v2.0.1)](../../architecture/engine/contracts/engine/AgnosticEventLayerStrategy.v2.0.1.md)                                    | -      |
| architecture | [Execution Semantics Contract (Normative v1)](../../architecture/engine/contracts/engine/ExecutionSemantics.v1.md)                                           | -      |

## Duplicate Language Pairs Detected

| English Variant                                                              | Base Variant                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| docs/adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.en.md         | docs/adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.md         |
| docs/architecture/vision/DVT_Docs_Pack_v0.6/docs/standards/development.en.md | docs/architecture/vision/DVT_Docs_Pack_v0.6/docs/standards/development.md |
| docs/review/DVT+\_Architectural_Review_20260226_AI.en.md                     | docs/review/DVT+\_Architectural_Review_20260226_AI.md                     |

## Recommended Convention

- Canonical docs SHOULD declare source-code references through markdown links and frontmatter metadata.
- Source files SHOULD declare architectural traceability with `@baseline ADR-...` and MAY add `@docs ...` links.
- Active specification documents SHOULD have at least one code reference or an explicit `reference-only` status model.

> This page is auto-generated by `pnpm docs:traceability:generate`. Do not edit manually.
