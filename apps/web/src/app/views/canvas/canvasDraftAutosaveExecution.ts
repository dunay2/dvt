import type { Dispatch, SetStateAction } from 'react';
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftRepository, CanvasDraftSaveResult } from './canvasDraftRepository';
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
  refreshWorkspaceFilesAfterSave: boolean;
};

type SaveFailureContext = {
  refs: DraftAttemptRefs;
  saveAttempt: DraftSaveAttempt;
  setDraftSession: SetDraftSession;
  setDraftSaveStatus: SetDraftSaveStatus;
  currentDraftPayloadSignature: string;
};

export type PerformCanvasDraftAutosaveArgs = {
  refs: DraftAttemptRefs;
  draftRepository: CanvasDraftRepository;
  currentDraftPayload: WorkspaceGraphAuthoringDraft;
  draftSession: CanvasDraftSession;
  createDraftIdempotencyKey: () => string;
  setDraftSession: SetDraftSession;
  setDraftSaveStatus: SetDraftSaveStatus;
  draftQueryCache: CanvasDraftQueryCache;
  currentDraftPayloadSignature: string;
  refreshWorkspaceFilesAfterSave: boolean;
};

function resolveDraftSaveSuccess(
  result: CanvasDraftSaveResult,
  {
    refs,
    saveAttempt,
    draftQueryCache,
    setDraftSession,
    setDraftSaveStatus,
    currentDraftPayloadSignature,
    refreshWorkspaceFilesAfterSave,
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
      refs,
      currentState: result.remoteDraftState,
    });
    return;
  }

  applySavedDraftResolution({
    draftQueryCache,
    currentDraftPayloadSignature,
    refs,
    setDraftSession,
    setDraftSaveStatus: (status) => setDraftSaveStatus(status),
    remoteDraftState: result.remoteDraftState,
  });
  if (refreshWorkspaceFilesAfterSave) {
    void draftQueryCache.refreshWorkspaceFilesAfterSourceRemoval().catch(() => undefined);
  }
}

function resolveDraftSaveFailure({
  refs,
  saveAttempt,
  setDraftSession,
  setDraftSaveStatus,
  currentDraftPayloadSignature,
}: SaveFailureContext) {
  if (isStaleSaveResolution(refs, saveAttempt)) {
    return;
  }

  refs.activeSaveAttemptRef.current = null;
  restoreEditingAfterSaveFailure(refs, currentDraftPayloadSignature, setDraftSession, (status) =>
    setDraftSaveStatus(status)
  );
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
  refreshWorkspaceFilesAfterSave,
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
        refreshWorkspaceFilesAfterSave,
      })
    )
    .catch(() =>
      resolveDraftSaveFailure({
        refs,
        saveAttempt,
        setDraftSession,
        setDraftSaveStatus,
        currentDraftPayloadSignature,
      })
    );
}
