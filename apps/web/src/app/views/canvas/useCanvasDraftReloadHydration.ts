import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftReadModel } from './canvasDraftReadModel';
import {
  markRemoteDraftMissing,
  reconcileSnapshot,
  reloadFromRemote,
  serializeWorkspaceGraphDraft,
  type CanvasDraftSession,
} from './canvasDraftSession';
import type { DraftSaveStatus } from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';

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
};

export function useCanvasDraftReloadHydration({
  draftQueryCache,
  workspaceLayoutKey,
  setDraftSession,
  setCanvasNodePositions,
  setDraftSaveStatus,
  lastSavedSignatureRef,
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
        setDraftSession((currentSession) => markRemoteDraftMissing(currentSession));
        return;
      }

      if (hasPersistedNodePositions(remoteDraft.draft.nodePositions)) {
        setCanvasNodePositions(workspaceLayoutKey, remoteDraft.draft.nodePositions);
      }
      lastSavedSignatureRef.current = serializeWorkspaceGraphDraft(remoteDraft.draft);
      setDraftSession((currentSession) =>
        reconcileSnapshot(reloadFromRemote(currentSession, remoteDraft), reloadedCanonicalSnapshot)
      );
    },
    [
      draftQueryCache,
      lastSavedSignatureRef,
      setCanvasNodePositions,
      setDraftSaveStatus,
      setDraftSession,
      workspaceLayoutKey,
    ]
  );
}
