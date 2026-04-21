import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import {
  canvasDraftSession,
  type CanvasDraftSession,
} from './canvasDraftSession';
import type { DraftAttemptRefs } from './canvasDraftLifecycle.types';

export const DRAFT_SAVE_DEBOUNCE_MS = 400;

export type DraftSaveAttempt = {
  id: number;
  generation: number;
};

export function clearSaveDebounce(refs: DraftAttemptRefs) {
  if (refs.saveDebounceTimerRef.current != null) {
    globalThis.clearTimeout(refs.saveDebounceTimerRef.current);
  }
}

export function shouldWaitForPersistenceReadiness(
  graphSnapshotQuery: { isPending: boolean; isError: boolean },
  graphDraftQuery: { isPending: boolean; isError: boolean }
): boolean {
  return (
    graphSnapshotQuery.isPending ||
    graphSnapshotQuery.isError ||
    graphDraftQuery.isPending ||
    graphDraftQuery.isError
  );
}

export function isStaleSaveResolution(
  refs: DraftAttemptRefs,
  saveAttempt: DraftSaveAttempt
): boolean {
  const activeSaveAttempt = refs.activeSaveAttemptRef.current;

  return (
    activeSaveAttempt?.id !== saveAttempt.id ||
    activeSaveAttempt?.generation !== saveAttempt.generation ||
    refs.saveAttemptGenerationRef.current !== saveAttempt.generation
  );
}

export function startNextSaveAttempt(refs: DraftAttemptRefs): DraftSaveAttempt {
  const saveAttempt = {
    id: refs.nextSaveAttemptIdRef.current + 1,
    generation: refs.saveAttemptGenerationRef.current,
  };

  refs.nextSaveAttemptIdRef.current = saveAttempt.id;
  refs.activeSaveAttemptRef.current = saveAttempt;
  return saveAttempt;
}

export function markDraftSaving(
  setDraftSession: (updater: (currentSession: CanvasDraftSession) => CanvasDraftSession) => void
) {
  setDraftSession((currentSession) => canvasDraftSession.machine.markSaving(currentSession));
}

export function applyConflictResolution(args: {
  draftQueryCache: CanvasDraftQueryCache;
  setDraftSession: (updater: (currentSession: CanvasDraftSession) => CanvasDraftSession) => void;
  setDraftSaveStatus: (status: 'idle') => void;
  current: Parameters<(typeof canvasDraftSession.machine.applyConflict)>[1];
}) {
  args.draftQueryCache.replaceRemoteDraft(args.current);
  args.setDraftSession((currentSession) =>
    canvasDraftSession.machine.applyConflict(currentSession, args.current)
  );
  args.setDraftSaveStatus('idle');
}

export function applySavedDraftResolution(args: {
  draftQueryCache: CanvasDraftQueryCache;
  currentDraftPayloadSignature: string;
  refs: DraftAttemptRefs;
  setDraftSession: (updater: (currentSession: CanvasDraftSession) => CanvasDraftSession) => void;
  setDraftSaveStatus: (status: 'saved') => void;
  record: Parameters<(typeof canvasDraftSession.machine.applySaveSuccess)>[1];
}) {
  args.refs.lastSavedSignatureRef.current = args.currentDraftPayloadSignature;
  args.draftQueryCache.replaceRemoteDraft(args.record);
  args.setDraftSession((currentSession) =>
    canvasDraftSession.machine.applySaveSuccess(currentSession, args.record)
  );
  args.setDraftSaveStatus('saved');
}

export function restoreEditingAfterSaveFailure(
  setDraftSession: (updater: (currentSession: CanvasDraftSession) => CanvasDraftSession) => void,
  setDraftSaveStatus: (status: 'idle') => void
) {
  setDraftSession((currentSession) =>
    currentSession.syncState === 'saving'
      ? {
          ...currentSession,
          syncState: 'editing',
        }
      : currentSession
  );
  setDraftSaveStatus('idle');
}
