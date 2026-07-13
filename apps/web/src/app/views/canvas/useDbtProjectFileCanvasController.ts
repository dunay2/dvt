/** Owned concern: orchestrate the read-only file-authoritative dbt Canvas read model. */
import type { Edge, Node, NodeTypes, ReactFlowProps } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import DbtNodeComponent, { type DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import { getRegisteredPluginIds } from '../../plugins/registry';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { useDbtProjectGraphQuery } from '../../queries/dbtProjectQueries';
import { observePlanRunReadiness } from './canvasPlanReadiness';
import { projectDbtProjectGraphToCanonicalCanvas } from './dbtProjectFileProjection';
import { validateTransformationGraph } from './transformationGraphValidation';
import { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import { useCanvasStoreFacade } from './useCanvasStoreFacade';
import { useCanvasViewportGraphModel } from './useCanvasViewportGraphModel';

const EMPTY_NODE_POSITIONS: Record<string, { x: number; y: number }> = {};
const EMPTY_FROZEN_NODE_IDS: readonly string[] = [];
const EMPTY_CANONICAL_NODES: CanonicalNode[] = [];
const EMPTY_CANONICAL_EDGES: CanonicalEdge[] = [];
const DBT_PROJECT_FILE_NODE_TYPES: NodeTypes = {
  dbtNode: DbtNodeComponent,
};

type ProjectCodeWorkbenchState = Readonly<{
  initialPath?: string;
}> | null;

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

export function useDbtProjectFileCanvasController(
  authorityBinding: DbtProjectFilesAuthorityBinding
) {
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
    setCanvasNodePositions,
    setCanvasSnapToGrid,
    setCanvasViewport,
    setInspectorNode,
    showInspectorPanel,
    toggleColumnLevelLineage,
    toggleFrozenCanvasNode,
    toggleImpactOverlay,
    workspaceLayoutKey,
  } = store;
  const [projectCodeWorkbench, setProjectCodeWorkbench] = useState<ProjectCodeWorkbenchState>(null);
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
  const canonicalNodesById = useMemo(() => buildCanonicalNodeMap(canonicalNodes), [canonicalNodes]);
  const canonicalEdgeIdBySignature = useMemo(
    () => buildCanonicalEdgeIdMap(canonicalEdges),
    [canonicalEdges]
  );
  const visibleNodeIds = useMemo(() => canonicalNodes.map((node) => node.id), [canonicalNodes]);
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
    persistedNodePositions,
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

  const openNodeWorkbench = useCallback(
    (nodeId: string, preferredTabId?: 'general' | 'inputs-outputs' | 'tests' | 'code' | null) => {
      const node = canonicalNodesById.get(nodeId);
      if (node == null) {
        return;
      }

      if (preferredTabId === 'code') {
        setInspectorNode(null);
        hideInspectorPanel();
        setProjectCodeWorkbench(node.path == null ? {} : { initialPath: node.path });
        return;
      }

      setProjectCodeWorkbench(null);
      setInspectorNode(nodeId, preferredTabId ?? 'general');
      showInspectorPanel();
    },
    [canonicalNodesById, hideInspectorPanel, setInspectorNode, showInspectorPanel]
  );
  const nodesWithCommands = useMemo<Node[]>(
    () =>
      graphModel.nodes.map((node) => ({
        ...node,
        data: {
          ...(node.data as DbtNodeData),
          canvasKind: 'dbt',
          canMutateGraph: false,
          onInspectNode: openNodeWorkbench,
        },
      })),
    [graphModel.nodes, openNodeWorkbench]
  );

  useEffect(() => {
    if (inspectorNodeId != null && !canonicalNodesById.has(inspectorNodeId)) {
      setInspectorNode(null);
      hideInspectorPanel();
    }
  }, [canonicalNodesById, hideInspectorPanel, inspectorNodeId, setInspectorNode]);

  const handleSelectionChange = useCallback<
    NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>
  >(() => undefined, []);
  const handleNodeClick = useCallback<NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>>(
    () => undefined,
    []
  );
  const handleDragOver = useCallback<React.DragEventHandler<HTMLDivElement>>((event) => {
    event.dataTransfer.dropEffect = 'none';
  }, []);
  const handleDrop = useCallback<React.DragEventHandler<HTMLDivElement>>((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'none';
  }, []);
  const inspectorNode =
    inspectorNodeId == null ? null : (canonicalNodesById.get(inspectorNodeId) ?? null);
  const transformationValidation = useMemo(
    () =>
      validateTransformationGraph({
        nodes: canonicalNodes,
        edges: canonicalEdges,
        selectedNodeIds: [],
        workspaceNodeIds: visibleNodeIds,
      }),
    [canonicalEdges, canonicalNodes, visibleNodeIds]
  );
  const planRunReadiness = useMemo(
    () =>
      observePlanRunReadiness({
        canRun: false,
        currentPlan: null,
        isCurrentPlanStale: false,
        persistedPreviewIdentityMismatch: false,
        hasPersistedPlanForRun: false,
      }),
    []
  );

  return {
    authorityBinding,
    query,
    projection,
    projectionErrorMessage: query.isError ? buildProjectionErrorMessage(query.error) : null,
    layoutKey,
    projectCodeWorkbench,
    openProjectCode: () => setProjectCodeWorkbench({}),
    closeProjectCode: () => setProjectCodeWorkbench(null),
    canonicalNodes,
    canonicalEdges,
    inspectorNode,
    nodesWithCommands,
    edges: graphModel.edges,
    nodeTypes: DBT_PROJECT_FILE_NODE_TYPES,
    persistedViewport,
    frozenNodeIds,
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
    planRunReadiness,
    registeredPlugins: getRegisteredPluginIds(),
    graphCommands: {
      onNodesChange: graphModel.onNodesChange,
      onNodeDrag: persistence.handleNodeDrag,
      onNodeDragStop: persistence.handleNodeDragStop,
      onEdgesChange: graphModel.onEdgesChange,
      onConnect: () => unsupportedSemanticMutation('Connect nodes'),
      onReconnect: () => unsupportedSemanticMutation('Reconnect nodes'),
      onNodeClick: handleNodeClick,
      onSelectionChange: handleSelectionChange,
      onViewportChange: persistence.handleViewportChange,
      onDrop: handleDrop,
      onDragOver: handleDragOver,
      onToggleFrozenNode: (nodeId: string) => toggleFrozenCanvasNode(layoutKey, nodeId),
      onCreateAuthoringNode: () => unsupportedSemanticMutation('Create node'),
      onSourceImportComplete: () => unsupportedSemanticMutation('Import sources'),
      onImportedNodeFocusComplete: () => undefined,
    },
    chromeCommands: {
      onHideInspector: hideInspectorPanel,
      onShowInspector: showInspectorPanel,
      onAutoLayout: () => unsupportedSemanticMutation('Automatic semantic layout'),
      onToggleCostOverlay: () => unsupportedSemanticMutation('Cost overlay'),
      onToggleImpact: toggleImpactOverlay,
      onToggleColumns: toggleColumnLevelLineage,
      onToggleGridVisible: () => setCanvasGridVisible(!canvasGridVisible),
      onGridColorChange: setCanvasGridColor,
      onToggleSnapToGrid: () => setCanvasSnapToGrid(!canvasSnapToGrid),
      onSetCanvasEmptyStateGuideVisible: () => undefined,
      onExportProjectSnapshot: () => unsupportedSemanticMutation('Export draft snapshot'),
      onImportProjectSnapshotFile: () => unsupportedSemanticMutation('Import draft snapshot'),
      onReloadLatestDraft: () => {
        void query.refetch();
      },
      onPreviewExecutionPlan: () => unsupportedSemanticMutation('Preview execution plan'),
      onRun: () => unsupportedSemanticMutation('Run project'),
    },
    canvasCommands: {
      onSelectCanvas: () => unsupportedSemanticMutation('Select draft canvas'),
      onApplyCanvasPatch: () => unsupportedSemanticMutation('Edit canvas properties'),
      onDeleteActiveCanvas: () => unsupportedSemanticMutation('Delete draft canvas'),
    },
  };
}
