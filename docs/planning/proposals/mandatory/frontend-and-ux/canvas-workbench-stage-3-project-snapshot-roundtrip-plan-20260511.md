---
title: Canvas Workbench Stage 3 Project Snapshot Round Trip Plan
status: Active
owner: Product / Frontend / Architecture
last_reviewed: 2026-05-11
planning_type: mandatory-proposal
lane: E
task_id: F-28-C
parent_task_id: F-28
---

# Canvas Workbench Stage 3 Project Snapshot Round Trip Plan

## Summary

Stage 3 proves that a Canvas project can move through a local file without
treating that file format as stable or authoritative before validation.

The slice adds a versioned project snapshot value object, a browser export
query, an import-validation query, and an import command that reuses the
existing protected draft save authority. It does not add backend project asset
persistence, multi-canvas persistence, or a second save rail.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md`
- `docs/architecture/components/web/graph/canvas-draft-session-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-2-autosave-e2e-proof-plan-20260508.md`

## Think-First Analysis

Problem summary:

- Canvas can persist an automatic protected draft, but there is no governed way
  to export that draft to a file and import it back.
- Without an explicit snapshot value object, JSON files can become a hidden
  authority that bypasses `WorkspaceGraphAuthoringDraft` validation.

Root cause:

- Stage 1 and Stage 2 intentionally left project snapshot behavior out of
  scope, so the workbench has no Project workspace I/O rail yet.
- The current Canvas draft lifecycle owns protected draft save and recovery,
  but it has no anti-corruption boundary for user-supplied files.

Constraints and invariants:

- The imported graph must validate as `WorkspaceGraphAuthoringDraft` before any
  write command is attempted.
- Import must call the existing `SaveWorkspaceGraphDraft` authority through
  `CanvasDraftRepository`; it must not seed protected draft state directly.
- Export reads the persisted draft record, not an unsaved failed local draft.
- The snapshot format is explicitly versioned and may be rejected; it is not a
  compatibility promise beyond this Stage 3 proof.
- Snapshot project metadata records tenant, project, and environment IDs for
  auditability, but import writes only to the current workspace scope.

Options considered:

| Option                                                                           | Decision | Rationale                                                                 |
| -------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| Add backend project asset persistence now                                        | Rejected | This expands Stage 3 into a backend contract and adapter slice.           |
| Export/import raw protected draft JSON                                           | Rejected | It has no version envelope or validation boundary.                        |
| Add a web-local `ProjectSnapshot` value object over the existing draft aggregate | Selected | It proves the file round trip while preserving protected draft authority. |

## Pre-Implementation Brief

- Mode: Full.
- Scope: web Canvas value object, toolbar commands, import/export browser
  adapter, unit tests, Cypress round-trip proof, C&Q catalog update, closeout.
- Expected outcome: users can export the persisted Canvas draft to a versioned
  `.json` snapshot, import a validated snapshot into a clean workspace context,
  and see nodes, edges, layout, workspace metadata, and Canvas identity restored.
- Out of scope: backend file storage, project asset APIs, multi-canvas project
  format, source-control import, contract package changes, adapter changes, and
  any manual Save command.
- Validation plan:
  - `pnpm docs:feature-mechanization -- --feature CANVAS-WORKBENCH-STAGE-3-PROJECT-SNAPSHOT-ROUNDTRIP`
  - `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts src/app/views/canvas/CanvasToolbar.test.tsx`
  - `pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-project-snapshot-roundtrip.cy.ts`
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm docs:sync`
  - `pnpm docs:feature-mechanization:implementation`
  - `pnpm verify:prepush`

## Command And Query Rail Binding

| Rail                      | Type    | DDD owner                                | Stage 3 rule                                                                                                                      |
| ------------------------- | ------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ExportProjectSnapshot`   | query   | `ProjectSnapshot` value object           | Serializes only a persisted Canvas draft record into a versioned file payload.                                                    |
| `ValidateProjectImport`   | query   | `ProjectSnapshotImportReadModel`         | Rejects malformed JSON, unsupported format/version, invalid draft schema, canvas identity mismatch, and missing project metadata. |
| `ImportProjectSnapshot`   | command | `ProjectSnapshotImport`                  | Saves the validated draft through `CanvasDraftRepository.saveGraphDraft`, preserving CAS conflict behavior.                       |
| `SaveWorkspaceGraphDraft` | command | `WorkspaceGraphAuthoringDraft` aggregate | Existing protected draft authority reused by import.                                                                              |

## Fowler Matrix

| Scenario                                             | Opportunity         | Fowler pattern                               | DDD owner                        | Command/query rail                                 | Implementation surfaces                                    | Unit or package test                                | Architecture test              | User-flow test                              | Out of scope                                        |
| ---------------------------------------------------- | ------------------- | -------------------------------------------- | -------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- | ------------------------------ | ------------------------------------------- | --------------------------------------------------- |
| Export current persisted Canvas draft to a file      | Primitive obsession | Replace Primitive with Object                | `ProjectSnapshot` value object   | `ExportProjectSnapshot`                            | `canvasProjectSnapshot.ts`, Canvas toolbar wiring          | `canvasProjectSnapshot.test.ts`                     | Feature mechanization manifest | Cypress export/import flow                  | Backend project assets                              |
| Validate uploaded project snapshot before import     | Hidden authority    | Anti-corruption Layer                        | `ProjectSnapshotImportReadModel` | `ValidateProjectImport`                            | `canvasProjectSnapshot.ts`, import file action             | malformed/version/schema/identity rejection tests   | Feature mechanization manifest | Cypress invalid import path if needed later | Stable long-term snapshot contract                  |
| Import snapshot into clean current workspace context | Boundary drift      | Service Layer over existing draft repository | `ProjectSnapshotImport`          | `ImportProjectSnapshot`, `SaveWorkspaceGraphDraft` | `useCanvasDraftLifecycle`, shell/toolbar command contracts | toolbar command unit proof plus snapshot unit proof | Feature mechanization manifest | Cypress round-trip proof                    | Direct API seeding or route-local state replacement |

## Acceptance

- Project snapshot export creates a versioned JSON file with workspace metadata,
  Canvas identity, and the persisted `WorkspaceGraphAuthoringDraft`.
- Import validates the file before saving and rejects malformed, unsupported, or
  incoherent snapshots without attempting a draft save.
- Import writes through the existing protected draft repository and keeps
  conflict/read-only failures on the existing draft-save path.
- Cypress proves: modify graph, wait for automatic save, export snapshot, visit
  a clean workspace draft, import the exported file, reload, and verify graph
  nodes plus Canvas title are restored.
- No manual Save command is introduced.

```feature-mechanization
version: 1
featureId: CANVAS-WORKBENCH-STAGE-3-PROJECT-SNAPSHOT-ROUNDTRIP
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-3-project-snapshot-roundtrip-plan-20260511.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-project-snapshot-component.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
  - docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md
  - docs/architecture/components/web/graph/canvas-draft-session-component.md
userStories:
  - docs/architecture/components/web/graph/canvas-project-snapshot-user-stories.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-3-project-snapshot-roundtrip-plan-20260511.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
  - apps/web/src/app/views/canvas/canvasProjectSnapshot.test.ts
  - apps/web/src/app/views/canvas/canvasProjectSnapshot.architecture.test.ts
  - apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts
  - apps/web/src/app/views/canvas/canvasDraftLifecycle.types.ts
  - apps/web/src/app/views/canvas/canvasControllerViewModel.ts
  - apps/web/src/app/views/canvas/canvasShellBuilder.types.ts
  - apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx
  - apps/web/src/app/views/canvas/canvasShell.types.ts
  - apps/web/src/app/views/canvas/canvasShellChromeCommandsBuilder.ts
  - apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx
  - apps/web/src/app/views/canvas/CanvasToolbar.tsx
  - apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx
  - apps/web/src/app/views/canvas/CanvasToolbar.test.tsx
  - apps/web/src/app/views/canvas/canvasCopy.types.ts
  - apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts
  - apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts
  - apps/web/src/app/views/canvas/copy.test.ts
  - apps/web/cypress/e2e/canvas/canvas-project-snapshot-roundtrip.cy.ts
  - buzon/20260511-codex-fowler-canvas-project-snapshot-analysis-and-remediation.md
  - docs/architecture/components/web/graph/canvas-project-snapshot-component.md
  - docs/architecture/components/web/graph/canvas-project-snapshot-user-stories.md
  - docs/architecture/components/web/graph/index.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-3-project-snapshot-roundtrip-plan-20260511.md
  - docs/planning/closeouts/**
  - docs/**/index.md
  - docs/planning/status/**
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - specs/**
commandQueryRails:
  - name: ExportProjectSnapshot
    type: query
    dddOwner: ProjectSnapshot
  - name: ValidateProjectImport
    type: query
    dddOwner: ProjectSnapshotImportReadModel
  - name: ImportProjectSnapshot
    type: command
    dddOwner: ProjectSnapshotImport
  - name: SaveWorkspaceGraphDraft
    type: command
    dddOwner: WorkspaceGraphAuthoringDraft
domainObjects:
  - name: ProjectSnapshot
    type: value object
    owner: Project workspace I/O
  - name: ProjectSnapshotImportReadModel
    type: read model
    owner: Project workspace I/O
  - name: ProjectSnapshotImport
    type: command
    owner: Project workspace I/O
fowlerSignals:
  - Primitive obsession
  - Hidden authority
  - Boundary drift
  - Anti-corruption Layer
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
  - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.architecture.test.ts
cypressFlows:
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-project-snapshot-roundtrip.cy.ts
completionGate:
  - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.architecture.test.ts
  - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts src/app/views/canvas/CanvasToolbar.test.tsx
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-project-snapshot-roundtrip.cy.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: project-snapshot-value-object
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
    expectedFailure: Project snapshot value object and validation query do not exist yet.
    patchSurfaces:
      - apps/web/src/app/views/canvas/canvasProjectSnapshot.test.ts
      - apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
  - id: project-snapshot-toolbar-commands
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx
    expectedFailure: Canvas toolbar has no governed project snapshot export/import command surface.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasToolbar.test.tsx
      - apps/web/src/app/views/canvas/CanvasToolbar.tsx
      - apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx
      - apps/web/src/app/views/canvas/canvasShell.types.ts
      - apps/web/src/app/views/canvas/canvasShellBuilder.types.ts
      - apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx
      - apps/web/src/app/views/canvas/canvasShellChromeCommandsBuilder.ts
      - apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx
      - apps/web/src/app/views/canvas/canvasControllerViewModel.ts
      - apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts
      - apps/web/src/app/views/canvas/canvasDraftLifecycle.types.ts
      - apps/web/src/app/views/canvas/canvasCopy.types.ts
      - apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts
      - apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts
      - apps/web/src/app/views/canvas/copy.test.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx
  - id: project-snapshot-browser-roundtrip
    redTest: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-project-snapshot-roundtrip.cy.ts
    expectedFailure: Browser flow cannot export, import, and reload a project snapshot round trip yet.
    patchSurfaces:
      - apps/web/cypress/e2e/canvas/canvas-project-snapshot-roundtrip.cy.ts
    greenTest: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-project-snapshot-roundtrip.cy.ts
  - id: project-snapshot-semantic-architecture
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.architecture.test.ts
    expectedFailure: Canvas project snapshot component guide, user stories, mailbox analysis, docblocks, and namespaced API are not yet in place.
    patchSurfaces:
      - apps/web/src/app/views/canvas/canvasProjectSnapshot.architecture.test.ts
      - apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
      - apps/web/src/app/views/canvas/canvasProjectSnapshot.test.ts
      - apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts
      - apps/web/cypress/e2e/canvas/canvas-project-snapshot-roundtrip.cy.ts
      - docs/architecture/components/web/graph/canvas-project-snapshot-component.md
      - docs/architecture/components/web/graph/canvas-project-snapshot-user-stories.md
      - buzon/20260511-codex-fowler-canvas-project-snapshot-analysis-and-remediation.md
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.architecture.test.ts
symbols:
  - name: canvasProjectSnapshot
    path: apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
    dddOwner: Project workspace I/O
    cqRails:
      - ExportProjectSnapshot
      - ValidateProjectImport
    fowlerSignals:
      - Intention-Revealing Interface
      - Anti-corruption Layer
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.architecture.test.ts
    cypressCoverage: canvas-project-snapshot-roundtrip.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
  - name: ProjectSnapshot
    path: apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
    dddOwner: Project workspace I/O
    cqRails:
      - ExportProjectSnapshot
      - ValidateProjectImport
    fowlerSignals:
      - Primitive obsession
      - Anti-corruption Layer
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: canvas-project-snapshot-roundtrip.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
  - name: PROJECT_SNAPSHOT_FORMAT
    path: apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
    dddOwner: ProjectSnapshot
    cqRails:
      - ExportProjectSnapshot
      - ValidateProjectImport
    fowlerSignals:
      - Primitive obsession
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: canvas-project-snapshot-roundtrip.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
  - name: PROJECT_SNAPSHOT_SCHEMA_VERSION
    path: apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
    dddOwner: ProjectSnapshot
    cqRails:
      - ExportProjectSnapshot
      - ValidateProjectImport
    fowlerSignals:
      - Primitive obsession
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: canvas-project-snapshot-roundtrip.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
  - name: ProjectSnapshotImportRejectionReason
    path: apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
    dddOwner: ProjectSnapshotImportReadModel
    cqRails:
      - ValidateProjectImport
    fowlerSignals:
      - Hidden authority
      - Anti-corruption Layer
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: canvas-project-snapshot-roundtrip.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
  - name: ProjectSnapshotImportValidation
    path: apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
    dddOwner: ProjectSnapshotImportReadModel
    cqRails:
      - ValidateProjectImport
    fowlerSignals:
      - Hidden authority
      - Anti-corruption Layer
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: canvas-project-snapshot-roundtrip.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
  - name: ExportProjectSnapshotInput
    path: apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
    dddOwner: ProjectSnapshot
    cqRails:
      - ExportProjectSnapshot
    fowlerSignals:
      - Primitive obsession
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: canvas-project-snapshot-roundtrip.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
  - name: ExportProjectSnapshotResult
    path: apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
    dddOwner: ProjectSnapshot
    cqRails:
      - ExportProjectSnapshot
    fowlerSignals:
      - Primitive obsession
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: canvas-project-snapshot-roundtrip.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
  - name: exportProjectSnapshot
    path: apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
    dddOwner: ProjectSnapshot
    cqRails:
      - ExportProjectSnapshot
    fowlerSignals:
      - Primitive obsession
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: canvas-project-snapshot-roundtrip.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
  - name: validateProjectImport
    path: apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
    dddOwner: ProjectSnapshotImportReadModel
    cqRails:
      - ValidateProjectImport
    fowlerSignals:
      - Hidden authority
      - Anti-corruption Layer
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: canvas-project-snapshot-roundtrip.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
  - name: buildProjectSnapshotFileName
    path: apps/web/src/app/views/canvas/canvasProjectSnapshot.ts
    dddOwner: ProjectSnapshot
    cqRails:
      - ExportProjectSnapshot
    fowlerSignals:
      - Primitive obsession
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: canvas-project-snapshot-roundtrip.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasProjectSnapshot.test.ts
  - name: CanvasProjectSnapshotBrowserRoundTrip
    path: apps/web/cypress/e2e/canvas/canvas-project-snapshot-roundtrip.cy.ts
    dddOwner: Browser verification
    cqRails:
      - ExportProjectSnapshot
      - ValidateProjectImport
      - ImportProjectSnapshot
    fowlerSignals:
      - Hidden authority
      - Anti-corruption Layer
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-project-snapshot-roundtrip.cy.ts
    unitTests:
      - N/A - Cypress proof owner
```
