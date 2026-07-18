import { describe, expect, it, vi } from 'vitest';

import { serializeCanvasDraftAuthoringSignature } from './canvasDraftAuthoring';
import { createWritableCanvasAuthoringDraftReadModel } from './canvasDraftReadModel';
import { executeCreateCanvasDocumentCommand } from './canvasCreateCanvasDocumentCommand';
import {
  buildCommandArgs,
  buildEmptyDraft,
  buildRecord,
  readBootstrappingSessionUpdate,
} from './canvasCreateCanvasDocumentCommand.test.support';

describe('canvasCreateCanvasDocumentCommand save outcomes', () => {
  it('persists the first typed canvas document through authoritative draft truth', async () => {
    const { args, draftRepository, draftQueryCache, setDraftSession, setDraftSaveStatus } =
      buildCommandArgs();

    await executeCreateCanvasDocumentCommand(args);

    expect(draftRepository.saveGraphDraft).toHaveBeenCalledTimes(1);
    expect(draftRepository.saveGraphDraft).toHaveBeenCalledWith({
      expectedRevision: null,
      idempotencyKey: expect.any(String),
      draft: {
        canvas: {
          id: 'transformation-canvas',
          kind: 'transformation',
          title: 'Transformation canvas',
        },
        activeCanvasId: 'transformation-canvas',
        nodeIds: [],
        nodePositions: {},
        nodes: [],
        edges: [],
        canvases: [
          {
            canvas: {
              id: 'transformation-canvas',
              kind: 'transformation',
              title: 'Transformation canvas',
            },
            nodeIds: [],
            nodePositions: {},
            nodes: [],
            edges: [],
          },
        ],
      },
    });
    expect(draftQueryCache.replaceRemoteDraftState).toHaveBeenCalledTimes(1);
    expect(setDraftSaveStatus.mock.calls).toEqual([['saving'], ['saved']]);

    const nextSession = readBootstrappingSessionUpdate(setDraftSession);
    expect(nextSession.syncState).toBe('editing');
    expect(nextSession.draftRevision).toBe('rev-saved');
    expect(args.lastSavedSignatureRef.current).toBe(
      serializeCanvasDraftAuthoringSignature(buildEmptyDraft())
    );
  });

  it('applies authoritative conflict truth and returns to idle when saveGraphDraft conflicts', async () => {
    const currentRecord = buildRecord({ revision: 'rev-current' });
    const { args, draftRepository, draftQueryCache, setDraftSession, setDraftSaveStatus } =
      buildCommandArgs({
        draftRepository: {
          readGraphDraftState: vi.fn(),
          readGraphDraft: vi.fn(),
          saveGraphDraft: vi.fn(async () => ({
            outcome: 'conflict' as const,
            current: currentRecord,
            remoteDraftState: createWritableCanvasAuthoringDraftReadModel(currentRecord),
          })),
        },
      });

    await executeCreateCanvasDocumentCommand(args);

    expect(draftRepository.saveGraphDraft).toHaveBeenCalledTimes(1);
    expect(draftQueryCache.replaceRemoteDraftState).toHaveBeenCalledTimes(1);
    expect(setDraftSaveStatus.mock.calls).toEqual([['saving'], ['idle']]);

    const nextSession = readBootstrappingSessionUpdate(setDraftSession);
    expect(nextSession.syncState).toBe('conflict');
    expect(nextSession.draftRevision).toBe('rev-current');
  });
});
