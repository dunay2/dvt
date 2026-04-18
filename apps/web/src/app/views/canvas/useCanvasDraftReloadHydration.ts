import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import { queryKeys } from '../../queries/queryKeys';
import {
  markRemoteDraftMissing,
  reconcileSnapshot,
  reloadFromRemote,
  serializeWorkspaceGraphDraft,
  type CanvasDraftSession,
} from './canvasDraftSession';
import type { DraftSaveStatus, QueryClientLike } from './canvasDraftLifecycle.types';
import type { CanvasDraftLifecycleCanonicalSnapshot } from './canvasDraftLifecycleSnapshot';

type UseCanvasDraftReloadHydrationArgs = {
  queryClient: QueryClientLike;
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
  queryClient,
  workspaceLayoutKey,
  setDraftSession,
  setCanvasNodePositions,
  setDraftSaveStatus,
  lastSavedSignatureRef,
}: UseCanvasDraftReloadHydrationArgs) {
  return useCallback(
    (
      remoteDraft: WorkspaceGraphDraftRecord | null,
      reloadedCanonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot
    ) => {
      queryClient.setQueryData(
        queryKeys.workspace.graphDraft(workspaceLayoutKey),
        remoteDraft
      );
      setDraftSaveStatus('idle');

      if (remoteDraft == null) {
        lastSavedSignatureRef.current = null;
        setDraftSession((currentSession) => markRemoteDraftMissing(currentSession));
        return;
      }

      setCanvasNodePositions(workspaceLayoutKey, remoteDraft.draft.nodePositions);
      lastSavedSignatureRef.current = serializeWorkspaceGraphDraft(remoteDraft.draft);
      setDraftSession((currentSession) =>
        reconcileSnapshot(reloadFromRemote(currentSession, remoteDraft), reloadedCanonicalSnapshot)
      );
    },
    [
      lastSavedSignatureRef,
      queryClient,
      setCanvasNodePositions,
      setDraftSaveStatus,
      setDraftSession,
      workspaceLayoutKey,
    ]
  );
}
