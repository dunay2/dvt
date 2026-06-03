/** Owned concern: compose backend posture, draft-flow composition, and authoring state into one Canvas authoring-runtime seam. */
import { useMemo } from 'react';

import { deriveCanvasAuthoringState } from './canvasAuthoringState';
import type { UseCanvasAuthoringRuntimeArgs } from './canvasAuthoringRuntime.types';
import { deriveCanvasBackendPosture } from './canvasBackendPosture';
import { deriveCanvasDraftAuthTransportPosture } from './canvasDraftAuthTransportPosture';
import { useCanvasAuthoringRuntimeDraftFlow } from './useCanvasAuthoringRuntimeDraftFlow';

export function useCanvasAuthoringRuntime({
  dataSourceMode,
  platformHealthQuery,
  workspaceGraphDraftAuthoringPort,
  workspaceLayoutKey,
  columnLevelLineageEnabled,
  persistedNodePositions,
  selectedNodeIds,
  inspectorNodeId,
  canPersistGraphDraftTransport,
  canMutateGraphTransport,
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
    canPersistGraphDraftTransport && backendPosture.backendAllowsMutations;
  const canMutateDraftGraphTransport = canPersistDraftTransport && canMutateGraphTransport;
  const draftFlow = useCanvasAuthoringRuntimeDraftFlow({
    workspaceGraphDraftAuthoringPort,
    workspaceLayoutKey,
    columnLevelLineageEnabled,
    persistedNodePositions,
    canPersistDraftTransport,
    workspaceScope,
    previewProvenanceConfig,
    setCanvasNodePositions,
  });
  const draftAuthTransportPosture = deriveCanvasDraftAuthTransportPosture({
    draftReadError: draftFlow.graphModel.graphAuthorityQuery.error,
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
        draftReadModel: draftFlow.draftReadModel,
        authTransportPosture: draftAuthTransportPosture,
        canMutateGraphTransport: canMutateDraftGraphTransport,
      }),
    [
      canMutateDraftGraphTransport,
      draftAuthTransportPosture,
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
    draftAuthTransportPosture,
    ...draftFlow,
    ...authoringState,
  };
}
