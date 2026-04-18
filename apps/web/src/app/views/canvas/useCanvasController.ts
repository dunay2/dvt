import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import DbtNodeComponent from '../../components/canvas/DbtNodeComponent';
import type {
  ImportSourcesResult,
  WorkspaceGraphDraft,
  WorkspaceGraphDraftRecord,
  WorkspaceGraphSnapshot,
} from '../../ports/workspace';
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
import {
  addExplicitNode,
  adoptCurrentSnapshot,
  applyConflict,
  applySaveSuccess,
  bootstrapSession,
  createBootstrappingCanvasDraftSession,
  markRemoteDraftMissing,
  markSaving,
  queueExplicitNodeIds,
  reconcileSnapshot,
  reloadFromRemote,
  removeNode,
  replaceEdges,
  serializeWorkspaceGraphDraft,
  type CanvasDraftSession,
  type CanvasDraftEdge,
} from './canvasDraftSession';
import {
  areNodeIdsEqual,
  deriveExecutionScope,
  deriveVisibleScope,
  reconcileUiScope,
} from './canvasDraftScope';
import {
  deriveCanvasDraftToolbarState,
  deriveDraftRecoveryReason,
} from './canvasDraftPresentationState';
import { useCanvasExecutionActions } from './useCanvasExecutionActions';
import { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import { useCanvasGraphModel } from './useCanvasGraphModel';
import { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import { useCanvasNavigationActions } from './useCanvasNavigationActions';
import { useCanvasOverlayModel } from './useCanvasOverlayModel';
import { useCanvasStoreFacade } from './useCanvasStoreFacade';
import { createCanvasDraftRepository } from './canvasDraftRepository';
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

function mapCanvasEdgesToDraftEdges(
  edges: Array<{ source: string; target: string }>
): CanvasDraftEdge[] {
  return edges.map((edge) => ({
    sourceId: edge.source,
    targetId: edge.target,
  }));
}

function buildCanonicalSnapshotFromWorkspaceSnapshot(
  graphSnapshot: WorkspaceGraphSnapshot,
  graphStrategy: ReturnType<typeof resolveCanvasGraphStrategy>
): {
  canonicalNodeIds: string[];
  canonicalEdges: CanvasDraftEdge[];
} {
  const canonicalNodeIds = [
    ...new Set(
      graphSnapshot.nodes.flatMap((node) => {
        const canonicalNode = graphStrategy.mapNodeToCanonical(node);
        return canonicalNode == null ? [] : [canonicalNode.id];
      })
    ),
  ];
  const canonicalNodeIdSet = new Set(canonicalNodeIds);
  const canonicalEdges: CanvasDraftEdge[] = [];
  const seenEdgeSignatures = new Set<string>();

  for (const edge of graphSnapshot.edges) {
    const canonicalEdge = graphStrategy.mapEdgeToCanonical(edge);
    if (
      canonicalEdge == null ||
      !canonicalNodeIdSet.has(canonicalEdge.sourceId) ||
      !canonicalNodeIdSet.has(canonicalEdge.targetId)
    ) {
      continue;
    }

    const signature = `${canonicalEdge.sourceId}::${canonicalEdge.targetId}`;
    if (seenEdgeSignatures.has(signature)) {
      continue;
    }

    seenEdgeSignatures.add(signature);
    canonicalEdges.push({
      sourceId: canonicalEdge.sourceId,
      targetId: canonicalEdge.targetId,
    });
  }

  return {
    canonicalNodeIds,
    canonicalEdges,
  };
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
  const draftRepository = useMemo(
    () => createCanvasDraftRepository(workspaceService),
    [workspaceService]
  );
  const plansService = usePlansService();
  const runsService = useRunsService();
  const sessionContext = useSessionContext();
  const shellFeedback = useShellFeedback();
  const workspaceBootstrapConfig = useMemo(() => resolveWorkspaceBootstrapConfig(), []);
  const navigationActions = useCanvasNavigationActions();
  const store = useCanvasStoreFacade();
  const [importedNodeFocusIds, setImportedNodeFocusIds] = useState<string[]>([]);
  const [draftSession, setDraftSession] = useState<CanvasDraftSession>(
    createBootstrappingCanvasDraftSession
  );
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveDebounceTimerRef = useRef<number | null>(null);
  const lastSavedSignatureRef = useRef<string | null>(null);
  const saveAttemptGenerationRef = useRef(0);
  const nextSaveAttemptIdRef = useRef(0);
  const activeSaveAttemptRef = useRef<{ id: number; generation: number } | null>(null);
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

  const graphDraftQuery = useQuery({
    queryKey: queryKeys.workspace.graphDraft(store.workspaceLayoutKey),
    queryFn: () => draftRepository.readGraphDraft(),
  });
  const graphModel = useCanvasGraphModel({
    workspaceLayoutKey: store.workspaceLayoutKey,
    visibleNodeIds: draftSession.workingSet.visibleNodeIds,
    visibleEdges: draftSession.workingSet.visibleEdges,
    workspaceService,
    graphStrategy,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    persistedNodePositions: store.persistedNodePositions,
  });

  const canonicalSnapshot = useMemo(
    () => ({
      canonicalNodeIds: graphModel.canonicalNodes.map((node) => node.id),
      canonicalEdges: graphModel.canonicalEdges.map((edge) => ({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
      })),
    }),
    [graphModel.canonicalEdges, graphModel.canonicalNodes]
  );

  const visibleScope = useMemo(
    () =>
      deriveVisibleScope({
        draftSession,
        canonicalNodes: graphModel.canonicalNodes,
        canonicalEdges: graphModel.canonicalEdges,
    }),
    [draftSession, graphModel.canonicalEdges, graphModel.canonicalNodes]
  );
  const isMissingRemoteDraft = draftSession.syncState === 'missing_remote';
  const isStaleDraftConflict = draftSession.syncState === 'conflict';
  const hasDraftProjectionGap =
    draftSession.syncState !== 'bootstrapping' && !visibleScope.isProjectionComplete;
  const draftRecoveryReason = deriveDraftRecoveryReason({
    hasMissingRemoteDraft: isMissingRemoteDraft,
    hasStaleDraftVersion: isStaleDraftConflict,
    hasDraftProjectionGap,
  });
  const draftToolbarState = deriveCanvasDraftToolbarState({
    draftSaveStatus,
    recoveryReason: draftRecoveryReason,
  });
  const isDraftRecoveryBlocked =
    isMissingRemoteDraft || isStaleDraftConflict || hasDraftProjectionGap;
  const canMutateGraph =
    store.userPermissions.canEditEdges &&
    (dataSourceMode !== 'api' || (!isBackendCheckPending && backendReady)) &&
    !isDraftRecoveryBlocked;
  const canPersistGraphDraft = canMutateGraph;
  const uiScope = useMemo(
    () =>
      draftSession.syncState === 'bootstrapping'
        ? {
            selectedNodeIds: store.selectedNodeIds,
            inspectorNodeId: store.inspectorNodeId,
          }
        : reconcileUiScope({
            visibleScope,
            pendingExplicitNodeIds: draftSession.workingSet.pendingExplicitNodeIds,
            selectedNodeIds: store.selectedNodeIds,
            inspectorNodeId: store.inspectorNodeId,
          }),
    [
      draftSession.syncState,
      draftSession.workingSet.pendingExplicitNodeIds,
      store.inspectorNodeId,
      store.selectedNodeIds,
      visibleScope,
    ]
  );
  const executionScope = useMemo(
    () =>
      deriveExecutionScope({
        visibleScope,
        selectedNodeIds: uiScope.selectedNodeIds,
      }),
    [uiScope.selectedNodeIds, visibleScope]
  );

  const overlayModel = useCanvasOverlayModel({
    canonicalNodes: graphModel.canonicalNodes,
    currentRun: store.currentRun,
    capabilities,
    edges: graphModel.edges,
    selectedNodeIds: uiScope.selectedNodeIds,
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
    selectedNodeIds: uiScope.selectedNodeIds,
    inspectorNodeId: uiScope.inspectorNodeId,
    canEditEdges: canMutateGraph,
    focusMode: store.focusMode,
    inspectorPanelVisible: store.inspectorPanelVisible,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    setNodes: graphModel.setNodes,
    setEdges: graphModel.setEdges,
    setSelectedNodes: store.setSelectedNodes,
    setInspectorNode: store.setInspectorNode,
    toggleInspectorPanel: store.toggleInspectorPanel,
    onLayoutComplete: persistence.handleNodePositionsSave,
    onNodeAddedToCanvas: (nodeId) => {
      setDraftSession((currentSession) => addExplicitNode(currentSession, nodeId));
    },
    onNodeRemovedFromCanvas: (nodeId) => {
      setDraftSession((currentSession) => removeNode(currentSession, nodeId));
    },
    onVisibleEdgesChanged: (edges) => {
      setDraftSession((currentSession) => replaceEdges(currentSession, edges));
    },
  });

  const executionActions = useCanvasExecutionActions({
    plansService,
    runsService,
    workspaceService,
    canonicalNodes: visibleScope.canonicalNodes,
    canonicalEdges: visibleScope.canonicalEdges,
    selectedNodeIds: executionScope.selectedNodeIds,
    workspaceNodeIds: executionScope.workspaceNodeIds,
    canPlan: store.userPermissions.canPlan && !isDraftRecoveryBlocked,
    canRun: store.userPermissions.canRun && !isDraftRecoveryBlocked,
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
        nodes: visibleScope.canonicalNodes,
        edges: visibleScope.canonicalEdges,
        selectedNodeIds: executionScope.selectedNodeIds,
        workspaceNodeIds: executionScope.workspaceNodeIds,
      }),
    [
      executionScope.selectedNodeIds,
      executionScope.workspaceNodeIds,
      visibleScope.canonicalEdges,
      visibleScope.canonicalNodes,
    ]
  );

  const currentDraftPayload = useMemo<WorkspaceGraphDraft>(() => {
    const currentNodePositions = Object.fromEntries(
      graphModel.nodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }])
    );
    const visibleNodeIds = draftSession.workingSet.visibleNodeIds.filter(
      (nodeId) => currentNodePositions[nodeId] != null
    );
    const visibleNodeIdSet = new Set(visibleNodeIds);
    const nodePositions: Record<string, { x: number; y: number }> = {};

    for (const nodeId of visibleNodeIds) {
      const position = currentNodePositions[nodeId];
      if (position != null) {
        nodePositions[nodeId] = position;
      }
    }

    return {
      nodeIds: visibleNodeIds,
      nodePositions,
      edges: draftSession.workingSet.visibleEdges.filter(
        (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
      ),
    };
  }, [draftSession.workingSet.visibleEdges, draftSession.workingSet.visibleNodeIds, graphModel.nodes]);

  const currentDraftSignature = useMemo(
    () => serializeWorkspaceGraphDraft(currentDraftPayload),
    [currentDraftPayload]
  );
  const invalidateInFlightSaveAttempt = useCallback(() => {
    saveAttemptGenerationRef.current += 1;
    activeSaveAttemptRef.current = null;
  }, []);
  const applyReloadedRemoteDraft = useCallback(
    (
      remoteDraft: WorkspaceGraphDraftRecord | null,
      reloadedCanonicalSnapshot: {
        canonicalNodeIds: string[];
        canonicalEdges: CanvasDraftEdge[];
      }
    ) => {
      queryClient.setQueryData(queryKeys.workspace.graphDraft(store.workspaceLayoutKey), remoteDraft);
      setDraftSaveStatus('idle');

      if (remoteDraft == null) {
        lastSavedSignatureRef.current = null;
        setDraftSession((currentSession) => markRemoteDraftMissing(currentSession));
        return;
      }

      store.setCanvasNodePositions(store.workspaceLayoutKey, remoteDraft.draft.nodePositions);
      lastSavedSignatureRef.current = serializeWorkspaceGraphDraft(remoteDraft.draft);
      setDraftSession((currentSession) =>
        reconcileSnapshot(reloadFromRemote(currentSession, remoteDraft), reloadedCanonicalSnapshot)
      );
    },
    [queryClient, store.setCanvasNodePositions, store.workspaceLayoutKey]
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

    if (draftSession.syncState === 'bootstrapping') {
      const remoteDraft = graphDraftQuery.data ?? null;

      if (remoteDraft != null) {
        store.setCanvasNodePositions(store.workspaceLayoutKey, remoteDraft.draft.nodePositions);
        lastSavedSignatureRef.current = serializeWorkspaceGraphDraft(remoteDraft.draft);
      } else {
        lastSavedSignatureRef.current = null;
      }

      setDraftSession(
        bootstrapSession({
          remoteDraft,
          canonicalNodeIds: canonicalSnapshot.canonicalNodeIds,
          canonicalEdges: canonicalSnapshot.canonicalEdges,
        })
      );
      setDraftSaveStatus('idle');
      return;
    }

    if (graphDraftQuery.data == null && draftSession.baseline.record != null) {
      invalidateInFlightSaveAttempt();
      lastSavedSignatureRef.current = null;
      setDraftSaveStatus('idle');
      setDraftSession((currentSession) => markRemoteDraftMissing(currentSession));
    }
  }, [
    canonicalSnapshot,
    draftSession.baseline.record,
    draftSession.syncState,
    graphDraftQuery.data,
    graphDraftQuery.isError,
    graphDraftQuery.isPending,
    graphModel.graphSnapshotQuery.isError,
    graphModel.graphSnapshotQuery.isPending,
    invalidateInFlightSaveAttempt,
    store.setCanvasNodePositions,
    store.workspaceLayoutKey,
  ]);

  useEffect(() => {
    if (graphModel.graphSnapshotQuery.isPending || graphModel.graphSnapshotQuery.isError) {
      return;
    }
    if (draftSession.syncState === 'bootstrapping') {
      return;
    }

    setDraftSession((currentSession) => reconcileSnapshot(currentSession, canonicalSnapshot));
  }, [
    canonicalSnapshot,
    draftSession.syncState,
    graphModel.graphSnapshotQuery.isError,
    graphModel.graphSnapshotQuery.isPending,
  ]);

  useEffect(() => {
    if (draftSession.syncState === 'bootstrapping') {
      return;
    }

    if (!areNodeIdsEqual(store.selectedNodeIds, uiScope.selectedNodeIds)) {
      store.setSelectedNodes(uiScope.selectedNodeIds);
    }
    if (store.inspectorNodeId !== uiScope.inspectorNodeId) {
      store.setInspectorNode(uiScope.inspectorNodeId);
    }
  }, [
    store.inspectorNodeId,
    store.selectedNodeIds,
    store.setInspectorNode,
    store.setSelectedNodes,
    draftSession.syncState,
    uiScope.inspectorNodeId,
    uiScope.selectedNodeIds,
  ]);

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
    if (draftSession.syncState !== 'editing') {
      if (draftSaveStatus === 'saving') {
        setDraftSaveStatus('idle');
      }
      return;
    }
    if (currentDraftSignature === lastSavedSignatureRef.current) {
      if (draftSaveStatus !== 'idle') {
        setDraftSaveStatus('idle');
      }
      return;
    }

    if (saveDebounceTimerRef.current != null) {
      window.clearTimeout(saveDebounceTimerRef.current);
    }

    saveDebounceTimerRef.current = window.setTimeout(() => {
      const saveAttempt = {
        id: nextSaveAttemptIdRef.current + 1,
        generation: saveAttemptGenerationRef.current,
      };

      nextSaveAttemptIdRef.current = saveAttempt.id;
      activeSaveAttemptRef.current = saveAttempt;
      setDraftSession((currentSession) => markSaving(currentSession));
      setDraftSaveStatus('saving');
      void draftRepository
        .saveGraphDraft({
          draft: currentDraftPayload,
          expectedRevision: draftSession.draftRevision,
          idempotencyKey: createDraftIdempotencyKey(),
        })
        .then((result) => {
          const activeSaveAttempt = activeSaveAttemptRef.current;
          const staleSaveResolution =
            activeSaveAttempt == null ||
            activeSaveAttempt.id !== saveAttempt.id ||
            activeSaveAttempt.generation !== saveAttempt.generation ||
            saveAttemptGenerationRef.current !== saveAttempt.generation;
          if (staleSaveResolution) {
            return;
          }

          activeSaveAttemptRef.current = null;
          if (result.outcome === 'conflict') {
            queryClient.setQueryData(
              queryKeys.workspace.graphDraft(store.workspaceLayoutKey),
              result.current
            );
            setDraftSession((currentSession) => applyConflict(currentSession, result.current));
            setDraftSaveStatus('idle');
            return;
          }

          const savedSignature = serializeWorkspaceGraphDraft(result.record.draft);
          queryClient.setQueryData(
            queryKeys.workspace.graphDraft(store.workspaceLayoutKey),
            result.record
          );
          lastSavedSignatureRef.current = savedSignature;
          setDraftSession((currentSession) => applySaveSuccess(currentSession, result.record));
          setDraftSaveStatus('saved');
        })
        .catch(() => {
          const activeSaveAttempt = activeSaveAttemptRef.current;
          const staleSaveResolution =
            activeSaveAttempt == null ||
            activeSaveAttempt.id !== saveAttempt.id ||
            activeSaveAttempt.generation !== saveAttempt.generation ||
            saveAttemptGenerationRef.current !== saveAttempt.generation;
          if (staleSaveResolution) {
            return;
          }

          activeSaveAttemptRef.current = null;
          setDraftSession((currentSession) =>
            currentSession.syncState === 'saving'
              ? {
                  ...currentSession,
                  syncState: 'editing',
                }
              : currentSession
          );
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
    draftSaveStatus,
    draftSession.draftRevision,
    draftSession.syncState,
    graphDraftQuery.isError,
    graphDraftQuery.isPending,
    graphModel.graphSnapshotQuery.isError,
    graphModel.graphSnapshotQuery.isPending,
    queryClient,
    draftRepository,
    store.workspaceLayoutKey,
  ]);

  const reloadLatestDraft = useCallback(() => {
    if (saveDebounceTimerRef.current != null) {
      window.clearTimeout(saveDebounceTimerRef.current);
    }
    invalidateInFlightSaveAttempt();
    const reloadGeneration = saveAttemptGenerationRef.current;
    const graphDraftKey = queryKeys.workspace.graphDraft(store.workspaceLayoutKey);
    const graphKey = queryKeys.workspace.graph(store.workspaceLayoutKey);
    setDraftSaveStatus('idle');
    void Promise.all([
      queryClient.cancelQueries({
        queryKey: graphDraftKey,
      }),
      queryClient.cancelQueries({
        queryKey: graphKey,
      }),
    ])
      .then(async () =>
        await Promise.all([
          queryClient.fetchQuery<WorkspaceGraphDraftRecord | null>({
            queryKey: graphDraftKey,
            queryFn: () => draftRepository.readGraphDraft(),
          }),
          queryClient.fetchQuery<WorkspaceGraphSnapshot>({
            queryKey: graphKey,
            queryFn: () => draftRepository.readGraphSnapshot(),
          }),
        ])
      )
      .then(([remoteDraft, graphSnapshot]) => {
        if (saveAttemptGenerationRef.current !== reloadGeneration) {
          return;
        }

        applyReloadedRemoteDraft(
          remoteDraft,
          buildCanonicalSnapshotFromWorkspaceSnapshot(graphSnapshot, graphStrategy)
        );
      })
      .catch(() => {
        if (saveAttemptGenerationRef.current !== reloadGeneration) {
          return;
        }

        setDraftSaveStatus('idle');
      });
  }, [
    applyReloadedRemoteDraft,
    graphStrategy,
    invalidateInFlightSaveAttempt,
    queryClient,
    draftRepository,
    store.workspaceLayoutKey,
  ]);

  const adoptCurrentWorkspaceSnapshot = useCallback(() => {
    if (saveDebounceTimerRef.current != null) {
      window.clearTimeout(saveDebounceTimerRef.current);
    }
    invalidateInFlightSaveAttempt();
    lastSavedSignatureRef.current = null;
    setDraftSaveStatus('idle');
    setDraftSession((currentSession) => adoptCurrentSnapshot(currentSession, canonicalSnapshot));
  }, [canonicalSnapshot, invalidateInFlightSaveAttempt]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const nextNodes = applyNodeChanges(changes, graphModel.nodes);
      const nextNodeIds = new Set(nextNodes.map((node) => node.id));
      const removedNodeIds = graphModel.nodes
        .map((node) => node.id)
        .filter((nodeId) => !nextNodeIds.has(nodeId));
      const nextEdges = removedNodeIds.length
        ? graphModel.edges.filter(
            (edge) => nextNodeIds.has(edge.source) && nextNodeIds.has(edge.target)
          )
        : graphModel.edges;

      graphModel.setNodes(nextNodes);
      if (removedNodeIds.length > 0) {
        const nextSelectedNodeIds = store.selectedNodeIds.filter(
          (nodeId) => !removedNodeIds.includes(nodeId)
        );
        graphModel.setEdges(nextEdges);
        if (!areNodeIdsEqual(nextSelectedNodeIds, uiScope.selectedNodeIds)) {
          store.setSelectedNodes(nextSelectedNodeIds);
        }
        if (uiScope.inspectorNodeId != null && removedNodeIds.includes(uiScope.inspectorNodeId)) {
          store.setInspectorNode(null);
        }
        setDraftSession((currentSession) => {
          let nextSession = currentSession;
          for (const nodeId of removedNodeIds) {
            nextSession = removeNode(nextSession, nodeId);
          }
          return replaceEdges(nextSession, mapCanvasEdgesToDraftEdges(nextEdges));
        });
      }
    },
    [
      graphModel.edges,
      graphModel.nodes,
      graphModel.setEdges,
      graphModel.setNodes,
      store.setInspectorNode,
      store.setSelectedNodes,
      uiScope.inspectorNodeId,
      uiScope.selectedNodeIds,
    ]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      const nextEdges = applyEdgeChanges(changes, graphModel.edges);

      graphModel.setEdges(nextEdges);
      setDraftSession((currentSession) =>
        replaceEdges(currentSession, mapCanvasEdgesToDraftEdges(nextEdges))
      );
    },
    [graphModel.edges, graphModel.setEdges]
  );

  const nodesWithImpact = useMemo(
    () =>
      buildNodesWithImpact({
        nodes: graphModel.nodes,
        edges: graphModel.edges,
        selectedNodeIds: uiScope.selectedNodeIds,
        impactOverlayEnabled: store.impactOverlayEnabled,
        columnLevelLineageEnabled: store.columnLevelLineageEnabled,
        handlers: {
          onInspectNode: graphHandlers.handleInspectNode,
          onRemoveNode: canMutateGraph ? graphHandlers.handleRemoveNode : undefined,
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
      canMutateGraph,
      graphHandlers.handleInspectNode,
      graphHandlers.handleRemoveNode,
      graphHandlers.handleToggleNodeSelection,
      graphModel.edges,
      graphModel.nodes,
      overlayModel.activeRunId,
      overlayModel.overlayDecorations,
      overlayModel.runStatusByNodeId,
      store.columnLevelLineageEnabled,
      store.impactOverlayEnabled,
      uiScope.selectedNodeIds,
    ]
  );

  const handleSourceImportComplete = useCallback(
    (result: ImportSourcesResult) => {
      if (!canMutateGraph) {
        return;
      }

      const nextImportedNodeIds = result.importedNodeIds ?? [];
      store.setCurrentPlan(null);

      if (nextImportedNodeIds.length > 0) {
        setDraftSession((currentSession) =>
          queueExplicitNodeIds(currentSession, nextImportedNodeIds)
        );
        store.setSelectedNodes(nextImportedNodeIds);
        store.setInspectorNode(nextImportedNodeIds[0] ?? null);
        store.showInspectorPanel();
        setImportedNodeFocusIds(nextImportedNodeIds);
      }

      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspace.graph(store.workspaceLayoutKey),
      });
    },
    [
      canMutateGraph,
      queryClient,
      store.setCurrentPlan,
      store.setInspectorNode,
      store.setSelectedNodes,
      store.showInspectorPanel,
      store.workspaceLayoutKey,
    ]
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
    inspectorNode: uiScope.inspectorNodeId
      ? (graphModel.canonicalNodesById.get(uiScope.inspectorNodeId) ?? null)
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
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
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
    canStartRun: executionActions.canStartRun && !isDraftRecoveryBlocked,
    planStatusSummary: executionActions.planStatusSummary,
    exclusiveOverlayMode: overlayModel.exclusiveOverlayMode,
    canUseCostOverlay: overlayModel.canUseCostOverlay,
    impactOverlayEnabled: store.impactOverlayEnabled,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    transformationValidation,
    planModalOpen: executionActions.planModalOpen,
    setPlanModalOpen: executionActions.setPlanModalOpen,
    draftSaveStatus,
    draftRecoveryReason,
    draftToolbarState,
    draftConflictRevision:
      draftSession.syncState === 'conflict' ? draftSession.draftRevision : null,
    hasStaleDraftVersion: isStaleDraftConflict,
    hasMissingRemoteDraft: isMissingRemoteDraft,
    hasDraftProjectionGap,
    reloadLatestDraft,
    adoptCurrentWorkspaceSnapshot,
    currentPlan: store.currentPlan,
    confirmEdgeModal: graphHandlers.confirmEdgeModal,
    setConfirmEdgeModal: graphHandlers.setConfirmEdgeModal,
    confirmEdgeCreation: graphHandlers.confirmEdgeCreation,
  };
}
