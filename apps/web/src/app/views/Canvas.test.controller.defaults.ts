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

export function buildDefaultCanvasControllerState(): CanvasControllerStateDefaults {
  return {
    dataSourceMode: 'mock',
    isBackendCheckPending: false,
    backendReady: true,
    backendBlockMessage: null,
    isLoadingGraph: false,
    graphErrorMessage: null,
    focusMode: false,
    explorerPanelVisible: true,
    inspectorPanelVisible: true,
    explorerNodes: [
      {
        id: 'node.orders',
        name: 'orders',
        pluginId: 'dbt',
        kind: 'dbt:model',
        role: 'transform',
        status: 'idle',
        tags: [],
      },
    ],
    inspectorNode: null,
    activeRunId: null,
    registeredPlugins: new Set(['dbt']),
    userPermissions: {
      canPlan: true,
      canRun: true,
      canEditEdges: true,
      canManagePlugins: false,
      canManageRBAC: false,
    },
    canvasAuthoringMode: 'transformation',
    nodesWithImpact: [],
    edges: [],
    nodeTypes: {},
    gridSize: 24,
    canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
    viewport: null,
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
    canStartRun: false,
    planStatusSummary: 'Preview required before running.',
    exclusiveOverlayMode: 'runtime',
    canUseCostOverlay: false,
    impactOverlayEnabled: false,
    columnLevelLineageEnabled: false,
    transformationValidation: {
      valid: false,
      summaryCode: 'requires_three_nodes',
      draftSignature: 'draft',
      scopedNodeIds: [],
      scopedEdgeIds: [],
      nodeRolesById: {},
    },
    planModalOpen: false,
    currentPlan: null,
    confirmEdgeModal: { open: false, edge: null },
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
  | 'adoptCurrentWorkspaceSnapshot'
  | 'setPlanModalOpen'
  | 'setConfirmEdgeModal'
  | 'confirmEdgeCreation'
> & Pick<CanvasController, 'importedNodeFocusIds'> {
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
    adoptCurrentWorkspaceSnapshot: vi.fn(),
    setPlanModalOpen: vi.fn(),
    setConfirmEdgeModal: vi.fn(),
    confirmEdgeCreation: vi.fn(),
  };
}
