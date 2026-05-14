---
title: Audit Document Intake Plan
status: Accepted
owner: Architecture / Docs / CI
last_reviewed: 2026-05-06
planning_type: proposal
---

# Audit Document Intake Plan

## Summary

This slice integrates two preserved audit artifacts as governed repository
documentation without publishing raw scratch outputs or creating a parallel
workboard.

The docs staleness audit is published as a non-normative status snapshot. The CI
build audit is published as a CI and delivery review, because existing CI audits
live under `docs/planning/reviews/ci-and-delivery/`.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/DOCS_README.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/reviews/review-naming-policy.md`
- `docs/planning/reviews/review-status-board.md`

## Scope

In scope:

- add `docs/planning/status/docs-staleness-audit-20260505.md`;
- add `docs/planning/reviews/ci-and-delivery/20260506-ci-build-audit-review.md`;
- update `docs/planning/reviews/review-status-board.md`;
- run docs sync and governance generators.

Out of scope:

- implementing any remediation identified by the audits;
- tracking raw scratch files such as CSV or transient scan text output;
- changing CI workflows, package scripts, ARC policy, or source code.

## Intake Decisions

The original stashed docs were not restored verbatim. The integrated versions:

- state their non-normative or review-only posture;
- correct stale ADR-0000 PR-gate claims after PR #1115, PR #1116, and PR #1118;
- keep remediation as follow-up owner review instead of batch-changing docs or
  CI behavior.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: AUDIT-DOC-INTAKE-20260506
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/audit-doc-intake-plan-20260506.md
componentGuides:
  - docs/planning/status/docs-staleness-audit-20260505.md
  - docs/planning/reviews/ci-and-delivery/20260506-ci-build-audit-review.md
userStories:
  - docs/planning/status/docs-staleness-audit-20260505.md
  - docs/planning/reviews/ci-and-delivery/20260506-ci-build-audit-review.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/DOCS_README.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/reviews/review-naming-policy.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/governance-and-docs/audit-doc-intake-plan-20260506.md
  - docs/planning/status/docs-staleness-audit-20260505.md
  - docs/planning/reviews/ci-and-delivery/20260506-ci-build-audit-review.md
  - docs/planning/reviews/review-status-board.md
  - docs/planning/reviews/index.md
  - docs/planning/index.md
  - docs/planning/status/**
  - docs/archive/planning/proposals/ci-adr0-owner-consolidation-plan-20260511.md
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
  - .github/workflows/**
  - package.json
  - scripts/**
commandQueryRails:
  - name: ClassifyAuditArtifact
    type: query
    dddOwner: AuditArtifactClassification
  - name: PublishAuditDocument
    type: command
    dddOwner: AuditDocumentIntakePolicy
  - name: LinkReviewStatusBoardEntry
    type: command
    dddOwner: ReviewStatusBoardProjection
domainObjects:
  - name: AuditArtifactClassification
    type: read-model
    owner: Docs governance
  - name: AuditDocumentIntakePolicy
    type: policy
    owner: Docs governance
  - name: ReviewStatusBoardProjection
    type: read-model
    owner: Docs governance
fowlerSignals:
  - Single Source of Truth
  - Explicit Gate
  - Documentation Drift
  - Review Surface Ownership
architectureGuards:
  - pnpm lint:md:changed
  - pnpm docs:feature-mechanization:implementation
  - pnpm closeout:changed
cypressFlows:
  - not-applicable: Audit document intake has no browser workflow.
completionGate:
  - pnpm lint:md:changed
  - pnpm closeout:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: review-surface-guard
    redTest: pnpm closeout:changed
    expectedFailure: New CI audit review is outside allowedImplementationSurfaces before this plan declares it.
    patchSurfaces:
      - docs/planning/proposals/mandatory/governance-and-docs/audit-doc-intake-plan-20260506.md
      - docs/planning/reviews/ci-and-delivery/20260506-ci-build-audit-review.md
      - docs/planning/reviews/review-status-board.md
      - docs/planning/status/docs-staleness-audit-20260505.md
      - docs/planning/status/**
      - docs/.manifest.json
    greenTest: pnpm closeout:changed
symbolDefaults: &auditDocIntakeSymbolDefaults
  dddOwner: AuditDocumentIntakePolicy
  cqRails:
    - ClassifyAuditArtifact
    - PublishAuditDocument
    - LinkReviewStatusBoardEntry
  fowlerSignals:
    - Single Source of Truth
    - Explicit Gate
    - Documentation Drift
  architectureGuard: pnpm docs:feature-mechanization:implementation
  cypressCoverage: "not-applicable: Audit document intake has no browser workflow."
  unitTests:
    - pnpm lint:md:changed
    - pnpm closeout:changed
symbols:
  - <<: *auditDocIntakeSymbolDefaults
    name: AuditDocumentIntakePlan
    path: docs/planning/proposals/mandatory/governance-and-docs/audit-doc-intake-plan-20260506.md
  - <<: *auditDocIntakeSymbolDefaults
    name: DocsStalenessAuditSnapshot
    path: docs/planning/status/docs-staleness-audit-20260505.md
  - <<: *auditDocIntakeSymbolDefaults
    name: CiBuildAuditReview
    path: docs/planning/reviews/ci-and-delivery/20260506-ci-build-audit-review.md
  - <<: *auditDocIntakeSymbolDefaults
    name: ReviewStatusBoardAuditLink
    path: docs/planning/reviews/review-status-board.md
```
