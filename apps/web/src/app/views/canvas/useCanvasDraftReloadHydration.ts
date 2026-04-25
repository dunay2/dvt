import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { WorkspaceGraphDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { DraftSaveStatus } from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';
import { buildLocalNodeCatalogFromSemanticGraph } from './canvasDraftLocalNodeCatalog';
import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftReadModel } from './canvasDraftReadModel';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { serializeCanvasDraftAuthoringBaselineSignature } from './canvasDraftAuthoring';

function hasPersistedNodePositions(
  nodePositions: Record<string, { x: number; y: number }>
): boolean {
  return Object.keys(nodePositions).length > 0;
}

type UseCanvasDraftReloadHydrationArgs = {
  draftQueryCache: CanvasDraftQueryCache;
  workspaceLayoutKey: string;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  setCanvasNodePositions: (
    workspaceLayoutKey: string,
    positions: Record<string, { x: number; y: number }>
  ) => void;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  lastSavedSignatureRef: { current: string | null };
  lastAuthoritativeSemanticGraphRef: {
    current: WorkspaceGraphDraftSemanticGraph | null;
  };
};

export function useCanvasDraftReloadHydration({
  draftQueryCache,
  workspaceLayoutKey,
  setDraftSession,
  setCanvasNodePositions,
  setDraftSaveStatus,
  lastSavedSignatureRef,
  lastAuthoritativeSemanticGraphRef,
}: UseCanvasDraftReloadHydrationArgs) {
  return useCallback(
    (
      remoteDraftState: CanvasDraftReadModel,
      reloadedCanonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot
    ) => {
      draftQueryCache.replaceRemoteDraftState(remoteDraftState);
      setDraftSaveStatus('idle');
      const remoteDraft = remoteDraftState.record;

      if (remoteDraft == null) {
        lastSavedSignatureRef.current = null;
        setDraftSession((currentSession) =>
          canvasDraftSession.machine.markRemoteDraftMissing(
            currentSession,
            buildLocalNodeCatalogFromSemanticGraph(
              lastAuthoritativeSemanticGraphRef.current,
              currentSession.workingSet.visibleNodeIds
            )
          )
        );
        return;
      }

      if (hasPersistedNodePositions(remoteDraft.draft.nodePositions)) {
        setCanvasNodePositions(workspaceLayoutKey, remoteDraft.draft.nodePositions);
      }
      lastSavedSignatureRef.current = serializeCanvasDraftAuthoringBaselineSignature({
        record: remoteDraft,
        semanticGraph: remoteDraftState.semanticGraph,
      });
      setDraftSession((currentSession) =>
        canvasDraftSession.workingSet.reconcileSnapshot(
          canvasDraftSession.machine.reloadFromRemote(currentSession, remoteDraft),
          reloadedCanonicalSnapshot
        )
      );
    },
    [
      draftQueryCache,
      lastAuthoritativeSemanticGraphRef,
      lastSavedSignatureRef,
      setCanvasNodePositions,
      setDraftSaveStatus,
      setDraftSession,
      workspaceLayoutKey,
    ]
  );
}
