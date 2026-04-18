import { queryKeys } from '../../queries/queryKeys';
import {
  applyConflict,
  applySaveSuccess,
  markSaving,
  type CanvasDraftSession,
} from './canvasDraftSession';
import type { DraftAttemptRefs, QueryClientLike } from './canvasDraftLifecycle.types';

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
  setDraftSession((currentSession) => markSaving(currentSession));
}

export function applyConflictResolution(args: {
  queryClient: QueryClientLike;
  workspaceLayoutKey: string;
  setDraftSession: (updater: (currentSession: CanvasDraftSession) => CanvasDraftSession) => void;
  setDraftSaveStatus: (status: 'idle') => void;
  current: Parameters<typeof applyConflict>[1];
}) {
  args.queryClient.setQueryData(
    queryKeys.workspace.graphDraft(args.workspaceLayoutKey),
    args.current
  );
  args.setDraftSession((currentSession) => applyConflict(currentSession, args.current));
  args.setDraftSaveStatus('idle');
}

export function applySavedDraftResolution(args: {
  queryClient: QueryClientLike;
  workspaceLayoutKey: string;
  currentDraftPayloadSignature: string;
  refs: DraftAttemptRefs;
  setDraftSession: (updater: (currentSession: CanvasDraftSession) => CanvasDraftSession) => void;
  setDraftSaveStatus: (status: 'saved') => void;
  record: Parameters<typeof applySaveSuccess>[1];
}) {
  args.refs.lastSavedSignatureRef.current = args.currentDraftPayloadSignature;
  args.queryClient.setQueryData(
    queryKeys.workspace.graphDraft(args.workspaceLayoutKey),
    args.record
  );
  args.setDraftSession((currentSession) => applySaveSuccess(currentSession, args.record));
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
