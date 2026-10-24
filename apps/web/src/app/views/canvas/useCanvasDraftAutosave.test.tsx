// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCanvasDraftAutosave } from './useCanvasDraftAutosave';
import type { CanvasDraftAutosaveSchedulingArgs } from './canvasDraftAutosaveScheduling';
import { canvasDraftSession } from './canvasDraftSession';
import { buildAuthoringPort } from './canvasDraftRepository.test.fixtures';
import { createCanvasDraftRepository } from './canvasDraftRepository';

describe('Canvas autosave semantic scheduling', () => {
  afterEach(() => vi.useRealTimers());

  it.each(['equivalent renders', 'semantic edit', 'unmount', 'permission denied'] as const)(
    'preserves semantic scheduling across %s',
    async (scenario) => {
      const repository = createCanvasDraftRepository(buildAuthoringPort());
      const record = (await repository.readGraphDraft())!;
      const session = canvasDraftSession.machine.bootstrap({
        remoteDraft: record,
        canonicalNodeIds: [],
        canonicalEdges: [],
      });
      const save = vi.spyOn(repository, 'saveGraphDraft');
      const args: CanvasDraftAutosaveSchedulingArgs = {
        draftRepository: repository,
        graphDraftQuery: { isPending: false, isError: false, data: undefined },
        graphAuthorityQuery: { isPending: false, isError: false },
        draftQueryCache: {
          fetchLatestRemoteDraft: repository.readGraphDraft,
          fetchLatestRemoteDraftState: repository.readGraphDraftState,
          replaceRemoteDraftState: vi.fn(),
          refreshWorkspaceFilesAfterSourceRemoval: vi.fn(),
        },
        draftSession: session,
        setDraftSession: vi.fn(),
        currentDraftPayloadSignature: 'same-edited-draft',
        currentDraftPayload: record.draft,
        canPersistGraphDraft: scenario !== 'permission denied',
        canPersistCurrentDraft: true,
        refs: {
          saveDebounceTimerRef: { current: null },
          lastSavedSignatureRef: { current: 'before' },
          lastFailedSignatureRef: { current: null },
          saveAttemptGenerationRef: { current: 0 },
          nextSaveAttemptIdRef: { current: 0 },
          activeSaveAttemptRef: { current: null },
        },
        setDraftSaveStatus: vi.fn(),
        createDraftIdempotencyKey: () => 'equivalent-render',
      };
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      (
        globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
      ).IS_REACT_ACT_ENVIRONMENT = true;
      function Harness({ request }: { request: CanvasDraftAutosaveSchedulingArgs }): null {
        useCanvasDraftAutosave(request);
        return null;
      }
      vi.useFakeTimers();
      try {
        await act(async () => root.render(<Harness request={args} />));
        if (scenario === 'semantic edit') {
          await act(async () => {
            await vi.advanceTimersByTimeAsync(200);
          });
          await act(async () =>
            root.render(
              <Harness
                request={{
                  ...args,
                  currentDraftPayloadSignature: 'new-intent',
                  currentDraftPayload: {
                    ...record.draft,
                    canvas: { ...record.draft.canvas, title: 'Edited title' },
                  },
                }}
              />
            )
          );
          await act(async () => {
            await vi.advanceTimersByTimeAsync(399);
          });
          expect(save).not.toHaveBeenCalled();
          await act(async () => {
            await vi.advanceTimersByTimeAsync(1);
          });
          expect(save).toHaveBeenCalledOnce();
          expect(save.mock.calls[0]?.[0].draft.canvas.title).toBe('Edited title');
        } else if (scenario === 'unmount') {
          await act(async () => root.render(null));
          await act(async () => {
            await vi.advanceTimersByTimeAsync(500);
          });
          expect(save).not.toHaveBeenCalled();
        } else {
          for (let render = 0; render < 5; render += 1) {
            await act(async () => {
              await vi.advanceTimersByTimeAsync(100);
            });
            await act(async () =>
              root.render(
                <Harness
                  request={{ ...args, currentDraftPayload: structuredClone(record.draft) }}
                />
              )
            );
          }
          expect(save).toHaveBeenCalledTimes(scenario === 'permission denied' ? 0 : 1);
        }
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    }
  );
});
