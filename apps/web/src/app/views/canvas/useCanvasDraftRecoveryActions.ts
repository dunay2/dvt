import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { WorkspaceGraphDraftRecord, WorkspaceGraphSnapshot } from '../../ports/workspace';
import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import { adoptCurrentSnapshot, type CanvasDraftSession } from './canvasDraftSession';
import type { DraftAttemptRefs, DraftSaveStatus } from './canvasDraftLifecycle.types';
import {
  buildCanonicalSnapshotFromWorkspaceSnapshot,
  type CanvasDraftLifecycleCanonicalSnapshot,
  type CanvasDraftLifecycleGraphStrategy,
} from './canvasDraftLifecycleSnapshot';
import { clearSaveDebounce } from './canvasDraftPersistenceRuntime';

type UseCanvasDraftRecoveryActionsArgs = {
  draftQueryCache: CanvasDraftQueryCache;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  canonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot;
  graphStrategy: CanvasDraftLifecycleGraphStrategy;
  refs: DraftAttemptRefs;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  invalidateInFlightSaveAttempt: () => void;
  applyReloadedRemoteDraft: (
    remoteDraft: WorkspaceGraphDraftRecord | null,
    reloadedCanonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot
  ) => void;
};

async function fetchRemoteDraftAndSnapshot(
  draftQueryCache: CanvasDraftQueryCache
): Promise<[WorkspaceGraphDraftRecord | null, WorkspaceGraphSnapshot]> {
  return await Promise.all([
    draftQueryCache.fetchLatestRemoteDraft(),
    draftQueryCache.fetchLatestGraphSnapshot(),
  ]);
}

export function useCanvasDraftRecoveryActions({
  draftQueryCache,
  setDraftSession,
  canonicalSnapshot,
  graphStrategy,
  refs,
  setDraftSaveStatus,
  invalidateInFlightSaveAttempt,
  applyReloadedRemoteDraft,
}: UseCanvasDraftRecoveryActionsArgs) {
  const reloadLatestDraft = useCallback(() => {
    clearSaveDebounce(refs);
    invalidateInFlightSaveAttempt();
    const reloadGeneration = refs.saveAttemptGenerationRef.current;
    setDraftSaveStatus('idle');

    fetchRemoteDraftAndSnapshot(draftQueryCache)
      .then(([remoteDraft, graphSnapshot]) => {
        if (refs.saveAttemptGenerationRef.current !== reloadGeneration) {
          return;
        }

        applyReloadedRemoteDraft(
          remoteDraft,
          buildCanonicalSnapshotFromWorkspaceSnapshot(graphSnapshot, graphStrategy)
        );
      })
      .catch(() => {
        if (refs.saveAttemptGenerationRef.current !== reloadGeneration) {
          return;
        }

        setDraftSaveStatus('idle');
      });
  }, [
    applyReloadedRemoteDraft,
    draftQueryCache,
    graphStrategy,
    invalidateInFlightSaveAttempt,
    refs,
    setDraftSaveStatus,
  ]);

  const adoptCurrentWorkspaceSnapshot = useCallback(() => {
    clearSaveDebounce(refs);
    invalidateInFlightSaveAttempt();
    refs.lastSavedSignatureRef.current = null;
    setDraftSaveStatus('idle');
    setDraftSession((currentSession) => adoptCurrentSnapshot(currentSession, canonicalSnapshot));
  }, [canonicalSnapshot, invalidateInFlightSaveAttempt, refs, setDraftSaveStatus, setDraftSession]);

  return {
    reloadLatestDraft,
    adoptCurrentWorkspaceSnapshot,
  };
}
