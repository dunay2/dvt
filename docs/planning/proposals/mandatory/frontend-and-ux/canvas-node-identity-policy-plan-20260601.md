---
title: Canvas Node Identity Policy Plan
status: Accepted
owner: Frontend / Architecture
last_reviewed: 2026-06-01
planning_type: proposal
lane: E
---

# Canvas Node Identity Policy Plan

## Summary

This slice records the Canvas node identity and naming decision without changing
runtime behavior. The work adds ADR-0059, a Canvas naming policy, and an
implementation plan so future UI changes can separate immutable graph identity
from editable labels and semantic references.

The slice is documentation-only. It must not change Canvas code, planner
identity, execution plan identity, or persisted edge authority.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/adr/ADR-0059-canonical-node-identity.md`

## Command And Query Rails

- `DocumentCanvasNodeIdentityPolicy` is the documentation command that records
  the accepted policy surface for future Canvas node identity work.
- No product command, query, API route, persistence mutation, or runtime
  behavior is introduced by this PR.

## Regression Guard

This plan keeps the PR integrable as documentation only:

- no `apps/**` or `packages/**` runtime surface is allowed;
- generated docs surfaces are explicitly included;
- future implementation remains deferred to the implementation plan and must
  create its own code-facing tests.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: E-CANVAS-NODE-IDENTITY-POLICY-20260601
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-identity-policy-plan-20260601.md
componentGuides:
  - docs/architecture/components/web/canvas/node-identity-and-naming-policy.md
  - docs/architecture/components/web/canvas/node-identity-implementation-plan.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
userStories:
  - E-CANVAS-NODE-IDENTITY-POLICY-20260601
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
  - docs/adr/ADR-0059-canonical-node-identity.md
allowedImplementationSurfaces:
  - docs/adr/ADR-0059-canonical-node-identity.md
  - docs/adr/index.md
  - docs/.manifest.json
  - docs/architecture/components/web/canvas/node-identity-and-naming-policy.md
  - docs/architecture/components/web/canvas/node-identity-implementation-plan.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-identity-policy-plan-20260601.md
  - docs/planning/proposals/index.md
  - docs/planning/index.md
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
  - tools/**
domainObjects:
  - CanvasNodeIdentity
  - CanvasNodeDisplayName
  - CanvasNodeSemanticReference
fowlerSignals:
  - Boundary drift
  - Primitive obsession
architectureGuards:
  - pnpm docs:feature-mechanization:implementation -- --feature E-CANVAS-NODE-IDENTITY-POLICY-20260601
cypressFlows:
  - N/A - documentation-only policy slice.
completionGate:
  - pnpm docs:sync
  - pnpm docs:gov:manifest:check
  - pnpm docs:feature-mechanization:implementation -- --feature E-CANVAS-NODE-IDENTITY-POLICY-20260601
  - pnpm verify:prepush
commandQueryRails:
  - name: DocumentCanvasNodeIdentityPolicy
    type: command
    dddOwner: CanvasNodeIdentity
redGreenCycles:
  - id: canvas-node-identity-doc-surfaces
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: Canvas node identity docs were outside allowedImplementationSurfaces before this plan declared the documentation-only slice.
    patchSurfaces:
      - docs/adr/ADR-0059-canonical-node-identity.md
      - docs/architecture/components/web/canvas/node-identity-and-naming-policy.md
      - docs/architecture/components/web/canvas/node-identity-implementation-plan.md
      - docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-identity-policy-plan-20260601.md
    greenTest: pnpm docs:feature-mechanization:implementation -- --feature E-CANVAS-NODE-IDENTITY-POLICY-20260601
symbols:
  - { name: CanvasNodeIdentityPolicyDocumentation, path: docs/architecture/components/web/canvas/node-identity-and-naming-policy.md, dddOwner: CanvasNodeIdentity, cqRails: [DocumentCanvasNodeIdentityPolicy], fowlerSignals: [Boundary drift], architectureGuard: pnpm docs:feature-mechanization:implementation -- --feature E-CANVAS-NODE-IDENTITY-POLICY-20260601, cypressCoverage: N/A - documentation-only policy slice, unitTests: [pnpm docs:feature-mechanization:implementation -- --feature E-CANVAS-NODE-IDENTITY-POLICY-20260601] }
```
