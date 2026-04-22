import { vi } from 'vitest';

import { DEFAULT_CANVAS_PALETTE_ID } from './canvas/canvasPalette';
import type { CanvasDraftToolbarState } from './canvas/canvasDraftToolbarState';
import type { CanvasController } from './Canvas.test.controller';

type CanvasControllerStateDefaults = Pick<
  CanvasController,
  | 'dataSourceMode'
  | 'isBackendCheckPending'
  | 'backendReady'
  | 'backendBlockMessage'
  | 'isLoadingGraph'
  | 'graphErrorMessage'
  | 'focusMode'
  | 'explorerPanelVisible'
  | 'inspectorPanelVisible'
  | 'canOpenSourceImport'
  | 'explorerNodes'
  | 'inspectorNode'
  | 'activeRunId'
  | 'registeredPlugins'
  | 'userPermissions'
  | 'canvasAuthoringMode'
  | 'nodesWithImpact'
  | 'edges'
  | 'nodeTypes'
  | 'gridSize'
  | 'canvasPalette'
  | 'viewport'
  | 'draftSaveStatus'
  | 'draftAccessMode'
  | 'draftCapabilityReason'
  | 'draftFormatError'
  | 'draftFormatMeta'
  | 'draftRecoveryReason'
  | 'draftToolbarState'
  | 'draftConflictRevision'
  | 'hasStaleDraftVersion'
  | 'hasMissingRemoteDraft'
  | 'hasDraftProjectionGap'
  | 'canStartRun'
  | 'planStatusSummary'
  | 'exclusiveOverlayMode'
  | 'canUseCostOverlay'
  | 'impactOverlayEnabled'
  | 'columnLevelLineageEnabled'
  | 'transformationValidation'
  | 'planModalOpen'
  | 'currentPlan'
  | 'confirmEdgeModal'
>;

export function buildDefaultCanvasToolbarState(): CanvasDraftToolbarState {
  return {
    label: 'Draft synced',
    tone: 'neutral',
    showReloadAction: false,
  };
}

function buildDefaultCanvasExplorerNodes(): CanvasControllerStateDefaults['explorerNodes'] {
  return [
    {
      id: 'node.orders',
      name: 'orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
    },
  ];
}

function buildDefaultCanvasUserPermissions(): CanvasControllerStateDefaults['userPermissions'] {
  return {
    canPlan: true,
    canRun: true,
    canEditEdges: true,
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

function buildDefaultCanvasWorkbenchState(): Pick<
  CanvasControllerStateDefaults,
  | 'dataSourceMode'
  | 'isBackendCheckPending'
  | 'backendReady'
  | 'backendBlockMessage'
  | 'isLoadingGraph'
  | 'graphErrorMessage'
  | 'focusMode'
  | 'explorerPanelVisible'
  | 'inspectorPanelVisible'
  | 'canOpenSourceImport'
  | 'explorerNodes'
  | 'inspectorNode'
  | 'activeRunId'
  | 'registeredPlugins'
  | 'userPermissions'
  | 'canvasAuthoringMode'
  | 'nodesWithImpact'
  | 'edges'
  | 'nodeTypes'
  | 'gridSize'
  | 'canvasPalette'
  | 'viewport'
> {
  return {
    dataSourceMode: 'api',
    isBackendCheckPending: false,
    backendReady: true,
    backendBlockMessage: null,
    isLoadingGraph: false,
    graphErrorMessage: null,
    focusMode: false,
    explorerPanelVisible: true,
    inspectorPanelVisible: true,
    canOpenSourceImport: true,
    explorerNodes: buildDefaultCanvasExplorerNodes(),
    inspectorNode: null,
    activeRunId: null,
    registeredPlugins: new Set(['dbt']),
    userPermissions: buildDefaultCanvasUserPermissions(),
    canvasAuthoringMode: 'transformation',
    nodesWithImpact: [],
    edges: [],
    nodeTypes: {},
    gridSize: 24,
    canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
    viewport: null,
  };
}

function buildDefaultCanvasDraftState(): Pick<
  CanvasControllerStateDefaults,
  | 'draftSaveStatus'
  | 'draftAccessMode'
  | 'draftCapabilityReason'
  | 'draftFormatError'
  | 'draftFormatMeta'
  | 'draftRecoveryReason'
  | 'draftToolbarState'
  | 'draftConflictRevision'
  | 'hasStaleDraftVersion'
  | 'hasMissingRemoteDraft'
  | 'hasDraftProjectionGap'
> {
  return {
    draftSaveStatus: 'idle',
    draftAccessMode: 'unknown',
    draftCapabilityReason: null,
    draftFormatError: null,
    draftFormatMeta: null,
    draftRecoveryReason: null,
    draftToolbarState: buildDefaultCanvasToolbarState(),
    draftConflictRevision: null,
    hasStaleDraftVersion: false,
    hasMissingRemoteDraft: false,
    hasDraftProjectionGap: false,
  };
}

function buildDefaultCanvasExecutionState(): Pick<
  CanvasControllerStateDefaults,
  | 'canStartRun'
  | 'planStatusSummary'
  | 'exclusiveOverlayMode'
  | 'canUseCostOverlay'
  | 'impactOverlayEnabled'
  | 'columnLevelLineageEnabled'
  | 'transformationValidation'
  | 'planModalOpen'
  | 'currentPlan'
  | 'confirmEdgeModal'
> {
  return {
    canStartRun: false,
    planStatusSummary: 'Preview required before running.',
    exclusiveOverlayMode: 'runtime',
    canUseCostOverlay: false,
    impactOverlayEnabled: false,
    columnLevelLineageEnabled: false,
    transformationValidation: buildDefaultTransformationValidation(),
    planModalOpen: false,
    currentPlan: null,
    confirmEdgeModal: { open: false, edge: null },
  };
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
  | 'handleNodeClick'
  | 'onSelectionChange'
  | 'handleViewportChange'
  | 'handleNodeDragStop'
  | 'handleDrop'
  | 'handleDragOver'
  | 'handleSourceImportComplete'
  | 'handleImportedNodeFocusComplete'
  | 'hideExplorerPanel'
  | 'showExplorerPanel'
  | 'hideInspectorPanel'
  | 'showInspectorPanel'
  | 'handleAutoLayout'
  | 'handleToggleCostOverlay'
  | 'toggleImpactOverlay'
  | 'toggleColumnLevelLineage'
  | 'handlePlan'
  | 'handleStartRun'
  | 'reloadLatestDraft'
  | 'setPlanModalOpen'
  | 'setConfirmEdgeModal'
  | 'confirmEdgeCreation'
> &
  Pick<CanvasController, 'importedNodeFocusIds'> {
  return {
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    handleNodeClick: vi.fn(),
    onSelectionChange: vi.fn(),
    handleViewportChange: vi.fn(),
    handleNodeDragStop: vi.fn(),
    handleDrop: vi.fn(),
    handleDragOver: vi.fn(),
    handleSourceImportComplete: vi.fn(),
    importedNodeFocusIds: [],
    handleImportedNodeFocusComplete: vi.fn(),
    hideExplorerPanel: vi.fn(),
    showExplorerPanel: vi.fn(),
    hideInspectorPanel: vi.fn(),
    showInspectorPanel: vi.fn(),
    handleAutoLayout: vi.fn(),
    handleToggleCostOverlay: vi.fn(),
    toggleImpactOverlay: vi.fn(),
    toggleColumnLevelLineage: vi.fn(),
    handlePlan: vi.fn(),
    handleStartRun: vi.fn(),
    reloadLatestDraft: vi.fn(),
    setPlanModalOpen: vi.fn(),
    setConfirmEdgeModal: vi.fn(),
    confirmEdgeCreation: vi.fn(),
  };
}
