---
title: Canvas Workbench Shell Save Export Sequence Plan
status: Proposed
owner: Product / Frontend / Architecture
last_reviewed: 2026-05-05
planning_type: mandatory-proposal
lane: E
task_id: F-28
---

# Canvas Workbench Shell Save Export Sequence Plan

## Summary

This proposal records the next Canvas workbench product slice so it does not
disappear behind smaller tab, layout, and startup fixes.

The next work should proceed in three stages:

1. simplify the Canvas workbench chrome and project context placement;
2. make automatic draft-save posture explicit and prove it through the existing
   draft authority;
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
- `docs/architecture/components/api/protected-runtime-command-query-rail-design.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/web-auth-project-onboarding-and-actionable-gaps-20260501.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-fowler-remediation-plan-20260504.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/assets/canvas-workbench-stage-1-mockup-20260505.png`

## Product Direction

The Canvas screen should feel closer to a dense cloud workbench than to a
prototype dashboard.

The header should prioritize the active project and Canvas identity:

- human title, for example `Sessionize Events`;
- technical slug, for example `sessionize_events_pipeline`;
- compact project identifier, for example `prj-7f3a9c2`;
- draft status, for example `Draft`, `Unsaved`, `Saving`, or `Saved`.

Tenant, project, and environment selection plus Git reference display should
not dominate the main top bar. They are workspace context, not the primary
workbench action. Move scope selection into an on-demand workspace context menu
or a similarly bounded shell surface. Stage 1 does not accept a fixed left
navigation rail inside the Canvas workbench.

## Partially Accepted UX Direction

The draft UX proposal and Stage 1 mockup were reviewed on 2026-05-05 and
accepted only as bounded input for `F-28` Stage 1. The accepted visual direction
is the dark, dense, professional workbench style shown in
[Canvas Workbench Stage 1 Mockup](./assets/canvas-workbench-stage-1-mockup-20260505.png).

Accepted Stage 1 direction:

- no fixed left navigation rail in the Canvas workbench;
- no generic SaaS sidebar or double-left-navigation pattern;
- top menu owns global and workbench commands;
- Canvas workbench tabs remain horizontal, text-first, and route-scoped;
- workspace, project, environment, and Git context render as compact labels,
  not as dominant selectors;
- Insert and Add behavior is command-driven and on demand;
- Run remains the only permanent primary action in the workbench shell;
- the graph canvas remains the dominant surface, with a right Inspector and
  bottom runtime panel allowed when they are useful.

Not accepted for Stage 1:

- save, export, import, or project-snapshot behavior changes;
- multi-canvas persistence;
- backend project asset persistence;
- fixed left navigation rail inside Canvas;
- a full VS Code clone or a Monaco-centered Canvas shell;
- route-local string assembly for project identity when a presentation read
  model is needed.

## UX Invariants For Stage 1 And Downstream Alignment

The workbench must preserve these invariants:

1. The graph canvas remains the dominant authoring surface.
2. No permanent double-left-navigation is allowed.
3. Add and create behavior is command-driven, not permanently docked by
   default.
4. Context labels are read-only reference indicators by default in the
   workbench shell. They may open details or dedicated context/admin surfaces,
   but they must not behave as dropdown scope-switchers inside the active
   workbench.
5. Workbench views are projections of the same workbench state, not global
   navigation.
6. Runtime evidence is separated from graph authoring.
7. The UI never executes directly; it submits user intent through application
   commands.
8. Node types visible in Insert or Add must be resolved from the active
   workbench capability registry.
9. Admin screens are shell-level destinations, never embedded in the canvas.
10. Any persistent panel must justify its space by active context: selected
    node, active run, active search, or explicit user pin.

### Progressive Disclosure Rules

- Empty canvas: show an Insert hint.
- Normal authoring: show canvas and view strip; show Inspector only if a
  selection exists or the user explicitly pinned it.
- Large graph: allow minimap and outline, but keep them optional.
- Active run: expand or surface the runtime panel.
- Failed run: force a visible error affordance.
- No active run: runtime panel is collapsed by default.
- Node secondary actions are hidden until hover, focus, or selection.

### Responsive Behavior

For widths below the desktop threshold:

- context labels collapse into a compact breadcrumb;
- view strip keeps Graph, SQL, Lineage, and More visible;
- Inspector becomes a right drawer;
- runtime panel becomes a bottom drawer;
- Add palette opens as a command palette or modal-less overlay;
- Run remains the only persistent primary action.

### View Strip Label Rule

The draft UX proposal and mockup use `SQL` as a user-facing view-strip label.
The existing Canvas workbench tab contract still owns route IDs and tab IDs such
as `code`. Stage 1 may relabel a capability-provided view only through
`ListCanvasWorkbenchTabs` and the active workbench capability registry. It must
not add a parallel `/canvas/sql` route, route-local string map, or hard-coded
view list to make the mockup label appear.

### Command Palette

The shell should support a command palette as the universal command discovery
surface.

Recommended shortcut:

- `Cmd/Ctrl + K`: open command palette.

Initial command groups:

- Insert node;
- open view;
- run command;
- export command;
- toggle panel;
- admin destination.

The command palette must call the same command and query rails as menus and
buttons. It must not introduce a parallel action path.

The command groups above describe the eventual command taxonomy. Stage 1 may
surface only commands backed by Stage 1 rails or already-existing accepted
behavior; enabled Save, Export, Import, project snapshot, or backend persistence
commands remain out of scope until Stage 2 or Stage 3 owns them.

### Add Palette Pinning

The Add palette may be pinned only as a user presentation preference.

Rules:

- default state: unpinned and closed;
- opened by Insert, shortcut, empty-canvas hint, or command palette;
- auto-closes after insert unless pinned;
- pinned state is stored as UI preference, not domain state;
- pinned palette must not create a second permanent navigation rail.

### Accessibility And Keyboard Navigation

- All top menu commands must be keyboard reachable.
- Add palette must support keyboard search, arrow navigation, and Enter to
  insert.
- Canvas toolbar active mode must be announced visually and through ARIA state.
- Runtime error state must not rely on color alone.
- Node status must have text or tooltip alternatives.
- Focus order: shell, view strip, canvas controls, canvas, Inspector, runtime.

### UX Acceptance Tests

- Insert hint appears on an empty canvas.
- Insert menu shows its shortcut.
- Add palette only shows node types valid for the active workbench.
- Canvas toolbar shows one active tool mode.
- Runtime panel is collapsed when no run context exists.
- Runtime panel expands or surfaces an alert on failed run.
- Minimap can be toggled from View > Minimap.
- Node kebab menu is hidden until hover, focus, or selection.
- Edges meet minimum contrast in dark mode.
- Context labels do not render as dropdown controls.

### Implementation Boundary Rule

The Add palette, View strip, Runtime panel, Inspector, and Admin navigation must
all be driven by explicit shell/workbench state and capability contracts. They
must not be implemented as unrelated hard-coded UI fragments.

## Stage 1: Workbench Chrome Simplification

Stage 1 is the first executable slice.

### Scope

In scope:

- remove icons from the Canvas workbench tab list;
- keep tab labels horizontal, readable, and route-scoped;
- free the shell top bar from tenant, project, and environment selectors plus
  dominant Git reference controls;
- expose active project identity with a compact hexadecimal-style identifier;
- move tenant, project, and environment selection into an on-demand workspace
  context menu or another bounded non-fixed shell surface;
- remove any fixed left navigation rail from the Canvas workbench surface;
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
| `setTenantId`                   | command | Web auth / workspace scope    | reuse  | Move tenant choice out of the top bar without changing auth. |
| `setProjectId`                  | command | Web auth / workspace scope    | reuse  | Move project choice out of the top bar.                      |
| `setEnvironmentId`              | command | Web auth / workspace scope    | reuse  | Move environment choice out of the top bar.                  |
| `RefreshSessionGrants`          | query   | Web auth / workspace scope    | reuse  | Keep the selector limited to granted scopes.                 |

Environment and Git posture:

- Environment selection reuses the existing workspace session command
  `setEnvironmentId`. Stage 1 must not invent a parallel environment rail.
- Git remains a read-only reference indicator in Stage 1. No Git selection,
  branch switching, staging, commit, or source-control workflow is accepted by
  this slice unless a separate source-control rail is added first.

If implementation discovers that project identity display has no existing read
model, add a local Canvas or shell presentation read model before coding. Do
not encode project identity as route-local string assembly inside the view.

### Acceptance

- The Canvas workbench tab strip renders text-only tabs.
- Cypress proves tab labels remain horizontal and readable.
- Tenant, project, and environment selectors plus Git reference controls no
  longer consume the main top bar.
- The Canvas workbench has no fixed left navigation rail.
- The active workbench still communicates project identity and draft state.
- Scope selection remains reachable from the shell and still uses the existing
  session store and protected runtime posture.
- No save, export, import, or backend contract behavior changes in Stage 1.

## Stage 2: Automatic Save Posture Proof

Stage 2 does not introduce a manual Save button or a second user-triggered save
command. Canvas draft persistence remains automatic. The stage makes the
automatic save posture explicit enough for operators and Cypress to distinguish
unchanged, saving, saved, failed-save, and conflict states without changing the
source of truth.

Expected rail posture:

| Rail                      | Type    | Bounded context             | Status |
| ------------------------- | ------- | --------------------------- | ------ |
| `SaveWorkspaceGraphDraft` | command | Canvas authoring draft      | reuse  |
| `GetWorkspaceGraphDraft`  | query   | Canvas startup and recovery | reuse  |
| `PersistCanvasLayout`     | command | Canvas layout presentation  | reuse  |

The toolbar status and browser proof should show that graph edits automatically
call `SaveWorkspaceGraphDraft`, transition through saving and saved states, keep
failed saves visible as failed instead of presenting them as synced, and block
manual-save affordances from appearing. It must not create a second persistence
authority beside the protected workspace graph draft.

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
- let the automatic draft save settle;
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
- Stage 2 is a command-boundary clarification: automatic save visibility must
  map to the existing draft command rail instead of inventing a manual Save
  command or a local persistence shortcut.
- Stage 3 is an anti-corruption and value-object boundary: imported project
  snapshots need validation before becoming workspace authority.

## Stage 1 Implementation Plan

The Stage 1 implementation plan is:

- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-1-chrome-simplification-implementation-plan-20260506.md`

That implementation plan covers Stage 1 only.

It should include:

- local component guide deltas for Canvas workbench tabs and shell context;
- semantic architecture tests for text-only tabs, top-bar scope relocation, and
  fixed-left-rail exclusion;
- architecture and Cypress proof for the UX invariants, progressive disclosure,
  command palette, Add palette pinning, responsive behavior, accessibility, and
  implementation boundary rules that Stage 1 touches;
- frontend folder-structure guardrails so shell chrome, workbench primitives,
  Canvas route code, stores, and UI primitives land in their owning folders;
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
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
  - docs/architecture/components/web/appshell/app-shell.md
  - docs/architecture/components/web/iconography-and-design-tokens-contract.md
  - docs/architecture/components/web/main-workspace-views-and-ux.md
  - docs/architecture/components/web/screen-layout-and-cross-surface-behavior-rules.md
  - docs/architecture/components/web/ux-implementation-guide.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
userStories:
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md
  - docs/architecture/components/web/graph/canvas-workbench-tabs-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - docs/architecture/components/web/appshell/app-shell.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
  - docs/architecture/components/web/graph/canvas-workbench-tabs-component.md
  - docs/architecture/components/web/graph/canvas-workbench-tabs-user-stories.md
  - docs/architecture/components/web/iconography-and-design-tokens-contract.md
  - docs/architecture/components/web/main-workspace-views-and-ux.md
  - docs/architecture/components/web/screen-layout-and-cross-surface-behavior-rules.md
  - docs/architecture/components/web/ux-implementation-guide.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-fowler-remediation-plan-20260504.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-tabs-placement-design-plan-20260503.md
  - docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md
  - docs/planning/proposals/nice-to-have/frontend-and-ux/dvt-ui-workbench-architecture-proposal-20260404.md
  - docs/planning/proposals/mandatory/frontend-and-ux/assets/canvas-workbench-stage-1-mockup-20260505.png
  - docs/planning/closeouts/20260514-f28-canvas-workbench-sequence-closeout.md
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
