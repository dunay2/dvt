---
title: Web Architecture Docs Current Runtime Substantiation Plan
status: Accepted
owner: Frontend / Architecture / Docs
last_reviewed: 2026-05-08
planning_type: proposal
---

# Web Architecture Docs Current Runtime Substantiation Plan

## Summary

This slice repairs the active web architecture documentation after QA found
that legacy frontend drafts were still presented as active architecture and that
runtime method signatures drifted from the `apps/web` port contract.

The slice does not change application behavior. It separates historical
frontend architecture drafts from current docs, aligns the active web summaries
with `apps/web` and `apps/api`, and refreshes governance-generated surfaces.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/DOCS_README.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/index.md`
- `docs/architecture/components/web/runs/frontend-runtime-contract-technical-manual.md`
- `apps/web/src/app/ports/runs.ts`
- `apps/web/src/app/services/runs/runsService.api.ts`
- `apps/api/src/application/ports/protectedRuntimeRunRailVocabulary.ts`
- `apps/api/src/application/ports/protectedRuntimeRailVocabulary.ts`

## Scope

In scope:

- archive superseded frontend architecture introduction and blueprint drafts;
- keep active web docs focused on current `apps/web` runtime boundaries;
- correct `IRunsPort` method signatures and tenant-scope wording;
- run docs sync, governance refresh, markdown/link checks, feature
  mechanization, and prepush validation.

Out of scope:

- moving source modules under `apps/` or `packages/`;
- changing runtime routes, DTOs, ports, or API authorization behavior;
- broad cleanup of every historical `@dvt/web` mention in unrelated web docs;
- changing the semantics of `pnpm closeout:changed` or governance generators.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: WEB-ARCH-DOCS-CURRENT-RUNTIME-SUBSTANTIATION-20260508
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/web-architecture-docs-current-runtime-substantiation-plan-20260508.md
componentGuides:
  - docs/architecture/components/web/index.md
  - docs/architecture/components/web/runs/frontend-runtime-contract-technical-manual.md
userStories:
  - docs/architecture/components/web/web-functional.md
  - docs/architecture/components/web/web-sequence.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/DOCS_README.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/index.md
  - docs/architecture/components/web/runs/frontend-runtime-contract-technical-manual.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/frontend-and-ux/web-architecture-docs-current-runtime-substantiation-plan-20260508.md
  - docs/architecture/components/web/web-constraints.md
  - docs/architecture/components/web/web-ddd.md
  - docs/architecture/components/web/web-functional.md
  - docs/architecture/components/web/web-sequence.md
  - docs/architecture/components/web/graph/graph-canvas-runtime-model.md
  - docs/architecture/components/web/runs/component-runs.md
  - docs/architecture/components/web/runs/user-stories-runs.md
  - docs/architecture/components/web/runs/frontend-runtime-contract-technical-manual.md
  - docs/archive/architecture/components/web-app/dvt-frontend-architecture-blueprint.md
  - docs/archive/architecture/components/web-app/dvt-frontend-architecture-introduction.md
  - docs/planning/status/**
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
  - .github/workflows/**
  - package.json
  - scripts/**
commandQueryRails:
  - name: ClassifyWebArchitectureDocument
    type: query
    dddOwner: WebArchitectureDocumentSet
  - name: ArchiveHistoricalWebArchitectureDraft
    type: command
    dddOwner: WebArchitectureDocumentSet
  - name: AlignWebRuntimeDocumentation
    type: command
    dddOwner: WebRuntimeDocumentationBoundary
domainObjects:
  - name: WebArchitectureDocumentSet
    type: document-set
    owner: Frontend architecture
  - name: WebRuntimeDocumentationBoundary
    type: policy
    owner: Frontend architecture
fowlerSignals:
  - Single Source of Truth
  - Documentation Drift
  - Explicit Gate
  - Bounded Context Ownership
architectureGuards:
  - pnpm docs:gov:links:changed
  - pnpm lint:md:changed
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - not-applicable: Documentation-only slice has no browser workflow.
completionGate:
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm lint:md:changed
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: web-doc-surface-guard
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: Web architecture docs are outside allowedImplementationSurfaces before this plan declares the slice.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/web-architecture-docs-current-runtime-substantiation-plan-20260508.md
      - docs/architecture/components/web/**
      - docs/archive/architecture/components/web-app/dvt-frontend-architecture-blueprint.md
      - docs/archive/architecture/components/web-app/dvt-frontend-architecture-introduction.md
      - docs/planning/status/**
      - docs/.manifest.json
    greenTest: pnpm docs:feature-mechanization:implementation
symbolDefaults: &webArchDocsSymbolDefaults
  dddOwner: WebArchitectureDocumentSet
  cqRails:
    - ClassifyWebArchitectureDocument
    - ArchiveHistoricalWebArchitectureDraft
    - AlignWebRuntimeDocumentation
  fowlerSignals:
    - Single Source of Truth
    - Documentation Drift
    - Explicit Gate
  architectureGuard: pnpm docs:feature-mechanization:implementation
  cypressCoverage: "not-applicable: Documentation-only slice has no browser workflow."
  unitTests:
    - pnpm docs:gov:links:changed
    - pnpm lint:md:changed
symbols:
  - <<: *webArchDocsSymbolDefaults
    name: WebArchitectureDocsCurrentRuntimeSubstantiationPlan
    path: docs/planning/proposals/mandatory/frontend-and-ux/web-architecture-docs-current-runtime-substantiation-plan-20260508.md
  - <<: *webArchDocsSymbolDefaults
    name: WebDddStructure
    path: docs/architecture/components/web/web-ddd.md
  - <<: *webArchDocsSymbolDefaults
    name: WebFunctionalities
    path: docs/architecture/components/web/web-functional.md
  - <<: *webArchDocsSymbolDefaults
    name: WebSequence
    path: docs/architecture/components/web/web-sequence.md
  - <<: *webArchDocsSymbolDefaults
    name: WebConstraintsAndInvariants
    path: docs/architecture/components/web/web-constraints.md
  - <<: *webArchDocsSymbolDefaults
    name: RunsComponentLocalGuide
    path: docs/architecture/components/web/runs/component-runs.md
  - <<: *webArchDocsSymbolDefaults
    name: RunsFrontendUserStories
    path: docs/architecture/components/web/runs/user-stories-runs.md
  - <<: *webArchDocsSymbolDefaults
    name: ArchivedFrontendArchitectureBlueprint
    path: docs/archive/architecture/components/web-app/dvt-frontend-architecture-blueprint.md
  - <<: *webArchDocsSymbolDefaults
    name: ArchivedFrontendArchitectureIntroduction
    path: docs/archive/architecture/components/web-app/dvt-frontend-architecture-introduction.md
```
