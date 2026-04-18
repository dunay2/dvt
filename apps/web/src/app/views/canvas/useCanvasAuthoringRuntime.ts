import { useMemo, useState } from 'react';

import type { PlatformHealthSnapshot } from '../../../capabilities/platform-health';
import type { IWorkspacePort } from '../../ports/workspace';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createBootstrappingCanvasDraftSession } from './canvasDraftSession';
import { deriveCanvasAuthoringState } from './canvasAuthoringState';
import { deriveCanvasBackendPosture } from './canvasBackendPosture';
import { useCanvasAuthoringProjection } from './useCanvasAuthoringProjection';
import { useCanvasDraftBaseline } from './useCanvasDraftBaseline';
import { useCanvasDraftLifecycle } from './useCanvasDraftLifecycle';

type UseCanvasAuthoringRuntimeArgs = {
  dataSourceMode: 'mock' | 'api';
  platformHealthQuery: {
    isPending: boolean;
    isError: boolean;
    data?: PlatformHealthSnapshot;
    error?: unknown;
  };
  workspaceService: IWorkspacePort;
  workspaceLayoutKey: string;
  graphStrategy: {
    mapNodeToCanonical: (node: { id: string }) => CanonicalNode | null;
    mapEdgeToCanonical: (edge: { id: string }) => CanonicalEdge | null;
    id: string;
  };
  columnLevelLineageEnabled: boolean;
  persistedNodePositions: Record<string, { x: number; y: number }>;
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
  canEditDraftTransport: boolean;
  setCanvasNodePositions: (
    workspaceLayoutKey: string,
    positions: Record<string, { x: number; y: number }>
  ) => void;
};

export function useCanvasAuthoringRuntime({
  dataSourceMode,
  platformHealthQuery,
  workspaceService,
  workspaceLayoutKey,
  graphStrategy,
  columnLevelLineageEnabled,
  persistedNodePositions,
  selectedNodeIds,
  inspectorNodeId,
  canEditDraftTransport,
  setCanvasNodePositions,
}: UseCanvasAuthoringRuntimeArgs) {
  const backendPosture = useMemo(
    () =>
      deriveCanvasBackendPosture({
        dataSourceMode,
        platformHealthQuery,
      }),
    [dataSourceMode, platformHealthQuery]
  );
  const canPersistDraftTransport =
    canEditDraftTransport && backendPosture.backendAllowsMutations;
  const [draftSession, setDraftSession] = useState(createBootstrappingCanvasDraftSession);

  const { queryClient, draftRepository, graphDraftQuery } = useCanvasDraftBaseline({
    workspaceService,
    workspaceLayoutKey,
  });

  const { graphModel, canonicalSnapshot } = useCanvasAuthoringProjection({
    workspaceLayoutKey,
    visibleNodeIds: draftSession.workingSet.visibleNodeIds,
    visibleEdges: draftSession.workingSet.visibleEdges,
    workspaceService,
    graphStrategy,
    columnLevelLineageEnabled,
    persistedNodePositions,
  });
  const {
    draftSaveStatus,
    reloadLatestDraft,
    adoptCurrentWorkspaceSnapshot,
  } = useCanvasDraftLifecycle({
    draftRepository,
    graphDraftQuery,
    queryClient,
    workspaceLayoutKey,
    draftSession,
    setDraftSession,
    canonicalSnapshot,
    graphNodes: graphModel.nodes,
    graphSnapshotQuery: {
      isPending: graphModel.graphSnapshotQuery.isPending,
      isError: graphModel.graphSnapshotQuery.isError,
    },
    canPersistGraphDraft: canPersistDraftTransport,
    setCanvasNodePositions,
    graphStrategy,
  });
  const authoringState = useMemo(
    () =>
      deriveCanvasAuthoringState({
        draftSession,
        canonicalNodes: graphModel.canonicalNodes,
        canonicalEdges: graphModel.canonicalEdges,
        selectedNodeIds,
        inspectorNodeId,
        draftSaveStatus,
        canPersistDraftTransport,
      }),
    [
      canPersistDraftTransport,
      draftSaveStatus,
      draftSession,
      graphModel.canonicalEdges,
      graphModel.canonicalNodes,
      inspectorNodeId,
      selectedNodeIds,
    ]
  );

  return {
    backendPosture,
    graphModel,
    draftSession,
    setDraftSession,
    draftSaveStatus,
    reloadLatestDraft,
    adoptCurrentWorkspaceSnapshot,
    ...authoringState,
  };
}
