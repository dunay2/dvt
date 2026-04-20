import { useEffect, type Dispatch, type SetStateAction } from 'react';

import {
  bootstrapSession,
  serializeWorkspaceGraphDraft,
  type CanvasDraftSession,
} from './canvasDraftSession';
import type { DraftSaveStatus, GraphDraftQueryState } from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';

function hasPersistedNodePositions(
  nodePositions: Record<string, { x: number; y: number }>
): boolean {
  return Object.keys(nodePositions).length > 0;
}

type UseCanvasDraftInitialBootstrapArgs = {
  shouldWaitForBootstrapReadiness: boolean;
  graphDraftQuery: GraphDraftQueryState;
  workspaceLayoutKey: string;
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  canonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot;
  setCanvasNodePositions: (
    workspaceLayoutKey: string,
    positions: Record<string, { x: number; y: number }>
  ) => void;
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
  setCanvasNodePositions,
  setDraftSaveStatus,
  lastSavedSignatureRef,
}: UseCanvasDraftInitialBootstrapArgs) {
  useEffect(() => {
    if (shouldWaitForBootstrapReadiness || draftSession.syncState !== 'bootstrapping') {
      return;
    }

    const remoteDraft = graphDraftQuery.data ?? null;

    if (remoteDraft == null) {
      lastSavedSignatureRef.current = null;
    } else {
      if (hasPersistedNodePositions(remoteDraft.draft.nodePositions)) {
        setCanvasNodePositions(workspaceLayoutKey, remoteDraft.draft.nodePositions);
      }
      lastSavedSignatureRef.current = serializeWorkspaceGraphDraft(remoteDraft.draft);
    }

    setDraftSession(
      bootstrapSession({
        remoteDraft,
        canonicalNodeIds: canonicalSnapshot.canonicalNodeIds,
        canonicalEdges: canonicalSnapshot.canonicalEdges,
      })
    );
    setDraftSaveStatus('idle');
  }, [
    canonicalSnapshot,
    draftSession.syncState,
    graphDraftQuery.data,
    lastSavedSignatureRef,
    setCanvasNodePositions,
    setDraftSaveStatus,
    setDraftSession,
    shouldWaitForBootstrapReadiness,
    workspaceLayoutKey,
  ]);
}
