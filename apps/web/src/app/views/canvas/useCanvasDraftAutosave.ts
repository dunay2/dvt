import { useEffect, useLayoutEffect, useRef } from 'react';

import {
  runCanvasDraftAutosaveEffect,
  type CanvasDraftAutosaveSchedulingArgs,
} from './canvasDraftAutosaveScheduling';

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
  const committedPayload = useRef(currentDraftPayload);
  useLayoutEffect(() => {
    committedPayload.current = currentDraftPayload;
  }, [currentDraftPayload]);
  useEffect(() => {
    return runCanvasDraftAutosaveEffect({
      refs,
      draftRepository,
      graphDraftQuery,
      graphAuthorityQuery,
      draftQueryCache,
      canPersistGraphDraft,
      canPersistCurrentDraft,
      currentDraftPayload: committedPayload.current,
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
