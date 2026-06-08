---
title: SQL Canvas Demanding User Flow Review Plan
status: Accepted
date: 2026-06-08
last_reviewed: 2026-06-08
owners:
  - apps/web
planning_type: mandatory-plan
---

# SQL Canvas Demanding User Flow Review Plan

## Think-First Analysis

Problem summary: the Canvas route contains the pieces for SQL-first graph
authoring, source import, plan preview, run start, and run evidence, but the
repository did not have one review surface that lists the demanding user tests
needed to judge the professional SQL authoring workflow.

Root cause: previous slices closed local implementation seams: node insertion,
DVT authoring fields, source import, plan/run readiness, selected closure, and
graph/code/artifact parity. Those proofs are useful, but they are fragmented.
Without a review-level inventory, development can keep improving local controls
while missing the product-level question: can a SQL user explore origins,
choose transformations, define an exact destination, validate, plan, run, and
inspect evidence as one professional flow?

Selected option: create a planning review that classifies the missing
professional tests, prioritizes them as P0/P1/P2, and names the existing rails
or missing rail decisions for future implementation planning.

Rejected alternatives:

- Start implementing the source picker or sink picker immediately. Rejected
  because the user explicitly asked to review the required tests together first.
- Put the inventory only in chat. Rejected because planning guidance must live
  in a canonical repository surface.
- Add a new runtime command/query rail in this documentation slice. Rejected
  because this slice only classifies required tests; future accepted tests can
  update the Canvas catalog before implementation.

## Command And Query Rail Impact

No new runtime command or query rail is introduced by this documentation slice.
The review maps future work to existing rails where they already govern the
behavior:

| Rail                                       | Type    | Current role in this review                         |
| ------------------------------------------ | ------- | --------------------------------------------------- |
| `ListWarehouseConnections`                 | query   | Source-origin discovery candidate.                  |
| `ListWarehouseConnectionTables`            | query   | Source table and column discovery candidate.        |
| `ImportWarehouseSources`                   | command | Source import to authoritative graph draft.         |
| `ListProjectWorkspaceResources`            | query   | Existing project resource exploration.              |
| `CreateCanvasAuthoringNode`                | command | Node creation through the Canvas authoring surface. |
| `ConfigureCanvasDvtNode`                   | command | Source, SQL transform, and sink metadata authoring. |
| `GenerateTransformationWorkspaceArtifacts` | command | SQL and graph artifact projection before Plan.      |
| `ObservePlanRunReadiness`                  | query   | Fail-closed readiness posture before Run.           |
| `PreviewExecutablePlan`                    | command | Plan preview and persisted proof.                   |
| `StartRun`                                 | command | Runtime execution start from persisted plan proof.  |

If exact destination discovery, SQL validation, or target collision checks are
accepted as implementation work, the next plan must add or update the owning
catalog before code changes.

## Fowler Opportunity Matrix

| Scenario                                                                                                    | Opportunity                               | Fowler pattern                      | DDD owner                                 | Command/query rail                              | Implementation surfaces                                                   | Test expectation                                  | Out of scope                          |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------- | ----------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------- |
| Existing SQL Canvas proofs are fragmented across source import, DVT authoring, plan/run, and parity slices. | Test-only confidence, documentation drift | Semantic fitness inventory          | Frontend review surface                   | Existing Canvas and workspace rails only        | `docs/planning/reviews/20260608-sql-canvas-demanding-user-flow-review.md` | `pnpm ci:docs`, `pnpm verify:prepush`             | Product UI implementation             |
| Manual source and destination fields hide product-level uncertainty.                                        | Primitive obsession, hidden authority     | Review-level value-object discovery | Future SQL origin/destination read models | Catalog decision required before implementation | Review test matrix only                                                   | Future mandatory plan must define rails and tests | New source or sink picker code        |
| The user needs a professional flow order before development continues.                                      | Responsibility overload                   | Prioritized planning surface        | Lane E frontend planning                  | Planning review, no runtime mutation            | Review priority matrix                                                    | Review with user before implementation            | Committing to every P2 hardening item |

## Review Output

The review output is:

- `docs/planning/reviews/20260608-sql-canvas-demanding-user-flow-review.md`

It contains:

- the current product finding;
- professional flow standards;
- 25 demanding user tests;
- P0/P1/P2 prioritization;
- Fowler opportunity classification;
- review questions for the next development decision;
- the proposed first implementation boundary.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: SQL-CANVAS-DEMANDING-USER-FLOW-REVIEW-20260608
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/sql-canvas-demanding-user-flow-review-plan-20260608.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
  - docs/architecture/components/web/graph/canvas-workspace-explorer-component.md
  - docs/architecture/components/web/graph/canvas-inspector-authoring-component.md
  - docs/architecture/components/web/graph/canvas-plan-run-readiness-component.md
  - docs/architecture/components/web/graph/canvas-execution-selection-component.md
userStories:
  - SQL-CANVAS-UX-001
  - SQL-CANVAS-UX-002
  - SQL-CANVAS-UX-003
  - SQL-CANVAS-UX-004
  - SQL-CANVAS-UX-005
  - SQL-CANVAS-UX-006
  - SQL-CANVAS-UX-007
  - SQL-CANVAS-UX-008
  - SQL-CANVAS-UX-009
  - SQL-CANVAS-UX-010
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/planning/state/planning-control-tower.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/reviews/review-naming-policy.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/frontend-and-ux/sql-canvas-demanding-user-flow-review-plan-20260608.md
  - docs/planning/reviews/20260608-sql-canvas-demanding-user-flow-review.md
  - docs/planning/index.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/frontend-and-ux/index.md
  - docs/planning/reviews/index.md
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
  - scripts/**
  - tools/**
  - .github/**
commandQueryRails:
  - name: ListWarehouseConnections
    type: query
    dddOwner: Warehouse source import
  - name: ListWarehouseConnectionTables
    type: query
    dddOwner: Warehouse source import
  - name: ImportWarehouseSources
    type: command
    dddOwner: Warehouse source import
  - name: ListProjectWorkspaceResources
    type: query
    dddOwner: ProjectWorkspaceResourceCatalog
  - name: CreateCanvasAuthoringNode
    type: command
    dddOwner: CanvasNodeAdmissionCommand
  - name: ConfigureCanvasDvtNode
    type: command
    dddOwner: DvtNodeAuthoringMetadata
  - name: GenerateTransformationWorkspaceArtifacts
    type: command
    dddOwner: TransformationWorkspaceArtifactProjection
  - name: ObservePlanRunReadiness
    type: query
    dddOwner: PlanRunReadinessReadModel
  - name: PreviewExecutablePlan
    type: command
    dddOwner: Executable plan preview
  - name: StartRun
    type: command
    dddOwner: Run start
domainObjects:
  - name: SqlCanvasDemandingUserFlowReview
    type: review surface
    owner: Frontend planning
  - name: CanvasProfessionalSqlFlowTestInventory
    type: semantic fitness inventory
    owner: Frontend planning
  - name: SqlCanvasP0FlowBoundary
    type: planning boundary
    owner: Lane E frontend planning
fowlerSignals:
  - Boundary drift
  - Responsibility overload
  - Primitive obsession
  - Hidden authority
  - Test-only confidence
  - Documentation drift
architectureGuards:
  - pnpm docs:sync:check
  - pnpm ci:docs
cypressFlows:
  - N/A - this slice creates a review inventory; selected P0 stories must add browser proof in a later implementation plan.
completionGate:
  - pnpm docs:sync
  - pnpm docs:sync:check
  - pnpm ci:docs
  - pnpm verify:prepush
redGreenCycles:
  - id: sql-canvas-demanding-user-flow-review-doc
    redTest: pnpm ci:docs
    expectedFailure: No governed review surface listed the demanding SQL Canvas user-flow tests needed before implementation planning.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/sql-canvas-demanding-user-flow-review-plan-20260608.md
      - docs/planning/reviews/20260608-sql-canvas-demanding-user-flow-review.md
    greenTest: pnpm ci:docs
symbols:
  - name: SQL Canvas Demanding User Flow Review Plan
    path: docs/planning/proposals/mandatory/frontend-and-ux/sql-canvas-demanding-user-flow-review-plan-20260608.md
    dddOwner: Frontend planning review
    cqRails:
      - ListWarehouseConnections
      - ListWarehouseConnectionTables
      - ImportWarehouseSources
      - ConfigureCanvasDvtNode
      - PreviewExecutablePlan
      - StartRun
    fowlerSignals:
      - Test-only confidence
      - Documentation drift
    architectureGuard: pnpm ci:docs
    cypressCoverage: N/A - documentation-only planning slice.
    unitTests:
      - pnpm docs:sync:check
  - name: SQL Canvas Demanding User Flow Review
    path: docs/planning/reviews/20260608-sql-canvas-demanding-user-flow-review.md
    dddOwner: Frontend planning review
    cqRails:
      - ListWarehouseConnections
      - ListWarehouseConnectionTables
      - ImportWarehouseSources
      - ConfigureCanvasDvtNode
      - PreviewExecutablePlan
      - StartRun
    fowlerSignals:
      - Boundary drift
      - Primitive obsession
      - Hidden authority
      - Test-only confidence
    architectureGuard: pnpm ci:docs
    cypressCoverage: N/A - review inventory names future Cypress flow requirements.
    unitTests:
      - pnpm docs:sync:check
```
