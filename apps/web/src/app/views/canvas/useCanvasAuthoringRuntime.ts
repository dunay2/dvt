import { useMemo } from 'react';

import type { PlatformHealthSnapshot } from '../../../capabilities/platform-health';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { IWorkspacePort } from '../../ports/workspace';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { deriveCanvasAuthoringState } from './canvasAuthoringState';
import { deriveCanvasBackendPosture } from './canvasBackendPosture';
import { useCanvasAuthoringRuntimeDraftFlow } from './useCanvasAuthoringRuntimeDraftFlow';

export type UseCanvasAuthoringRuntimeArgs = {
  dataSourceMode: 'mock' | 'api';
  platformHealthQuery: {
    isPending: boolean;
    isError: boolean;
    data?: PlatformHealthSnapshot;
    error?: unknown;
  };
  workspaceService: IWorkspacePort;
  workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort;
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
  workspaceScope: WorkspaceScope;
  previewProvenanceConfig: Pick<WorkspaceBootstrapConfig, 'gitBranch' | 'gitSha' | 'gitRepo'>;
  setCanvasNodePositions: (
    workspaceLayoutKey: string,
    positions: Record<string, { x: number; y: number }>
  ) => void;
};

export function useCanvasAuthoringRuntime({
  dataSourceMode,
  platformHealthQuery,
  workspaceService,
  workspaceGraphDraftAuthoringPort,
  workspaceLayoutKey,
  graphStrategy,
  columnLevelLineageEnabled,
  persistedNodePositions,
  selectedNodeIds,
  inspectorNodeId,
  canEditDraftTransport,
  workspaceScope,
  previewProvenanceConfig,
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
  const draftFlow = useCanvasAuthoringRuntimeDraftFlow({
    workspaceService,
    workspaceGraphDraftAuthoringPort,
    workspaceLayoutKey,
    columnLevelLineageEnabled,
    persistedNodePositions,
    canPersistDraftTransport,
    workspaceScope,
    previewProvenanceConfig,
    setCanvasNodePositions,
  });
  const authoringState = useMemo(
    () =>
      deriveCanvasAuthoringState({
        draftSession: draftFlow.draftSession,
        canonicalNodes: draftFlow.graphModel.canonicalNodes,
        canonicalEdges: draftFlow.graphModel.canonicalEdges,
        selectedNodeIds,
        inspectorNodeId,
        draftSaveStatus: draftFlow.draftSaveStatus,
        canPersistDraftTransport,
        draftReadModel: draftFlow.draftReadModel,
      }),
    [
      canPersistDraftTransport,
      draftFlow.draftReadModel,
      draftFlow.draftSaveStatus,
      draftFlow.draftSession,
      draftFlow.graphModel.canonicalEdges,
      draftFlow.graphModel.canonicalNodes,
      inspectorNodeId,
      selectedNodeIds,
    ]
  );

  return {
    backendPosture,
    ...draftFlow,
    ...authoringState,
  };
}
