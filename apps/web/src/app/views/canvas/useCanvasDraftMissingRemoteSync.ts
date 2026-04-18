import { useEffect, type Dispatch, type SetStateAction } from 'react';

import { markRemoteDraftMissing, type CanvasDraftSession } from './canvasDraftSession';
import type { DraftSaveStatus, GraphDraftQueryState } from './canvasDraftLifecycle.types';

type UseCanvasDraftMissingRemoteSyncArgs = {
  shouldWaitForBootstrapReadiness: boolean;
  graphDraftQuery: GraphDraftQueryState;
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  invalidateInFlightSaveAttempt: () => void;
  lastSavedSignatureRef: { current: string | null };
};

export function useCanvasDraftMissingRemoteSync({
  shouldWaitForBootstrapReadiness,
  graphDraftQuery,
  draftSession,
  setDraftSession,
  setDraftSaveStatus,
  invalidateInFlightSaveAttempt,
  lastSavedSignatureRef,
}: UseCanvasDraftMissingRemoteSyncArgs) {
  useEffect(() => {
    if (
      shouldWaitForBootstrapReadiness ||
      draftSession.syncState === 'bootstrapping' ||
      graphDraftQuery.data != null ||
      draftSession.baseline.record == null
    ) {
      return;
    }

    invalidateInFlightSaveAttempt();
    lastSavedSignatureRef.current = null;
    setDraftSaveStatus('idle');
    setDraftSession((currentSession) => markRemoteDraftMissing(currentSession));
  }, [
    draftSession.baseline.record,
    draftSession.syncState,
    graphDraftQuery.data,
    invalidateInFlightSaveAttempt,
    lastSavedSignatureRef,
    setDraftSaveStatus,
    setDraftSession,
    shouldWaitForBootstrapReadiness,
  ]);
}
