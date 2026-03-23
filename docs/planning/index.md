---
title: Planning
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-03-08
---

# Planning

Canonical planning surfaces, active gap tracking, proposals, reviews, and
generated status artifacts.

Use this section to distinguish roadmap, current status, execution gaps,
and proposal work. Do not treat them as interchangeable surfaces.

Concept anchors for this page:

- [Glossary](../concepts/glossary.md) for `roadmap`, `status`, `gap`,
  `canonical spec`, and `verification tuple`
- [Domain Language](../concepts/domain-language.md) for the naming rules
  shared across planning, architecture, and code

## Navigation

- [Roadmap Of Record](roadmap/index.md)
- [Current Status](../architecture/system-delivery-status.md)
- [Gaps](gaps/index.md)
- [Proposals](proposals/index.md)
- [Reviews](reviews/index.md)
- [Status](status/index.md)

## Canonical Planning Surfaces

- [Roadmap Of Record](roadmap/index.md) for repository-wide sequencing and
  planning order
- [System Delivery Status](../architecture/system-delivery-status.md) for
  what is currently true in implementation
- [Gap Execution Plans](gaps/GAP_EXECUTION_PLANS.md) for active execution
  gaps and closure posture
- [Planning Status](status/index.md) for generated or curated status
  artifacts

## Proposals

- [CI Workflow Deduplication Plan](proposals/ci-workflow-deduplication-plan-20260307.md)
- [Documentation Restructuring Diagnostic And Roadmap](proposals/documentation-restructuring-diagnostic-and-roadmap.md)
- [Documentation Usability Change Plan](proposals/documentation-usability-change-plan-20260308.md)
- [Domain Cohesion Refactor Plan](domain-cohesion-refactor-plan.md)
- [Domain Cohesion Refactor Subplans](domain-cohesion-refactor-subplans.md)
- [DVT+ - Top 5 Architectural Gaps (Corrected)](dvt-top-5-gaps-corrected-20260319.md)
- [Engine Migration Plan: Current Gap to Target Blueprint v0.6](engine-gap-to-target-migration-plan.md)
- [G5 Outbox Worker Development Proposal](proposals/g5-outbox-worker-development-proposal-20260308.md)
- [Gap 4 Backpressure Admission Design](proposals/gap4-backpressure-admission-design-20260319.md)
- [Gap 4 PR1 Admission Foundation](proposals/gap4-backpressure-admission-pr1-foundation-20260319.md)
- [Gap 4 PR2 Raw Snapshot Store](proposals/gap4-backpressure-admission-pr2-raw-store-20260319.md)
- [Gap 4 PR3 Resilience Envelope](proposals/gap4-backpressure-admission-pr3-resilience-20260319.md)
- [Gap 4 PR4 Operability And Rollout](proposals/gap4-backpressure-admission-pr4-operability-20260319.md)
- [Gap 4 PR5 Projected Read Model](proposals/gap4-backpressure-admission-pr5-projected-read-model-20260319.md)
- [Gap 5 Domain Design Companion](proposals/gap-5-domain-design-companion-20260319.md)
- [Gap 5 Event Lifecycle And Archival Design](proposals/gap-5-event-lifecycle-and-archival-design-20260319.md)
- [Gap 5 PR1 Minimal Usable Archival](proposals/gap-5-pr1-minimal-usable-archival-20260319.md)
- [Gap 5 PR2 Deferred Deletion And Restore](proposals/gap-5-pr2-deferred-deletion-and-restore-20260319.md)
- [Gap 5 PR3 Delivery Buffer Retention](proposals/gap-5-pr3-delivery-buffer-retention-20260319.md)
- [Gap 5 PR4 Redaction ADR And Follow-Up](proposals/gap-5-pr4-redaction-adr-follow-up-20260319.md)
- [Gap 5 Sequence And Module Design](proposals/gap-5-sequence-and-module-design-20260319.md)
- [Package Module Build Policy v2](proposals/package-module-build-policy-v2-20260317.md)
- [Phase 2 Architectural Debt Roadmap](proposals/phase2-arch-debt-roadmap-20260315.md)
- [Planner Target State And Hardening Roadmap](proposals/planner-target-state-roadmap-20260320.md)
- [Principal Architecture Review Execution Plan](proposals/principal-architecture-review-execution-plan-20260317.md)
- [RC-A1 SimulateError Production Hardening](proposals/rc-a1-simulate-error-production-hardening-20260322.md)
- [RC-A2 Deterministic StartRun Intent ID](proposals/rc-a2-deterministic-start-run-intent-id-20260322.md)
- [RC-B2 Lineage Compiled Code Resolver Rollout](proposals/rc-b2-lineage-compiled-code-resolver-rollout-20260322.md)
- [Repository Governance Proposal Set 2026-03-17](proposals/repository-governance-proposal-set-20260317.md)
- [S15 Run Snapshot CAS Guard](proposals/s15-run-snapshot-cas-guard-20260322.md)

## Reviews

- ['DVT+ Architectural Review — Pass 2'](reviews/20260304-dvt-architectural-review-pass-2.md)
- [`workflowHelpers.ts` — Architecture Review](reviews/20260315-workflow-helpers-architecture-review.md)
- [20260305 Review](reviews/20260305-general-review.md)
- [20260314 Domain Cohesion Review](reviews/20260314-domain-cohesion-review.md)
- [20260314 Review](reviews/20260314-general-review.md)
- [20260321 Planner-Backed StartRun QA Review](reviews/20260321-planner-backed-start-run-qa-review.md)
- [20260322 DDD and Hexagonal Port Audit](reviews/20260322-ddd-hexagonal-port-audit-review.md)
- [20260322 DVT Code Grounded Corrective Task List Review](reviews/20260322-dvt-code-grounded-corrective-task-list-review.md)
- [20260322 DVT Corrected Code Grounded Review](reviews/20260322-dvt-corrected-code-grounded-review.md)
- [20260322 DVT Deep Architectural Review](reviews/20260322-dvt-deep-architectural-review.md)
- [20260322 Review](reviews/20260322-general-review.md)
- [Architecture Documentation Consolidation Matrix (2026-03-07)](reviews/20260307-architecture-doc-consolidation-matrix-review.md)
- [DVT+ - Architectural Gap Remediation Tasks (2026-02-26)](reviews/20260226-dvt-architectural-gap-remediation-tasks-review.md)
- [DVT+ — Consolidated Architectural Review](reviews/20260305-dvt-architectural-review-consolidated.md)
- [DVT+ Review Action Plan](reviews/20260314-dvt-action-plan-review.md)
- [PostgresStateStoreAdapter — Architecture Review and Refactor Proposal](reviews/20260315-postgres-state-store-adapter-refactor-review.md)
- [Principal Architecture Review - DVT+](reviews/20260316-principal-architecture-review.md)
- [QA Review and Class Documentation — `PostgresStartRunIntentStore`](reviews/20260315-postgres-start-run-intent-store-qa-review.md)
- [Review Naming Policy](reviews/review-naming-policy.md)
- [RunPlanWorkflow — Architecture Review, Refactor Map, and Mermaid Diagrams](reviews/20260315-run-plan-workflow-architecture-review.md)
- [StartRunIntentSchemaManager — QA, Architecture Review, and Refactor Proposal](reviews/20260315-start-run-intent-schema-manager-architecture-review.md)

## Status

- [Canonical Doc Code Matrix](status/canonical-doc-code-matrix.md)
- [Engine DVT - Implementation Status Checklist (Against Requested Spec)](ENGINE_DVT_SPEC_CHECKLIST_STATUS.en.md)
- [Generated Capability Coverage](status/generated-capability-coverage.md)
- [Generated Code State](status/generated-code-state.md)
- [Generated Spec Traceability](status/generated-spec-traceability.md)
- [Governance Document And Rule Inventory](status/governance-document-rule-inventory.md)
- [Planner Current State Assessment](status/planner-current-state-assessment-20260320.md)
- [Planner Local Doc Triage](status/planner-local-doc-triage-20260320.md)
- [Release Please Continuous Mode Status](status/release-please-continuous.md)

## Reference

- [Closeouts](closeouts/)
- [Domains](domains/)
- [Execution Model](execution-model/)
- [Gaps](gaps/)
- [Roadmap](roadmap/)
- [State](state/)
- [Templates](templates/)

- [QA Architecture Findings And Risks](qa-architecture-findings-and-risks.md)

> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.
