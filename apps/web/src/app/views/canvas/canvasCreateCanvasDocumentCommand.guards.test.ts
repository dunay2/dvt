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
      expect(args.invalidateInFlightSaveAttempt).not.toHaveBeenCalled();
    }
  );

  it('invalidates the previous attempt only after admission and before its new write', async () => {
    const invalidate = vi.fn();
    const { args, draftRepository } = buildCommandArgs({
      invalidateInFlightSaveAttempt: invalidate,
    });

    await executeCreateCanvasDocumentCommand(args);

    expect(invalidate).toHaveBeenCalledOnce();
    expect(draftRepository.saveGraphDraft).toHaveBeenCalledOnce();
    expect(invalidate.mock.invocationCallOrder[0]).toBeLessThan(
      draftRepository.saveGraphDraft.mock.invocationCallOrder[0]!
    );
  });

  it.each([new Error('write failed'), new TypeError('Failed to fetch')])(
    'retains failed posture when authoritative save rejects with %s',
    async (failure) => {
      const { args, draftQueryCache, setDraftSession, setDraftSaveStatus } = buildCommandArgs({
        draftRepository: {
          readGraphDraftState: vi.fn(),
          readGraphDraft: vi.fn(),
          saveGraphDraft: vi.fn(async () => {
            throw failure;
          }),
        },
      });

      await executeCreateCanvasDocumentCommand(args);

      expect(setDraftSaveStatus.mock.calls).toEqual([['saving'], ['failed']]);
      expect(draftQueryCache.replaceRemoteDraftState).not.toHaveBeenCalled();
      expect(setDraftSession).not.toHaveBeenCalled();
      expect(args.lastSavedSignatureRef.current).toBeNull();
      expect(args.draftRepository.saveGraphDraft).toHaveBeenCalledTimes(1);
    }
  );

  it('retries only on another explicit command and publishes its authoritative success', async () => {
    const { args, draftRepository, draftQueryCache, setDraftSession, setDraftSaveStatus } =
      buildCommandArgs();
    draftRepository.saveGraphDraft.mockRejectedValueOnce(new Error('write failed'));

    await executeCreateCanvasDocumentCommand(args);

    expect(draftRepository.saveGraphDraft).toHaveBeenCalledTimes(1);
    expect(setDraftSaveStatus.mock.calls).toEqual([['saving'], ['failed']]);
    expect(draftQueryCache.replaceRemoteDraftState).not.toHaveBeenCalled();
    expect(setDraftSession).not.toHaveBeenCalled();

    await executeCreateCanvasDocumentCommand(args);

    expect(draftRepository.saveGraphDraft).toHaveBeenCalledTimes(2);
    expect(setDraftSaveStatus.mock.calls).toEqual([['saving'], ['failed'], ['saving'], ['saved']]);
    expect(draftQueryCache.replaceRemoteDraftState).toHaveBeenCalledTimes(1);
    expect(setDraftSession).toHaveBeenCalledTimes(1);
  });
});
