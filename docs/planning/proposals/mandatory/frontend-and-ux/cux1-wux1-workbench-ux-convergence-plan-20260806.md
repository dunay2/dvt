---
title: CUX1 and WUX1 workbench UX convergence plan
status: Proposed
date: 2026-08-06
last_reviewed: 2026-08-06
owners:
  - apps/web
planning_type: proposal
lane: E
github_epics:
  - 2228
  - 2236
---

# CUX1 And WUX1 Workbench UX Convergence Plan

## Think-First Analysis

Problem summary: the active web workbench exposes the governed project, Canvas,
code, and execution capabilities, but their presentation does not yet form a
coherent novice-accessible workflow. Project switching is hidden inside context,
language is inferred independently by multiple copy resolvers, project code uses
a fixed panel, node execution copy and icons disagree, graph direction is too
subtle, component creation lacks a responsive grouped hierarchy, startup visuals
overuse saturated blue, and dialog cancellation is inconsistent.

Root causes:

- workspace selection has a valid `SelectWorkspaceScope` command but no durable,
  explicit shell affordance when only one scope is currently granted;
- locale detection is repeated at presentation leaves instead of being owned by
  one application preference value object;
- project and node code surfaces do not share the same movable contextual
  workbench interaction contract;
- some controls communicate state through labels while their icons still imply
  a different command;
- graph direction relies on a low-contrast marker despite an existing directed
  edge projection;
- component taxonomy exists in the model but the catalog view flattens it;
- base tokens are operationally sound, but startup composition does not yet use
  the neutral-first visual hierarchy required by the design-token contract;
- cancel, close, and discard behaviors are implemented per dialog without one
  reviewable presentation rule.

### Current-state flow

```mermaid
flowchart LR
  Shell[Shell] --> Context[Workspace context popover]
  Context -->|only when multiple grants| Scope[SelectWorkspaceScope]
  View[View menu] -. no locale command .-> Copy[Leaf copy resolvers]
  Canvas --> ProjectCode[Fixed project code panel]
  Canvas --> NodeCode[Movable node workbench]
  Canvas --> Edge[Directed edge with subtle marker]
  Canvas --> Catalog[Flat component catalog]
  Dialogs[Dialogs] --> Mixed[Mixed close and cancellation cues]
```

### Target flow and solution rationale

```mermaid
flowchart LR
  Shell[Persistent shell] --> Scope[Explicit project control]
  Scope --> Select[SelectWorkspaceScope]
  View[View menu] --> Locale[ConfigureApplicationLanguage]
  Locale --> Copy[Reactive localized copy]
  Canvas --> Workbench[One movable code workbench contract]
  Workbench --> Files[List/Get/SaveWorkspaceFileContent]
  Canvas --> Execution[Selection state with play/pause semantics]
  Canvas --> Direction[Visible directed dependency arrows]
  Canvas --> Groups[Responsive component groups]
  Startup[Startup and onboarding] --> Tokens[Neutral mature token hierarchy]
  Dialogs[Dialogs] --> Cancel[Consistent close/cancel/discard semantics]
```

Selected option: converge the behavior inside the existing shell, Canvas,
workspace-file, execution-selection, and run-cancellation rails. Add only the
missing local command `ConfigureApplicationLanguage`, backed by a single
observable application-language preference. Extend the canonical manual and
design contracts rather than creating a second UX authority.

Rejected alternatives:

- A second project picker route. Rejected because `SelectWorkspaceScope` already
  owns the intent and a parallel route would split authorization semantics.
- Per-component language state. Rejected because it preserves stale mixed-language
  screens and duplicate authority.
- Generated or reconstructed node snippets. Rejected because exact workspace
  files already have governed query and save rails.
- A second modal framework or design system. Rejected because the existing shell,
  Radix primitives, Lucide icons, and semantic tokens are canonical.
- Generic client-side cancellation. Rejected because only cancellable domain work
  may use its owning cancellation rail; dismissing a dialog is not `CancelRun`.

## Pre-Implementation Brief

Execution mode: Full. This slice spans two epics, shell-wide language state,
cross-screen visual/accessibility behavior, and several Canvas interactions.

Behavioral invariants:

- only server-granted workspace scopes can be selected;
- changing language changes visible and accessible copy without reloading;
- the chosen language persists locally and never mutates domain data;
- code actions open the exact governed workspace file for the selected target;
- moving or closing a workbench cannot silently discard unsaved code;
- execution selection remains independent from run lifecycle cancellation;
- edges remain the projection of graph dependencies, with no second edge model;
- every overlay has an accessible name, keyboard exit, and visible close or
  cancel action appropriate to its semantics;
- all reviewed screens remain usable at desktop and narrow viewport sizes.

Allowed surfaces are limited to `apps/web`, the canonical web architecture and
manual documents, governed Planning DB projections, Cypress evidence, and the
closeout/evidence documents for this slice. Backend, contract, engine, adapter,
and planner semantics are out of scope.

## Fowler Matrix

| Scenario                                                    | Opportunity         | Fowler pattern                      | DDD owner                                       | Command/query rail                                                                                      | Proof                                              | Out of scope             |
| ----------------------------------------------------------- | ------------------- | ----------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------ |
| A novice finds and changes the active project.              | Hidden authority    | Intention-Revealing Interface       | Workspace scope selection                       | `GetEffectiveWorkspaceContext`, `SelectWorkspaceScope`                                                  | selector unit/integration and keyboard test        | inventing grants         |
| A user changes Spanish/English from View.                   | Duplicate semantics | Value Object, Presentation Model    | Application language preference                 | `ConfigureApplicationLanguage`                                                                          | store, menu, persistence, reactive copy tests      | backend locale profile   |
| A user opens project or selected-node code.                 | Divergent change    | Contextual Workbench, Repository    | Workspace file content                          | `ListWorkspaceFiles`, `GetWorkspaceFileContent`, `SaveWorkspaceFileContent`, `ResolveCanvasContextMenu` | exact-path and movable workbench tests             | fabricated snippets      |
| A user understands execution selection and graph direction. | Primitive obsession | State, Presentation Model           | Canvas execution selection and graph projection | `CollectCanvasExecutionSelection`, `RenderCanvasGraphBase`                                              | icon/label and marker tests                        | run scheduling semantics |
| A user adds a component on any supported viewport.          | Feature envy        | Catalog, Presenter                  | Canvas authoring catalog                        | `CreateCanvasAuthoringNode`                                                                             | grouped catalog and responsive tests               | new node kinds           |
| A user starts, navigates, and dismisses safely.             | Shotgun surgery     | Design tokens, Command              | Shell presentation and owning dialog command    | existing route queries; `CancelRun` only for runs                                                       | visual, axe, focus, cancel/discard tests           | new modal framework      |
| An unfamiliar demanding user completes the manual.          | Missing evidence    | Acceptance Test, Published Language | Screen manual                                   | all rails above                                                                                         | independent critical report against committed head | self-attestation         |

```feature-mechanization
version: 1
featureId: WORKBENCH-UX-CONVERGENCE-20260806
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/cux1-wux1-workbench-ux-convergence-plan-20260806.md
componentGuides:
  - docs/architecture/components/web/screen-manuals-and-user-stories.md
  - docs/architecture/components/web/iconography-and-design-tokens-contract.md
  - docs/architecture/components/web/appshell/shell-workspace-context-component.md
  - docs/architecture/components/web/graph/canvas-view-menu-component.md
  - docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
userStories:
  - docs/architecture/components/web/appshell/shell-workspace-context-user-stories.md
  - docs/architecture/components/web/graph/canvas-view-menu-user-stories.md
  - docs/architecture/components/web/graph/canvas-interaction-command-surface-user-stories.md
  - docs/architecture/components/web/workbench-ux-canon-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/frontend-command-query-rail-inventory.md
  - docs/architecture/components/web/iconography-and-design-tokens-contract.md
  - docs/architecture/components/web/screen-manuals-and-user-stories.md
allowedImplementationSurfaces:
  - apps/web/src/**
  - apps/web/cypress/**
  - docs/architecture/components/web/**
  - docs/planning/closeouts/**
  - docs/planning/proposals/mandatory/frontend-and-ux/cux1-wux1-workbench-ux-convergence-plan-20260806.md
  - docs/planning/status/**
  - docs/evidence/**
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - specs/**
commandQueryRails:
  - name: ConfigureApplicationLanguage
    type: command
    dddOwner: ApplicationLanguagePreference value object
  - name: SelectWorkspaceScope
    type: command
    dddOwner: Workspace scope selection
  - name: GetEffectiveWorkspaceContext
    type: query
    dddOwner: Workspace context read model
  - name: ListWorkspaceFiles
    type: query
    dddOwner: Workspace file tree read model
  - name: GetWorkspaceFileContent
    type: query
    dddOwner: Workspace file content read model
  - name: SaveWorkspaceFileContent
    type: command
    dddOwner: Workspace file content aggregate
  - name: CollectCanvasExecutionSelection
    type: query
    dddOwner: Canvas execution selection
  - name: RenderCanvasGraphBase
    type: query
    dddOwner: Canvas graph projection
  - name: CreateCanvasAuthoringNode
    type: command
    dddOwner: Canvas authoring graph
  - name: CancelRun
    type: command
    dddOwner: Run aggregate
domainObjects:
  - name: ApplicationLanguagePreference
    type: value object
    owner: Application presentation
  - name: WorkspaceScopeSelection
    type: application service
    owner: Protected workspace session
  - name: ContextualCodeWorkbench
    type: presenter
    owner: Canvas and workspace files
  - name: CanvasComponentCatalog
    type: catalog
    owner: Canvas authoring
fowlerSignals:
  - Hidden authority
  - Duplicate semantics
  - Divergent change
  - Primitive obsession
  - Feature envy
  - Shotgun surgery
architectureGuards:
  - pnpm --filter @dvt/web test:architecture
cypressFlows:
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-workbench-ux-convergence.cy.ts
completionGate:
  - pnpm docs:feature-mechanization -- --feature WORKBENCH-UX-CONVERGENCE-20260806
  - pnpm --filter @dvt/web test
  - pnpm --filter @dvt/web test:architecture
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-workbench-ux-convergence.cy.ts
  - pnpm docs:feature-mechanization:implementation -- --feature WORKBENCH-UX-CONVERGENCE-20260806
  - pnpm verify:prepush
redGreenCycles:
  - id: application-language
    redTest: pnpm --filter @dvt/web test -- src/app/stores/applicationLanguageStore.test.ts src/app/views/canvas/CanvasViewMenuControls.test.tsx
    expectedFailure: No observable persisted application-language command or View menu choice exists.
    patchSurfaces:
      - apps/web/src/app/stores/applicationLanguageStore.ts
      - apps/web/src/app/views/canvas/**
      - apps/web/src/app/components/shell/**
    greenTest: pnpm --filter @dvt/web test -- src/app/stores/applicationLanguageStore.test.ts src/app/views/canvas/CanvasViewMenuControls.test.tsx
  - id: project-and-code-discoverability
    redTest: pnpm --filter @dvt/web test -- src/app/components/shell/ShellWorkspaceScopeSelector.test.tsx src/app/views/canvas/dbtProjectFileCodeWorkbench.test.tsx
    expectedFailure: Project choice is hidden and project code cannot be moved like node code.
    patchSurfaces:
      - apps/web/src/app/components/shell/**
      - apps/web/src/app/views/canvas/**
    greenTest: pnpm --filter @dvt/web test -- src/app/components/shell/ShellWorkspaceScopeSelector.test.tsx src/app/views/canvas/dbtProjectFileCodeWorkbench.test.tsx
  - id: canvas-meaning-and-layout
    redTest: pnpm --filter @dvt/web test -- src/app/components/canvas/canvasNodeContextMenuModel.test.ts src/app/views/canvas/canvasNodeMapper.test.ts src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx
    expectedFailure: Selection icon, edge marker visibility, and catalog hierarchy do not express their meaning consistently.
    patchSurfaces:
      - apps/web/src/app/components/canvas/**
      - apps/web/src/app/views/canvas/**
    greenTest: pnpm --filter @dvt/web test -- src/app/components/canvas/canvasNodeContextMenuModel.test.ts src/app/views/canvas/canvasNodeMapper.test.ts src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx
  - id: cross-screen-visual-accessibility
    redTest: pnpm --filter @dvt/web test -- src/app/bootstrap/appBootstrapScreen.test.ts src/app/components/ui/Modals.test.tsx
    expectedFailure: Startup hierarchy and cancel/close semantics are not covered by the demanding-user contract.
    patchSurfaces:
      - apps/web/src/app/bootstrap/**
      - apps/web/src/app/components/**
      - apps/web/src/styles/**
      - apps/web/cypress/**
    greenTest: pnpm --filter @dvt/web test -- src/app/bootstrap/appBootstrapScreen.test.ts src/app/components/ui/Modals.test.tsx
symbols:
  - name: configureApplicationLanguage
    path: apps/web/src/app/stores/applicationLanguageStore.ts
    dddOwner: ApplicationLanguagePreference
    cqRails: [ConfigureApplicationLanguage]
    fowlerSignals: [Hidden authority, Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-workbench-ux-convergence.cy.ts
    unitTests: [pnpm --filter @dvt/web test -- src/app/stores/applicationLanguageStore.test.ts]
  - name: ShellWorkspaceScopeSelector
    path: apps/web/src/app/components/shell/ShellWorkspaceScopeSelector.tsx
    dddOwner: WorkspaceScopeSelection
    cqRails: [SelectWorkspaceScope, GetEffectiveWorkspaceContext]
    fowlerSignals: [Intention-Revealing Interface]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-workbench-ux-convergence.cy.ts
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/shell/ShellWorkspaceScopeSelector.test.tsx]
  - name: DbtProjectFileCodeWorkbench
    path: apps/web/src/app/views/canvas/dbtProjectFileCodeWorkbench.tsx
    dddOwner: ContextualCodeWorkbench
    cqRails: [ListWorkspaceFiles, GetWorkspaceFileContent, SaveWorkspaceFileContent]
    fowlerSignals: [Divergent change]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-workbench-ux-convergence.cy.ts
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/dbtProjectFileCodeWorkbench.test.tsx]
  - name: CanvasAddNodeCatalogView
    path: apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx
    dddOwner: CanvasComponentCatalog
    cqRails: [CreateCanvasAuthoringNode]
    fowlerSignals: [Feature envy]
    architectureGuard: pnpm --filter @dvt/web test:architecture
    cypressCoverage: apps/web/cypress/e2e/canvas/canvas-workbench-ux-convergence.cy.ts
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx]
```

## Demanding-User Acceptance

An independent reviewer who starts with no product knowledge must follow the
canonical screen manual at desktop and narrow widths, using mouse and keyboard.
The reviewer must report discoverability, language consistency, visual maturity,
information hierarchy, duplicate controls, cancellation confidence, focus
visibility, contrast, clipping, and whether the complete project/node code is
actually reachable. Findings are defects until fixed or explicitly rejected
with evidence; the implementation author cannot self-certify this gate.
