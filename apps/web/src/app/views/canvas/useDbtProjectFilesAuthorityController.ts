/**
Owned concern: orchestrate the read-only external dbt project-file authority read model.
@baseline InspectCanvasNode: only fresh analysis may confirm removal of the active file inspector.
@decision Delegate scoped file-editor continuity without retaining graph or execution membership.
@consequence Invalid SQL stays repairable in Code while Preview and Run consume actual analysis.
@version 1.0.1
 */
import type { Node, NodeTypes } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import DbtNodeComponent, { type DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import { getRegisteredPluginIds } from '../../plugins/registry';
import { getGraphNodeCardStrategies } from '../../plugins/graphStrategyRegistry';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { ImportSourcesResult, WorkspaceFileSaveReceipt } from '../../ports/workspace';
import { createCanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import { useDbtProjectGraphQuery } from '../../queries/dbtProjectQueries';
import { useCapabilitiesQuery } from '../../queries/useCapabilitiesQuery';
import {
  buildDbtProjectFileInitialNodePositions,
  mergeDbtProjectFileNodePositions,
} from './dbtProjectFileLayout';
import { deriveExecutionScope } from './canvasDraftScope';
import { projectDbtProjectGraphToCanonicalCanvas } from './dbtProjectFileProjection';
import { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import { useCanvasStoreFacade } from './useCanvasStoreFacade';
import { useCanvasViewportGraphModel } from './useCanvasViewportGraphModel';
import { useDbtProjectFileExecution } from './useDbtProjectFileExecution';
import {
  applyDbtExecutionSelectionToggle,
  canOfferDbtExecutionSelectionToggle,
} from './dbtExecutionScopePolicy';
import { projectDbtCodeReconciliationOutcome } from './dbtProjectCodeReconciliation';
import { projectCanvasNodeAccessibleHealth } from './canvasNodeMapper';
import { useDbtProjectFileInspector } from './useDbtProjectFileInspector';
import { useDbtProjectFileWorkbenchSession } from './useDbtProjectFileWorkbenchSession';
import { useDbtProjectFilePlacements } from './useDbtProjectFilePlacements';

const EMPTY_NODE_POSITIONS: Record<string, { x: number; y: number }> = {};
const EMPTY_FROZEN_NODE_IDS: readonly string[] = [];
const EMPTY_CANONICAL_NODES: CanonicalNode[] = [];
const EMPTY_CANONICAL_EDGES: CanonicalEdge[] = [];
const DBT_PROJECT_FILE_NODE_TYPES: NodeTypes = {
  dbtNode: DbtNodeComponent,
};

function buildLayoutKey(
  workspaceLayoutKey: string,
  authorityBinding: DbtProjectFilesAuthorityBinding
): string {
  return [
    workspaceLayoutKey,
    'canvas',
    authorityBinding.canvasId,
    'authority',
    authorityBinding.authority.kind,
    'root',
    authorityBinding.authority.projectRoot,
  ].join('::');
}

function buildCanonicalNodeMap(
  nodes: readonly CanonicalNode[]
): ReadonlyMap<string, CanonicalNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

function buildCanonicalEdgeIdMap(edges: readonly CanonicalEdge[]): ReadonlyMap<string, string> {
  return new Map(edges.map((edge) => [`${edge.sourceId}::${edge.targetId}`, edge.id]));
}

function buildProjectionErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : 'The dbt project graph could not be loaded.';
}

export function resolveDbtProjectFileSourceImportFocus(
  authorityBinding: DbtProjectFilesAuthorityBinding,
  result: ImportSourcesResult
): string[] | null {
  if (
    result.outcome.kind !== 'dbt-project-files' ||
    result.authorityBinding.canvasId !== authorityBinding.canvasId ||
    result.authorityBinding.authority.kind !== 'dbt-project-files' ||
    result.authorityBinding.authority.projectRoot !== authorityBinding.authority.projectRoot
  ) {
    return null;
  }

  return [...result.outcome.projectedSourceUniqueIds];
}

export function useDbtProjectFilesAuthorityController(
  authorityBinding: DbtProjectFilesAuthorityBinding
) {
  const capabilitiesQuery = useCapabilitiesQuery();
  const runtimeCapabilities = capabilitiesQuery.data;
  const query = useDbtProjectGraphQuery(authorityBinding);
  const store = useCanvasStoreFacade();
  const {
    _hasHydrated,
    canvasLayouts,
    canvasPalette,
    canvasGridColor,
    canvasGridVisible,
    canvasSnapToGrid,
    columnLevelLineageEnabled,
    focusMode,
    gridSize,
    hideInspectorPanel,
    impactOverlayEnabled,
    inspectorNodeId,
    inspectorPanelVisible,
    inspectorPreferredTabId,
    inspectorPreferredTabRequestId,
    setCanvasGridColor,
    setCanvasGridVisible,
    setCanvasPalette,
    setCanvasNodePositions,
    setCanvasSnapToGrid,
    setCanvasViewport,
    setGridSize,
    setInspectorNode,
    showInspectorPanel,
    toggleColumnLevelLineage,
    toggleFrozenCanvasNode,
    toggleImpactOverlay,
    workspaceLayoutKey,
  } = store;
  const [importedNodeFocusIds, setImportedNodeFocusIds] = useState<string[]>([]);
  const layoutKey = useMemo(
    () => buildLayoutKey(workspaceLayoutKey, authorityBinding),
    [authorityBinding, workspaceLayoutKey]
  );
  const persistedLayout = canvasLayouts[layoutKey];
  const persistedNodePositions = persistedLayout?.nodePositions ?? EMPTY_NODE_POSITIONS;
  const persistedViewport = persistedLayout?.viewport ?? null;
  const frozenNodeIdsSource = persistedLayout?.frozenNodeIds ?? EMPTY_FROZEN_NODE_IDS;
  const frozenNodeIds = useMemo(() => new Set(frozenNodeIdsSource), [frozenNodeIdsSource]);
  const projection = useMemo(
    () => (query.data == null ? null : projectDbtProjectGraphToCanonicalCanvas(query.data)),
    [query.data]
  );
  const canonicalNodes = projection?.nodes ?? EMPTY_CANONICAL_NODES;
  const canonicalEdges = projection?.edges ?? EMPTY_CANONICAL_EDGES;
  const analysisFresh = query.isSuccess && query.data.freshness === 'fresh';
  const canPlaceReferences = _hasHydrated && analysisFresh;
  const placements = useDbtProjectFilePlacements({
    layoutKey,
    resources: canonicalNodes,
    canPlaceReferences,
  });
  const placedNodesById = useMemo(
    () => buildCanonicalNodeMap(placements.nodes),
    [placements.nodes]
  );
  const placedNodeIds = useMemo(() => placements.nodes.map((node) => node.id), [placements.nodes]);
  const initialNodePositions = useMemo(
    () => buildDbtProjectFileInitialNodePositions(canonicalNodes, canonicalEdges),
    [canonicalEdges, canonicalNodes]
  );
  const viewportNodePositions = useMemo(
    () => mergeDbtProjectFileNodePositions(initialNodePositions, persistedNodePositions),
    [initialNodePositions, persistedNodePositions]
  );
  const canonicalNodesById = useMemo(() => buildCanonicalNodeMap(canonicalNodes), [canonicalNodes]);
  const workbenchSession = useDbtProjectFileWorkbenchSession({
    nodesById: canonicalNodesById,
    setInspectorNode,
    showInspectorPanel,
    hideInspectorPanel,
  });
  const { openNodeWorkbench } = workbenchSession;
  const inspectorNode = useDbtProjectFileInspector({
    authorityKey: layoutKey,
    inspectorNodeId,
    inspectorVisible: inspectorPanelVisible,
    analysisFresh,
    nodesById: canonicalNodesById,
  });
  const canonicalEdgeIdBySignature = useMemo(
    () => buildCanonicalEdgeIdMap(canonicalEdges),
    [canonicalEdges]
  );
  const visibleNodeIds = useMemo(() => canonicalNodes.map((node) => node.id), [canonicalNodes]);
  const executionScope = useMemo(
    () =>
      deriveExecutionScope({
        visibleNodeIds,
        selectionIntent: store.executionSelectionIntent,
      }),
    [store.executionSelectionIntent, visibleNodeIds]
  );
  const executionSelectionIntent = useMemo(
    () =>
      createCanvasExecutionSelectionIntent(
        executionScope.requestedNodeIds,
        executionScope.selectionMode
      ),
    [executionScope.requestedNodeIds, executionScope.selectionMode]
  );
  const selectedNodeIds = executionScope.selectedNodeIds;
  const visibleEdges = useMemo(
    () =>
      canonicalEdges.map((edge) => ({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
      })),
    [canonicalEdges]
  );
  const graphModel = useCanvasViewportGraphModel({
    visibleNodeIds: placedNodeIds,
    visibleEdges,
    canonicalNodesById: placedNodesById,
    canonicalEdgeIdBySignature,
    columnLevelLineageEnabled,
    persistedNodePositions: viewportNodePositions,
    frozenNodeIds,
  });
  const persistence = useCanvasLayoutPersistence({
    hasHydrated: _hasHydrated,
    isGraphQueryPending: query.isPending,
    workspaceLayoutKey: layoutKey,
    nodes: graphModel.nodes,
    persistedViewport,
    persistedNodePositions,
    setCanvasViewport,
    setCanvasNodePositions,
  });
  const execution = useDbtProjectFileExecution({
    projection: query.data ?? null,
    canonicalNodes,
    canonicalEdges,
    selectionIntent: executionSelectionIntent,
    workspaceNodeIds: visibleNodeIds,
    store,
    refetchProjectGraph: query.refetch,
  });
  const { executionSelectableNodeIds, executionSelectionRecovery } = execution;
  const refetchProjectGraph = query.refetch;
  const refreshProjectGraphSource = useCallback(async () => {
    const result = await refetchProjectGraph();
    if (!result.isSuccess || result.data == null) {
      throw result.error ?? new Error('The refreshed dbt project graph is unavailable.');
    }
    return result.data;
  }, [refetchProjectGraph]);
  const refreshProjectGraph = useCallback(async () => {
    return projectDbtProjectGraphToCanonicalCanvas(await refreshProjectGraphSource());
  }, [refreshProjectGraphSource]);
  const refreshProjectGraphAfterMutation = useCallback(async (): Promise<void> => {
    await refreshProjectGraph();
  }, [refreshProjectGraph]);
  const reconcileCodeFilePersistence = useCallback(
    async (_receipt: WorkspaceFileSaveReceipt) => {
      return projectDbtCodeReconciliationOutcome(await refreshProjectGraphSource());
    },
    [refreshProjectGraphSource]
  );
  const reloadNodeDescription = useCallback(
    async (nodeId: string): Promise<string | null> => {
      const refreshedProjection = await refreshProjectGraph();
      const refreshedNode = refreshedProjection.nodes.find((node) => node.id === nodeId);
      if (refreshedNode == null) {
        throw new Error(`The refreshed dbt resource is unavailable: ${nodeId}`);
      }
      return refreshedNode.description ?? null;
    },
    [refreshProjectGraph]
  );
  const graphNodeCardStrategies = useMemo(
    () => getGraphNodeCardStrategies(runtimeCapabilities),
    [runtimeCapabilities]
  );
  const nodesWithCommands = useMemo<Node[]>(
    () =>
      graphModel.nodes.map((node) => {
        const resourceId = placements.definitionIdByInstanceId.get(node.id) ?? node.id;
        const isInstance = placements.definitionIdByInstanceId.has(node.id);
        const placedNode = { ...node, deletable: isInstance };
        const data: DbtNodeData = {
          ...(node.data as DbtNodeData),
          runtimeCapabilities,
          canMutateGraph: false,
          canRemovePlacement: isInstance,
          onRemoveNode: isInstance ? placements.removeInstance : undefined,
          selectedForExecution: selectedNodeIds.includes(resourceId),
          onInspectNode: (_nodeId, preferredTabId) => {
            void openNodeWorkbench(resourceId, preferredTabId);
          },
          canOpenNodeCode: node.data.path != null,
          onToggleNodeSelection:
            execution.canSelectExecution &&
            canOfferDbtExecutionSelectionToggle({
              isExecutableRoot: executionSelectableNodeIds.has(resourceId),
              selectedForExecution: selectedNodeIds.includes(resourceId),
            })
              ? (_nodeId: string, shouldSelect: boolean) => {
                  store.setExecutionSelectionIntent(
                    applyDbtExecutionSelectionToggle({
                      requestedNodeIds: executionScope.requestedNodeIds,
                      nodeId: resourceId,
                      shouldSelect,
                    })
                  );
                }
              : undefined,
        };
        const canonicalNode = placedNodesById.get(node.id);

        return canonicalNode == null
          ? { ...placedNode, data }
          : projectCanvasNodeAccessibleHealth({
              node: placedNode,
              canonicalNode,
              data,
              graphNodeCardStrategies,
            });
      }),
    [
      placedNodesById,
      placements.definitionIdByInstanceId,
      placements.removeInstance,
      execution.canSelectExecution,
      executionSelectableNodeIds,
      executionScope.requestedNodeIds,
      graphNodeCardStrategies,
      graphModel.nodes,
      openNodeWorkbench,
      runtimeCapabilities,
      selectedNodeIds,
      store.setExecutionSelectionIntent,
    ]
  );

  useEffect(() => {
    if (analysisFresh && inspectorNodeId != null && inspectorNode == null) {
      setInspectorNode(null);
      hideInspectorPanel();
    }
  }, [analysisFresh, hideInspectorPanel, inspectorNode, inspectorNodeId, setInspectorNode]);

  const handleSourceImportComplete = useCallback(
    (result: ImportSourcesResult) => {
      const nextFocusIds = resolveDbtProjectFileSourceImportFocus(authorityBinding, result);
      if (nextFocusIds == null) {
        return;
      }

      void query.refetch().then((refreshResult) => {
        if (refreshResult.isSuccess) {
          setImportedNodeFocusIds(nextFocusIds);
        }
      });
    },
    [authorityBinding, query]
  );

  return {
    ...workbenchSession,
    authorityBinding,
    workspaceLayoutKey,
    query,
    projection,
    projectionErrorMessage: query.isError ? buildProjectionErrorMessage(query.error) : null,
    layoutKey,
    refreshProjectGraphAfterMutation,
    reconcileCodeFilePersistence,
    reloadNodeDescription,
    canonicalNodes,
    canonicalEdges,
    inspectorNode,
    nodesWithCommands,
    edges: graphModel.edges,
    nodeTypes: DBT_PROJECT_FILE_NODE_TYPES,
    persistedViewport,
    frozenNodeIds,
    referencePlacementScope: canPlaceReferences ? layoutKey : undefined,
    importedNodeFocusIds,
    presentation: {
      focusMode,
      inspectorPanelVisible,
      inspectorPreferredTabId,
      inspectorPreferredTabRequestId,
      gridSize,
      canvasPalette,
      canvasGridVisible,
      canvasGridColor,
      canvasSnapToGrid,
      impactOverlayEnabled,
      columnLevelLineageEnabled,
    },
    execution,
    executionSelectionRecovery: executionSelectionRecovery.model,
    currentPlan: store.currentPlan,
    activeRunId: store.currentRun?.runId ?? null,
    registeredPlugins: getRegisteredPluginIds(runtimeCapabilities),
    runtimeCapabilities,
    graphCommands: {
      onInstantiateNode: placements.placeResource,
      onNodesChange: (changes: Parameters<typeof graphModel.onNodesChange>[0]) => {
        const accepted = placements.applyNodeChanges(changes);
        if (accepted.length > 0) graphModel.onNodesChange(accepted);
      },
      onNodeDragStop: persistence.handleNodeDragStop,
      onEdgesChange: (changes: Parameters<typeof graphModel.onEdgesChange>[0]) => {
        const accepted = changes.filter((change) => change.type !== 'remove');
        if (accepted.length > 0) graphModel.onEdgesChange(accepted);
      },
      onViewportChange: persistence.handleViewportChange,
      onDrop: placements.onDrop,
      onDragOver: placements.onDragOver,
      onToggleFrozenNode: (nodeId: string) => toggleFrozenCanvasNode(layoutKey, nodeId),
      onSourceImportComplete: handleSourceImportComplete,
      onImportedNodeFocusComplete: () => setImportedNodeFocusIds([]),
    },
    chromeCommands: {
      onHideInspector: workbenchSession.closeNodeWorkbench,
      onShowInspector: showInspectorPanel,
      onToggleImpact: toggleImpactOverlay,
      onToggleColumns: toggleColumnLevelLineage,
      onGridSizeChange: setGridSize,
      onCanvasPaletteChange: setCanvasPalette,
      onToggleGridVisible: () => setCanvasGridVisible(!canvasGridVisible),
      onGridColorChange: setCanvasGridColor,
      onToggleSnapToGrid: () => setCanvasSnapToGrid(!canvasSnapToGrid),
      onReloadLatestDraft: () => {
        void query.refetch();
      },
      onPreviewExecutionPlan: () => {
        void execution.handlePreviewExecutionPlan();
      },
      onRun: () => {
        void execution.handleStartRun();
      },
      executionSelectionRecovery: executionSelectionRecovery.commands,
    },
    canvasCommands: {},
  };
}
