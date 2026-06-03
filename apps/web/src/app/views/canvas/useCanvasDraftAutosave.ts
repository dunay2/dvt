import { useEffect, type Dispatch, type SetStateAction } from 'react';

import type { CanvasDraftSession } from './canvasDraftSession';
import type { DraftSaveStatus } from './canvasDraftLifecycle.types';
import {
  runCanvasDraftAutosaveEffect,
  type CanvasDraftAutosaveSchedulingArgs,
} from './canvasDraftAutosaveScheduling';

type SetDraftSession = Dispatch<SetStateAction<CanvasDraftSession>>;
type SetDraftSaveStatus = Dispatch<SetStateAction<DraftSaveStatus>>;

export function useCanvasDraftAutosave({
  draftRepository,
  graphDraftQuery,
  graphAuthorityQuery,
  draftQueryCache,
  draftSession,
  setDraftSession,
  currentDraftPayloadSignature,
  currentDraftPayload,
  canPersistGraphDraft,
  canPersistCurrentDraft,
  refs,
  setDraftSaveStatus,
  createDraftIdempotencyKey,
}: CanvasDraftAutosaveSchedulingArgs) {
  useEffect(() => {
    return runCanvasDraftAutosaveEffect({
      refs,
      draftRepository,
      graphDraftQuery,
      graphAuthorityQuery,
      draftQueryCache,
      canPersistGraphDraft,
      canPersistCurrentDraft,
      currentDraftPayload,
      draftSession,
      createDraftIdempotencyKey,
      setDraftSession,
      setDraftSaveStatus,
      currentDraftPayloadSignature,
    });
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
    graphAuthorityQuery.isError,
    graphAuthorityQuery.isPending,
    draftQueryCache,
    refs,
    setDraftSaveStatus,
    setDraftSession,
  ]);
}
