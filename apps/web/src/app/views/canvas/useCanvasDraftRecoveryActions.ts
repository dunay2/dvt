import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { WorkspaceGraphSnapshot } from '../../ports/workspace';
import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftReadModel } from './canvasDraftReadModel';
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
    remoteDraftState: CanvasDraftReadModel,
    reloadedCanonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot
  ) => void;
};

async function fetchRemoteDraftAndSnapshot(
  draftQueryCache: CanvasDraftQueryCache
): Promise<[CanvasDraftReadModel, WorkspaceGraphSnapshot]> {
  return await Promise.all([
    draftQueryCache.fetchLatestRemoteDraftState(),
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
      .then(([remoteDraftState, graphSnapshot]) => {
        if (refs.saveAttemptGenerationRef.current !== reloadGeneration) {
          return;
        }

        applyReloadedRemoteDraft(
          remoteDraftState,
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
