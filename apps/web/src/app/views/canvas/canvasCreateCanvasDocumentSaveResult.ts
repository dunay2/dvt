/** Owned concern: apply authoritative create-canvas save outcomes to draft cache and session state. */
import { serializeCanvasDraftAuthoringSignature } from './canvasDraftAuthoring';
import { canvasDraftSession } from './canvasDraftSession';
import type { CanvasCreateCanvasDocumentCommandDto } from './canvasDraftLifecycle.types';

type SaveGraphDraftResult = Awaited<
  ReturnType<CanvasCreateCanvasDocumentCommandDto['draftRepository']['saveGraphDraft']>
>;

type SavedGraphDraftResult = Extract<SaveGraphDraftResult, { outcome: 'saved' }>;
type ConflictedGraphDraftResult = Extract<SaveGraphDraftResult, { outcome: 'conflict' }>;

export function applyCanvasDocumentSaveSuccess({
  result,
  draftQueryCache,
  setDraftSession,
  setDraftSaveStatus,
  lastSavedSignatureRef,
}: Pick<
  CanvasCreateCanvasDocumentCommandDto,
  'draftQueryCache' | 'setDraftSession' | 'setDraftSaveStatus' | 'lastSavedSignatureRef'
> & {
  result: SavedGraphDraftResult;
}): void {
  lastSavedSignatureRef.current = serializeCanvasDraftAuthoringSignature({
    projectedDraft: result.record.draft,
    canonicalNodes: [],
    canonicalEdges: [],
  });
  draftQueryCache.replaceRemoteDraftState(result.remoteDraftState);
  setDraftSession((currentSession) =>
    canvasDraftSession.machine.applySaveSuccess(currentSession, result.record)
  );
  setDraftSaveStatus('saved');
}

export function applyCanvasDocumentSaveConflict({
  result,
  draftQueryCache,
  setDraftSession,
  setDraftSaveStatus,
}: Pick<
  CanvasCreateCanvasDocumentCommandDto,
  'draftQueryCache' | 'setDraftSession' | 'setDraftSaveStatus'
> & {
  result: ConflictedGraphDraftResult;
}): void {
  draftQueryCache.replaceRemoteDraftState(result.remoteDraftState);
  setDraftSession((currentSession) =>
    canvasDraftSession.machine.applyConflict(currentSession, result.current)
  );
  setDraftSaveStatus('idle');
}
