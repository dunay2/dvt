---
title: Workspace-First Frontend Architecture Specification
status: Draft
owner: Frontend / Architecture
last_reviewed: 2026-04-14
planning_type: proposal
---

# Workspace-First Frontend Architecture Specification (`apps/web`)

## 1. Executive Summary

The current Canvas-centric frontend is directionally useful for graph authoring
but structurally incorrect as the primary product container. It conflates
navigation, working context, and one surface type (graph). The correct
evolution is a Workspace-first operational workbench where Canvas becomes one
tab or surface among many.

Recommendation: adopt model D (hybrid): global shell session selectors
(`tenant`, `workspace-or-project`, `gitRef`) plus a workspace container and
workbench tabs (`Graph`, `SQL`, `JSON`, `Diff`, `Artifacts`, `Log`). Keep the
frontend as a pure client under hexagonal boundaries
(`View -> Hook -> Facade -> Port -> Adapter`) and composition-root mode
selection.

`Environment` is not part of the authoring shell. It is runtime evidence scope
attached to runs, artifacts, logs, and diagnostics.

## 2. Problem Statement

The current model is weak because Canvas currently acts as:

- route (`/canvas`)
- working context
- main surface container
- graph visualization

This creates limits:

- graph dominates even when user intent is SQL, artifacts, diff, or logs
- app-level state and canvas state bleed into each other
- the URL represents one surface instead of the active operational context
- shell-level navigation and workbench tabs are mixed conceptually
- plugin-contributed non-graph surfaces feel bolted on

The shell also mixes authoring context with operational or runtime scope. When
`Environment` appears in the top bar next to `Project` and `GitRef`, the UI
creates a false equivalence between source selection and deployed runtime
selection.

## 3. Domain model Clarification

### Canonical terms

- `Tenant`: security and governance boundary.
- `Project`: business or repo scope selected in shell context.
- `Environment`: runtime evidence scope describing where a run, artifact, or
  log was produced or observed.
- `GitRef`: selected source review used for read-model and authoring views.
- `Workspace`: operational container in UI that binds session context, content
  scope, open surfaces, and layout state.
- `Canvas`: graph surface or document inside a workspace, not the workspace
  itself.
- `WorkbenchTab`: top-level tab inside the workspace center area.
- `GraphTab`: tab rendering graph viewport for a canvas.
- `SQLTab`: tab for SQL editor or preview content.
- `JSONTab`: tab for JSON documents or structured payload inspection.
- `DiffTab`: tab for graph, code, or artifact comparisons.
- `ArtifactTab`: tab for run or build artifact views.
- `LogTab`: tab for runtime log or event streams.

### Explicit answers

- Project is not the same thing as workspace.
- Canvas is not the same thing as workspace.
- `dbt-analytics` should remain a session selector, not a top editor tab.
- Global session context: `tenant`, `workspace-or-project`, `gitRef`.
- Runtime scope: `environment` is attached to runs and evidence, not to the
  authoring shell.
- Local workspace state: open workbench tabs, active canvas, layout, tree
  expansion, selected workspace surface.
- Local tab state: cursor, selection, filters, viewport, editor scroll.

## 4. Recommended Information Architecture

### Structural hierarchy

- Shell App
- Session Context Bar: `tenant`, `workspace-or-project`, `gitRef`
- Workspace Container
- Workspace Header and Workspace Tab Strip
- Center Workbench Surface
- Left Panels: workspace tree and discovery
- Right Panel: inspector
- Bottom Panel: console, runs, logs, diagnostics
- Workbench Tabs: `Graph`, `SQL`, `JSON`, `Diff`, `Artifacts`, `Log`

### State ownership

- `sessionStore`: global authoring context
- `workspaceStore`: active workspace and workspace lifecycle
- `workbenchStore`: open workbench tabs and active tab identity
- `graphStore`: graph and canvas interaction state
- `runStore`: runs, logs, runtime environment filters, evidence scope
- `shellStore`: panel visibility and shell chrome
- `statusStore`: health and capability readiness

### Route model

- Root shell route owns selectors and shell chrome.
- Workspace route owns workspace identity and active top-level tab key.
- Runtime evidence routes own run, log, and artifact drill-down.
- Runtime environment is shown as evidence metadata or filter badge, not as a
  shell selector.

### Tab model

- Shell navigation tabs represent product sections, not editor documents.
- Workspace tabs represent documents or surfaces opened inside the workspace.
- Runtime environment must not appear as a standalone workbench tab.

## 5. Canonical Recommendation

Choose model D: session context plus workspace container plus canvas tabs plus
editor tabs.

Reject:

- model A (`project == workspace`): too rigid for multi-root or multi-surface
  future.
- model B (`workspace` above `project` only): may over-abstract and weaken
  context clarity.
- model C (`canvas` primary plus inner tabs): still graph-centric and preserves
  the core flaw.

Tradeoff:

model D adds more concepts, but cleanly separates authoring context,
workspace-owned surfaces, and runtime evidence without re-architecting later.

## 6. UX Grammar

### Layout grammar

- Top bar: `tenant`, `workspace-or-project`, `gitRef`, active workspace
  metadata, command entry, status.
- Left rail or panel: workspace tree plus `Add data` and discovery.
- Workspace tab strip: open canvases and non-graph workbench documents.
- Inner surface: active tab content.
- Right inspector: context-sensitive entity details.
- Bottom console: runs, logs, diagnostics, and evidence streams.

### Runtime rules

- When reviewing runs, artifacts, or logs, the UI shows runtime environment as
  evidence metadata or a filter badge.
- Environment must not appear as a standalone workbench tab or shell selector
  in the authoring workspace.

### Behavioral rules

- Switch tenant: invalidate all workspace state and close or restore tabs keyed
  by tenant boundary.
- Switch project or workspace: open or restore the default workspace and clear
  incompatible tabs.
- Switch git ref: keep workspace container and refresh read-model tabs and
  graph snapshots against that ref.
- Open another workspace: switch active workspace and restore its prior tab
  set.
- Open another canvas in the same workspace: create or activate `GraphTab`
  bound to `canvasId`.
- Open SQL from a node: open `SQLTab` with `originNodeId`.
- Open artifacts from a run: open `ArtifactTab` keyed by run and artifact, and
  show runtime environment in evidence metadata.
- Close a tab: remove it from workbench registry and preserve dirty warning
  policy.
- Restore a previous session: hydrate session context first, then workspace,
  then tab state and layout.

## 7. Store Architecture

| Store            | Authority                       | Owns                                                                                                                      | Commands                                                                         | Must not own                                       |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------- |
| `sessionStore`   | global authoring context        | `tenant`, `project-or-workspace`, `gitRef`, auth-scoped prefs                                                             | `setTenant`, `setProject`, `setGitRef`, `hydrateSession`                         | graph nodes, open editor tabs, runtime environment |
| `shellStore`     | shell chrome                    | panel visibility, focus mode, command palette UI                                                                          | `toggleExplorer`, `toggleInspector`, `toggleConsole`, `togglePalette`            | workspace documents and runtime evidence           |
| `workspaceStore` | workspace lifecycle             | workspace descriptors, `activeWorkspaceId`, manifests, restore metadata                                                   | `openWorkspace`, `closeWorkspace`, `switchWorkspace`, `restoreWorkspace`         | tab-local editor state                             |
| `workbenchStore` | workspace tab session           | open tabs, active tab, tab order, tab metadata                                                                            | `openTab`, `closeTab`, `activateTab`, `moveTab`, `pinTab`                        | canonical graph model                              |
| `graphStore`     | graph surface                   | canvas graph snapshots, viewport, node selection, positions                                                               | `setViewport`, `setNodePositions`, `selectNode`, `applyLayout`                   | shell selectors and runtime evidence               |
| `runStore`       | runtime evidence                | runs, log streams, runtime environment filters, environment badges, evidence scope derived from run and artifact metadata | `openRunLogTab`, `appendLogChunk`, `setRunFilter`, `setRuntimeEnvironmentFilter` | shell chrome and authoring session identity        |
| `statusStore`    | health and capability readiness | backend health, capabilities status, diagnostics readiness                                                                | `refreshHealth`, `refreshCapabilities`                                           | workbench tab registry                             |

This reduces drift from `appStore` because each store maps to one bounded
responsibility. Route state belongs in the router plus minimal synchronization
keys (`workspaceId`, `tabId`); canvas viewport and editor cursor remain
store-local.

## 8. Routing model

### Authoring routes

- `/t/:tenantId/p/:projectId/r/:gitRef/workspace/:workspaceId`
- `/t/:tenantId/p/:projectId/r/:gitRef/workspace/:workspaceId/tab/:tabId`
- `/t/:tenantId/p/:projectId/r/:gitRef/workspace/:workspaceId/canvas/:canvasId`

### Runtime evidence routes

- `/t/:tenantId/p/:projectId/r/:gitRef/runs`
- `/t/:tenantId/p/:projectId/r/:gitRef/runs/:runId`

### Compatibility

- Optional alias redirect: `/canvas` resolves to the default workspace graph
  tab during the backward-compatibility phase.

### URL-worthy vs ephemeral

URL-worthy:

- session context keys
- workspace identity
- active tab or canvas identifier
- stable run or artifact identifier for share links

Ephemeral:

- panel sizes
- scroll position
- transient selections
- temporary filter chips unless they are explicitly shareable
- runtime environment filter for authoring routes

## 9. TypeScript model

```ts
export type TenantId = string & { readonly __brand: 'TenantId' };
export type ProjectId = string & { readonly __brand: 'ProjectId' };
export type GitRef = string & { readonly __brand: 'GitRef' };
export type WorkspaceId = string & { readonly __brand: 'WorkspaceId' };
export type CanvasId = string & { readonly __brand: 'CanvasId' };
export type WorkbenchTabId = string & { readonly __brand: 'WorkbenchTabId' };
export type RuntimeEnvironmentId = string & {
  readonly __brand: 'RuntimeEnvironmentId';
};

export interface SessionContext {
  tenantId: TenantId;
  projectId: ProjectId;
  gitRef: GitRef;
}

export interface WorkspaceDescriptor {
  id: WorkspaceId;
  name: string;
  rootPath: string;
  projectId: ProjectId;
  sessionContext: SessionContext;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export type WorkspaceTreeNode =
  | {
      kind: 'folder';
      id: string;
      name: string;
      path: string;
      children: WorkspaceTreeNode[];
    }
  | {
      kind: 'file';
      id: string;
      name: string;
      path: string;
      fileType: 'sql' | 'json' | 'yaml' | 'md' | 'other';
    }
  | {
      kind: 'canvas';
      id: CanvasId;
      name: string;
      path: string;
    };

export interface WorkspaceManifest {
  workspaceId: WorkspaceId;
  version: number;
  canvases: Array<{ id: CanvasId; name: string; path: string }>;
  defaultCanvasId: CanvasId | null;
  tree: WorkspaceTreeNode[];
}

export interface WorkspaceLayout {
  explorerVisible: boolean;
  inspectorVisible: boolean;
  consoleVisible: boolean;
  explorerWidthPx: number;
  inspectorWidthPx: number;
  consoleHeightPx: number;
}

export interface CanvasSnapshot {
  canvasId: CanvasId;
  nodePositions: Record<string, { x: number; y: number }>;
  viewport: { x: number; y: number; zoom: number };
  selectedNodeIds: string[];
  updatedAtUtc: string;
}

export type OpenWorkbenchTab =
  | {
      kind: 'graph';
      tabId: WorkbenchTabId;
      workspaceId: WorkspaceId;
      canvasId: CanvasId;
      title: string;
      dirty: boolean;
    }
  | {
      kind: 'sql';
      tabId: WorkbenchTabId;
      workspaceId: WorkspaceId;
      title: string;
      sourcePath: string;
      originNodeId: string | null;
      dirty: boolean;
    }
  | {
      kind: 'json';
      tabId: WorkbenchTabId;
      workspaceId: WorkspaceId;
      title: string;
      sourcePath: string;
      dirty: boolean;
    }
  | {
      kind: 'artifact';
      tabId: WorkbenchTabId;
      workspaceId: WorkspaceId;
      title: string;
      runId: string;
      artifactKey: string;
      runtimeEnvironmentId: RuntimeEnvironmentId | null;
      dirty: false;
    }
  | {
      kind: 'diff';
      tabId: WorkbenchTabId;
      workspaceId: WorkspaceId;
      title: string;
      leftRef: string;
      rightRef: string;
      dirty: false;
    }
  | {
      kind: 'log';
      tabId: WorkbenchTabId;
      workspaceId: WorkspaceId;
      title: string;
      runId: string | null;
      stream: 'runtime' | 'planner' | 'adapter';
      runtimeEnvironmentId: RuntimeEnvironmentId | null;
      dirty: false;
    };

export interface WorkspaceSnapshot {
  workspace: WorkspaceDescriptor;
  layout: WorkspaceLayout;
  openTabs: OpenWorkbenchTab[];
  activeTabId: WorkbenchTabId | null;
  canvases: CanvasSnapshot[];
  restoredAtUtc: string;
}
```

## 10. Ports and Adapters Impact

Required frontend ports:

- `SessionContextPort`: resolve and persist authoring selectors only
- `WorkspaceCatalogPort`: list, open, and close available workspaces
- `WorkspacePort`: get workspace manifest, tree, and layout snapshot
- `CanvasPersistencePort`: load and save canvas snapshots and positions
- `ArtifactsPort`: retrieve artifacts by run, workspace, ref, and runtime
  metadata
- `RunsPort`: list, start, status, and log streams plus runtime environment
  metadata or filter input
- `PlansPort`: plan preview and validation request surface
- `ShellFeedbackPort`: toast, banner, and command feedback abstraction

Recommendation: keep `WorkspaceCatalogPort` separate from `WorkspacePort`;
merging both makes the interface too broad.

### Hexagonal flow

- View calls Hook.
- Hook calls Facade.
- Facade orchestrates port contracts plus query keys.
- Adapter implements the port for `api` or `mock`.
- Composition root selects adapter mode once.

### TanStack query integration

- query keys include session and workspace dimensions.
- Runtime environment may participate in runs or artifact query keys, but not
  in authoring shell identity.
- No raw fetch in views or hooks.

## 11. Persistence and Source of Truth

- Session selectors: server or user profile plus local fallback for `tenant`,
  `project`, `gitRef`
- Workspace definitions: server or repo index plus local recents cache
- Canvases: server or repo-backed metadata plus local unsaved edits
- Local UI layout and open tabs: browser persistence scoped by session and
  workspace
- Graph positions: persisted through `CanvasPersistencePort`
- Generated tabs (`SQL`, `JSON`, `Artifacts`, `Log`): derived from server or
  repo truth plus local tab wrapper state
- Restored session state: validated against current session context and
  workspace availability

Truth layers:

- server truth: health, capabilities, runs, artifacts, persisted workspace and
  canvas metadata
- repo or folder truth: files and tree at selected `gitRef`
- local browser convenience state: layout, open tabs, recent workspaces
- ephemeral runtime state: in-flight selection, hover, panel focus

Runtime environment belongs to run, artifact, and log metadata, not to
workspace authoring identity.

## 12. Git / Folder / DBT Alignment

Workspace maps to a repo logical root or folder boundary under the selected
`gitRef`.

- `GitRef` determines source selection and authoring read models.
- Auto-create workspace from folder can exist as policy, but it is not a hard
  requirement.
- Workspace may aggregate multiple folders later; phase 1 should keep a
  single-root model.
- Runtime environment is orthogonal to source selection and is resolved through
  run and evidence metadata.
- Keep dbt as plugin or contribution, not product identity.

## 13. Canvas Semantics

Final definition: Canvas is a visual sheet or graph document inside a
workspace. It is not route authority.

Recommendation: keep the term `Canvas` for continuity, but demote it from
top-level product center. The product center is the workspace workbench.

## 14. Plugin and Extension Readiness

- Plugins can contribute workbench tab kinds through manifest and capability
  declarations.
- Plugins can contribute workspace surfaces through explicit ports.
- Plugin commands are surfaced in the command palette with namespace and
  capability checks.
- Plugins never receive execution authority; they issue requests through
  approved ports only.
- Runtime environment, when shown by a plugin, must appear as evidence
  metadata, badge, or filter, not as shell selector chrome.

## 15. Migration Plan

### Phase 0: terminology and contract freeze

- Freeze vocabulary (`workspace`, `canvas`, `tab`, `session`).
- Freeze the rule that environment is not part of authoring shell context.
- Publish architecture contract and route semantics.

### Phase 1: store split groundwork

- Introduce `workspaceStore`, `workbenchStore`, `statusStore`.
- Remove environment from `sessionStore` and shell selectors.
- move responsibilities out of `appStore` incrementally.

### Phase 2: workspace entity introduction

- Add `WorkspaceDescriptor`, manifest loading, and workspace switch API.
- Keep existing canvas route as compatibility wrapper.

### Phase 3: canvas demotion or redefinition

- Treat canvas as `GraphTab`.
- Remove assumptions that route equals canvas equals context.

### Phase 4: workbench tab integration

- Introduce tab registry and tab state.
- Open `SQL`, `JSON`, `Artifact`, `Diff`, and `Log` as first-class tabs.

### Phase 5: API alignment and real data flow

- Implement `WorkspaceCatalogPort`, `WorkspacePort`, `CanvasPersistencePort`.
- Carry runtime environment only through `RunsPort` and `ArtifactsPort`
  metadata.
- Ensure mock and API parity through the composition root only.

### Phase 6: cleanup and legacy removal

- Deprecate legacy `/canvas` direct authority.
- Remove redundant `appStore` fields and duplicated tab models.

## 16. Acceptance Criteria

### Architecture

- No view or controller directly instantiates services.
- All flows follow `View -> Hook -> Facade -> Port -> Adapter`.
- mode selection happens only in the composition root.
- Environment is not part of `SessionContext` or workspace authoring routes.

### UX

- Workspace container is visible as first-class context.
- Top bar shows `tenant`, `workspace-or-project`, and `gitRef` only.
- Canvas appears as one workbench tab, not the sole center.
- Runtime environment appears only in runs, logs, artifacts, and diagnostics
  contexts.

### Store ownership

- No cross-domain state ownership leaks.
- Route, workspace, tab, graph, and runtime evidence concerns are separated by
  store boundary.

### Routing

- URL can deep-link workspace and active tab or canvas.
- No `/e/:envId` segment exists in workspace authoring routes.
- Non-shareable UI state stays out of URL.

### Tabs

- Open, close, and restore behavior is deterministic.
- Generated tabs (`SQL`, `JSON`, `Artifact`, `Log`, `Diff`) reopen reliably per
  workspace.

### mock/API parity

- Same facades and view logic run in both modes.
- No direct fetch exists in components.

### Testability

- Ports are mockable at facade level.
- Store slices test independently.
- Route restoration covers workspace and tab state.

### Documentation

- Canonical diagrams and type contracts are published.
- Migration checklist is mapped to phased rollout.

## 17. Risks and Tradeoffs

- naming ambiguity risk: mitigate with canonical glossary and strict naming
- double-tab-system risk: mitigate by explicit `ShellNavItem` vs
  `WorkbenchTab` types
- route explosion risk: mitigate by stable minimal route schema
- local state restoration complexity: mitigate with versioned snapshot schema
- plugin overreach risk: mitigate with host-owned adapters and explicit docks
- dbt-first lock-in risk: mitigate with workspace model independent from dbt
  identity
- runtime evidence confusion risk: mitigate by keeping environment out of the
  authoring shell and showing it only where evidence is reviewed
- Monaco and editor over-expansion risk: mitigate with tab-kind budget and
  explicit non-goals

## 18. Final Recommendation

Adopt Workspace-first model D.

Naming recommendation:

- keep only authoring selectors as session context: `tenant`,
  `workspace-or-project`, `gitRef`
- promote `Workspace` as the primary operational container
- demote `Canvas` to `GraphTab` concept while keeping the label temporarily for
  continuity
- demote `Environment` to runtime evidence scope shown only where operational
  review requires it

Implement first:

- store split plus workspace and workbench contracts
- workspace routing and tab registry
- canvas as one tab, with `SQL`, `JSON`, `Artifact`, `Diff`, and `Log` tab
  parity

Do not implement yet:

- multi-root workspaces
- full plugin-authored executable workflows
- URL encoding of transient layout minutiae
- frontend-side execution authority logic
