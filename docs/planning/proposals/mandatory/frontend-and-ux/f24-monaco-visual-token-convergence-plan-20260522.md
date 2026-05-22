---
title: F-24 Monaco Visual Token Convergence Plan
status: Accepted
owner: Web / Monaco
last_reviewed: 2026-05-22
planning_type: proposal
---

# F-24 Monaco Visual Token Convergence Plan

## Problem

F-24 had converged shell, route, graph, and graph-context presentation tokens,
but the shared Monaco surfaces still mixed visual ownership across
`RouteWorkbenchFrame`, `MonacoViewerFallback`, `MonacoCodeSurface`, and
`MonacoDiffSurface`. That kept editor theme, container chrome, and option
presets as local literals instead of a semantic Monaco visual component.

## Fowler Opportunity Matrix

| scenario                                     | opportunity                               | Fowler pattern                      | DDD owner                  | command/query rail                  | implementation surfaces                                                                                        | unit or package test | architecture test                         | user-flow test                           | out of scope                                        |
| -------------------------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| Monaco embedded panes share visual semantics | Primitive obsession / duplicate semantics | Introduce Presentation Token Object | Monaco visual token object | `MonacoVisualTokenQuery` - internal | `monacoVisualTokens.ts`, Monaco surface modules, `RouteWorkbenchFrame.tsx`, Monaco docs, Lane E planning state | existing route tests | `monacoVisualTokens.architecture.test.ts` | route-specific Monaco architecture tests | editor persistence, provider contracts, Canvas host |

## Public API Target

- `monacoVisualClasses`
- `monacoTheme`
- `createMonacoCodeOptions()`
- `createMonacoDiffOptions()`

## Red / Green Plan

1. Add an architecture test that fails while Monaco visual ownership is split.
2. Introduce `monacoVisualTokens.ts` as the single Monaco visual token object.
3. Route fallback, code, and diff surfaces through the token object.
4. Remove the Monaco-specific export from `RouteWorkbenchFrame`.
5. Run Monaco and route ownership guards.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: F24-MONACO-VISUAL-TOKEN-CONVERGENCE-20260522
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f24-monaco-visual-token-convergence-plan-20260522.md
componentGuides:
  - docs/architecture/components/web/monaco/monaco-visual-token-component.md
userStories:
  - docs/architecture/components/web/monaco/monaco-visual-token-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
  - docs/guides/ai-work-protocol.md
allowedImplementationSurfaces:
  - apps/web/src/app/components/monaco/monacoVisualTokens.ts
  - apps/web/src/app/components/monaco/monacoVisualTokens.architecture.test.ts
  - apps/web/src/app/components/monaco/MonacoViewerFallback.tsx
  - apps/web/src/app/components/monaco/MonacoCodeSurface.tsx
  - apps/web/src/app/components/monaco/MonacoDiffSurface.tsx
  - apps/web/src/app/components/workbench/RouteWorkbenchFrame.tsx
  - docs/architecture/components/web/monaco/**
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
  - docs/planning/closeouts/**
  - docs/planning/state/agent-lane-e.yaml
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
commandQueryRails:
  - name: MonacoVisualTokenQuery
    type: query
    dddOwner: Monaco visual token component
domainObjects:
  - name: monacoVisualTokens
    type: presentation token object
    owner: apps/web
fowlerSignals:
  - Primitive obsession
  - Duplicate semantics
  - Documentation drift
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
cypressFlows:
  - N/A - Monaco visual token convergence only; route behavior stays unchanged.
completionGate:
  - pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts src/app/views/code/codeMonacoEditableAccess.architecture.test.ts src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm docs:feature-mechanization -- --feature F24-MONACO-VISUAL-TOKEN-CONVERGENCE-20260522
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:sync
  - pnpm docs:status:generate
  - pnpm verify:prepush
redGreenCycles:
  - id: f24-monaco-visual-token-boundary
    redTest: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    expectedFailure: Monaco visual token file is missing and Monaco surfaces still hardcode theme/options or import route frame Monaco classes.
    patchSurfaces:
      - apps/web/src/app/components/monaco/monacoVisualTokens.ts
      - apps/web/src/app/components/monaco/MonacoViewerFallback.tsx
      - apps/web/src/app/components/monaco/MonacoCodeSurface.tsx
      - apps/web/src/app/components/monaco/MonacoDiffSurface.tsx
      - apps/web/src/app/components/workbench/RouteWorkbenchFrame.tsx
    greenTest: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
symbols:
  - name: monacoVisualClasses
    path: apps/web/src/app/components/monaco/monacoVisualTokens.ts
    dddOwner: Monaco visual token component
    cqRails: [MonacoVisualTokenQuery]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts]
  - name: monacoTheme
    path: apps/web/src/app/components/monaco/monacoVisualTokens.ts
    dddOwner: Monaco visual token component
    cqRails: [MonacoVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts]
  - name: createMonacoCodeOptions
    path: apps/web/src/app/components/monaco/monacoVisualTokens.ts
    dddOwner: Monaco visual token component
    cqRails: [MonacoVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    cypressCoverage: N/A - option preset API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts]
  - name: createMonacoDiffOptions
    path: apps/web/src/app/components/monaco/monacoVisualTokens.ts
    dddOwner: Monaco visual token component
    cqRails: [MonacoVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    cypressCoverage: N/A - option preset API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts]
  - name: CreateMonacoCodeOptionsInput
    path: apps/web/src/app/components/monaco/monacoVisualTokens.ts
    dddOwner: Monaco visual token component
    cqRails: [MonacoVisualTokenQuery]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    cypressCoverage: N/A - internal type only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts]
  - name: CreateMonacoDiffOptionsInput
    path: apps/web/src/app/components/monaco/monacoVisualTokens.ts
    dddOwner: Monaco visual token component
    cqRails: [MonacoVisualTokenQuery]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    cypressCoverage: N/A - internal type only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts]
  - name: DEFAULT_MONACO_CONTAINER_CLASS_NAME
    path: apps/web/src/app/components/monaco/MonacoViewerFallback.tsx
    dddOwner: Monaco visual token component
    cqRails: [MonacoVisualTokenQuery]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    cypressCoverage: N/A - default class export only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts]
  - name: TOKEN_SOURCE
    path: apps/web/src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    dddOwner: Monaco visual token component
    cqRails: [MonacoVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts]
  - name: FALLBACK_SOURCE
    path: apps/web/src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    dddOwner: Monaco visual token component
    cqRails: [MonacoVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts]
  - name: CODE_SURFACE_SOURCE
    path: apps/web/src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    dddOwner: Monaco visual token component
    cqRails: [MonacoVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts]
  - name: DIFF_SURFACE_SOURCE
    path: apps/web/src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    dddOwner: Monaco visual token component
    cqRails: [MonacoVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts]
  - name: FRAME_SOURCE
    path: apps/web/src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    dddOwner: Monaco visual token component
    cqRails: [MonacoVisualTokenQuery]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts
    cypressCoverage: N/A - architecture test support symbol only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/monaco/monacoVisualTokens.architecture.test.ts]
```
