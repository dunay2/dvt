---
title: Canvas Workbench Stage 2 Autosave E2E Proof Plan
status: Active
owner: Product / Frontend / Architecture
last_reviewed: 2026-05-08
planning_type: mandatory-proposal
lane: E
task_id: F-28-B
parent_task_id: F-28
---

# Canvas Workbench Stage 2 Autosave E2E Proof Plan

## Summary

This plan corrects `F-28` Stage 2: Canvas save is automatic. The slice must not
add a manual Save button, a user-triggered save command, or a second persistence
authority.

The work proves that the existing automatic draft save path remains visible and
truthful in the browser:

- graph edits automatically call `SaveWorkspaceGraphDraft`;
- the toolbar exposes saving and saved posture from the draft lifecycle;
- failed automatic saves remain visible as failed instead of reverting to
  synced copy;
- no manual Save command appears in the Canvas toolbar or workbench chrome;
- read-only protected draft posture still blocks mutations and produces no
  draft write.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/planning/state/agent-lane-e.yaml`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md`
- `docs/architecture/components/web/graph/canvas-draft-session-component.md`
- `docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md`

## Scope

In scope:

- automatic save status copy and posture for the existing Canvas draft lifecycle;
- Cypress proof over `apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts`;
- focused unit tests for draft toolbar/status derivation and autosave failure
  scheduling;
- planning and component documentation that removes the manual-save framing.

Out of scope:

- manual Save button or command;
- backend routes, contracts, adapters, migrations, or RBAC changes;
- project export/import;
- multi-canvas persistence;
- protected draft API changes;
- replacing the existing autosave debounce policy except where required to keep
  a failed autosave visibly failed until the draft changes.

## Command And Query Rail Binding

| Rail                      | Type    | DDD owner                       | Stage 2 rule                                                    |
| ------------------------- | ------- | ------------------------------- | --------------------------------------------------------------- |
| `SaveWorkspaceGraphDraft` | command | `WorkspaceGraphAuthoringDraft`  | Existing automatic save authority; no manual duplicate command. |
| `GetWorkspaceGraphDraft`  | query   | protected draft read model      | Existing route read and reload authority.                       |
| `PersistCanvasLayout`     | command | `CanvasLayoutProjection`        | Existing route-local layout persistence; not a project save.    |
| `VerifyCanvasAutosave`    | query   | browser verification read model | Cypress checks save posture and captured draft writes.          |

## Fowler Reading

- **Duplicate semantics:** A manual Save command would duplicate the already
  accepted automatic `SaveWorkspaceGraphDraft` path.
- **Hidden authority:** Showing `Draft synced` after an automatic save failure
  hides that the authoritative write failed.
- **Presentation model:** The toolbar should reflect lifecycle truth, not own
  persistence.
- **Command-query separation:** Cypress verifies command dispatch and rendered
  status; it does not create a new write path.

## Acceptance

- No button with visible text `Save` is rendered by the Canvas toolbar.
- Adding a node from the Explorer causes exactly one automatic
  `PUT /workspace/graph/draft` in the stubbed Cypress proof.
- The draft status badge eventually renders `Draft saved` after the automatic
  save succeeds.
- A failed automatic save renders `Draft save failed` and does not present the
  failed write as synced.
- Read-only draft posture keeps node creation hidden and produces zero draft
  writes.
- Focused unit tests cover the failed-save toolbar state and the autosave
  scheduler holding the failed signature until a new draft signature appears.

## Validation

```powershell
pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftToolbarState.test.ts src/app/views/canvas/canvasDraftPersistenceRuntime.test.ts
pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
pnpm --filter @dvt/web typecheck
pnpm docs:sync
pnpm docs:workboard:generate
pnpm lint:md:changed
pnpm docs:feature-mechanization:implementation
pnpm verify:prepush
```

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: CANVAS-WORKBENCH-STAGE-2-AUTOSAVE-E2E
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-2-autosave-e2e-proof-plan-20260508.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md
  - docs/architecture/components/web/graph/canvas-draft-session-component.md
userStories:
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-2-autosave-e2e-proof-plan-20260508.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
  - apps/web/src/app/views/canvas/canvasCopy.types.ts
  - apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts
  - apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts
  - apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts
  - apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.test.ts
  - apps/web/src/app/views/canvas/canvasDraftAutosaveExecution.ts
  - apps/web/src/app/views/canvas/canvasDraftAutosaveScheduling.ts
  - apps/web/src/app/views/canvas/canvasDraftLifecycle.types.ts
  - apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.ts
  - apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.test.ts
  - apps/web/src/app/views/canvas/canvasDraftToolbarState.ts
  - apps/web/src/app/views/canvas/canvasDraftToolbarState.test.ts
  - apps/web/src/app/views/canvas/useCanvasDraftAttemptRefs.ts
  - apps/web/src/app/views/canvas/useCanvasDraftAutosave.ts
  - apps/web/src/app/views/canvas/useCanvasDraftBootstrapSync.ts
  - apps/web/src/app/views/canvas/useCanvasDraftBootstrapping.ts
  - apps/web/src/app/views/canvas/useCanvasDraftInitialBootstrap.ts
  - apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts
  - apps/web/src/app/views/canvas/useCanvasDraftMissingRemoteSync.ts
  - apps/web/src/app/views/canvas/useCanvasDraftRecoveryActions.ts
  - apps/web/src/app/views/canvas/useCanvasDraftReloadHydration.ts
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-2-autosave-e2e-proof-plan-20260508.md
  - docs/planning/state/agent-lane-e.yaml
  - docs/planning/status/**
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - specs/**
commandQueryRails:
  - name: SaveWorkspaceGraphDraft
    type: command
    dddOwner: WorkspaceGraphAuthoringDraft
  - name: GetWorkspaceGraphDraft
    type: query
    dddOwner: Protected draft read model
  - name: PersistCanvasLayout
    type: command
    dddOwner: CanvasLayoutProjection
  - name: VerifyCanvasAutosave
    type: query
    dddOwner: CanvasAutosaveBrowserProof
domainObjects:
  - name: DraftSaveStatus
    type: lifecycle state
    owner: apps/web/src/app/views/canvas/canvasDraftLifecycle.types.ts
  - name: CanvasDraftToolbarState
    type: presentation model
    owner: apps/web/src/app/views/canvas/canvasDraftToolbarState.ts
  - name: CanvasAutosaveBrowserProof
    type: browser verification read model
    owner: apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
fowlerSignals:
  - Hidden authority
  - Duplicate semantics
  - Presentation Model
  - Command Query Separation
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
completionGate:
  - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftToolbarState.test.ts src/app/views/canvas/canvasDraftPersistenceRuntime.test.ts
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: autosave-failed-status
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftToolbarState.test.ts -t "failed automatic save"
    expectedFailure: Failed autosave currently falls back to synced/idle toolbar copy.
    patchSurfaces:
      - apps/web/src/app/views/canvas/canvasDraftToolbarState.test.ts
      - apps/web/src/app/views/canvas/canvasDraftToolbarState.ts
      - apps/web/src/app/views/canvas/canvasCopy.types.ts
      - apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts
      - apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftToolbarState.test.ts
  - id: autosave-failed-signature-hold
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftPersistenceRuntime.test.ts -t "holds a failed autosave signature"
    expectedFailure: The current autosave scheduler retries the same failed signature instead of holding failed posture.
    patchSurfaces:
      - apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.test.ts
      - apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.ts
      - apps/web/src/app/views/canvas/canvasDraftAutosaveScheduling.ts
      - apps/web/src/app/views/canvas/canvasDraftAutosaveExecution.ts
      - apps/web/src/app/views/canvas/canvasDraftLifecycle.types.ts
      - apps/web/src/app/views/canvas/useCanvasDraftAttemptRefs.ts
      - apps/web/src/app/views/canvas/useCanvasDraftAutosave.ts
      - apps/web/src/app/views/canvas/useCanvasDraftBootstrapSync.ts
      - apps/web/src/app/views/canvas/useCanvasDraftBootstrapping.ts
      - apps/web/src/app/views/canvas/useCanvasDraftInitialBootstrap.ts
      - apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts
      - apps/web/src/app/views/canvas/useCanvasDraftMissingRemoteSync.ts
      - apps/web/src/app/views/canvas/useCanvasDraftRecoveryActions.ts
      - apps/web/src/app/views/canvas/useCanvasDraftReloadHydration.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftPersistenceRuntime.test.ts
  - id: autosave-browser-proof
    redTest: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
    expectedFailure: Cypress does not yet prove failed autosave status or absence of a manual Save command.
    patchSurfaces:
      - apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
    greenTest: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
symbols:
  - name: DraftSaveStatus
    path: apps/web/src/app/views/canvas/canvasDraftLifecycle.types.ts
    dddOwner: WorkspaceGraphAuthoringDraft lifecycle
    cqRails:
      - SaveWorkspaceGraphDraft
    fowlerSignals:
      - Hidden authority
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: canvas-ready-node-authoring.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftToolbarState.test.ts src/app/views/canvas/canvasDraftPersistenceRuntime.test.ts
  - name: CanvasAutosaveBrowserProof
    path: apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
    dddOwner: Browser verification
    cqRails:
      - VerifyCanvasAutosave
    fowlerSignals:
      - Command Query Separation
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
    unitTests:
      - N/A - Cypress proof owner
  - name: assertNoManualSaveCommand
    path: apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
    dddOwner: Browser verification
    cqRails:
      - VerifyCanvasAutosave
    fowlerSignals:
      - Command Query Separation
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
    unitTests:
      - N/A - Cypress proof helper
  - name: assertDraftSaveStatus
    path: apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
    dddOwner: Browser verification
    cqRails:
      - VerifyCanvasAutosave
    fowlerSignals:
      - Presentation Model
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts
    unitTests:
      - N/A - Cypress proof helper
  - name: resolveWritableToolbarTone
    path: apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts
    dddOwner: CanvasDraftToolbarState
    cqRails:
      - SaveWorkspaceGraphDraft
    fowlerSignals:
      - Presentation Model
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: canvas-ready-node-authoring.cy.ts
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftAccessPostureModel.test.ts
```
