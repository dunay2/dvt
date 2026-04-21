import { vi } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import { buildDefaultCanvasHarnessServices } from './useCanvasController.test.serviceDefaults';
import type { CanvasHarnessState } from './useCanvasController.test.types';

function buildDefaultCanvasHarnessPlan(): PlanViewModel {
  return {
    planId: 'plan_1',
    planVersion: '1',
    generatedAt: '2026-03-28T00:00:00Z',
    adapter: 'dbt',
    target: 'dev',
    steps: [],
    capabilities: [],
  };
}

function buildDefaultCanvasHarnessCanonicalNodes(): CanonicalNode[] {
  return [
    {
      id: 'node_1',
      name: 'orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
      lastCost: 10,
      lastDuration: 120,
    },
    {
      id: 'node_2',
      name: 'customers',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
      lastCost: 15,
      lastDuration: 180,
    },
  ];
}

function buildDefaultCanvasHarnessCanonicalEdges(): CanonicalEdge[] {
  return [{ id: 'edge_1', sourceId: 'node_1', targetId: 'node_2', relation: 'lineage' }];
}

function buildDefaultCanvasHarnessQueryClient(): CanvasHarnessState['queryClient'] {
  return {
    cancelQueries: vi.fn(async () => undefined),
    fetchQuery: vi.fn(),
    invalidateQueries: vi.fn(async () => undefined),
    setQueryData: vi.fn(),
  };
}

function buildDefaultCanvasHarnessStore(
  currentPlan: PlanViewModel
): CanvasHarnessState['store'] {
  return {
    _hasHydrated: true,
    focusMode: false,
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'dev',
    selectedTenant: 'tenant-a',
    selectedProject: 'project-a',
    selectedEnvironment: 'dev',
    selectedNodes: ['node_1'],
    setSelectedNodes: vi.fn(),
    inspectorNodeId: 'node_1',
    setInspectorNode: vi.fn(),
    impactOverlayEnabled: true,
    toggleImpactOverlay: vi.fn(),
    columnLevelLineageEnabled: false,
    toggleColumnLevelLineage: vi.fn(),
    setCurrentPlan: vi.fn(),
    currentPlan,
    userPermissions: {
      canPlan: true,
      canRun: true,
      canEditEdges: true,
      canManagePlugins: false,
      canManageRBAC: false,
    },
    setConsolePanelHeight: vi.fn(),
    consolePanelVisible: false,
    showExplorerPanel: vi.fn(),
    hideExplorerPanel: vi.fn(),
    toggleExplorerPanel: vi.fn(),
    showInspectorPanel: vi.fn(),
    hideInspectorPanel: vi.fn(),
    toggleInspectorPanel: vi.fn(),
    toggleConsolePanel: vi.fn(),
    explorerPanelVisible: true,
    inspectorPanelVisible: true,
    gridSize: 24,
    canvasLayouts: {},
    setCanvasViewport: vi.fn(),
    setCanvasNodePositions: vi.fn(),
    currentRun: null,
  };
}

function buildDefaultCanvasHarnessGraphHandlersResult(): CanvasHarnessState['graphHandlersResult'] {
  return {
    confirmEdgeModal: { open: false, edge: null },
    setConfirmEdgeModal: vi.fn(),
    onConnect: vi.fn(),
    confirmEdgeCreation: vi.fn(),
    handleInspectNode: vi.fn(),
    handleNodeClick: vi.fn(),
    onSelectionChange: vi.fn(),
    handleAutoLayout: vi.fn(),
    handleDrop: vi.fn(),
    handleDragOver: vi.fn(),
    handleToggleNodeSelection: vi.fn(),
    handleRemoveNode: vi.fn(),
  };
}

function buildDefaultCanvasHarnessExecutionActionsResult(): CanvasHarnessState['executionActionsResult'] {
  return {
    planModalOpen: false,
    setPlanModalOpen: vi.fn(),
    canStartRun: false,
    planStatusSummary: 'Preview required before running.',
    handlePlan: vi.fn(),
    handleStartRun: vi.fn(),
  };
}

function buildDefaultCanvasHarnessNavigationActionsResult(): CanvasHarnessState['navigationActionsResult'] {
  return {
    handleRunStarted: vi.fn(),
  };
}

export function createDefaultCanvasHarnessState(): CanvasHarnessState {
  const currentPlan = buildDefaultCanvasHarnessPlan();

  return {
    currentPlan,
    graphData: { nodes: [{ id: 'node_1' }, { id: 'node_2' }], edges: [{ id: 'edge_1' }] },
    remoteDraftRecord: null,
    graphDraftQueryData: undefined,
    canonicalNodes: buildDefaultCanvasHarnessCanonicalNodes(),
    canonicalEdges: buildDefaultCanvasHarnessCanonicalEdges(),
    overlayDecorations: new Map([
      ['node_1', { borderColor: '#ef4444' }],
      ['node_2', null],
    ]),
    services: buildDefaultCanvasHarnessServices(currentPlan),
    queryClient: buildDefaultCanvasHarnessQueryClient(),
    store: buildDefaultCanvasHarnessStore(currentPlan),
    graphHandlersResult: buildDefaultCanvasHarnessGraphHandlersResult(),
    executionActionsResult: buildDefaultCanvasHarnessExecutionActionsResult(),
    navigationActionsResult: buildDefaultCanvasHarnessNavigationActionsResult(),
  };
}
