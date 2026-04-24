/** Owned concern: persist the first typed canvas document through authoritative draft save and fail-closed conflict/no-op handling. */
import { canvasDraftSession } from './canvasDraftSession';
import { createCanvasDraftIdempotencyKey } from './canvasDraftIdempotencyKey';
import type { CanvasCreateCanvasDocumentCommandDto } from './canvasDraftLifecycle.types';

export async function executeCreateCanvasDocumentCommand({
  command,
  draftRepository,
  graphDraftQuery,
  draftQueryCache,
  canPersistGraphDraft,
  setDraftSession,
  setDraftSaveStatus,
  lastSavedSignatureRef,
  workspaceScope,
  previewProvenanceConfig,
}: CanvasCreateCanvasDocumentCommandDto): Promise<void> {
  if (!canPersistGraphDraft || graphDraftQuery.isPending || graphDraftQuery.isError) {
    return;
  }

  if (graphDraftQuery.data?.record != null) {
    return;
  }

  setDraftSaveStatus('saving');

  try {
    const result = await draftRepository.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: createCanvasDraftIdempotencyKey(),
      draft: {
        projectedDraft: {
          canvas: {
            kind: command.kind,
            title: command.title,
          },
          nodeIds: [],
          nodePositions: {},
          edges: [],
        },
        canonicalNodes: [],
        canonicalEdges: [],
        workspaceScope,
        previewProvenanceConfig,
      },
    });

    if (result.outcome === 'saved') {
      lastSavedSignatureRef.current = canvasDraftSession.baseline.serialize(result.record.draft);
      draftQueryCache.replaceRemoteDraftState(result.remoteDraftState);
      setDraftSession((currentSession) =>
        canvasDraftSession.machine.applySaveSuccess(currentSession, result.record)
      );
      setDraftSaveStatus('saved');
      return;
    }

    draftQueryCache.replaceRemoteDraftState(result.remoteDraftState);
    if (result.current != null) {
      setDraftSession((currentSession) =>
        canvasDraftSession.machine.applyConflict(currentSession, result.current)
      );
    }
    setDraftSaveStatus('idle');
  } catch {
    setDraftSaveStatus('idle');
  }
}
