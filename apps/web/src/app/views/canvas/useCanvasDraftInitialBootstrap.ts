import { useEffect, type Dispatch, type SetStateAction } from 'react';

import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { serializeCanvasDraftAuthoringBaselineSignature } from './canvasDraftAuthoring';
import type { CanvasNodePositions } from './canvasAuthoringRuntime.types';
import { shouldSeedCanvasLayoutFromRemoteDraft } from './canvasDraftLayoutHydrationPolicy';
import type { DraftSaveStatus, GraphDraftQueryState } from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';

type UseCanvasDraftInitialBootstrapArgs = {
  shouldWaitForBootstrapReadiness: boolean;
  graphDraftQuery: GraphDraftQueryState;
  workspaceLayoutKey: string;
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  canonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot;
  persistedNodePositions: CanvasNodePositions;
  setCanvasNodePositions: (workspaceLayoutKey: string, positions: CanvasNodePositions) => void;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  lastSavedSignatureRef: { current: string | null };
};

export function useCanvasDraftInitialBootstrap({
  shouldWaitForBootstrapReadiness,
  graphDraftQuery,
  workspaceLayoutKey,
  draftSession,
  setDraftSession,
  canonicalSnapshot,
  persistedNodePositions,
  setCanvasNodePositions,
  setDraftSaveStatus,
  lastSavedSignatureRef,
}: UseCanvasDraftInitialBootstrapArgs) {
  useEffect(() => {
    if (shouldWaitForBootstrapReadiness || draftSession.syncState !== 'bootstrapping') {
      return;
    }

    const remoteDraft = graphDraftQuery.data?.record ?? null;

    if (remoteDraft == null) {
      lastSavedSignatureRef.current = null;
    } else {
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
        semanticGraph: graphDraftQuery.data?.semanticGraph ?? null,
      });
    }

    setDraftSession(
      canvasDraftSession.machine.bootstrap({
        remoteDraft,
        canonicalNodeIds: canonicalSnapshot.canonicalNodeIds,
        canonicalEdges: canonicalSnapshot.canonicalEdges,
      })
    );
    setDraftSaveStatus('idle');
  }, [
    canonicalSnapshot,
    draftSession.syncState,
    graphDraftQuery.data?.record,
    graphDraftQuery.data?.semanticGraph,
    lastSavedSignatureRef,
    persistedNodePositions,
    setCanvasNodePositions,
    setDraftSaveStatus,
    setDraftSession,
    shouldWaitForBootstrapReadiness,
    workspaceLayoutKey,
  ]);
}
