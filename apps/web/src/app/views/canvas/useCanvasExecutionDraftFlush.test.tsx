// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildAuthoringDraft } from './canvasDraftRepository.test.fixtures';
import {
  createWritableCanvasAuthoringDraftReadModel,
  type CanvasAuthoringDraftReadModel,
} from './canvasDraftReadModel';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { DraftAttemptRefs } from './canvasDraftLifecycle.types';
import { useCanvasExecutionDraftFlush } from './useCanvasExecutionDraftFlush';

type FlushHook = ReturnType<typeof useCanvasExecutionDraftFlush> | null;
type HookArgs = Parameters<typeof useCanvasExecutionDraftFlush>[0];

function buildRefs(): DraftAttemptRefs {
  return {
    saveDebounceTimerRef: { current: null },
    lastSavedSignatureRef: { current: null },
    lastFailedSignatureRef: { current: null },
    saveAttemptGenerationRef: { current: 0 },
    nextSaveAttemptIdRef: { current: 0 },
    activeSaveAttemptRef: { current: null },
  };
}

function buildDraftState(revision = 'rev-2'): CanvasAuthoringDraftReadModel {
  return createWritableCanvasAuthoringDraftReadModel({
    revision,
    savedAt: '2026-05-28T00:00:00.000Z',
    draft: buildAuthoringDraft(),
  });
}

function buildHookArgs(overrides: Partial<HookArgs> = {}): HookArgs {
  return {
    draftRepository: {
      readGraphDraftState: vi.fn(),
      readGraphDraft: vi.fn(),
      saveGraphDraft: vi.fn(),
    },
    draftQueryCache: {
      fetchLatestRemoteDraftState: vi.fn(),
      fetchLatestRemoteDraft: vi.fn(),
      replaceRemoteDraft: vi.fn(),
      replaceRemoteDraftState: vi.fn(),
    },
    graphDraftState: buildDraftState('rev-1'),
    draftRevision: 'rev-1',
    draftSyncState: 'editing',
    currentDraftPayload: buildAuthoringDraft(),
    currentDraftPayloadSignature: 'draft-sig-1',
    canPersistGraphDraft: true,
    canPersistCurrentDraft: true,
    refs: buildRefs(),
    setDraftSession: vi.fn(),
    setDraftSaveStatus: vi.fn(),
    invalidateInFlightSaveAttempt: vi.fn(),
    createDraftIdempotencyKey: vi.fn(() => 'idem-1'),
    ...overrides,
  };
}

function renderFlushHook(initialArgs: HookArgs): {
  cleanup: () => void;
  latest: () => FlushHook;
  render: (nextArgs?: HookArgs) => Promise<void>;
} {
  let latest: FlushHook = null;
  let args = initialArgs;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  function HookHost(): null {
    latest = useCanvasExecutionDraftFlush(args);
    return null;
  }

  return {
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
    latest: () => latest,
    render: async (nextArgs?: HookArgs) => {
      if (nextArgs != null) {
        args = nextArgs;
      }
      await act(async () => {
        root.render(<HookHost />);
      });
    },
  };
}

describe('useCanvasExecutionDraftFlush', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('waits for an in-flight draft save before projecting the execution graph', async () => {
    const refs = buildRefs();
    const savingArgs = buildHookArgs({
      refs,
      draftSyncState: 'saving',
      graphDraftState: buildDraftState('rev-1'),
    });
    const harness = renderFlushHook(savingArgs);
    await harness.render();

    const flushPromise = harness.latest()?.();
    let settled = false;
    void flushPromise?.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(25);
    expect(settled).toBe(false);

    refs.lastSavedSignatureRef.current = 'draft-sig-1';
    await harness.render(
      buildHookArgs({
        refs,
        draftSyncState: 'editing',
        graphDraftState: buildDraftState('rev-2'),
      })
    );
    await vi.advanceTimersByTimeAsync(25);

    await expect(flushPromise).resolves.toEqual({
      ok: true,
      canonicalNodes: expect.arrayContaining([expect.objectContaining({ id: 'transform-node' })]),
      canonicalEdges: expect.arrayContaining([
        expect.objectContaining({ sourceId: 'source-node', targetId: 'transform-node' }),
      ]),
      workspaceNodeIds: ['source-node', 'transform-node', 'sink-node'],
    });
    expect(savingArgs.draftRepository.saveGraphDraft).not.toHaveBeenCalled();

    harness.cleanup();
  });
});
