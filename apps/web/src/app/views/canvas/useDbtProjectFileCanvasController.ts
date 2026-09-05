/** Owned concern: orchestrate the read-only file-authoritative dbt Canvas read model. */
import type { Node, NodeTypes } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import DbtNodeComponent, { type DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import { getRegisteredPluginIds } from '../../plugins/registry';
import { getCanvasGraphNodeCardStrategies } from '../../plugins/graphStrategyRegistry';
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
import { validateTransformationGraph } from './transformationGraphValidation';
import { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import { useCanvasStoreFacade } from './useCanvasStoreFacade';
import { useCanvasViewportGraphModel } from './useCanvasViewportGraphModel';
import { useDbtProjectFileExecution } from './useDbtProjectFileExecution';
import {
  applyDbtExecutionSelectionToggle,
  canOfferDbtExecutionSelectionToggle,
} from './dbtExecutionScopePolicy';
import {
  buildCanvasExecutionSelectionRecoveryGraph,
  resolveCanvasExecutionSelectionLastPreviewRevision,
} from './canvasExecutionSelectionRecovery';
import { refreshCanvasExecutionSelectionAuthority } from './canvasExecutionSelectionRecoveryAuthorityAdapter';
import { useCanvasExecutionSelectionRecovery } from './useCanvasExecutionSelectionRecovery';
import { projectDbtCodeReconciliationOutcome } from './dbtProjectCodeReconciliation';
import type { WorkspaceFileCodeEditorHandle } from '../code/WorkspaceFileCodeEditor';
import { projectCanvasNodeAccessibleHealth } from './canvasNodeMapper';

const EMPTY_NODE_POSITIONS: Record<string, { x: number; y: number }> = {};
const EMPTY_FROZEN_NODE_IDS: readonly string[] = [];
const EMPTY_CANONICAL_NODES: CanonicalNode[] = [];
const EMPTY_CANONICAL_EDGES: CanonicalEdge[] = [];
const DBT_PROJECT_FILE_NODE_TYPES: NodeTypes = {
  dbtNode: DbtNodeComponent,
};

function unsupportedSemanticMutation(commandName: string): never {
  throw new Error(
    `${commandName} is unavailable because dbt project files are the Canvas semantic authority.`
  );
}

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

export function useDbtProjectFileCanvasController(
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
  const [projectCodeWorkbenchOpen, setProjectCodeWorkbenchOpen] = useState(false);
  const nodeCodeEditorRef = useRef<WorkspaceFileCodeEditorHandle>(null);
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
  const initialNodePositions = useMemo(
    () => buildDbtProjectFileInitialNodePositions(canonicalNodes, canonicalEdges),
    [canonicalEdges, canonicalNodes]
  );
  const viewportNodePositions = useMemo(
    () => mergeDbtProjectFileNodePositions(initialNodePositions, persistedNodePositions),
    [initialNodePositions, persistedNodePositions]
  );
  const canonicalNodesById = useMemo(() => buildCanonicalNodeMap(canonicalNodes), [canonicalNodes]);
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
    visibleNodeIds,
    visibleEdges,
    canonicalNodesById,
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
  });
  const executionSelectableNodeIds = useMemo(
    () =>
      new Set(
        execution.executionStrategy?.kind === 'dbt_project_file_preview'
          ? execution.executionStrategy.plannerGraphSource.nodes.map((node) => node.nodeId)
          : []
      ),
    [execution.executionStrategy]
  );
  const executionSelectionRecoveryGraph = useMemo(
    () =>
      buildCanvasExecutionSelectionRecoveryGraph({
        canonicalNodes,
        canonicalEdges,
        workspaceNodeIds: visibleNodeIds,
        plannerGraphSource:
          execution.executionStrategy?.kind === 'dbt_project_file_preview'
            ? execution.executionStrategy.plannerGraphSource
            : null,
      }),
    [canonicalEdges, canonicalNodes, execution.executionStrategy, visibleNodeIds]
  );
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
  const refreshExecutionSelectionAnalysis = useCallback(
    () =>
      refreshCanvasExecutionSelectionAuthority(
        refetchProjectGraph,
        (projection) => projection?.freshness === 'fresh'
      ),
    [refetchProjectGraph]
  );
  const executionSelectionRecovery = useCanvasExecutionSelectionRecovery({
    enabled: true,
    selectionIntent: executionSelectionIntent,
    workspaceNodeIds: visibleNodeIds,
    executableNodeIds: executionSelectionRecoveryGraph.executableNodeIds,
    dependencyIdsByNodeId: executionSelectionRecoveryGraph.dependencyIdsByNodeId,
    lastPreviewRevision: resolveCanvasExecutionSelectionLastPreviewRevision(store.currentPlan),
    canRefreshAnalysis: true,
    setSelectionIntent: store.setExecutionSelectionIntent,
    refreshAnalysis: refreshExecutionSelectionAnalysis,
  });

  const flushActiveNodeCode = useCallback(
    async (): Promise<boolean> => (await nodeCodeEditorRef.current?.flush()) ?? true,
    []
  );

  const openNodeWorkbench = useCallback(
    async (
      nodeId: string,
      preferredTabId?: 'general' | 'inputs-outputs' | 'tests' | 'code' | null
    ) => {
      if (!canonicalNodesById.has(nodeId)) {
        return;
      }
      if (!(await flushActiveNodeCode())) {
        return;
      }

      setProjectCodeWorkbenchOpen(false);
      setInspectorNode(nodeId, preferredTabId ?? 'general');
      showInspectorPanel();
    },
    [canonicalNodesById, flushActiveNodeCode, setInspectorNode, showInspectorPanel]
  );
  const openProjectCode = useCallback(async () => {
    if (!(await flushActiveNodeCode())) {
      return;
    }
    setProjectCodeWorkbenchOpen(true);
  }, [flushActiveNodeCode]);
  const closeCodeWorkbench = useCallback(() => {
    setProjectCodeWorkbenchOpen(false);
  }, []);
  const graphNodeCardStrategies = useMemo(
    () => getCanvasGraphNodeCardStrategies('dbt', runtimeCapabilities),
    [runtimeCapabilities]
  );
  const nodesWithCommands = useMemo<Node[]>(
    () =>
      graphModel.nodes.map((node) => {
        const data: DbtNodeData = {
          ...(node.data as DbtNodeData),
          canvasKind: 'dbt',
          runtimeCapabilities,
          canMutateGraph: false,
          selectedForExecution: selectedNodeIds.includes(node.id),
          onInspectNode: (nodeId, preferredTabId) => {
            void openNodeWorkbench(nodeId, preferredTabId);
          },
          canOpenNodeCode: node.data.path != null,
          onToggleNodeSelection:
            execution.canSelectExecution &&
            canOfferDbtExecutionSelectionToggle({
              isExecutableRoot: executionSelectableNodeIds.has(node.id),
              selectedForExecution: selectedNodeIds.includes(node.id),
            })
              ? (nodeId: string, shouldSelect: boolean) => {
                  store.setExecutionSelectionIntent(
                    applyDbtExecutionSelectionToggle({
                      requestedNodeIds: executionScope.requestedNodeIds,
                      nodeId,
                      shouldSelect,
                    })
                  );
                }
              : undefined,
        };
        const canonicalNode = canonicalNodesById.get(node.id);

        return canonicalNode == null
          ? { ...node, data }
          : projectCanvasNodeAccessibleHealth({
              node,
              canonicalNode,
              data,
              graphNodeCardStrategies,
            });
      }),
    [
      canonicalNodesById,
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
    if (inspectorNodeId != null && !canonicalNodesById.has(inspectorNodeId)) {
      setInspectorNode(null);
      hideInspectorPanel();
    }
  }, [canonicalNodesById, hideInspectorPanel, inspectorNodeId, setInspectorNode]);

  const handleDragOver = useCallback<React.DragEventHandler<HTMLDivElement>>((event) => {
    event.dataTransfer.dropEffect = 'none';
  }, []);
  const handleDrop = useCallback<React.DragEventHandler<HTMLDivElement>>((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'none';
  }, []);
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
  const inspectorNode =
    inspectorNodeId == null ? null : (canonicalNodesById.get(inspectorNodeId) ?? null);
  const transformationValidation = useMemo(
    () =>
      validateTransformationGraph({
        nodes: canonicalNodes,
        edges: canonicalEdges,
        selectedNodeIds,
        workspaceNodeIds: visibleNodeIds,
      }),
    [canonicalEdges, canonicalNodes, selectedNodeIds, visibleNodeIds]
  );

  return {
    authorityBinding,
    workspaceLayoutKey,
    query,
    projection,
    projectionErrorMessage: query.isError ? buildProjectionErrorMessage(query.error) : null,
    layoutKey,
    nodeCodeEditorRef,
    projectCodeWorkbenchOpen,
    openProjectCode,
    closeCodeWorkbench,
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
    transformationValidation,
    execution,
    executionSelectionRecovery: executionSelectionRecovery.model,
    currentPlan: store.currentPlan,
    activeRunId: store.currentRun?.runId ?? null,
    registeredPlugins: getRegisteredPluginIds(runtimeCapabilities),
    runtimeCapabilities,
    graphCommands: {
      onNodesChange: graphModel.onNodesChange,
      onNodeDrag: persistence.handleNodeDrag,
      onNodeDragStop: persistence.handleNodeDragStop,
      onEdgesChange: graphModel.onEdgesChange,
      onViewportChange: persistence.handleViewportChange,
      onDrop: handleDrop,
      onDragOver: handleDragOver,
      onToggleFrozenNode: (nodeId: string) => toggleFrozenCanvasNode(layoutKey, nodeId),
      onSourceImportComplete: handleSourceImportComplete,
      onImportedNodeFocusComplete: () => setImportedNodeFocusIds([]),
    },
    chromeCommands: {
      onHideInspector: () => {
        void flushActiveNodeCode().then((persisted) => {
          if (persisted) {
            hideInspectorPanel();
          }
        });
      },
      onShowInspector: showInspectorPanel,
      onAutoLayout: () => unsupportedSemanticMutation('Automatic semantic layout'),
      onToggleCostOverlay: () => unsupportedSemanticMutation('Cost overlay'),
      onToggleImpact: toggleImpactOverlay,
      onToggleColumns: toggleColumnLevelLineage,
      onGridSizeChange: setGridSize,
      onCanvasPaletteChange: setCanvasPalette,
      onToggleGridVisible: () => setCanvasGridVisible(!canvasGridVisible),
      onGridColorChange: setCanvasGridColor,
      onToggleSnapToGrid: () => setCanvasSnapToGrid(!canvasSnapToGrid),
      onExportProjectSnapshot: () => unsupportedSemanticMutation('Export draft snapshot'),
      onImportProjectSnapshotFile: () => unsupportedSemanticMutation('Import draft snapshot'),
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
    canvasCommands: {
      onSelectCanvas: () => unsupportedSemanticMutation('Select draft canvas'),
    },
  };
}
