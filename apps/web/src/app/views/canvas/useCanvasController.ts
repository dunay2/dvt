import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type NodeTypes } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import DbtNodeComponent from '../../components/canvas/DbtNodeComponent';
import type { ImportSourcesResult, WorkspaceGraphDraftRecord } from '../../ports/workspace';
import {
  getPlatformConnectionDetail,
  getPlatformHealthErrorMessageFromQuery,
  isPlatformReady,
  usePlatformHealthSnapshotQuery,
} from '../../../capabilities/platform-health';
import { resolveCanvasGraphStrategy } from '../../plugins/graphStrategyRegistry';
import { queryKeys } from '../../queries/queryKeys';
import { getRegisteredPluginIds } from '../../plugins/registry';
import { useCapabilitiesQuery } from '../../queries/useCapabilitiesQuery';
import { resolveWorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import {
  useAppDataSourceMode,
  usePlansService,
  useRunsService,
  useSessionContext,
  useShellFeedback,
  useWorkspaceService,
} from '../../services/AppServicesContext';
import { buildNodesWithImpact } from './canvasImpactOverlay';
import { useCanvasExecutionActions } from './useCanvasExecutionActions';
import { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import { useCanvasGraphModel } from './useCanvasGraphModel';
import { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import { useCanvasNavigationActions } from './useCanvasNavigationActions';
import { useCanvasOverlayModel } from './useCanvasOverlayModel';
import { useCanvasStoreFacade } from './useCanvasStoreFacade';
import { validateTransformationGraph } from './transformationGraphValidation';

const nodeTypes: NodeTypes = {
  dbtNode: DbtNodeComponent,
};

const DRAFT_SAVE_DEBOUNCE_MS = 400;

function createDraftIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `canvas-draft:${crypto.randomUUID()}`;
  }

  return `canvas-draft:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

function serializeGraphDraft(draft: {
  nodeIds: string[];
  nodePositions: Record<string, { x: number; y: number }>;
  edges: Array<{ sourceId: string; targetId: string }>;
}): string {
  return JSON.stringify({
    nodeIds: [...draft.nodeIds],
    nodePositions: Object.fromEntries(
      Object.entries(draft.nodePositions)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([nodeId, position]) => [nodeId, { x: position.x, y: position.y }])
    ),
    edges: [...draft.edges]
      .map((edge) => ({ sourceId: edge.sourceId, targetId: edge.targetId }))
      .sort(
        (left, right) =>
          left.sourceId.localeCompare(right.sourceId) ||
          left.targetId.localeCompare(right.targetId)
      ),
  });
}

export function useCanvasController() {
  const queryClient = useQueryClient();
  const dataSourceMode = useAppDataSourceMode();
  const { data: capabilities } = useCapabilitiesQuery();
  const platformHealthQuery = usePlatformHealthSnapshotQuery();
  const graphStrategy = useMemo(() => resolveCanvasGraphStrategy(), []);
  const canvasAuthoringMode: 'transformation' | 'dbt' =
    graphStrategy.id === 'transformation' ? 'transformation' : 'dbt';
  const workspaceService = useWorkspaceService();
  const plansService = usePlansService();
  const runsService = useRunsService();
  const sessionContext = useSessionContext();
  const shellFeedback = useShellFeedback();
  const workspaceBootstrapConfig = useMemo(() => resolveWorkspaceBootstrapConfig(), []);
  const navigationActions = useCanvasNavigationActions();
  const [importedNodeFocusIds, setImportedNodeFocusIds] = useState<string[]>([]);
  const isBackendCheckPending =
    dataSourceMode === 'api' &&
    platformHealthQuery.isPending &&
    !platformHealthQuery.data &&
    !platformHealthQuery.isError;
  const backendReady = dataSourceMode !== 'api' || isPlatformReady(platformHealthQuery.data);
  const backendBlockMessage =
    dataSourceMode !== 'api' || isBackendCheckPending || backendReady
      ? null
      : getPlatformConnectionDetail(
            platformHealthQuery.isError ? 'offline' : 'degraded',
            platformHealthQuery.data,
            getPlatformHealthErrorMessageFromQuery(
              platformHealthQuery.isError,
              platformHealthQuery.error
            )
          ) ?? null;

  const store = useCanvasStoreFacade();
  const graphDraftQuery = useQuery({
    queryKey: queryKeys.workspace.graphDraft(store.workspaceLayoutKey),
    queryFn: () => workspaceService.getGraphDraft(),
  });
  const [draftRevision, setDraftRevision] = useState<string | null>(null);
  const [draftConflictRevision, setDraftConflictRevision] = useState<string | null>(null);
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [draftSyncState, setDraftSyncState] = useState<
    'initializing' | 'hydrating_remote' | 'ready' | 'conflict'
  >('initializing');
  const [draftHydrationRecord, setDraftHydrationRecord] = useState<WorkspaceGraphDraftRecord | null>(
    null
  );
  const lastSavedSignatureRef = useRef<string | null>(null);
  const remoteDraftBaselineRef = useRef<{ revision: string | null; signature: string | null }>({
    revision: null,
    signature: null,
  });
  const hasInitializedDraftSyncRef = useRef(false);
  const reloadRemoteDraftRequestedRef = useRef(false);
  const saveDebounceTimerRef = useRef<number | null>(null);
  const canPersistGraphDraft =
    store.userPermissions.canEditEdges &&
    (dataSourceMode !== 'api' || (!isBackendCheckPending && backendReady));
  const activeDraftHydrationRecord =
    draftHydrationRecord ?? (!hasInitializedDraftSyncRef.current ? graphDraftQuery.data ?? null : null);

  const graphModel = useCanvasGraphModel({
    workspaceLayoutKey: store.workspaceLayoutKey,
    draftHydrationRecord: activeDraftHydrationRecord,
    draftModeEnabled: graphDraftQuery.data != null || draftRevision != null,
    workspaceService,
    graphStrategy,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    persistedNodePositions: store.persistedNodePositions,
  });

  const overlayModel = useCanvasOverlayModel({
    canonicalNodes: graphModel.canonicalNodes,
    currentRun: store.currentRun,
    capabilities,
    edges: graphModel.edges,
    selectedNodeIds: store.selectedNodeIds,
  });

  const persistence = useCanvasLayoutPersistence({
    hasHydrated: store._hasHydrated,
    isGraphQueryPending: graphModel.graphSnapshotQuery.isPending,
    workspaceLayoutKey: store.workspaceLayoutKey,
    persistedViewport: store.persistedViewport,
    setCanvasViewport: store.setCanvasViewport,
    setCanvasNodePositions: store.setCanvasNodePositions,
  });

  const graphHandlers = useCanvasGraphHandlers({
    graphStrategy,
    canonicalNodesById: graphModel.canonicalNodesById,
    edges: graphModel.edges,
    nodes: graphModel.nodes,
    selectedNodeIds: store.selectedNodeIds,
    inspectorNodeId: store.inspectorNodeId,
    canEditEdges: store.userPermissions.canEditEdges,
    focusMode: store.focusMode,
    inspectorPanelVisible: store.inspectorPanelVisible,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    setNodes: graphModel.setNodes,
    setEdges: graphModel.setEdges,
    setSelectedNodes: store.setSelectedNodes,
    setInspectorNode: store.setInspectorNode,
    toggleInspectorPanel: store.toggleInspectorPanel,
    onLayoutComplete: persistence.handleNodePositionsSave,
  });

  const executionActions = useCanvasExecutionActions({
    plansService,
    runsService,
    workspaceService,
    canonicalNodes: graphModel.canonicalNodes,
    canonicalEdges: graphModel.canonicalEdges,
    selectedNodeIds: store.selectedNodeIds,
    workspaceNodeIds: graphModel.workspaceNodes.map((node) => node.id),
    canPlan: store.userPermissions.canPlan,
    canRun: store.userPermissions.canRun,
    sessionContext,
    shellFeedback,
    previewProvenanceConfig: workspaceBootstrapConfig,
    consolePanelVisible: store.consolePanelVisible,
    currentPlan: store.currentPlan,
    setCurrentPlan: store.setCurrentPlan,
    setConsolePanelHeight: store.setConsolePanelHeight,
    toggleConsolePanel: store.toggleConsolePanel,
    onRunStarted: navigationActions.handleRunStarted,
  });
  const transformationValidation = useMemo(
    () =>
      validateTransformationGraph({
        nodes: graphModel.canonicalNodes,
        edges: graphModel.canonicalEdges,
        selectedNodeIds: store.selectedNodeIds,
        workspaceNodeIds: graphModel.workspaceNodes.map((node) => node.id),
      }),
    [
      graphModel.canonicalEdges,
      graphModel.canonicalNodes,
      graphModel.workspaceNodes,
      store.selectedNodeIds,
    ]
  );
  const currentDraftPayload = useMemo(
    () => ({
      nodeIds: graphModel.nodes.map((node) => node.id),
      nodePositions: Object.fromEntries(
        graphModel.nodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }])
      ),
      edges: graphModel.edges.map((edge) => ({
        sourceId: edge.source,
        targetId: edge.target,
      })),
    }),
    [graphModel.edges, graphModel.nodes]
  );
  const currentDraftSignature = useMemo(
    () => serializeGraphDraft(currentDraftPayload),
    [currentDraftPayload]
  );
  const hydrationTargetSignature = useMemo(
    () => (draftHydrationRecord ? serializeGraphDraft(draftHydrationRecord.draft) : null),
    [draftHydrationRecord]
  );

  useEffect(() => {
    if (
      graphModel.graphSnapshotQuery.isPending ||
      graphModel.graphSnapshotQuery.isError ||
      graphDraftQuery.isPending ||
      graphDraftQuery.isError
    ) {
      return;
    }

    const remoteRecord = graphDraftQuery.data;
    const remoteSignature = remoteRecord ? serializeGraphDraft(remoteRecord.draft) : null;

    if (!hasInitializedDraftSyncRef.current) {
      hasInitializedDraftSyncRef.current = true;
      remoteDraftBaselineRef.current = {
        revision: remoteRecord?.revision ?? null,
        signature: remoteSignature,
      };
      setDraftRevision(remoteRecord?.revision ?? null);
      if (remoteRecord == null) {
        setDraftSyncState('ready');
        lastSavedSignatureRef.current = null;
        return;
      }

      setDraftHydrationRecord(remoteRecord);
      setDraftSyncState('hydrating_remote');
      return;
    }

    if (reloadRemoteDraftRequestedRef.current) {
      reloadRemoteDraftRequestedRef.current = false;
      remoteDraftBaselineRef.current = {
        revision: remoteRecord?.revision ?? null,
        signature: remoteSignature,
      };
      setDraftRevision(remoteRecord?.revision ?? null);
      if (remoteRecord == null) {
        setDraftHydrationRecord(null);
        setDraftConflictRevision(null);
        setDraftSyncState('ready');
        lastSavedSignatureRef.current = null;
        return;
      }

      setDraftHydrationRecord(remoteRecord);
      setDraftSyncState('hydrating_remote');
      return;
    }

    if (
      remoteRecord != null &&
      remoteRecord.revision !== remoteDraftBaselineRef.current.revision
    ) {
      remoteDraftBaselineRef.current = {
        revision: remoteRecord.revision,
        signature: remoteSignature,
      };
      setDraftRevision(remoteRecord.revision);
    }
  }, [
    graphDraftQuery.data,
    graphDraftQuery.isError,
    graphDraftQuery.isPending,
    graphModel.graphSnapshotQuery.isError,
    graphModel.graphSnapshotQuery.isPending,
  ]);

  useEffect(() => {
    if (draftSyncState !== 'hydrating_remote' || hydrationTargetSignature == null) {
      return;
    }
    if (currentDraftSignature !== hydrationTargetSignature) {
      return;
    }

    lastSavedSignatureRef.current = hydrationTargetSignature;
    setDraftHydrationRecord(null);
    setDraftConflictRevision(null);
    setDraftSaveStatus('idle');
    setDraftSyncState('ready');
  }, [currentDraftSignature, draftSyncState, hydrationTargetSignature]);

  useEffect(() => {
    if (
      graphModel.graphSnapshotQuery.isPending ||
      graphModel.graphSnapshotQuery.isError ||
      graphDraftQuery.isPending ||
      graphDraftQuery.isError
    ) {
      return;
    }
    if (!canPersistGraphDraft) {
      if (saveDebounceTimerRef.current != null) {
        window.clearTimeout(saveDebounceTimerRef.current);
      }
      if (draftSaveStatus !== 'idle') {
        setDraftSaveStatus('idle');
      }
      return;
    }
    if (draftSaveStatus === 'saving') {
      return;
    }
    if (draftSyncState !== 'ready') {
      return;
    }
    const nextSignature = currentDraftSignature;
    if (nextSignature === lastSavedSignatureRef.current) {
      if (draftSaveStatus !== 'idle') {
        setDraftSaveStatus('idle');
      }
      return;
    }

    if (saveDebounceTimerRef.current != null) {
      window.clearTimeout(saveDebounceTimerRef.current);
    }

    saveDebounceTimerRef.current = window.setTimeout(() => {
      setDraftSaveStatus('saving');
      void workspaceService
        .saveGraphDraft({
          draft: currentDraftPayload,
          expectedRevision: draftRevision,
          idempotencyKey: createDraftIdempotencyKey(),
        })
        .then((result) => {
          if (result.outcome === 'conflict') {
            const conflictSignature = serializeGraphDraft(result.current.draft);
            remoteDraftBaselineRef.current = {
              revision: result.current.revision,
              signature: conflictSignature,
            };
            queryClient.setQueryData(
              queryKeys.workspace.graphDraft(store.workspaceLayoutKey),
              result.current
            );
            setDraftConflictRevision(result.current.revision);
            setDraftRevision(result.current.revision);
            setDraftSaveStatus('idle');
            setDraftSyncState('conflict');
            return;
          }

          const savedSignature = serializeGraphDraft(result.record.draft);
          remoteDraftBaselineRef.current = {
            revision: result.record.revision,
            signature: savedSignature,
          };
          queryClient.setQueryData(
            queryKeys.workspace.graphDraft(store.workspaceLayoutKey),
            result.record
          );
          setDraftRevision(result.record.revision);
          setDraftConflictRevision(null);
          lastSavedSignatureRef.current = savedSignature;
          setDraftSaveStatus('saved');
          setDraftSyncState('ready');
        })
        .catch(() => {
          setDraftSaveStatus('idle');
        });
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveDebounceTimerRef.current != null) {
        window.clearTimeout(saveDebounceTimerRef.current);
      }
    };
  }, [
    canPersistGraphDraft,
    currentDraftPayload,
    currentDraftSignature,
    draftRevision,
    draftSaveStatus,
    graphDraftQuery.isPending,
    graphDraftQuery.isError,
    graphModel.graphSnapshotQuery.isError,
    graphModel.graphSnapshotQuery.isPending,
    draftSyncState,
    queryClient,
    store.workspaceLayoutKey,
    workspaceService,
  ]);

  const reloadLatestDraft = useCallback(() => {
    if (saveDebounceTimerRef.current != null) {
      window.clearTimeout(saveDebounceTimerRef.current);
    }
    reloadRemoteDraftRequestedRef.current = true;
    setDraftSaveStatus('idle');
    void queryClient.invalidateQueries({
      queryKey: queryKeys.workspace.graphDraft(store.workspaceLayoutKey),
    });
  }, [queryClient, store.workspaceLayoutKey]);

  const nodesWithImpact = useMemo(
    () =>
      buildNodesWithImpact({
        nodes: graphModel.nodes,
        edges: graphModel.edges,
        selectedNodeIds: store.selectedNodeIds,
        impactOverlayEnabled: store.impactOverlayEnabled,
        columnLevelLineageEnabled: store.columnLevelLineageEnabled,
        handlers: {
          onInspectNode: graphHandlers.handleInspectNode,
          onRemoveNode: store.userPermissions.canEditEdges
            ? graphHandlers.handleRemoveNode
            : undefined,
          onToggleNodeSelection: graphHandlers.handleToggleNodeSelection,
        },
      }).map((node) => ({
        ...node,
        data: {
          ...node.data,
          activeRunId: overlayModel.activeRunId,
          runStatusByNodeId: overlayModel.runStatusByNodeId,
          overlayDecoration: overlayModel.overlayDecorations.get(node.id) ?? null,
        },
      })),
    [
      store.columnLevelLineageEnabled,
      graphHandlers.handleInspectNode,
      graphHandlers.handleRemoveNode,
      graphHandlers.handleToggleNodeSelection,
      graphModel.edges,
      graphModel.nodes,
      store.impactOverlayEnabled,
      store.userPermissions.canEditEdges,
      overlayModel.activeRunId,
      overlayModel.overlayDecorations,
      overlayModel.runStatusByNodeId,
      store.selectedNodeIds,
    ]
  );

  const handleSourceImportComplete = useCallback(
    (result: ImportSourcesResult) => {
      const nextImportedNodeIds = result.importedNodeIds ?? [];
      store.setCurrentPlan(null);

      if (nextImportedNodeIds.length > 0) {
        store.setSelectedNodes(nextImportedNodeIds);
        store.setInspectorNode(nextImportedNodeIds[0] ?? null);
        store.showInspectorPanel();
        setImportedNodeFocusIds(nextImportedNodeIds);
      }

      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspace.graph(store.workspaceLayoutKey),
      });
    },
    [queryClient, store]
  );

  const handleImportedNodeFocusComplete = useCallback(() => {
    setImportedNodeFocusIds([]);
  }, []);

  return {
    dataSourceMode,
    isBackendCheckPending,
    backendReady,
    backendBlockMessage,
    isLoadingGraph: graphModel.graphSnapshotQuery.isPending,
    graphErrorMessage:
      graphModel.graphSnapshotQuery.error instanceof Error
        ? graphModel.graphSnapshotQuery.error.message
        : null,
    focusMode: store.focusMode,
    explorerPanelVisible: store.explorerPanelVisible,
    inspectorPanelVisible: store.inspectorPanelVisible,
    explorerNodes: graphModel.canonicalNodes,
    inspectorNode: store.inspectorNodeId
      ? (graphModel.canonicalNodesById.get(store.inspectorNodeId) ?? null)
      : null,
    activeRunId: overlayModel.activeRunId,
    registeredPlugins: getRegisteredPluginIds(capabilities),
    userPermissions: store.userPermissions,
    canvasAuthoringMode,
    nodesWithImpact,
    edges: graphModel.edges,
    nodeTypes,
    gridSize: store.gridSize,
    canvasPalette: store.canvasPalette,
    viewport: store.persistedViewport,
    onNodesChange: graphModel.onNodesChange,
    onEdgesChange: graphModel.onEdgesChange,
    onConnect: graphHandlers.onConnect,
    handleNodeClick: graphHandlers.handleNodeClick,
    onSelectionChange: graphHandlers.onSelectionChange,
    handleViewportChange: persistence.handleViewportChange,
    handleNodeDragStop: persistence.handleNodeDragStop,
    handleDrop: graphHandlers.handleDrop,
    handleDragOver: graphHandlers.handleDragOver,
    handleSourceImportComplete,
    importedNodeFocusIds,
    handleImportedNodeFocusComplete,
    hideExplorerPanel: store.hideExplorerPanel,
    showExplorerPanel: store.showExplorerPanel,
    hideInspectorPanel: store.hideInspectorPanel,
    showInspectorPanel: store.showInspectorPanel,
    handleAutoLayout: graphHandlers.handleAutoLayout,
    handleToggleCostOverlay: overlayModel.handleToggleCostOverlay,
    toggleImpactOverlay: store.toggleImpactOverlay,
    toggleColumnLevelLineage: store.toggleColumnLevelLineage,
    handlePlan: executionActions.handlePlan,
    handleStartRun: executionActions.handleStartRun,
    canStartRun: executionActions.canStartRun,
    planStatusSummary: executionActions.planStatusSummary,
    exclusiveOverlayMode: overlayModel.exclusiveOverlayMode,
    canUseCostOverlay: overlayModel.canUseCostOverlay,
    impactOverlayEnabled: store.impactOverlayEnabled,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    transformationValidation,
    planModalOpen: executionActions.planModalOpen,
    setPlanModalOpen: executionActions.setPlanModalOpen,
    draftSaveStatus,
    draftConflictRevision,
    hasStaleDraftVersion: draftConflictRevision != null,
    reloadLatestDraft,
    currentPlan: store.currentPlan,
    confirmEdgeModal: graphHandlers.confirmEdgeModal,
    setConfirmEdgeModal: graphHandlers.setConfirmEdgeModal,
    confirmEdgeCreation: graphHandlers.confirmEdgeCreation,
  };
}
