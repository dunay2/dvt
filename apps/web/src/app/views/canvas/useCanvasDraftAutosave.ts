import { useEffect, type Dispatch, type SetStateAction } from 'react';

import type { CanvasDraftRepository } from './canvasDraftRepository';
import type { CanvasDraftAuthoringPayload } from './canvasDraftAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  DraftAttemptRefs,
  DraftSaveStatus,
  GraphDraftQueryState,
  GraphSnapshotQueryState,
  QueryClientLike,
} from './canvasDraftLifecycle.types';
import {
  clearSaveDebounce,
  DRAFT_SAVE_DEBOUNCE_MS,
  shouldWaitForPersistenceReadiness,
} from './canvasDraftPersistenceRuntime';
import { performCanvasDraftAutosave } from './canvasDraftAutosaveExecution';

type SetDraftSession = Dispatch<SetStateAction<CanvasDraftSession>>;
type SetDraftSaveStatus = Dispatch<SetStateAction<DraftSaveStatus>>;

type UseCanvasDraftAutosaveArgs = {
  draftRepository: CanvasDraftRepository;
  graphDraftQuery: GraphDraftQueryState;
  graphSnapshotQuery: GraphSnapshotQueryState;
  queryClient: QueryClientLike;
  workspaceLayoutKey: string;
  draftSession: CanvasDraftSession;
  setDraftSession: SetDraftSession;
  currentDraftPayloadSignature: string;
  currentDraftPayload: CanvasDraftAuthoringPayload;
  canPersistGraphDraft: boolean;
  canPersistCurrentDraft: boolean;
  refs: DraftAttemptRefs;
  setDraftSaveStatus: SetDraftSaveStatus;
  createDraftIdempotencyKey: () => string;
};

export function useCanvasDraftAutosave({
  draftRepository,
  graphDraftQuery,
  graphSnapshotQuery,
  queryClient,
  workspaceLayoutKey,
  draftSession,
  setDraftSession,
  currentDraftPayloadSignature,
  currentDraftPayload,
  canPersistGraphDraft,
  canPersistCurrentDraft,
  refs,
  setDraftSaveStatus,
  createDraftIdempotencyKey,
}: UseCanvasDraftAutosaveArgs) {
  useEffect(() => {
    if (shouldWaitForPersistenceReadiness(graphSnapshotQuery, graphDraftQuery)) {
      return;
    }
    if (!canPersistGraphDraft || !canPersistCurrentDraft) {
      clearSaveDebounce(refs);
      setDraftSaveStatus((currentStatus) => (currentStatus === 'idle' ? currentStatus : 'idle'));
      return;
    }
    if (draftSession.syncState !== 'editing') {
      setDraftSaveStatus((currentStatus) =>
        currentStatus === 'saving' ? 'idle' : currentStatus
      );
      return;
    }
    if (currentDraftPayloadSignature === refs.lastSavedSignatureRef.current) {
      setDraftSaveStatus((currentStatus) => (currentStatus === 'idle' ? currentStatus : 'idle'));
      return;
    }

    clearSaveDebounce(refs);

    refs.saveDebounceTimerRef.current = globalThis.setTimeout(() => {
      performCanvasDraftAutosave({
        refs,
        draftRepository,
        currentDraftPayload,
        draftSession,
        createDraftIdempotencyKey,
        setDraftSession,
        setDraftSaveStatus,
        queryClient,
        workspaceLayoutKey,
        currentDraftPayloadSignature,
      });
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => {
      clearSaveDebounce(refs);
    };
  }, [
    canPersistCurrentDraft,
    canPersistGraphDraft,
    createDraftIdempotencyKey,
    currentDraftPayload,
    currentDraftPayloadSignature,
    draftRepository,
    draftSession.draftRevision,
    draftSession.syncState,
    graphDraftQuery.isError,
    graphDraftQuery.isPending,
    graphSnapshotQuery.isError,
    graphSnapshotQuery.isPending,
    queryClient,
    refs,
    setDraftSaveStatus,
    setDraftSession,
    workspaceLayoutKey,
  ]);
}
