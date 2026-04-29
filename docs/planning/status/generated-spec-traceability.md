---
title: Generated Spec Traceability
status: Active
owner: docs
last_reviewed: 2026-04-13
planning_type: status
---

# Generated Spec Traceability

Generated automatically from repository documentation and source-code signals on 2026-04-13.

## Summary

| Metric                            | Value     |
| --------------------------------- | --------- |
| Canonical docs scanned            | 911       |
| Canonical docs with code links    | 86 (9%)   |
| Canonical docs with ADR links     | 85 (9%)   |
| Code files scanned                | 1126      |
| Code files with ADR baseline tags | 126 (11%) |
| Code files with explicit doc refs | 0 (0%)    |

## Canonical Doc Coverage By Section

| Section       | Docs | Docs With Code Links | Docs With ADR Links |
| ------------- | ---- | -------------------- | ------------------- |
| adr           | 51   | 6 (12%)              | 27 (53%)            |
| architecture  | 184  | 46 (25%)             | 17 (9%)             |
| contracts     | 10   | 0 (0%)               | 1 (10%)             |
| evidence      | 101  | 2 (2%)               | 5 (5%)              |
| guides        | 31   | 3 (10%)              | 5 (16%)             |
| planning      | 490  | 28 (6%)              | 30 (6%)             |
| risk-register | 31   | 0 (0%)               | 0 (0%)              |
| runbooks      | 13   | 1 (8%)               | 0 (0%)              |

## Source Traceability By Workspace

| Workspace                          | Files | Files With ADR Baselines | Files With Doc Refs |
| ---------------------------------- | ----- | ------------------------ | ------------------- |
| apps/api                           | 204   | 3 (1%)                   | 0 (0%)              |
| apps/lineage-worker                | 11    | 0 (0%)                   | 0 (0%)              |
| apps/outbox-worker                 | 37    | 0 (0%)                   | 0 (0%)              |
| apps/projector-worker              | 4     | 0 (0%)                   | 0 (0%)              |
| apps/web                           | 372   | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/adapter-postgres     | 79    | 26 (33%)                 | 0 (0%)              |
| packages/@dvt/adapter-temporal     | 35    | 14 (40%)                 | 0 (0%)              |
| packages/@dvt/artifacts            | 14    | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/canonical            | 4     | 2 (50%)                  | 0 (0%)              |
| packages/@dvt/cli                  | 2     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/contracts            | 60    | 13 (22%)                 | 0 (0%)              |
| packages/@dvt/delivery             | 15    | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/dsl                  | 6     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/engine               | 147   | 48 (33%)                 | 0 (0%)              |
| packages/@dvt/observability        | 6     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/observability-otel   | 3     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/plan-interpreter     | 6     | 5 (83%)                  | 0 (0%)              |
| packages/@dvt/plan-verifier        | 9     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/planner              | 45    | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/planner-contracts    | 1     | 0 (0%)                   | 0 (0%)              |
| packages/@dvt/run-domain           | 7     | 4 (57%)                  | 0 (0%)              |
| packages/@dvt/state-store          | 28    | 1 (4%)                   | 0 (0%)              |
| packages/@dvt/traceability-service | 30    | 10 (33%)                 | 0 (0%)              |
| packages/test                      | 1     | 0 (0%)                   | 0 (0%)              |

## Canonical Docs Missing Code Links

| Section | Document                                                                                                                                                          | Status     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| adr     | [ADR-G5 - Independent Outbox Worker Runtime](../../adr/_drafts/ADR-G5-independent-outbox-worker-runtime.md)                                                       | Proposed   |
| adr     | [ADR Drafts](../../adr/_drafts/index.md)                                                                                                                          | Draft      |
| adr     | [ADR Status Board — DVT+ (Extensive Governance Version)](../../adr/ADR_Status_Board_Extensive.md)                                                                 | -          |
| adr     | [ADR-0000: Code Generation with Enforced Normative Traceability (Automated)](../../adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md)       | -          |
| adr     | [ADR-0003: Execution Model Sovereignty](../../adr/ADR-0003-execution-model.md)                                                                                    | -          |
| adr     | [ADR-0004: Event Sourcing Strategy (Extended)](../../adr/ADR-0004-event-sourcing-strategy.md)                                                                     | -          |
| adr     | [ADR-0005: Contract Formalization Tooling](../../adr/ADR-0005-contract-formalization-tooling.md)                                                                  | -          |
| adr     | [ADR-0007: Run Cancellation Semantics and Event Ownership](../../adr/ADR-0007_RunCancellation.md)                                                                 | -          |
| adr     | [ADR-0008: Signal Idempotency Key Derivation](../../adr/ADR-0008_Signal_Idempotency.md)                                                                           | -          |
| adr     | [ADR-0009: Outbox Publication Ordering Guarantees](../../adr/ADR-0009_Outbox_Ordering.md)                                                                         | -          |
| adr     | [ADR-0010 — Run Event Envelope Split, Idempotency, and Runtime Integrity Governance (Comprehensive Version)](../../adr/ADR-0010-run-event-envelope-split.md)      | -          |
| adr     | [ADR-0011 — RunStarted Ownership](../../adr/ADR-0011-run-started-ownership.md)                                                                                    | -          |
| adr     | [ADR-0012 - Plan Integrity Ownership](../../adr/ADR-0012-plan-integrity-ownership.md)                                                                             | -          |
| adr     | [ADR-0012a — Canonical Plan Error Code Strategy](../../adr/ADR-0012a_Canonical_Error_Code_Strategy.md)                                                            | -          |
| adr     | [ADR-0013 — IRunStateStore.bootstrapRunTx](../../adr/ADR-0013-run-state-store-bootstrapRunTx.md)                                                                  | -          |
| adr     | [ADR-0014 — Run-Driven Adapter Model](../../adr/ADR-0014-run-driven-adapter-model.md)                                                                             | -          |
| adr     | [ADR-0015 — getRunStatus Read Model Separation](../../adr/ADR-0015-getRunStatus-read-model-separation.md)                                                         | -          |
| adr     | [ADR-0016 - logicalAttemptId Ownership by Adapter](../../adr/ADR-0016-logicalAttemptId-adapter-ownership.md)                                                      | Superseded |
| adr     | [ADR-0017: ExecutionPlan Schema Versioning & Compatibility](../../adr/ADR-0017_ExecutionPlan_Schema_Versioning.md)                                                | -          |
| adr     | [ADR-0018 — Shared Kernel Ownership Governance (`@dvt/contracts`)](../../adr/ADR-0018_Shared_Kernel_Ownership_Governance.md)                                      | -          |
| adr     | [ADR-0019 — Adapter Equivalence and Maintenance Boundary](../../adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.en.md)                                  | -          |
| adr     | [ADR-0019 — Adapter Equivalence and Maintenance Boundary](../../adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.md)                                     | -          |
| adr     | [ADR-0029 — Run Maintenance Service Extraction](../../adr/ADR-0029-run-maintenance-service.md)                                                                    | -          |
| adr     | [ADR-0031 - Storage Adapter Tenant Isolation Strategy](../../adr/ADR-0031-adapter-tenant-isolation.md)                                                            | -          |
| adr     | [ADR-0033 - Outbox Worker Sharding And Fencing Model](../../adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md)                                             | Accepted   |
| adr     | [ADR-0034 - Bounded Context Boundaries And Communication Rules](../../adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md)                         | Accepted   |
| adr     | [ADR-0035 - Planner Public Contract Evolution Protocol](../../adr/ADR-0035-planner-public-contract-evolution-protocol.md)                                         | Accepted   |
| adr     | [ADR-0036 - ExecutionPlan planVersion registry and runtime admission matrix](../../adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md)        | Accepted   |
| adr     | [ADR-0037 - Run Event Lifecycle Archival, Verification, and Restore Model](../../adr/ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md)     | Accepted   |
| adr     | [ADR-0038 - Delivery Buffer Retention and Purge Policy](../../adr/ADR-0038-delivery-buffer-retention-and-purge-policy.md)                                         | Accepted   |
| adr     | [ADR-0039 — Hexagonal Port Hardening and SOLID Remediation](../../adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md)                                 | Accepted   |
| adr     | [ADR-0040 - Retry Ownership and Attempt Authority](../../adr/ADR-0040-retry-ownership-and-attempt-authority.md)                                                   | Accepted   |
| adr     | [ADR-0041 - Global Domain State Model and Boundary Contracts](../../adr/ADR-0041-global-domain-state-model-and-boundary-contracts.md)                             | Accepted   |
| adr     | [ADR-0041A - Reconciler Health State and Readiness Port Semantics](../../adr/ADR-0041a-reconciler-health-state-and-readiness-port-semantics.md)                   | Accepted   |
| adr     | [ADR-0042 - ExecutionPlan canonical identity unification](../../adr/ADR-0042-execution-plan-canonical-identity-unification.md)                                    | Accepted   |
| adr     | [ADR-0043 - Plan record, plan store, and artifacts ownership](../../adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md)                               | Accepted   |
| adr     | [ADR-0044 - Structured contracts error metadata and non-semantic messages](../../adr/ADR-0044-structured-contracts-error-metadata.md)                             | Accepted   |
| adr     | [ADR-0045 - Dedicated status-head read model for hot run status queries](../../adr/ADR-0045-dedicated-status-head-read-model.md)                                  | Proposed   |
| adr     | [ADR-0046 - Execution plan definition and run execution policy separation](../../adr/ADR-0046-execution-plan-definition-and-run-execution-policy-separation.md)   | Accepted   |
| adr     | [ADR-0047 - Runtime-owned realized lifecycle for signal-driven transitions](../../adr/ADR-0047-runtime-owned-realized-lifecycle-for-signal-driven-transitions.md) | Accepted   |

## Duplicate Language Pairs Detected

| English Variant                                                      | Base Variant                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| docs/adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.en.md | docs/adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.md |

## Recommended Convention

- Canonical docs SHOULD declare source-code references through markdown links and frontmatter metadata.
- Source files SHOULD declare architectural traceability with `@baseline ADR-...` and MAY add `@docs ...` links.
- Active specification documents SHOULD have at least one code reference or an explicit `reference-only` status model.

> This page is auto-generated by `pnpm docs:traceability:generate`. Do not edit manually.
