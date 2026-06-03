---
title: Web API Integration Gap Audit Plan
status: Implemented
owner: Web / API / Architecture
last_reviewed: 2026-05-10
planning_type: mandatory
---

# Web API Integration Gap Audit Plan

## Purpose

This slice records the bounded planning surface for the web/API integration
audit captured in
[`20260510-web-api-integration-gap-review.md`](../../../reviews/20260510-web-api-integration-gap-review.md).

The work is deliberately documentation-only. It audits the existing
`apps/web/src` capability surface against `apps/api/src` and
`packages/@dvt/contracts`, identifies mock/local-state gaps, and proposes a
migration sequence. It does not implement web, API, adapter, or contract
changes.

## Scope

Included:

- Inventory web capabilities that are visible in `apps/web/src`.
- Compare those capabilities with real API routes and contract surfaces.
- Classify each capability as API-backed, mock-backed, local-state-backed, or
  mixed.
- Mark risks against the rules: UI does not execute, UI does not decide, UI
  does not invent runtime state.
- Propose capability-by-capability migration steps.

Excluded:

- Adding or changing HTTP routes.
- Changing contracts, adapters, stores, or web components.
- Removing mock mode.
- Changing authorization, runtime, planner, or workspace behavior.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: WEB-API-INTEGRATION-GAP-AUDIT-20260510
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/web-api-integration-gap-audit-plan-20260510.md
componentGuides:
  - docs/planning/reviews/20260510-web-api-integration-gap-review.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/reference-architecture.md
userStories:
  - docs/planning/reviews/20260510-web-api-integration-gap-review.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/reference-architecture.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/frontend-and-ux/web-api-integration-gap-audit-plan-20260510.md
  - docs/planning/reviews/20260510-web-api-integration-gap-review.md
  - docs/planning/status/**
  - docs/.manifest.json
  - docs/**/index.md
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/contracts/**
  - .golden/**
  - docs/archive/**
commandQueryRails:
  - name: GetRuntimeSession
    type: query
    dddOwner: Runtime session admission
  - name: PreviewExecutablePlan
    type: command
    dddOwner: Planner runtime admission
  - name: StartRun
    type: command
    dddOwner: Runtime execution admission
  - name: GetWorkspaceGraphDraft
    type: query
    dddOwner: Workspace graph draft
  - name: SaveWorkspaceGraphDraft
    type: command
    dddOwner: Workspace graph draft
  - name: ListWorkspaceFiles
    type: query
    dddOwner: Workspace file read model
  - name: GetWorkspaceFileContent
    type: query
    dddOwner: Workspace file read model
  - name: ListRuns
    type: query
    dddOwner: Run read model
  - name: GetRunEvents
    type: query
    dddOwner: Run event read model
domainObjects:
  - name: WebCapabilityInventory
    type: audit read model
    owner: Web / API architecture
  - name: RuntimeCapabilityReadModel
    type: API capability read model
    owner: API runtime boundary
  - name: WorkspaceGraphDraft
    type: workspace authoring aggregate
    owner: Workspace graph draft
  - name: PlanPreview
    type: planner admission read model
    owner: Planner runtime admission
  - name: RunReadModel
    type: runtime read model
    owner: Runtime execution admission
fowlerSignals:
  - Broad frontend port mixes unrelated bounded contexts
  - Mock adapters retain product semantics outside explicit demo mode
  - Frontend-owned local state can masquerade as runtime authority
  - API adapter contains calls for routes that do not exist
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
  - pnpm ci:docs
  - pnpm verify:prepush
cypressFlows:
  - N/A - architecture review only
completionGate:
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization -- --feature WEB-API-INTEGRATION-GAP-AUDIT-20260510
  - pnpm docs:feature-mechanization:implementation
  - pnpm ci:docs
  - pnpm verify:prepush
redGreenCycles:
  - id: audit-review-is-covered-by-feature-mechanization
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: docs/planning/reviews/20260510-web-api-integration-gap-review.md is outside allowedImplementationSurfaces before this plan declares the audit slice.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/web-api-integration-gap-audit-plan-20260510.md
      - docs/planning/reviews/20260510-web-api-integration-gap-review.md
    greenTest: pnpm docs:feature-mechanization:implementation
  - id: audit-docs-pass-governed-documentation-gates
    redTest: pnpm ci:docs
    expectedFailure: the review document is not yet indexed, synchronized, and covered by a mandatory audit plan.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/web-api-integration-gap-audit-plan-20260510.md
      - docs/planning/reviews/20260510-web-api-integration-gap-review.md
      - docs/planning/status/**
      - docs/.manifest.json
      - docs/**/index.md
    greenTest: pnpm ci:docs
symbols:
  - name: WebApiIntegrationGapAuditPlan
    path: docs/planning/proposals/mandatory/frontend-and-ux/web-api-integration-gap-audit-plan-20260510.md
    dddOwner: WebCapabilityInventory
    cqRails:
      - GetRuntimeSession
      - PreviewExecutablePlan
      - StartRun
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ListRuns
      - GetRunEvents
    fowlerSignals:
      - Broad frontend port mixes unrelated bounded contexts
      - Mock adapters retain product semantics outside explicit demo mode
      - Frontend-owned local state can masquerade as runtime authority
      - API adapter contains calls for routes that do not exist
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - architecture review only
    unitTests:
      - pnpm ci:docs
  - name: WebApiIntegrationGapReview
    path: docs/planning/reviews/20260510-web-api-integration-gap-review.md
    dddOwner: WebCapabilityInventory
    cqRails:
      - GetRuntimeSession
      - PreviewExecutablePlan
      - StartRun
      - GetWorkspaceGraphDraft
      - SaveWorkspaceGraphDraft
      - ListWorkspaceFiles
      - GetWorkspaceFileContent
      - ListRuns
      - GetRunEvents
    fowlerSignals:
      - Broad frontend port mixes unrelated bounded contexts
      - Mock adapters retain product semantics outside explicit demo mode
      - Frontend-owned local state can masquerade as runtime authority
      - API adapter contains calls for routes that do not exist
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - architecture review only
    unitTests:
      - pnpm ci:docs
```

## Acceptance Criteria

- The review lists the web capability surface and classifies each capability by
  integration posture.
- The review names route or contract gaps instead of turning those gaps into
  implementation work in the same slice.
- The feature mechanization guard accepts the review and this plan as the only
  intentional changed source documents.
- Documentation refresh and docs CI pass after indexes and governance surfaces
  are regenerated.

## Validation Plan

Run:

```bash
pnpm docs:sync
pnpm governance:refresh
pnpm docs:feature-mechanization -- --feature WEB-API-INTEGRATION-GAP-AUDIT-20260510
pnpm docs:feature-mechanization:implementation
pnpm ci:docs
pnpm verify:prepush
```
