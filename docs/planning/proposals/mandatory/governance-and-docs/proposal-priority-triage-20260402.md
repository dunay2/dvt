---
title: Proposal Priority Triage 2026-04-02
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-04-03
planning_type: proposal
---

# Proposal Priority Triage 2026-04-02

This triage classifies current planning proposals into:

- `Must`: required for current delivery and governance closure.
- `Nice to have`: valuable but not on the critical closure path.
- `Superseded`: replaced by a newer execution surface.

Classification is grounded in current repository posture (active lanes, sprint
boards, review status board, and active governance/docs tracks).

## Must

- [Architecture Documentation Reconciliation Plan](architecture-doc-reconciliation-plan-20260402.md)
  Rationale: active truth-correction and simplification path for repository-wide architecture docs.
- [CI Delivery Governance Consolidated Action Plan](ci-delivery-governance-consolidated-action-plan-20260331.md)
  Rationale: declared as the single active CI governance execution surface.
- [Contracts Domain Ownership Migration Plan](../runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md)
  Rationale: active domain-boundary and ownership alignment work.
- [Documentation Usability Change Plan](documentation-usability-change-plan-20260308.md)
  Rationale: active documentation governance and navigation hardening.
- [Generated Planning Surfaces Extraction Plan](generated-planning-surfaces-extraction-plan-20260403.md)
  Rationale: targeted plan to stop tracking the highest-conflict generated planning views while keeping CI fail-closed.
- [Governance Startup Card Router Plan](governance-startup-card-router-plan-20260402.md)
  Rationale: active startup-governance enforcement and routing consistency.
- [Doc-Driven Framework And Tooling Plan](doc-driven-framework-and-tooling-plan-20260404.md)
  Rationale: the repo already has strong governance controls, but still lacks a unified
  framework for document taxonomy, planning data, authoring scaffolds, and traceability
  automation.
- [RC-C1 HTTP Error Envelope Normalization Plan](../../superseded/runtime-and-contracts/rc-c1-http-error-envelope-normalization-plan-20260331.md)
  Rationale: active API contract normalization track.
- [RC-C2 Shared Preflight And CI Log-First Triage Plan](../runtime-and-contracts/rc-c2-shared-preflight-and-ci-log-first-triage-plan-20260401.md)
  Rationale: active CI/runtime delivery reliability track and sprint linkage.
- [S08 Plan Record And Plan Store Execution Plan](../runtime-and-contracts/s08-plan-record-plan-store-execution-plan-20260402.md)
  Rationale: active execution-model closure and contractual runtime integrity.
- [MVP-A1 Backend Contractual Inventory](../../superseded/runtime-and-contracts/mvp-a1-backend-contractual-inventory-20260329.md)
  Rationale: review-stage contractual inventory still drives lane and review work.

## Nice To Have

- [DataMode Concept Proposal](../../nice-to-have/architecture/datamode_proposal.md)
  Rationale: concept-level, not currently on critical path.
- [DDD Hexagonal Modularization Plan](../../nice-to-have/architecture/ddd-hexagonal-modularization-plan-20260323.md)
  Rationale: strategic modularization with phased adoption.
- [DDD Pure Root And Aggregate Boundaries](../../nice-to-have/architecture/todo.md)
  Rationale: important design direction, currently proposal-level.
- [Evidence Information Architecture And Governance Plan](../../nice-to-have/architecture/evidence-information-architecture-plan-20260402.md)
  Rationale: high value, but not blocking immediate delivery gates.
- [Frontend Roadmap - Prototype To Operational UI](../../nice-to-have/frontend-and-ux/frontend-roadmap-20260219.md)
  Rationale: active roadmap line, but not on backend critical closure path.
- [MVP Backend Operability Baseline Roadmap](../../nice-to-have/architecture/mvp-backend-operability-baseline-roadmap-20260329.md)
  Rationale: broad roadmap surface; immediate slices are tracked elsewhere.
- [RC-E3 Execution And Task Tracking Plan](../../nice-to-have/architecture/rc-e3-execution-tracking-plan-20260328.md)
  Rationale: useful coordination track with lower criticality than must set.

## Superseded

- [G4-PR4: Admission Control Operability - Plan B](../../superseded/runtime-and-delivery/gap4-backpressure-admission-pr4-planb-20260326.md)
  Superseded by: [G4-PR4: Admission Control Operability - Implementation Plan](../../superseded/runtime-and-contracts/gap4-backpressure-admission-pr4-plan-20260326.md)
  Rationale: alternative strategy replaced by implementation-oriented plan.
- [DVT Production Readiness Review - Corrected Top 3 Gaps And Roadmap](../../superseded/runtime-and-delivery/dvt_production_readiness_corrected_review_and_roadmap.md)
  Superseded by: [Review Remediation Roadmap 20260402](../../../roadmap/review-remediation-roadmap-20260402.md)
  Rationale: execution moved to sprint/board-based remediation roadmap.

## Operating Rule

When a proposal from `Must` is completed or replaced, update this triage and
move it to `Superseded` with explicit replacement links.
