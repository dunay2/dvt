---
title: Planner Local Documentation Archive Plan
status: Accepted
owner: Governance / Docs
last_reviewed: 2026-06-01
planning_type: proposal
lane: A
---

# Planner Local Documentation Archive Plan

## Summary

This slice archives historical planner-local documents that were already
classified as archive candidates by
`docs/planning/status/planner-local-doc-triage-20260320.md`. It removes stale
planner-local authority from the active package reader path while retaining the
historical material under `docs/archive/planner/`.

The slice does not change planner runtime behavior, public contracts, package
source code, or planner command/query rails.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/planning/status/planner-local-doc-triage-20260320.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `.arc-policy.yaml`

## Command And Query Rails

- `ArchivePlannerLocalDocumentation` is the documentation command for moving
  triaged planner-local historical documents into the repository archive.
- No product command, query, adapter, route, package API, or runtime behavior is
  introduced.

## Regression Guard

The allowed implementation surface is intentionally narrow:

- archive only the planner-local documents named by the triage status;
- keep package runtime, tests, and contracts unchanged;
- commit generated archive, evidence, risk, and docs manifest surfaces;
- satisfy ARC-2 because package-local planner documentation is touched.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: GD-PLANNER-LOCAL-DOC-ARCHIVE-20260601
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/planner-local-doc-archive-plan-20260601.md
componentGuides:
  - docs/planning/status/planner-local-doc-triage-20260320.md
  - docs/archive/planner/index.md
userStories:
  - GD-PLANNER-LOCAL-DOC-ARCHIVE-20260601
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/planning/status/planner-local-doc-triage-20260320.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - .arc-policy.yaml
allowedImplementationSurfaces:
  - buzon/20260531-docs-archive-old-documents-planner-batch.md
  - docs/.manifest.json
  - docs/archive/index.md
  - docs/archive/planner/**
  - docs/evidence/ed-20260601-planner-local-doc-archive.md
  - docs/evidence/index.md
  - docs/risk-register/quality/r-20260601-planner-local-doc-archive.md
  - docs/risk-register/quality/index.md
  - docs/planning/proposals/mandatory/governance-and-docs/planner-local-doc-archive-plan-20260601.md
  - docs/planning/proposals/index.md
  - docs/planning/index.md
  - scripts/check-feature-mechanization.cjs
  - scripts/check-feature-mechanization.test.cjs
  - packages/@dvt/planner/docs/PLANNER_IMPLEMENTATION_REVIEW_v2_3_2.md
  - packages/@dvt/planner/docs/adr/**
  - packages/@dvt/planner/docs/contracts/**
  - packages/@dvt/planner/docs/planning/proposal/**
forbiddenImplementationSurfaces:
  - apps/**
  - packages/@dvt/planner/src/**
  - packages/@dvt/planner/test/**
  - packages/@dvt/planner/package.json
  - packages/@dvt/contracts/**
  - specs/**
  - tools/**
domainObjects:
  - PlannerDocumentationAuthority
  - PlannerLocalArchive
fowlerSignals:
  - Divergent change
  - Duplicated knowledge
architectureGuards:
  - node --test scripts/check-feature-mechanization.test.cjs
  - pnpm docs:feature-mechanization:implementation -- --feature GD-PLANNER-LOCAL-DOC-ARCHIVE-20260601
cypressFlows:
  - N/A - documentation archive slice.
completionGate:
  - pnpm docs:sync
  - node --test scripts/check-feature-mechanization.test.cjs
  - pnpm docs:gov:manifest:check
  - pnpm docs:arc:evidence:check -- --changed-only
  - pnpm docs:feature-mechanization:implementation -- --feature GD-PLANNER-LOCAL-DOC-ARCHIVE-20260601
  - pnpm verify:prepush
commandQueryRails:
  - name: ArchivePlannerLocalDocumentation
    type: command
    dddOwner: PlannerDocumentationAuthority
redGreenCycles:
  - id: planner-archive-surfaces
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: Archive paths are forbidden until this plan declares the historical documentation move.
    patchSurfaces:
      - docs/archive/index.md
      - docs/archive/planner/**
      - packages/@dvt/planner/docs/**
      - scripts/check-feature-mechanization.cjs
      - scripts/check-feature-mechanization.test.cjs
      - docs/planning/proposals/mandatory/governance-and-docs/planner-local-doc-archive-plan-20260601.md
    greenTest: pnpm docs:feature-mechanization:implementation -- --feature GD-PLANNER-LOCAL-DOC-ARCHIVE-20260601
symbols:
  - { name: PlannerLocalArchiveIndex, path: docs/archive/planner/index.md, dddOwner: PlannerDocumentationAuthority, cqRails: [ArchivePlannerLocalDocumentation], fowlerSignals: [Duplicated knowledge], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature GD-PLANNER-LOCAL-DOC-ARCHIVE-20260601, cypressCoverage: N/A - documentation archive slice, unitTests: [pnpm docs:feature-mechanization:implementation -- --feature GD-PLANNER-LOCAL-DOC-ARCHIVE-20260601] }
```
