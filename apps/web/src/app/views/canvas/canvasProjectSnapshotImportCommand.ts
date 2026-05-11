/** Owned concern: import validated Canvas project snapshots through the authoritative draft save rail. */
import { toast } from 'sonner';

import { createCanvasDraftIdempotencyKey } from './canvasDraftIdempotencyKey';
import type { CanvasImportProjectSnapshotCommandDto } from './canvasDraftLifecycle.types';
import {
  applyCanvasDocumentSaveConflict,
  applyCanvasDocumentSaveSuccess,
} from './canvasCreateCanvasDocumentSaveResult';
import { clearSaveDebounce } from './canvasDraftPersistenceRuntime';
import { canvasProjectSnapshot } from './canvasProjectSnapshot';
import { canvasViewCopy } from './copy';

export async function executeImportProjectSnapshotCommand({
  file,
  canImportProjectSnapshot,
  draftRepository,
  graphDraftQuery,
  draftQueryCache,
  setDraftSession,
  setDraftSaveStatus,
  refs,
  invalidateInFlightSaveAttempt,
}: CanvasImportProjectSnapshotCommandDto): Promise<void> {
  if (!canImportProjectSnapshot) {
    return;
  }

  setDraftSaveStatus('saving');
  try {
    const validation = canvasProjectSnapshot.validateImport(await file.text());
    if (validation.kind === 'rejected') {
      setDraftSaveStatus('failed');
      toast.error(`${canvasViewCopy.projectSnapshotImportRejectedMessage} ${validation.message}`);
      return;
    }

    clearSaveDebounce(refs);
    invalidateInFlightSaveAttempt();
    refs.lastFailedSignatureRef.current = null;

    const result = await draftRepository.saveGraphDraft({
      expectedRevision: graphDraftQuery.data?.record?.revision ?? null,
      idempotencyKey: createCanvasDraftIdempotencyKey(),
      draft: validation.snapshot.draft,
    });

    if (result.outcome === 'saved') {
      applyCanvasDocumentSaveSuccess({
        result,
        draftQueryCache,
        setDraftSession,
        setDraftSaveStatus,
        lastSavedSignatureRef: refs.lastSavedSignatureRef,
      });
      return;
    }

    applyCanvasDocumentSaveConflict({
      result,
      draftQueryCache,
      setDraftSession,
      setDraftSaveStatus,
    });
  } catch {
    setDraftSaveStatus('failed');
    toast.error(canvasViewCopy.projectSnapshotImportFailedMessage);
  }
}
