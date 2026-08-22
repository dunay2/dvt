---
title: F-19 Marquez Public-Data Visual System Plan
status: Accepted
owner: Frontend / Architecture
date: 2026-05-22
planning_type: proposal
featureId: F19-MARQUEZ-PUBLIC-DATA-VISUAL-SYSTEM-20260522
---

# F-19 Marquez Public-Data Visual System Plan

## Objective

Close F-19 by turning `Marquez` from a named reference into a scoped
public-data visual-system component with explicit API, invariants, transitions,
consumers, user stories, and an architecture guard.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/ux-implementation-guide.md`
- `docs/architecture/components/web/library-and-open-source-reference-stack.md`

## Command And Query Rail Catalog

| Rail                             | Type  | Owning bounded context | DDD owner                         | Port or adapter surface             | Scope and authorization                             | Negative tests                                     |
| -------------------------------- | ----- | ---------------------- | --------------------------------- | ----------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `ClassifyPublicDataVisualSystem` | query | Web architecture       | `PublicDataVisualSystemReadModel` | Web architecture component guidance | Documentation and architecture-test semantics only. | Operator workbench routes must not select Marquez. |

## Fowler Opportunity Matrix

| Scenario                                       | Opportunity         | Fowler pattern            | DDD owner                         | Implementation surfaces                                            | Test evidence                                 |
| ---------------------------------------------- | ------------------- | ------------------------- | --------------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| Marquez was only a named reference             | Documentation drift | Component Guide           | `PublicDataVisualSystemReadModel` | public-data component doc, user stories, UX guide, reference stack | `publicDataVisualSystem.architecture.test.ts` |
| Public-data styling could leak into workbench  | Divergent change    | Semantic Fitness Function | `PublicDataVisualSystemReadModel` | architecture test and invariants                                   | `publicDataVisualSystem.architecture.test.ts` |
| Marquez could be confused with backend product | Ubiquitous language | Published Language        | Frontend architecture vocabulary  | component docs and library/reference stack                         | docs and architecture guard                   |

## Red-Green Plan

1. Red: add `publicDataVisualSystem.architecture.test.ts` expecting a Marquez
   component guide, user stories, UX-guide separation, and reference-stack
   classification.
2. Green: add the public-data component docs, user stories, UX guide text,
   reference-stack classification, component index entry, feature manifest,
   closeout, and Lane E state closure.
3. Validate focused architecture test, docs sync/status generation, planning DB
   export, and pre-push.

ADR decision: no ADR is required. This is a frontend architecture and UX
classification slice; it does not change runtime contracts, persistence,
adapter behavior, or compatibility policy.

```feature-mechanization
version: 1
featureId: F19-MARQUEZ-PUBLIC-DATA-VISUAL-SYSTEM-20260522
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
owner: Frontend / Architecture
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f19-marquez-public-data-visual-system-plan-20260522.md
componentGuides:
  - docs/architecture/components/web/public-data/marquez-visual-system-component.md
userStories:
  - docs/architecture/components/web/public-data/marquez-visual-system-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/ux-implementation-guide.md
  - docs/architecture/components/web/library-and-open-source-reference-stack.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/publicDataVisualSystem.architecture.test.ts
  - docs/.manifest.json
  - docs/architecture/components/web/index.md
  - docs/architecture/components/web/library-and-open-source-reference-stack.md
  - docs/architecture/components/web/public-data/index.md
  - docs/architecture/components/web/public-data/marquez-visual-system-component.md
  - docs/architecture/components/web/public-data/marquez-visual-system-user-stories.md
  - docs/architecture/components/web/ux-implementation-guide.md
  - docs/planning/closeouts/20260522-f19-marquez-public-data-visual-system-closeout.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f19-marquez-public-data-visual-system-plan-20260522.md
  - docs/planning/state/agent-lane-e.yaml
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
commandQueryRails:
  - name: ClassifyPublicDataVisualSystem
    type: query
    dddOwner: PublicDataVisualSystemReadModel
domainObjects:
  - name: PublicDataVisualSystemReadModel
    type: architecture read model
    owner: apps/web
  - name: MarquezPublicDataSurface
    type: component pattern
    owner: apps/web
fowlerSignals:
  - Documentation drift
  - Divergent change
  - Ubiquitous language
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/views/publicDataVisualSystem.architecture.test.ts
cypressFlows:
  - N/A - no public-data route exists in this slice
completionGate:
  - pnpm --filter @dvt/web test -- src/app/views/publicDataVisualSystem.architecture.test.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization -- --feature F19-MARQUEZ-PUBLIC-DATA-VISUAL-SYSTEM-20260522
  - pnpm docs:feature-mechanization:implementation -- --feature F19-MARQUEZ-PUBLIC-DATA-VISUAL-SYSTEM-20260522
  - pnpm docs:sync
  - pnpm docs:status:generate
  - pnpm planning:db:import -- --planning-only
  - pnpm verify:prepush
redGreenCycles:
  - id: f19-marquez-public-data-architecture
    redTest: pnpm --filter @dvt/web test -- src/app/views/publicDataVisualSystem.architecture.test.ts
    expectedFailure: Marquez component docs, user stories, and scoped public-data guidance do not exist yet.
    patchSurfaces:
      - apps/web/src/app/views/publicDataVisualSystem.architecture.test.ts
      - docs/architecture/components/web/public-data/index.md
      - docs/architecture/components/web/public-data/marquez-visual-system-component.md
      - docs/architecture/components/web/public-data/marquez-visual-system-user-stories.md
      - docs/architecture/components/web/ux-implementation-guide.md
      - docs/architecture/components/web/library-and-open-source-reference-stack.md
    greenTest: pnpm --filter @dvt/web test -- src/app/views/publicDataVisualSystem.architecture.test.ts
symbols:
  - name: REPO_ROOT
    path: apps/web/src/app/views/publicDataVisualSystem.architecture.test.ts
    dddOwner: PublicDataVisualSystemReadModel
    cqRails: [ClassifyPublicDataVisualSystem]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/publicDataVisualSystem.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/publicDataVisualSystem.architecture.test.ts]
  - name: readRepoFile
    path: apps/web/src/app/views/publicDataVisualSystem.architecture.test.ts
    dddOwner: PublicDataVisualSystemReadModel
    cqRails: [ClassifyPublicDataVisualSystem]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/publicDataVisualSystem.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/publicDataVisualSystem.architecture.test.ts]
  - name: repoFileExists
    path: apps/web/src/app/views/publicDataVisualSystem.architecture.test.ts
    dddOwner: PublicDataVisualSystemReadModel
    cqRails: [ClassifyPublicDataVisualSystem]
    fowlerSignals: [Semantic Fitness Function]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/publicDataVisualSystem.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/publicDataVisualSystem.architecture.test.ts]
```

## Planning Disposition

- Action: classify this mandatory proposal through `E-PROP-DISP-1`; no standalone implementation starts from this document without Planning DB ownership.
