/** Owned concern: persist project-canvas selection through protected draft CAS semantics. */
import { createBrowserIdempotencyKey } from '../../services/idempotency/createBrowserIdempotencyKey';

import type { CanvasProjectCanvasLifecycleCommandDto } from './canvasDraftLifecycle.types';
import {
  applyCanvasDocumentSaveConflict,
  applyCanvasDocumentSaveSuccess,
} from './canvasCreateCanvasDocumentSaveResult';
import { buildDraftWithSelectedProjectCanvas } from './canvasProjectCanvasLifecycle';

type SaveGraphDraftInput = Parameters<
  CanvasProjectCanvasLifecycleCommandDto['draftRepository']['saveGraphDraft']
>[0];

function resolveExpectedRevision({
  graphDraftQuery,
  canPersistGraphDraft,
}: Pick<CanvasProjectCanvasLifecycleCommandDto, 'graphDraftQuery' | 'canPersistGraphDraft'>):
  string | null {
  if (!canPersistGraphDraft || graphDraftQuery.isPending || graphDraftQuery.isError) {
    return null;
  }

  return graphDraftQuery.data?.record?.revision ?? null;
}

async function executeProjectCanvasDraftSave(
  args: CanvasProjectCanvasLifecycleCommandDto,
  input: SaveGraphDraftInput | null
): Promise<void> {
  if (input == null) {
    return;
  }

  args.setDraftSaveStatus('saving');

  try {
    const result = await args.draftRepository.saveGraphDraft(input);
    if (result.outcome === 'saved') {
      applyCanvasDocumentSaveSuccess({
        result,
        draftQueryCache: args.draftQueryCache,
        setDraftSession: args.setDraftSession,
        setDraftSaveStatus: args.setDraftSaveStatus,
        lastSavedSignatureRef: args.lastSavedSignatureRef,
      });
      return;
    }

    applyCanvasDocumentSaveConflict({
      result,
      draftQueryCache: args.draftQueryCache,
      setDraftSession: args.setDraftSession,
      setDraftSaveStatus: args.setDraftSaveStatus,
    });
  } catch {
    args.setDraftSaveStatus('idle');
  }
}

export async function executeSelectCanvasDocumentCommand(
  args: CanvasProjectCanvasLifecycleCommandDto & { canvasId: string }
): Promise<void> {
  const expectedRevision = resolveExpectedRevision(args);
  const draft =
    expectedRevision == null
      ? null
      : buildDraftWithSelectedProjectCanvas({
          currentDraft: args.currentDraftPayload,
          canvasId: args.canvasId,
        });

  await executeProjectCanvasDraftSave(
    args,
    draft == null
      ? null
      : {
          expectedRevision,
          idempotencyKey: createBrowserIdempotencyKey('canvas-draft'),
          draft,
        }
  );
}
