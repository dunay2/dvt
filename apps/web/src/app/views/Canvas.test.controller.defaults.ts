/** Owned concern: provide canonical Canvas route test defaults and story-shaped host-cycle DTOs. */
import { vi } from 'vitest';

import { DBT_NODE_KINDS, DVT_AUTHORING_NODE_KINDS } from '../plugins/nodeTypeCatalog.dbt';
import type { NodeKindRegistration } from '../plugins/nodeTypeContracts';
import { DEFAULT_CANVAS_PALETTE_ID } from './canvas/canvasPalette';
import { canvasViewCopy } from './canvas/copy';
import type { CanvasDraftToolbarState } from './canvas/canvasDraftToolbarState';
import type { CanvasController } from './Canvas.test.controller';

type CanvasWorkbenchDefaultsDto = {
  dataSourceMode: CanvasController['dataSourceMode'];
  isBackendCheckPending: CanvasController['isBackendCheckPending'];
  backendReady: CanvasController['backendReady'];
  backendBlockMessage: CanvasController['backendBlockMessage'];
  isLoadingGraph: CanvasController['isLoadingGraph'];
  graphErrorMessage: CanvasController['graphErrorMessage'];
  focusMode: CanvasController['focusMode'];
  explorerPanelVisible: CanvasController['explorerPanelVisible'];
  inspectorPanelVisible: CanvasController['inspectorPanelVisible'];
  canOpenSourceImport: CanvasController['canOpenSourceImport'];
  explorerNodes: CanvasController['explorerNodes'];
  inspectorNode: CanvasController['inspectorNode'];
  activeRunId: CanvasController['activeRunId'];
  registeredPlugins: CanvasController['registeredPlugins'];
  availableCanvasKinds: CanvasController['availableCanvasKinds'];
  canvasDocument: CanvasController['canvasDocument'];
  userPermissions: CanvasController['userPermissions'];
  canvasAuthoringMode: CanvasController['canvasAuthoringMode'];
  nodesWithImpact: CanvasController['nodesWithImpact'];
  edges: CanvasController['edges'];
  nodeTypes: CanvasController['nodeTypes'];
  gridSize: CanvasController['gridSize'];
  canvasPalette: CanvasController['canvasPalette'];
  viewport: CanvasController['viewport'];
};

type CanvasDraftDefaultsDto = {
  draftSaveStatus: CanvasController['draftSaveStatus'];
  draftAccessMode: CanvasController['draftAccessMode'];
  draftCapabilityReason: CanvasController['draftCapabilityReason'];
  draftFormatError: CanvasController['draftFormatError'];
  draftFormatMeta: CanvasController['draftFormatMeta'];
  draftRecoveryReason: CanvasController['draftRecoveryReason'];
  draftToolbarState: CanvasController['draftToolbarState'];
  draftConflictRevision: CanvasController['draftConflictRevision'];
  hasStaleDraftVersion: CanvasController['hasStaleDraftVersion'];
  hasMissingRemoteDraft: CanvasController['hasMissingRemoteDraft'];
  hasDraftProjectionGap: CanvasController['hasDraftProjectionGap'];
};

type CanvasExecutionDefaultsDto = {
  canStartRun: CanvasController['canStartRun'];
  planStatusSummary: CanvasController['planStatusSummary'];
  exclusiveOverlayMode: CanvasController['exclusiveOverlayMode'];
  canUseCostOverlay: CanvasController['canUseCostOverlay'];
  impactOverlayEnabled: CanvasController['impactOverlayEnabled'];
  columnLevelLineageEnabled: CanvasController['columnLevelLineageEnabled'];
  transformationValidation: CanvasController['transformationValidation'];
  planModalOpen: CanvasController['planModalOpen'];
  currentPlan: CanvasController['currentPlan'];
  confirmEdgeModal: CanvasController['confirmEdgeModal'];
};

type CanvasControllerStateDefaults =
  CanvasWorkbenchDefaultsDto &
  CanvasDraftDefaultsDto &
  CanvasExecutionDefaultsDto;

type CanvasDocumentKind = Exclude<CanvasController['canvasAuthoringMode'], undefined>;
type CanvasExplorerNode = CanvasControllerStateDefaults['explorerNodes'][number];

export type CanvasHostCycleControllerStateDto =
  | { kind: 'needs_canvas' }
  | {
      kind: 'typed_empty';
      canvasKind: CanvasDocumentKind;
      title?: string;
      canEditEdges?: boolean;
      canOpenSourceImport?: boolean;
    }
  | {
      kind: 'restored_empty';
      canvasKind: CanvasDocumentKind;
      title?: string;
      canEditEdges?: boolean;
      canOpenSourceImport?: boolean;
    }
  | {
      kind: 'graph_ready';
      canvasKind: CanvasDocumentKind;
      title?: string;
      firstNodeKind?: NodeKindRegistration['kind'];
    }
  | {
      kind: 'restored_graph_ready';
      canvasKind: CanvasDocumentKind;
      title?: string;
      firstNodeKind?: NodeKindRegistration['kind'];
    }
  | {
      kind: 'plan_ready';
      canvasKind: CanvasDocumentKind;
      title?: string;
    }
  | {
      kind: 'preview_ready';
      canvasKind: CanvasDocumentKind;
      title?: string;
    };

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

function resolveCanvasHostCycleTitle(kind: CanvasDocumentKind): string {
  return kind === 'dbt' ? 'dbt canvas' : 'Transformation canvas';
}

function buildCanvasHostCycleExplorerNode(
  kind: CanvasDocumentKind,
  firstNodeKind?: NodeKindRegistration['kind']
): CanvasExplorerNode {
  if (kind === 'dbt') {
    return {
      id: 'node.orders',
      name: 'orders',
      pluginId: 'dbt',
      kind: firstNodeKind ?? 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
    };
  }

  return {
    id: 'node.source',
    name: 'Source',
    pluginId: 'dvt',
    kind: firstNodeKind ?? 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
  };
}

function buildCanvasHostCycleExecutionExplorerNodes(
  kind: CanvasDocumentKind
): CanvasControllerStateDefaults['explorerNodes'] {
  if (kind === 'dbt') {
    return [
      {
        id: 'node.source',
        name: 'Seed',
        pluginId: 'dbt',
        kind: 'dbt:source',
        role: 'input',
        status: 'idle',
        tags: [],
      },
      {
        id: 'node.model',
        name: 'Model',
        pluginId: 'dbt',
        kind: 'dbt:model',
        role: 'transform',
        status: 'idle',
        tags: [],
      },
      {
        id: 'node.exposure',
        name: 'Exposure',
        pluginId: 'dbt',
        kind: 'dbt:exposure',
        role: 'output',
        status: 'idle',
        tags: [],
      },
    ];
  }

  return [
    {
      id: 'node.source',
      name: 'Source',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
    },
    {
      id: 'node.transform',
      name: 'Transform',
      pluginId: 'dvt',
      kind: 'dvt:sql_transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    },
    {
      id: 'node.sink',
      name: 'Sink',
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
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

function buildDefaultCanvasWorkbenchState(): CanvasWorkbenchDefaultsDto {
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
    availableCanvasKinds: [
      {
        kind: 'dbt',
        pluginId: 'dbt',
        label: 'dbt',
        description: 'Model-first canvas for dbt resources and dependencies.',
        createTitle: 'dbt canvas',
        emptyState: {
          title: 'Start dbt canvas',
          editableMessage:
            'Start this dbt canvas by adding a governed source, model, snapshot, exposure, or metric.',
          firstNodeLabel: 'Add first dbt node',
          firstNodeHelper:
            'Choose a governed dbt resource kind to start modeling this workspace lineage graph.',
        },
        nodeKinds: DBT_NODE_KINDS,
      },
      {
        kind: 'transformation',
        pluginId: 'dvt',
        label: 'Transformation',
        description: 'Flow-based transformation canvas for the protected authoring draft.',
        createTitle: 'Transformation canvas',
        emptyState: {
          title: 'Start transformation canvas',
          editableMessage:
            'Start this transformation canvas by adding a governed source, SQL transform, or sink node.',
          firstNodeLabel: 'Add first transformation node',
          firstNodeHelper:
            'Choose a governed transformation node kind to start this protected authoring flow.',
        },
        nodeKinds: DVT_AUTHORING_NODE_KINDS,
      },
    ],
    canvasDocument: {
      kind: 'transformation',
      title: 'Main canvas',
    },
    userPermissions: buildDefaultCanvasUserPermissions(),
    canvasAuthoringMode: 'transformation',
    nodesWithImpact: [],
    edges: [],
    nodeTypes: {},
    gridSize: 24,
    canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
    viewport: null,
  } satisfies CanvasWorkbenchDefaultsDto;
}

function buildDefaultCanvasDraftState(): CanvasDraftDefaultsDto {
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
  } satisfies CanvasDraftDefaultsDto;
}

function buildDefaultCanvasExecutionState(): CanvasExecutionDefaultsDto {
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
  } satisfies CanvasExecutionDefaultsDto;
}

export function buildDefaultCanvasControllerState(): CanvasControllerStateDefaults {
  return {
    ...buildDefaultCanvasWorkbenchState(),
    ...buildDefaultCanvasDraftState(),
    ...buildDefaultCanvasExecutionState(),
  };
}

export function buildCanvasHostCycleControllerState(
  dto: CanvasHostCycleControllerStateDto
): Partial<CanvasController> {
  if (dto.kind === 'needs_canvas') {
    return {
      canvasDocument: null,
      explorerNodes: [],
    };
  }

  if (dto.kind === 'typed_empty' || dto.kind === 'restored_empty') {
    return {
      canvasDocument: {
        kind: dto.canvasKind,
        title: dto.title ?? resolveCanvasHostCycleTitle(dto.canvasKind),
      },
      explorerNodes: [],
      userPermissions: {
        ...buildDefaultCanvasUserPermissions(),
        canEditEdges: dto.canEditEdges ?? true,
      },
      canOpenSourceImport: dto.canOpenSourceImport ?? true,
      canvasAuthoringMode: dto.canvasKind,
    };
  }

  if (dto.kind === 'plan_ready' || dto.kind === 'preview_ready') {
    return {
      canvasDocument: {
        kind: dto.canvasKind,
        title: dto.title ?? resolveCanvasHostCycleTitle(dto.canvasKind),
      },
      explorerNodes: buildCanvasHostCycleExecutionExplorerNodes(dto.canvasKind),
      canvasAuthoringMode: dto.canvasKind,
      transformationValidation:
        dto.canvasKind === 'transformation'
          ? {
              valid: true,
              summaryCode: 'valid',
              draftSignature: 'draft:transformation-ready',
              scopedNodeIds: ['node.source', 'node.transform', 'node.sink'],
              scopedEdgeIds: ['edge.source-transform', 'edge.transform-sink'],
              nodeRolesById: {
                'node.source': 'source',
                'node.transform': 'sql_transform',
                'node.sink': 'sink',
              },
            }
          : buildDefaultTransformationValidation(),
      canStartRun: dto.kind === 'preview_ready',
      planStatusSummary:
        dto.kind === 'preview_ready'
          ? canvasViewCopy.planStatusPreviewReadyMessage
          : canvasViewCopy.planStatusPreviewRequiredMessage,
    };
  }

  return {
    canvasDocument: {
      kind: dto.canvasKind,
      title: dto.title ?? resolveCanvasHostCycleTitle(dto.canvasKind),
    },
    explorerNodes: [buildCanvasHostCycleExplorerNode(dto.canvasKind, dto.firstNodeKind)],
    canvasAuthoringMode: dto.canvasKind,
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
  | 'handleCreateAuthoringNode'
  | 'handleCreateCanvasDocument'
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
    handleCreateAuthoringNode: vi.fn(),
    handleCreateCanvasDocument: vi.fn(),
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
