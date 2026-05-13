---
title: AR-D6 Triple Versioning Governance Review Plan
status: Accepted
owner: Architecture / Planner / Contracts / Engine
last_reviewed: 2026-05-13
planning_type: proposal
---

# AR-D6 Triple Versioning Governance Review Plan

## Summary

This slice closes `AR-D6` by reviewing whether the current
`planVersion`, `schemaVersion`, and `contractVersion` split should remain in
place while only `planVersion = 1.0` is active.

The governed outcome is documentation-only: record the review result, add the
decision as an ADR-0036 addendum, and close the planning task through the
planning DB command rail.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/state/how-to-add-tasks.md`
- `docs/adr/ADR-0017_ExecutionPlan_Schema_Versioning.md`
- `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`
- `docs/adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md`

## Scope

In scope:

- add an AR-D6 governance review under
  `docs/planning/reviews/architecture-and-governance/`;
- add an ADR-0036 addendum recording the retain/defer decision;
- close `AR-D6` through `pnpm planning:db:operate`;
- regenerate documentation and planning derived surfaces required by the repo.

Out of scope:

- changing runtime admission behavior;
- changing planner, contracts, engine, or adapter source code;
- opening a new plan version or schema version line;
- weakening feature mechanization, ARC, planning DB, or pre-push gates.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: AR-D6-TRIPLE-VERSIONING-GOVERNANCE-REVIEW-20260513
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/ar-d6-triple-versioning-governance-review-plan-20260513.md
componentGuides:
  - docs/planning/reviews/architecture-and-governance/20260513-ar-d6-triple-versioning-governance-review.md
  - docs/adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md
userStories:
  - docs/planning/reviews/architecture-and-governance/20260513-ar-d6-triple-versioning-governance-review.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/state/how-to-add-tasks.md
  - docs/adr/ADR-0017_ExecutionPlan_Schema_Versioning.md
  - docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md
  - docs/adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/governance-and-docs/ar-d6-triple-versioning-governance-review-plan-20260513.md
  - docs/planning/proposals/**
  - docs/planning/reviews/architecture-and-governance/20260513-ar-d6-triple-versioning-governance-review.md
  - docs/planning/reviews/index.md
  - docs/planning/index.md
  - docs/adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
  - .github/workflows/**
  - package.json
  - scripts/**
commandQueryRails:
  - name: AssessTripleVersioningGovernanceBurden
    type: query
    dddOwner: VersioningGovernanceReview
  - name: RecordArchitectureDecisionAddendum
    type: command
    dddOwner: ArchitectureDecisionRecord
  - name: ClosePlanningTask
    type: command
    dddOwner: PlanningTaskLifecycle
domainObjects:
  - name: VersioningGovernanceReview
    type: read-model
    owner: Architecture governance
  - name: ArchitectureDecisionRecord
    type: aggregate
    owner: Architecture governance
  - name: PlanningTaskLifecycle
    type: aggregate
    owner: Planning governance
fowlerSignals:
  - Single Source of Truth
  - Explicit Gate
  - Documentation Drift
  - Versioning Policy
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
  - pnpm lint:md:changed
  - pnpm planning:db:export:check
cypressFlows:
  - not-applicable: AR-D6 is a documentation and planning governance review.
completionGate:
  - pnpm docs:feature-mechanization:implementation
  - pnpm lint:md:changed
  - pnpm planning:db:export:check
  - pnpm verify:prepush
redGreenCycles:
  - id: ar-d6-review-surface-guard
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: AR-D6 review document is outside allowedImplementationSurfaces before this manifest declares it.
    patchSurfaces:
      - docs/planning/proposals/mandatory/governance-and-docs/ar-d6-triple-versioning-governance-review-plan-20260513.md
      - docs/planning/reviews/architecture-and-governance/20260513-ar-d6-triple-versioning-governance-review.md
      - docs/adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md
      - docs/planning/reviews/index.md
      - docs/planning/index.md
      - docs/.manifest.json
    greenTest: pnpm docs:feature-mechanization:implementation
symbolDefaults: &arD6VersioningReviewSymbolDefaults
  dddOwner: VersioningGovernanceReview
  cqRails:
    - AssessTripleVersioningGovernanceBurden
    - RecordArchitectureDecisionAddendum
    - ClosePlanningTask
  fowlerSignals:
    - Single Source of Truth
    - Explicit Gate
    - Versioning Policy
  architectureGuard: pnpm docs:feature-mechanization:implementation
  cypressCoverage: "not-applicable: AR-D6 is a documentation and planning governance review."
  unitTests:
    - pnpm lint:md:changed
    - pnpm planning:db:export:check
symbols:
  - <<: *arD6VersioningReviewSymbolDefaults
    name: ArD6TripleVersioningGovernanceReviewPlan
    path: docs/planning/proposals/mandatory/governance-and-docs/ar-d6-triple-versioning-governance-review-plan-20260513.md
  - <<: *arD6VersioningReviewSymbolDefaults
    name: ArD6TripleVersioningGovernanceReview
    path: docs/planning/reviews/architecture-and-governance/20260513-ar-d6-triple-versioning-governance-review.md
  - <<: *arD6VersioningReviewSymbolDefaults
    name: Adr0036TripleVersioningAddendum
    path: docs/adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md
```
