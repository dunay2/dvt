import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { CanvasAuthoringSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanvasNodePositions } from './canvasAuthoringRuntime.types';
import { shouldSeedCanvasLayoutFromRemoteDraft } from './canvasDraftLayoutHydrationPolicy';
import type { DraftSaveStatus } from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';
import { buildLocalNodeCatalogFromSemanticGraph } from './canvasDraftLocalNodeCatalog';
import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasAuthoringDraftReadModel } from './canvasDraftReadModel';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { serializeCanvasDraftAuthoringBaselineSignature } from './canvasDraftAuthoring';

type UseCanvasDraftReloadHydrationArgs = {
  draftQueryCache: CanvasDraftQueryCache;
  workspaceLayoutKey: string;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  persistedNodePositions: CanvasNodePositions;
  setCanvasNodePositions: (workspaceLayoutKey: string, positions: CanvasNodePositions) => void;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  lastSavedSignatureRef: { current: string | null };
  lastAuthoritativeSemanticGraphRef: {
    current: CanvasAuthoringSemanticGraph | null;
  };
};

export function useCanvasDraftReloadHydration({
  draftQueryCache,
  workspaceLayoutKey,
  setDraftSession,
  persistedNodePositions,
  setCanvasNodePositions,
  setDraftSaveStatus,
  lastSavedSignatureRef,
  lastAuthoritativeSemanticGraphRef,
}: UseCanvasDraftReloadHydrationArgs) {
  return useCallback(
    (
      remoteDraftState: CanvasAuthoringDraftReadModel,
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

      if (
        shouldSeedCanvasLayoutFromRemoteDraft({
          persistedNodePositions,
          remoteNodePositions: remoteDraft.draft.nodePositions,
        })
      ) {
        setCanvasNodePositions(workspaceLayoutKey, remoteDraft.draft.nodePositions);
      }
      lastSavedSignatureRef.current = serializeCanvasDraftAuthoringBaselineSignature({
        record: remoteDraft,
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
      persistedNodePositions,
      setCanvasNodePositions,
      setDraftSaveStatus,
      setDraftSession,
      workspaceLayoutKey,
    ]
  );
}
