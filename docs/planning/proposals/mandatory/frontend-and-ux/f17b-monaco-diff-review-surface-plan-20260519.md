---
title: F-17-B Monaco Diff Review Surface Plan
status: Active
owner: Web / Architecture
date: 2026-05-19
last_reviewed: 2026-05-19
planning_type: proposal
---

# F-17-B Monaco Diff Review Surface Plan

## Think-First Analysis

Problem summary: `F-17-B` was still queued even though Diff already rendered
Monaco-backed SQL and catalog diff panes. The remaining product risk is
semantic drift: Monaco could be treated as route or shell authority, and the
work lacked a local component guide, stories, and architecture guard.

Root cause: implementation arrived before the planning row and component docs
were closed. Existing tests assert rendered behavior, but not Fowler ownership
or read-only/diff-only invariants.

Constraints and invariants:

- `docs/planning/proposals/monaco-workbench-integration-rationale-20260402.md`
  keeps Monaco embedded in Diff, Artifacts, and Templates only.
- Diff reuses `GetWorkspaceDiffChanges` and `GetWorkspaceFileContent`; no new
  command/query rail is introduced.
- The route shell and tab topology remain unchanged.
- Monaco remains lazy, read-only, and diff-only for this slice.

Options considered:

- Rebuild Diff around a new route model. Rejected; code already has the right
  broad shape and a rebuild would slow product.
- Treat current code as done. Rejected; it leaves planning and documentation
  drift.
- Close the semantic component boundary. Selected; it accelerates product by
  making the visible Diff surface reviewable and safe to extend.

## Pre-Implementation Brief

Mode: Full.

Scope:

- Add Fowler analysis in `buzon`.
- Add Diff Monaco component guide and user stories.
- Add module owned-concern docblocks.
- Add semantic architecture guard.
- Update planning state and generated docs.

Out of scope:

- new backend diff APIs;
- editing or save/apply semantics;
- Artifacts Monaco closure;
- bundle-budget enforcement beyond existing lazy loading;
- shell or Canvas route changes.

Validation plan:

- `pnpm docs:feature-mechanization -- --feature F17B-MONACO-DIFF-REVIEW-SURFACE-20260519`
- `pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts`
- `pnpm --filter @dvt/web test -- src/app/views/DiffView.test.tsx`
- `pnpm --filter @dvt/web test:architecture`
- `pnpm --filter @dvt/web typecheck`
- `pnpm docs:sync`
- `pnpm governance:refresh`
- `pnpm verify:prepush`

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                   | Opportunity             | Fowler pattern               | DDD owner                                  | Command/query rail                | Implementation surfaces         | Unit or package test | Architecture test                              | User-flow test    | Out of scope       |
| -------------------------- | ----------------------- | ---------------------------- | ------------------------------------------ | --------------------------------- | ------------------------------- | -------------------- | ---------------------------------------------- | ----------------- | ------------------ |
| SQL review uses Monaco     | Documentation drift     | Presentation Model + Gateway | `SqlDiffDocument` / `MonacoDiffViewer`     | `GetWorkspaceFileContent`         | Diff panels and Monaco viewer   | `DiffView.test.tsx`  | `diffMonacoReviewSurface.architecture.test.ts` | Vitest route test | editing            |
| Catalog review uses Monaco | Duplicate semantics     | Shared Gateway               | `CatalogDiffDocument` / `MonacoDiffViewer` | `GetWorkspaceDiffChanges`         | Catalog panel and Monaco viewer | `DiffView.test.tsx`  | `diffMonacoReviewSurface.architecture.test.ts` | Vitest route test | Artifacts viewer   |
| Monaco route posture       | Hidden authority        | Semantic Fitness Function    | Diff route workbench                       | none - internal presentation only | architecture docs and tests     | n/a                  | `diffMonacoReviewSurface.architecture.test.ts` | n/a               | shell changes      |
| Module ownership           | Responsibility overload | Extract Owned Concern        | Diff and Monaco modules                    | none - internal presentation only | docblocks                       | n/a                  | `diffMonacoReviewSurface.architecture.test.ts` | n/a               | unrelated refactor |

<!-- markdownlint-enable MD060 -->

```feature-mechanization
version: 1
featureId: F17B-MONACO-DIFF-REVIEW-SURFACE-20260519
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f17b-monaco-diff-review-surface-plan-20260519.md
componentGuides:
  - docs/architecture/components/web/diff/diff-monaco-review-surface-component.md
userStories:
  - docs/architecture/components/web/diff/diff-monaco-review-surface-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/monaco-workbench-integration-rationale-20260402.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/DiffView.tsx
  - apps/web/src/app/views/DiffView.test.tsx
  - apps/web/src/app/views/diff/DiffTabs.tsx
  - apps/web/src/app/views/diff/SqlDiffPanel.tsx
  - apps/web/src/app/views/diff/CatalogDiffPanel.tsx
  - apps/web/src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
  - apps/web/src/app/components/monaco/MonacoDiffViewer.tsx
  - apps/web/src/app/components/monaco/MonacoDiffSurface.tsx
  - docs/architecture/components/web/diff/diff-monaco-review-surface-component.md
  - docs/architecture/components/web/diff/diff-monaco-review-surface-user-stories.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f17b-monaco-diff-review-surface-plan-20260519.md
  - docs/planning/closeouts/20260519-f17b-monaco-diff-review-surface-closeout.md
  - buzon/20260519-f17b-fowler-monaco-diff-review-surface-analysis.md
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/api/**
commandQueryRails:
  - name: GetWorkspaceDiffChanges
    type: query
    dddOwner: Workspace diff read model
  - name: GetWorkspaceFileContent
    type: query
    dddOwner: Workspace file content read model
domainObjects:
  - name: DiffReviewSurfaceReadModel
    type: presentation read model
    owner: apps/web
  - name: MonacoDiffViewer
    type: presentation gateway
    owner: apps/web
fowlerSignals:
  - Documentation drift
  - Hidden authority
  - Test-only confidence
  - Responsibility overload
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
cypressFlows:
  - N/A - route behavior is covered by existing React/Vitest tests for DiffView.
completionGate:
  - pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
  - pnpm --filter @dvt/web test -- src/app/views/DiffView.test.tsx
  - pnpm --filter @dvt/web test:architecture
  - pnpm --filter @dvt/web typecheck
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: f17b-semantic-architecture-guard
    redTest: pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
    expectedFailure: component docs and owned-concern module docblocks are missing.
    patchSurfaces:
      - apps/web/src/app/views/DiffView.tsx
      - apps/web/src/app/views/diff/DiffTabs.tsx
      - apps/web/src/app/views/diff/SqlDiffPanel.tsx
      - apps/web/src/app/views/diff/CatalogDiffPanel.tsx
      - apps/web/src/app/components/monaco/MonacoDiffViewer.tsx
      - apps/web/src/app/components/monaco/MonacoDiffSurface.tsx
      - docs/architecture/components/web/diff/diff-monaco-review-surface-component.md
      - docs/architecture/components/web/diff/diff-monaco-review-surface-user-stories.md
      - buzon/20260519-f17b-fowler-monaco-diff-review-surface-analysis.md
    greenTest: pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
symbols:
  - name: APP_ROOT
    path: apps/web/src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
    dddOwner: Diff Monaco architecture test support
    cqRails: [none - internal presentation only]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts]
  - name: REPO_ROOT
    path: apps/web/src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
    dddOwner: Diff Monaco architecture test support
    cqRails: [none - internal presentation only]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts]
  - name: readAppSource
    path: apps/web/src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
    dddOwner: Diff Monaco architecture test support
    cqRails: [none - internal presentation only]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts]
  - name: readRepoDoc
    path: apps/web/src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
    dddOwner: Diff Monaco architecture test support
    cqRails: [none - internal presentation only]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts]
  - name: DiffView
    path: apps/web/src/app/views/DiffView.tsx
    dddOwner: Diff route application controller
    cqRails: [GetWorkspaceDiffChanges, GetWorkspaceFileContent]
    fowlerSignals: [Hidden authority]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/DiffView.test.tsx]
  - name: MonacoDiffViewer
    path: apps/web/src/app/components/monaco/MonacoDiffViewer.tsx
    dddOwner: Monaco diff presentation gateway
    cqRails: [none - internal presentation only]
    fowlerSignals: [Shared Gateway]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/DiffView.test.tsx]
  - name: MonacoDiffSurface
    path: apps/web/src/app/components/monaco/MonacoDiffSurface.tsx
    dddOwner: Monaco DiffEditor binding
    cqRails: [none - internal presentation only]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/DiffView.test.tsx]
```
