/** Owned concern: provide canonical Canvas route test defaults and controller callback stubs. */
import { vi } from 'vitest';

import { DVT_AUTHORING_NODE_KINDS } from '../plugins/dvt/dvtNodeTypeCatalog';
import { dvtCanvasSurfaceStrategy } from '../plugins/dvt/dvtCanvasSurfaceStrategy';
import type { WorkspaceScope } from '../ports/sessionContext';
import { DEFAULT_CANVAS_GRID_COLOR, DEFAULT_CANVAS_PALETTE_ID } from './canvas/canvasPalette';
import { deriveCanvasDraftAccessPosture } from './canvas/canvasDraftAccessPostureModel';
import type { CanvasDraftAuthTransportPosture } from './canvas/canvasDraftAuthTransportPosture';
import type { CanvasDraftStatusState } from './canvas/canvasDraftStatusState';
import type { CanvasController } from './Canvas.test.controller';

type CanvasWorkbenchDefaultsDto = {
  workspaceLayoutKey: CanvasController['workspaceLayoutKey'];
  workspaceScope: WorkspaceScope;
  isBackendCheckPending: CanvasController['isBackendCheckPending'];
  backendReady: CanvasController['backendReady'];
  backendBlockMessage: CanvasController['backendBlockMessage'];
  isLoadingGraph: CanvasController['isLoadingGraph'];
  graphErrorMessage: CanvasController['graphErrorMessage'];
  focusMode: CanvasController['focusMode'];
  inspectorPanelVisible: CanvasController['inspectorPanelVisible'];
  canOpenSourceImport: CanvasController['canOpenSourceImport'];
  inspectorNode: CanvasController['inspectorNode'];
  inspectorPreferredTabId: CanvasController['inspectorPreferredTabId'];
  inspectorPreferredTabRequestId: CanvasController['inspectorPreferredTabRequestId'];
  inspectorGraphNodes: CanvasController['inspectorGraphNodes'];
  inspectorGraphEdges: CanvasController['inspectorGraphEdges'];
  canEditInspectorNode: CanvasController['canEditInspectorNode'];
  activeRunId: CanvasController['activeRunId'];
  registeredPlugins: CanvasController['registeredPlugins'];
  runtimeCapabilities: CanvasController['runtimeCapabilities'];
  availableCanvasKinds: CanvasController['availableCanvasKinds'];
  canvasDocument: CanvasController['canvasDocument'];
  canvasDocuments: CanvasController['canvasDocuments'];
  activeCanvasId: CanvasController['activeCanvasId'];
  executionEnvironmentOptions: CanvasController['executionEnvironmentOptions'];
  canCreateCanvasDocument: CanvasController['canCreateCanvasDocument'];
  authorizationPermissions: CanvasController['authorizationPermissions'];
  userPermissions: CanvasController['userPermissions'];
  canvasAuthoringMode: CanvasController['canvasAuthoringMode'];
  canvasSurfaceStrategy: CanvasController['canvasSurfaceStrategy'];
  nodesWithImpact: CanvasController['nodesWithImpact'];
  edges: CanvasController['edges'];
  nodeTypes: CanvasController['nodeTypes'];
  gridSize: CanvasController['gridSize'];
  canvasPalette: CanvasController['canvasPalette'];
  canvasGridVisible: CanvasController['canvasGridVisible'];
  canvasGridColor: CanvasController['canvasGridColor'];
  canvasSnapToGrid: CanvasController['canvasSnapToGrid'];
  viewport: CanvasController['viewport'];
  frozenNodeIds: CanvasController['frozenNodeIds'];
};

type CanvasDraftDefaultsDto = {
  draftSaveStatus: CanvasController['draftSaveStatus'];
  draftAuthTransportPosture: CanvasDraftAuthTransportPosture;
  draftAccessPosture: CanvasController['draftAccessPosture'];
  draftAccessMode: CanvasController['draftAccessMode'];
  draftCapabilityReason: CanvasController['draftCapabilityReason'];
  draftFormatError: CanvasController['draftFormatError'];
  draftFormatMeta: CanvasController['draftFormatMeta'];
  draftRecoveryReason: CanvasController['draftRecoveryReason'];
  draftStatusState: CanvasController['draftStatusState'];
  canExportProjectSnapshot: CanvasController['canExportProjectSnapshot'];
  canImportProjectSnapshot: CanvasController['canImportProjectSnapshot'];
  draftConflictRevision: CanvasController['draftConflictRevision'];
  hasStaleDraftVersion: CanvasController['hasStaleDraftVersion'];
  hasMissingRemoteDraft: CanvasController['hasMissingRemoteDraft'];
  hasDraftProjectionGap: CanvasController['hasDraftProjectionGap'];
};

type CanvasExecutionDefaultsDto = {
  canPlanGraph: CanvasController['canPlanGraph'];
  canStartRun: CanvasController['canStartRun'];
  planRunReadiness: CanvasController['planRunReadiness'];
  planStatusSummary: CanvasController['planStatusSummary'];
  latestPreviewOutcome: CanvasController['latestPreviewOutcome'];
  exclusiveOverlayMode: CanvasController['exclusiveOverlayMode'];
  canUseCostOverlay: CanvasController['canUseCostOverlay'];
  impactOverlayEnabled: CanvasController['impactOverlayEnabled'];
  columnLevelLineageEnabled: CanvasController['columnLevelLineageEnabled'];
  transformationValidation: CanvasController['transformationValidation'];
  planModalOpen: CanvasController['planModalOpen'];
  currentPlan: CanvasController['currentPlan'];
  executionSelectionRecovery: CanvasController['executionSelectionRecovery'];
  executionSelectionRecoveryCommands: CanvasController['executionSelectionRecoveryCommands'];
};

type CanvasControllerStateDefaults = CanvasWorkbenchDefaultsDto &
  CanvasDraftDefaultsDto &
  CanvasExecutionDefaultsDto;

export function buildDefaultCanvasDraftStatusState(): CanvasDraftStatusState {
  return {
    label: 'Draft synced',
    tone: 'neutral',
    showReloadAction: false,
  };
}

function buildDefaultCanvasUserPermissions(): CanvasControllerStateDefaults['userPermissions'] {
  return {
    canPlan: true,
    canRun: true,
    canEditEdges: true,
    canPersistGraphDraft: true,
    canManagePlugins: false,
    canManageRBAC: false,
  };
}

function buildDefaultTransformationValidation(): CanvasControllerStateDefaults['transformationValidation'] {
  return {
    valid: false,
    summaryCode: 'requires_three_nodes',
    draftSignature: 'draft',
    scopedNodeIds: [],
    scopedEdgeIds: [],
    nodeRolesById: {},
  };
}

function buildDefaultCanvasWorkbenchState(): CanvasWorkbenchDefaultsDto {
  return {
    workspaceLayoutKey: 'tenant-a::project-a::dev',
    workspaceScope: {
      tenantId: 'tenant-a',
      projectId: 'project-orders',
      environmentId: 'dev',
      targetAdapter: 'temporal',
    },
    isBackendCheckPending: false,
    backendReady: true,
    backendBlockMessage: null,
    isLoadingGraph: false,
    graphErrorMessage: null,
    focusMode: false,
    inspectorPanelVisible: true,
    canOpenSourceImport: true,
    inspectorNode: null,
    inspectorPreferredTabId: null,
    inspectorPreferredTabRequestId: 0,
    inspectorGraphNodes: [],
    inspectorGraphEdges: [],
    canEditInspectorNode: true,
    activeRunId: null,
    registeredPlugins: new Set(['dbt']),
    runtimeCapabilities: undefined,
    availableCanvasKinds: [
      {
        kind: 'transformation',
        pluginId: 'dvt',
        label: 'Transformation',
        description: 'Flow-based transformation canvas for the protected authoring draft.',
        createTitle: 'Transformation canvas',
        nodeKinds: DVT_AUTHORING_NODE_KINDS,
      },
    ],
    canvasDocument: {
      id: 'main-canvas',
      kind: 'transformation',
      title: 'Main canvas',
    },
    canvasDocuments: [
      {
        id: 'main-canvas',
        kind: 'transformation',
        title: 'Main canvas',
      },
    ],
    activeCanvasId: 'main-canvas',
    executionEnvironmentOptions: [{ value: 'dev', label: 'dev' }],
    canCreateCanvasDocument: false,
    authorizationPermissions: buildDefaultCanvasUserPermissions(),
    userPermissions: buildDefaultCanvasUserPermissions(),
    canvasAuthoringMode: 'transformation',
    canvasSurfaceStrategy: dvtCanvasSurfaceStrategy,
    nodesWithImpact: [],
    edges: [],
    nodeTypes: {},
    gridSize: 24,
    canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
    canvasGridVisible: true,
    canvasGridColor: DEFAULT_CANVAS_GRID_COLOR,
    canvasSnapToGrid: false,
    viewport: null,
    frozenNodeIds: new Set(),
  } satisfies CanvasWorkbenchDefaultsDto;
}

function buildDefaultCanvasDraftState(): CanvasDraftDefaultsDto {
  const draftAccessPosture = deriveCanvasDraftAccessPosture({
    draftAccessMode: 'writable',
    draftCapabilityReason: 'authorized',
    draftFormatError: null,
    authTransportPosture: 'none',
    recoveryReason: null,
    draftSaveStatus: 'idle',
  });

  return {
    draftSaveStatus: 'idle',
    draftAuthTransportPosture: 'none',
    draftAccessPosture,
    draftAccessMode: 'writable',
    draftCapabilityReason: 'authorized',
    draftFormatError: null,
    draftFormatMeta: null,
    draftRecoveryReason: null,
    draftStatusState: buildDefaultCanvasDraftStatusState(),
    canExportProjectSnapshot: true,
    canImportProjectSnapshot: true,
    draftConflictRevision: null,
    hasStaleDraftVersion: false,
    hasMissingRemoteDraft: false,
    hasDraftProjectionGap: false,
  } satisfies CanvasDraftDefaultsDto;
}

function buildDefaultCanvasExecutionState(): CanvasExecutionDefaultsDto {
  return {
    canPlanGraph: false,
    canStartRun: false,
    planRunReadiness: {
      blockers: ['plan_integrity'],
      rail: 'ObservePlanRunReadiness',
      status: 'blocked',
      summary: 'Preview required before running.',
    },
    planStatusSummary: 'Preview required before running.',
    latestPreviewOutcome: null,
    exclusiveOverlayMode: 'runtime',
    canUseCostOverlay: false,
    impactOverlayEnabled: false,
    columnLevelLineageEnabled: false,
    transformationValidation: buildDefaultTransformationValidation(),
    planModalOpen: false,
    currentPlan: null,
    executionSelectionRecovery: null,
    executionSelectionRecoveryCommands: null,
  } satisfies CanvasExecutionDefaultsDto;
}

export function buildDefaultCanvasControllerState(): CanvasControllerStateDefaults {
  return {
    ...buildDefaultCanvasWorkbenchState(),
    ...buildDefaultCanvasDraftState(),
    ...buildDefaultCanvasExecutionState(),
  };
}

export function buildDefaultCanvasControllerCallbacks(): Pick<
  CanvasController,
  | 'onNodesChange'
  | 'onEdgesChange'
  | 'onConnect'
  | 'onReconnect'
  | 'onSetEdgeExecutionGate'
  | 'handleViewportChange'
  | 'handleNodeDrag'
  | 'handleNodeDragStop'
  | 'handleDrop'
  | 'handleDragOver'
  | 'handleCreateAuthoringNode'
  | 'handleCreateCanvasDocument'
  | 'handleSelectCanvasDocument'
  | 'handleExportProjectSnapshot'
  | 'handleImportProjectSnapshotFile'
  | 'applyInspectorNodeDraft'
  | 'handleDuplicateNode'
  | 'handleToggleNodeSelection'
  | 'handleToggleFrozenNode'
  | 'handleRemoveNode'
  | 'handleSourceImportComplete'
  | 'handleImportedNodeFocusComplete'
  | 'handleImpactFocusNodeChange'
  | 'hideInspectorPanel'
  | 'showInspectorPanel'
  | 'handleAutoLayout'
  | 'handleToggleCostOverlay'
  | 'toggleImpactOverlay'
  | 'toggleColumnLevelLineage'
  | 'setGridSize'
  | 'setCanvasPalette'
  | 'setCanvasGridVisible'
  | 'setCanvasGridColor'
  | 'setCanvasSnapToGrid'
  | 'handlePreviewExecutionPlan'
  | 'handleStartRun'
  | 'reloadLatestDraft'
  | 'setPlanModalOpen'
> &
  Pick<CanvasController, 'importedNodeFocusIds'> {
  return {
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    onReconnect: vi.fn(),
    onSetEdgeExecutionGate: vi.fn(() => false),
    handleViewportChange: vi.fn(),
    handleNodeDrag: vi.fn(),
    handleNodeDragStop: vi.fn(),
    handleDrop: vi.fn(),
    handleDragOver: vi.fn(),
    handleCreateAuthoringNode: vi.fn(),
    handleCreateCanvasDocument: vi.fn(),
    handleSelectCanvasDocument: vi.fn(),
    handleExportProjectSnapshot: vi.fn(),
    handleImportProjectSnapshotFile: vi.fn(),
    applyInspectorNodeDraft: vi.fn(),
    handleDuplicateNode: vi.fn(),
    handleToggleNodeSelection: vi.fn(),
    handleToggleFrozenNode: vi.fn(),
    handleRemoveNode: vi.fn(),
    handleSourceImportComplete: vi.fn(),
    importedNodeFocusIds: [],
    handleImportedNodeFocusComplete: vi.fn(),
    handleImpactFocusNodeChange: vi.fn(),
    hideInspectorPanel: vi.fn(),
    showInspectorPanel: vi.fn(),
    handleAutoLayout: vi.fn(),
    handleToggleCostOverlay: vi.fn(),
    toggleImpactOverlay: vi.fn(),
    toggleColumnLevelLineage: vi.fn(),
    setGridSize: vi.fn(),
    setCanvasPalette: vi.fn(),
    setCanvasGridVisible: vi.fn(),
    setCanvasGridColor: vi.fn(),
    setCanvasSnapToGrid: vi.fn(),
    handlePreviewExecutionPlan: vi.fn(),
    handleStartRun: vi.fn(),
    reloadLatestDraft: vi.fn(),
    setPlanModalOpen: vi.fn(),
  };
}
