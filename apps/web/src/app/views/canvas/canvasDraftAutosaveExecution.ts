import type { Dispatch, SetStateAction } from 'react';

import type { SaveWorkspaceGraphDraftResult } from '../../ports/workspace';
import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import type { CanvasDraftAuthoringPayload } from './canvasDraftAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { DraftAttemptRefs, DraftSaveStatus } from './canvasDraftLifecycle.types';
import {
  applyConflictResolution,
  applySavedDraftResolution,
  type DraftSaveAttempt,
  isStaleSaveResolution,
  markDraftSaving,
  restoreEditingAfterSaveFailure,
  startNextSaveAttempt,
} from './canvasDraftPersistenceRuntime';

type SetDraftSession = Dispatch<SetStateAction<CanvasDraftSession>>;
type SetDraftSaveStatus = Dispatch<SetStateAction<DraftSaveStatus>>;

type SaveResolutionContext = {
  refs: DraftAttemptRefs;
  saveAttempt: DraftSaveAttempt;
  draftQueryCache: CanvasDraftQueryCache;
  setDraftSession: SetDraftSession;
  setDraftSaveStatus: SetDraftSaveStatus;
  currentDraftPayloadSignature: string;
};

type SaveFailureContext = {
  refs: DraftAttemptRefs;
  saveAttempt: DraftSaveAttempt;
  setDraftSession: SetDraftSession;
  setDraftSaveStatus: SetDraftSaveStatus;
};

export type PerformCanvasDraftAutosaveArgs = {
  refs: DraftAttemptRefs;
  draftRepository: CanvasDraftRepository;
  currentDraftPayload: CanvasDraftAuthoringPayload;
  draftSession: CanvasDraftSession;
  createDraftIdempotencyKey: () => string;
  setDraftSession: SetDraftSession;
  setDraftSaveStatus: SetDraftSaveStatus;
  draftQueryCache: CanvasDraftQueryCache;
  currentDraftPayloadSignature: string;
};

function resolveDraftSaveSuccess(
  result: SaveWorkspaceGraphDraftResult,
  {
    refs,
    saveAttempt,
    draftQueryCache,
    setDraftSession,
    setDraftSaveStatus,
    currentDraftPayloadSignature,
  }: SaveResolutionContext
) {
  if (isStaleSaveResolution(refs, saveAttempt)) {
    return;
  }

  refs.activeSaveAttemptRef.current = null;
  if (result.outcome === 'conflict') {
    applyConflictResolution({
      draftQueryCache,
      setDraftSession,
      setDraftSaveStatus: (status) => setDraftSaveStatus(status),
      current: result.current,
    });
    return;
  }

  applySavedDraftResolution({
    draftQueryCache,
    currentDraftPayloadSignature,
    refs,
    setDraftSession,
    setDraftSaveStatus: (status) => setDraftSaveStatus(status),
    record: result.record,
  });
}

function resolveDraftSaveFailure({
  refs,
  saveAttempt,
  setDraftSession,
  setDraftSaveStatus,
}: SaveFailureContext) {
  if (isStaleSaveResolution(refs, saveAttempt)) {
    return;
  }

  refs.activeSaveAttemptRef.current = null;
  restoreEditingAfterSaveFailure(setDraftSession, (status) => setDraftSaveStatus(status));
}

export function performCanvasDraftAutosave({
  refs,
  draftRepository,
  currentDraftPayload,
  draftSession,
  createDraftIdempotencyKey,
  setDraftSession,
  setDraftSaveStatus,
  draftQueryCache,
  currentDraftPayloadSignature,
}: PerformCanvasDraftAutosaveArgs) {
  const saveAttempt = startNextSaveAttempt(refs);
  markDraftSaving(setDraftSession);
  setDraftSaveStatus('saving');

  draftRepository
    .saveGraphDraft({
      draft: currentDraftPayload,
      expectedRevision: draftSession.draftRevision,
      idempotencyKey: createDraftIdempotencyKey(),
    })
    .then((result) =>
      resolveDraftSaveSuccess(result, {
        refs,
        saveAttempt,
        draftQueryCache,
        setDraftSession,
        setDraftSaveStatus,
        currentDraftPayloadSignature,
      })
    )
    .catch(() =>
      resolveDraftSaveFailure({
        refs,
        saveAttempt,
        setDraftSession,
        setDraftSaveStatus,
      })
    );
}
