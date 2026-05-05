---
title: Canvas Workbench Shell Save Export Sequence Plan
status: Proposed
owner: Product / Frontend / Architecture
last_reviewed: 2026-05-05
planning_type: mandatory-proposal
lane: E
task_id: F-27
---

# Canvas Workbench Shell Save Export Sequence Plan

## Summary

This proposal records the next Canvas workbench product slice so it does not
disappear behind smaller tab, layout, and startup fixes.

The next work should proceed in three stages:

1. simplify the Canvas workbench chrome and project context placement;
2. introduce an explicit user-visible save command over the existing draft
   authority;
3. add project export and import proof as a complete round trip.

Multi-canvas persistence is intentionally out of scope for this sequence. The
current product can live with one active workspace draft while the workbench
gets cleaner and the project can be saved, exported, and loaded back for
verification.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/reference-architecture.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md`
- `docs/architecture/components/web/screen-layout-and-cross-surface-behavior-rules.md`
- `docs/architecture/components/web/graph/canvas-workbench-tabs-component.md`
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md`
- `docs/architecture/components/web/graph/canvas-layout-persistence-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/web-auth-project-onboarding-and-actionable-gaps-20260501.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-fowler-remediation-plan-20260504.md`

## Product Direction

The Canvas screen should feel closer to a dense cloud workbench than to a
prototype dashboard.

The header should prioritize the active project and Canvas identity:

- human title, for example `Sessionize Events`;
- technical slug, for example `sessionize_events_pipeline`;
- compact project identifier, for example `prj-7f3a9c2`;
- draft status, for example `Draft`, `Unsaved`, `Saving`, or `Saved`.

Tenant, project, environment, and Git selection should not dominate the main
top bar. They are workspace context, not the primary workbench action. Move
scope selection into a left-rail workspace context menu or a similarly bounded
shell surface.

## Stage 1: Workbench Chrome Simplification

Stage 1 is the first executable slice.

### Scope

In scope:

- remove icons from the Canvas workbench tab list;
- keep tab labels horizontal, readable, and route-scoped;
- free the shell top bar from tenant, project, environment, and Git selectors;
- expose active project identity with a compact hexadecimal-style identifier;
- move tenant, project, and environment selection into a left-rail or workspace
  context menu;
- keep Canvas route behavior, draft authority, and protected runtime semantics
  unchanged.

Out of scope:

- multi-canvas persistence;
- backend project asset persistence;
- project export or import implementation;
- new authentication, tenant administration, or RBAC behavior;
- changing the protected draft API contract.

### Command And Query Rails

Stage 1 should reuse existing rails.

| Rail                            | Type    | Bounded context               | Status | Use in Stage 1                                               |
| ------------------------------- | ------- | ----------------------------- | ------ | ------------------------------------------------------------ |
| `ListCanvasWorkbenchTabs`       | query   | Canvas workbench presentation | reuse  | Return tab labels without forcing icon rendering.            |
| `SelectCanvasWorkbenchTab`      | command | Canvas workbench presentation | reuse  | Preserve current route-scoped tab navigation.                |
| `ResolveCanvasWorkbenchContext` | query   | Canvas workbench presentation | reuse  | Resolve visible Canvas title, slug, and draft posture.       |
| `SelectTenantScope`             | command | Web auth / workspace scope    | reuse  | Move tenant choice out of the top bar without changing auth. |
| `SelectProjectScope`            | command | Web auth / workspace scope    | reuse  | Move project choice out of the top bar.                      |
| `RefreshSessionGrants`          | query   | Web auth / workspace scope    | reuse  | Keep the selector limited to granted scopes.                 |

If implementation discovers that project identity display has no existing read
model, add a local Canvas or shell presentation read model before coding. Do
not encode project identity as route-local string assembly inside the view.

### Acceptance

- The Canvas workbench tab strip renders text-only tabs.
- Cypress proves tab labels remain horizontal and readable.
- Tenant, project, environment, and Git controls no longer consume the main top
  bar.
- The active workbench still communicates project identity and draft state.
- Scope selection remains reachable from the shell and still uses the existing
  session store and protected runtime posture.
- No save, export, import, or backend contract behavior changes in Stage 1.

## Stage 2: Explicit Save

Stage 2 introduces a visible `Save` command without changing the source of
truth.

Expected rail posture:

| Rail                      | Type    | Bounded context             | Status |
| ------------------------- | ------- | --------------------------- | ------ |
| `SaveWorkspaceGraphDraft` | command | Canvas authoring draft      | reuse  |
| `GetWorkspaceGraphDraft`  | query   | Canvas startup and recovery | reuse  |
| `PersistCanvasLayout`     | command | Canvas layout presentation  | reuse  |

The save button should reflect `Unsaved`, `Saving`, `Saved`, conflict, and
failed-save states. It must not create a second persistence authority beside
the protected workspace graph draft.

## Stage 3: Project Export And Import Proof

Stage 3 adds a round-trip proof for moving a project snapshot through a file.

Expected new or extended rails:

| Rail                    | Type    | Bounded context       | Status   |
| ----------------------- | ------- | --------------------- | -------- |
| `ExportProjectSnapshot` | query   | Project workspace I/O | proposed |
| `ImportProjectSnapshot` | command | Project workspace I/O | proposed |
| `ValidateProjectImport` | query   | Project workspace I/O | proposed |

The acceptance proof must cover:

- create or modify a Canvas graph;
- save the draft;
- export the project snapshot;
- load or import the snapshot into a clean workspace context;
- verify nodes, edges, layout, project metadata, and Canvas identity are
  restored coherently.

No file format should be treated as stable until this stage owns explicit
version, validation, error, and compatibility rules.

## Fowler Reading

- Stage 1 is primarily a Presentation Model cleanup: the shell should expose
  the right workbench state without making scope selectors the dominant
  visual object.
- Stage 2 is a command-boundary clarification: user-visible save must map to
  the existing draft command rail instead of inventing a local persistence
  shortcut.
- Stage 3 is an anti-corruption and value-object boundary: imported project
  snapshots need validation before becoming workspace authority.

## First Implementation Plan To Write Next

The next implementation plan should cover Stage 1 only.

It should include:

- local component guide deltas for Canvas workbench tabs and shell context;
- semantic architecture tests for text-only tabs and top-bar scope relocation;
- Cypress proof for Canvas tab readability and reachable scope selection;
- no backend, save, export, or import changes;
- governance regeneration and `pnpm verify:prepush`.

```feature-mechanization
version: 1
featureId: CANVAS-WORKBENCH-SHELL-SAVE-EXPORT-SEQUENCE
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-workbench-tabs-component.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
userStories:
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md
  - docs/planning/state/agent-lane-e.yaml
  - docs/planning/status/**
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - scripts/**
  - specs/**
commandQueryRails:
  - name: ListCanvasWorkbenchTabs
    type: query
    dddOwner: CanvasWorkbenchTabsReadModel
  - name: SelectCanvasWorkbenchTab
    type: command
    dddOwner: CanvasWorkbenchTabSelectionCommand
  - name: ResolveCanvasWorkbenchContext
    type: query
    dddOwner: CanvasWorkbenchContext
  - name: SaveWorkspaceGraphDraft
    type: command
    dddOwner: WorkspaceGraphAuthoringDraft
  - name: ExportProjectSnapshot
    type: query
    dddOwner: ProjectSnapshot
  - name: ImportProjectSnapshot
    type: command
    dddOwner: ProjectSnapshotImport
domainObjects:
  - name: CanvasWorkbenchChrome
    type: presentation model
    owner: Canvas workbench presentation
  - name: ProjectIdentityBadge
    type: read model
    owner: Web shell presentation
  - name: WorkspaceGraphAuthoringDraft
    type: aggregate
    owner: Canvas authoring draft
  - name: ProjectSnapshot
    type: value object
    owner: Project workspace I/O
fowlerSignals:
  - Presentation Model
  - Command Query Separation
  - Value Object
  - Anti-corruption Layer
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - Stage 1 future proof: Canvas tab readability and reachable scope selection
completionGate:
  - pnpm lint:md:changed
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: canvas-workbench-shell-save-export-sequence-registration
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: New Canvas workbench sequence plan is outside allowedImplementationSurfaces before this manifest declares it.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: CanvasWorkbenchShellSaveExportSequencePlan
    path: docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md
    dddOwner: Canvas workbench product planning
    cqRails:
      - ListCanvasWorkbenchTabs
      - SelectCanvasWorkbenchTab
      - ResolveCanvasWorkbenchContext
      - SaveWorkspaceGraphDraft
      - ExportProjectSnapshot
      - ImportProjectSnapshot
    fowlerSignals:
      - Presentation Model
      - Command Query Separation
      - Value Object
      - Anti-corruption Layer
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Stage 1 future proof
    unitTests:
      - pnpm docs:feature-mechanization:implementation
```
