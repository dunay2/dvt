/** Owned concern: compose backend posture, draft-flow composition, and authoring state into one Canvas authoring-runtime seam. */
import { useMemo } from 'react';

import { deriveCanvasAuthoringState } from './canvasAuthoringState';
import type { UseCanvasAuthoringRuntimeArgs } from './canvasAuthoringRuntime.types';
import { deriveCanvasBackendPosture } from './canvasBackendPosture';
import { useCanvasAuthoringRuntimeDraftFlow } from './useCanvasAuthoringRuntimeDraftFlow';

export function useCanvasAuthoringRuntime({
  dataSourceMode,
  platformHealthQuery,
  workspaceService,
  workspaceGraphDraftAuthoringPort,
  workspaceLayoutKey,
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
