/** Owned concern: persist first or explicitly replaced typed canvas documents through authoritative draft CAS save semantics. */
import type { CanvasCreateCanvasDocumentCommandDto } from './canvasDraftLifecycle.types';
import {
  buildBlankCanvasDocumentDraftInput,
  resolveCreateCanvasDocumentCommandEligibility,
} from './canvasCreateCanvasDocumentCommandPolicy';
import {
  applyCanvasDocumentSaveConflict,
  applyCanvasDocumentSaveSuccess,
} from './canvasCreateCanvasDocumentSaveResult';

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
  const eligibility = resolveCreateCanvasDocumentCommandEligibility({
    command,
    graphDraftQuery,
    canPersistGraphDraft,
  });
  if (eligibility.kind === 'blocked') {
    return;
  }

  setDraftSaveStatus('saving');

  try {
    const result = await draftRepository.saveGraphDraft(
      buildBlankCanvasDocumentDraftInput({
        command,
        expectedRevision: eligibility.expectedRevision,
        workspaceScope,
        previewProvenanceConfig,
      })
    );

    if (result.outcome === 'saved') {
      applyCanvasDocumentSaveSuccess({
        result,
        draftQueryCache,
        setDraftSession,
        setDraftSaveStatus,
        lastSavedSignatureRef,
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
    setDraftSaveStatus('idle');
  }
}
