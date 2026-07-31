import { describe, expect, it, vi } from 'vitest';

import {
  createUnknownCanvasAuthoringDraftReadModel,
  createWritableCanvasAuthoringDraftReadModel,
} from './canvasDraftReadModel';
import { buildGraphDraftAuthority } from './canvasDraftRepository.test.fixtures';
import { executeCreateCanvasDocumentCommand } from './canvasCreateCanvasDocumentCommand';
import {
  buildCommandArgs,
  buildRecord,
  type BuildCommandOverrides,
} from './canvasCreateCanvasDocumentCommand.test.support';

describe('canvasCreateCanvasDocumentCommand guards', () => {
  it.each([
    {
      name: 'transport persistence is disabled',
      overrides: { canPersistGraphDraft: false },
    },
    {
      name: 'draft query is still pending',
      overrides: {
        graphDraftQuery: {
          data: createUnknownCanvasAuthoringDraftReadModel(),
          isPending: true,
          isError: false,
        },
      },
    },
    {
      name: 'draft query is in error',
      overrides: {
        graphDraftQuery: {
          data: createUnknownCanvasAuthoringDraftReadModel(),
          isPending: false,
          isError: true,
        },
      },
    },
    {
      name: 'an authoritative draft already exists',
      overrides: {
        graphDraftQuery: {
          data: createWritableCanvasAuthoringDraftReadModel(
            buildRecord(),
            buildGraphDraftAuthority(null)
          ),
          isPending: false,
          isError: false,
        },
      },
    },
  ] satisfies Array<{ name: string; overrides: BuildCommandOverrides }>)(
    'fails closed when $name',
    async ({ overrides }) => {
      const { args, draftRepository, draftQueryCache, setDraftSession, setDraftSaveStatus } =
        buildCommandArgs(overrides);

      await executeCreateCanvasDocumentCommand(args);

      expect(draftRepository.saveGraphDraft).not.toHaveBeenCalled();
      expect(draftQueryCache.replaceRemoteDraftState).not.toHaveBeenCalled();
      expect(setDraftSession).not.toHaveBeenCalled();
      expect(setDraftSaveStatus).not.toHaveBeenCalled();
    }
  );

  it('returns to idle when authoritative save throws', async () => {
    const { args, draftQueryCache, setDraftSession, setDraftSaveStatus } = buildCommandArgs({
      draftRepository: {
        readGraphDraftState: vi.fn(),
        readGraphDraft: vi.fn(),
        saveGraphDraft: vi.fn(async () => {
          throw new Error('write failed');
        }),
      },
    });

    await executeCreateCanvasDocumentCommand(args);

    expect(setDraftSaveStatus.mock.calls).toEqual([['saving'], ['idle']]);
    expect(draftQueryCache.replaceRemoteDraftState).not.toHaveBeenCalled();
    expect(setDraftSession).not.toHaveBeenCalled();
  });
});
