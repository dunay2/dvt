// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import {
  buildAuthoringDraft,
  buildAuthoringPort,
  buildGraphDraftAuthority,
  WORKSPACE_SCOPE,
} from './canvasDraftRepository.test.fixtures';
import {
  createWritableCanvasAuthoringDraftReadModel,
  type CanvasAuthoringDraftReadModel,
} from './canvasDraftReadModel';
import { createCanvasDraftRepository } from './canvasDraftRepository';
import { performCanvasDraftSave } from './canvasDraftSaveExecution';
import { createDraftAttemptRefs } from './canvasDraftPersistenceRuntime';
import { runCanvasDraftAutosaveEffect } from './canvasDraftAutosaveScheduling';
import { useCanvasDraftAttemptRefs } from './useCanvasDraftAttemptRefs';
import { buildDraftSaveConflictResponse } from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import { executeCreateCanvasDocumentCommand } from './canvasCreateCanvasDocumentCommand';
import { executeSelectCanvasDocumentCommand } from './canvasProjectCanvasLifecycleCommand';
import { canvasDraftSession } from './canvasDraftSession';
import type { DraftAttemptRefs } from './canvasDraftLifecycle.types';
import { useCanvasExecutionDraftFlush } from './useCanvasExecutionDraftFlush';

type FlushHook = ReturnType<typeof useCanvasExecutionDraftFlush> | null;
type HookArgs = Parameters<typeof useCanvasExecutionDraftFlush>[0];

function buildDraftState(revision = 'rev-2'): CanvasAuthoringDraftReadModel {
  return createWritableCanvasAuthoringDraftReadModel(
    {
      revision,
      savedAt: '2026-05-28T00:00:00.000Z',
      draft: buildAuthoringDraft(),
    },
    buildGraphDraftAuthority()
  );
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
      refreshWorkspaceFilesAfterSourceRemoval: vi.fn(),
      replaceRemoteDraftState: vi.fn(),
    },
    graphDraftState: buildDraftState('rev-1'),
    draftSession: canvasDraftSession.machine.bootstrap({
      remoteDraft: buildDraftState('rev-1').record,
      canonicalNodeIds: [],
      canonicalEdges: [],
    }),
    currentDraftPayload: buildAuthoringDraft(),
    currentDraftPayloadSignature: 'draft-sig-1',
    canPersistGraphDraft: true,
    canPersistCurrentDraft: true,
    refs: createDraftAttemptRefs(),
    draftSaveStatus: 'idle',
    setDraftSession: vi.fn(),
    setDraftSaveStatus: vi.fn(),
    createDraftIdempotencyKey: vi.fn(() => 'idem-1'),
    ...overrides,
  };
}

function buildAutosaveReceiptScenario(outcome: 'saved' | 'conflict' | 'unconfirmed' = 'saved'): {
  args: HookArgs;
  port: ReturnType<typeof buildAuthoringPort>;
  save: MockInstance<ReturnType<typeof createCanvasDraftRepository>['saveGraphDraft']>;
  release: () => void;
  reject: (reason: Error) => void;
  published: Promise<CanvasAuthoringDraftReadModel>;
} {
  const port = buildAuthoringPort();
  const acceptSave = port.saveGraphDraft;
  const read = port.readGraphDraft;
  let confirmedRead: Awaited<ReturnType<typeof read>> | undefined;
  let revision = 1;
  let release!: () => void;
  let reject!: (reason: Error) => void;
  const pending = new Promise<void>((resolve, rejectSave) => {
    release = resolve;
    reject = rejectSave;
  });
  port.readGraphDraft = vi.fn(async () => confirmedRead ?? read());
  port.saveGraphDraft = vi.fn(async (input: Parameters<typeof acceptSave>[0]) => {
    await pending;
    if (outcome === 'conflict') {
      const remote = await read();
      if (remote.kind !== 'ok' || remote.record == null) throw new Error('Expected remote draft.');
      confirmedRead = { ...remote, record: { ...remote.record, revision: 'rev-conflict' } };
      return buildDraftSaveConflictResponse(WORKSPACE_SCOPE, { currentRevision: 'rev-conflict' });
    }
    const receipt = await acceptSave(input);
    const remote = await read();
    if (receipt.kind !== 'saved' || remote.kind !== 'ok' || remote.record == null)
      throw new Error('Expected saved fixture receipt.');
    const nextRevision = `rev-${++revision}`;
    confirmedRead = {
      ...remote,
      record: {
        ...remote.record,
        revision: outcome === 'unconfirmed' ? 'rev-other' : nextRevision,
      },
    };
    return { ...receipt, revision: nextRevision };
  });
  const repository = createCanvasDraftRepository(port);
  const save = vi.spyOn(repository, 'saveGraphDraft');
  let publish!: (state: CanvasAuthoringDraftReadModel) => void;
  const published = new Promise<CanvasAuthoringDraftReadModel>((resolve) => {
    publish = resolve;
  });
  const payload = buildAuthoringDraft();
  payload.nodeIds = payload.nodeIds.filter((id) => id !== 'sink-node');
  payload.nodes = payload.nodes.filter((node) => node.id !== 'sink-node');
  payload.edges = payload.edges.filter((edge) => edge.targetId !== 'sink-node');
  let commandId = 0;
  const args = buildHookArgs({
    draftRepository: repository,
    currentDraftPayload: payload,
    currentDraftPayloadSignature: 'receipt-draft',
    createDraftIdempotencyKey: vi.fn(() => `draft-command-${++commandId}`),
  });
  args.draftQueryCache.replaceRemoteDraftState = vi.fn(publish);
  return { args, port, save, release, reject, published };
}

function renderFlushHook(initialArgs: HookArgs): {
  cleanup: () => void;
  latest: () => FlushHook;
  save: () => ReturnType<typeof performCanvasDraftSave>;
  schedule: () => ReturnType<typeof runCanvasDraftAutosaveEffect>;
  refs: () => DraftAttemptRefs;
  invalidate: () => void;
  render: (nextArgs?: HookArgs) => Promise<void>;
} {
  let latest: FlushHook = null;
  let args = initialArgs;
  let scope: ReturnType<typeof useCanvasDraftAttemptRefs> | undefined;
  let mounted = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  function HookHost(): null {
    scope = useCanvasDraftAttemptRefs();
    latest = useCanvasExecutionDraftFlush({ ...args, refs: scope.refs });
    return null;
  }

  return {
    cleanup: () => {
      if (!mounted) return;
      mounted = false;
      act(() => {
        root.unmount();
      });
      container.remove();
    },
    latest: () => latest,
    refs: () => scope!.refs,
    invalidate: () => scope!.invalidateInFlightSaveAttempt(),
    save: () =>
      performCanvasDraftSave({
        ...args,
        refs: scope!.refs,
        refreshWorkspaceFilesAfterSave: false,
      }),
    schedule: () =>
      runCanvasDraftAutosaveEffect({
        ...args,
        refs: scope!.refs,
        graphDraftQuery: { isPending: false, isError: false, data: args.graphDraftState },
        graphAuthorityQuery: { isPending: false, isError: false },
      }),
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

  it('joins the actual autosave before its saving state reaches a React commit', async () => {
    const scenario = buildAutosaveReceiptScenario();
    const harness = renderFlushHook(scenario.args);
    await harness.render();
    const autosave = harness.save();
    const flush = harness.latest()!();
    try {
      expect(scenario.args.setDraftSession).toHaveBeenCalled();
      expect(scenario.args.draftSession.syncState).not.toBe('saving');
      expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
      scenario.release();
      await expect(flush).resolves.toMatchObject({
        ok: true,
        workspaceNodeIds: ['source-node', 'transform-node'],
        canonicalNodes: [
          expect.objectContaining({ id: 'source-node' }),
          expect.objectContaining({ id: 'transform-node' }),
        ],
        canonicalEdges: [
          expect.objectContaining({ sourceId: 'source-node', targetId: 'transform-node' }),
        ],
      });
      expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
    } finally {
      scenario.release();
      await Promise.allSettled([autosave, flush]);
      harness.cleanup();
    }
  });

  it('projects the confirmed autosave receipt before React publishes its query snapshot', async () => {
    const scenario = buildAutosaveReceiptScenario();
    const harness = renderFlushHook(scenario.args);
    await harness.render();
    const autosave = harness.save();
    try {
      scenario.release();
      const published = await scenario.published;
      expect(published.record?.revision).toBe('rev-2');
      expect(scenario.args.graphDraftState?.record?.revision).toBe('rev-1');
      expect(scenario.args.draftSession.draftRevision).toBe('rev-1');
      await expect(harness.latest()!()).resolves.toMatchObject({
        ok: true,
        workspaceNodeIds: ['source-node', 'transform-node'],
        canonicalNodes: [
          expect.objectContaining({ id: 'source-node' }),
          expect.objectContaining({ id: 'transform-node' }),
        ],
        canonicalEdges: [
          expect.objectContaining({ sourceId: 'source-node', targetId: 'transform-node' }),
        ],
      });
      expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
    } finally {
      scenario.release();
      await autosave;
      harness.cleanup();
    }
  });

  it('waits for a known save after its saving state commits and uses its confirmed graph', async () => {
    const scenario = buildAutosaveReceiptScenario();
    scenario.args.currentDraftPayload = buildAuthoringDraft();
    const harness = renderFlushHook(scenario.args);
    await harness.render();
    const autosave = harness.save();
    const update = vi.mocked(scenario.args.setDraftSession).mock.calls[0]![0];
    const saving = typeof update === 'function' ? update(scenario.args.draftSession) : update;
    expect(saving.syncState).toBe('saving');
    await harness.render({ ...scenario.args, draftSession: saving, draftSaveStatus: 'saving' });
    const flush = harness.latest()!();
    const settled = vi.fn();
    void flush.then(settled);
    try {
      await Promise.resolve();
      expect(settled).not.toHaveBeenCalled();
      expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
      scenario.release();
      await expect(flush).resolves.toMatchObject({
        ok: true,
        workspaceNodeIds: ['source-node', 'transform-node', 'sink-node'],
        canonicalNodes: expect.arrayContaining([expect.objectContaining({ id: 'transform-node' })]),
        canonicalEdges: expect.arrayContaining([
          expect.objectContaining({ sourceId: 'source-node', targetId: 'transform-node' }),
        ]),
      });
      expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
    } finally {
      scenario.release();
      await Promise.allSettled([autosave, flush]);
      harness.cleanup();
    }
  });

  it.each(['session', 'raw status'] as const)(
    'rejects unknown saving ownership from %s',
    async (saving) => {
      const scenario = buildAutosaveReceiptScenario();
      const args = {
        ...scenario.args,
        ...(saving === 'session'
          ? { draftSession: { ...scenario.args.draftSession, syncState: 'saving' as const } }
          : { draftSaveStatus: 'saving' as const }),
      };
      const harness = renderFlushHook(args);
      await harness.render();
      const flush = harness.latest()!();
      try {
        expect(scenario.port.saveGraphDraft).not.toHaveBeenCalled();
        await expect(flush).resolves.toMatchObject({ ok: false });
        expect(scenario.args.draftQueryCache.replaceRemoteDraftState).not.toHaveBeenCalled();
      } finally {
        scenario.release();
        await flush;
        harness.cleanup();
      }
    }
  );

  it('takes over a known debounce once instead of dispatching an autosave later', async () => {
    const scenario = buildAutosaveReceiptScenario();
    const harness = renderFlushHook(scenario.args);
    await harness.render();
    const stop = harness.schedule();
    expect(harness.refs().saveDebounceTimerRef.current).not.toBeNull();
    await harness.render({ ...scenario.args, draftSaveStatus: 'saving' });
    const flush = harness.latest()!();
    try {
      expect(harness.refs().saveDebounceTimerRef.current).toBeNull();
      expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
      scenario.release();
      await expect(flush).resolves.toMatchObject({
        ok: true,
        workspaceNodeIds: ['source-node', 'transform-node'],
      });
      await vi.advanceTimersByTimeAsync(400);
      expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
    } finally {
      stop?.();
      scenario.release();
      await flush;
      harness.cleanup();
    }
  });

  it.each(['failure', 'unconfirmed', 'conflict'] as const)(
    'blocks a joined save on %s without retry',
    async (outcome) => {
      const scenario = buildAutosaveReceiptScenario(outcome === 'failure' ? 'saved' : outcome);
      const harness = renderFlushHook(scenario.args);
      await harness.render();
      const autosave = harness.save();
      const flush = harness.latest()!();
      try {
        if (outcome === 'failure') scenario.reject(new Error('transport unavailable'));
        else scenario.release();
        await expect(flush).resolves.toMatchObject({ ok: false });
        expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
        if (outcome !== 'conflict')
          expect(scenario.args.draftQueryCache.replaceRemoteDraftState).not.toHaveBeenCalled();
      } finally {
        scenario.release();
        await Promise.allSettled([autosave, flush]);
        harness.cleanup();
      }
    }
  );

  it.each(['unchanged intent', 'new local edit'] as const)(
    'retains a completed conflict before React commits with %s',
    async (intent) => {
      const scenario = buildAutosaveReceiptScenario('conflict');
      const harness = renderFlushHook(scenario.args);
      await harness.render();
      const autosave = harness.save();
      try {
        scenario.release();
        const remote = await scenario.published;
        expect(remote.record?.revision).toBe('rev-conflict');
        expect(scenario.args.draftSession.draftRevision).toBe('rev-1');
        expect(scenario.args.graphDraftState?.record?.revision).toBe('rev-1');
        if (intent === 'new local edit')
          await harness.render({
            ...scenario.args,
            currentDraftPayload: buildAuthoringDraft(),
            currentDraftPayloadSignature: 'unresolved-local-edit',
          });
        await expect(harness.latest()!()).resolves.toMatchObject({ ok: false });
        expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
      } finally {
        scenario.release();
        await autosave;
        harness.cleanup();
      }
    }
  );

  it.each(['canPersistGraphDraft', 'canPersistCurrentDraft'] as const)(
    'rechecks %s after awaiting the actual save',
    async (permission) => {
      const scenario = buildAutosaveReceiptScenario();
      const harness = renderFlushHook(scenario.args);
      await harness.render();
      const autosave = harness.save();
      const flush = harness.latest()!();
      try {
        await harness.render({ ...scenario.args, [permission]: false });
        scenario.release();
        await expect(flush).resolves.toMatchObject({ ok: false });
        expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
      } finally {
        scenario.release();
        await Promise.allSettled([autosave, flush]);
        harness.cleanup();
      }
    }
  );

  it.each(['invalidate', 'unmount'] as const)(
    'wakes a stale waiter on %s and rejects its late receipt',
    async (cancel) => {
      const scenario = buildAutosaveReceiptScenario();
      const harness = renderFlushHook(scenario.args);
      await harness.render();
      const autosave = harness.save();
      const wire = scenario.save.mock.results[0]!.value;
      const flush = harness.latest()!();
      const settled = vi.fn();
      void flush.then(settled);
      try {
        if (cancel === 'unmount') harness.cleanup();
        else harness.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(settled).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
        scenario.release();
        await wire;
        expect(scenario.args.draftQueryCache.replaceRemoteDraftState).not.toHaveBeenCalled();
        expect(harness.refs().confirmedSaveReceiptRef.current).toBeNull();
        expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
      } finally {
        scenario.release();
        await Promise.allSettled([autosave, wire, flush]);
        harness.cleanup();
      }
    }
  );

  it('keeps the five-second deadline and never resumes Preview after a late acknowledgement', async () => {
    const scenario = buildAutosaveReceiptScenario();
    const harness = renderFlushHook(scenario.args);
    await harness.render();
    const autosave = harness.save();
    const wire = scenario.save.mock.results[0]!.value;
    const flush = harness.latest()!();
    const settled = vi.fn();
    void flush.then(settled);
    try {
      await vi.advanceTimersByTimeAsync(4999);
      expect(settled).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await expect(flush).resolves.toMatchObject({ ok: false });
      scenario.release();
      await wire;
      expect(settled).toHaveBeenCalledTimes(1);
      expect(settled).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
      expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      scenario.release();
      await Promise.allSettled([autosave, wire, flush]);
      harness.cleanup();
    }
  });

  it.each([
    ['blocked Create', 'pending'],
    ['missing Select', 'pending'],
    ['blocked Create', 'confirmed'],
    ['missing Select', 'confirmed'],
  ] as const)('preserves the real save on %s while %s', async (operation, phase) => {
    const scenario = buildAutosaveReceiptScenario();
    const harness = renderFlushHook(scenario.args);
    await harness.render();
    const autosave = harness.save();
    const wire = scenario.save.mock.results[0]!.value;
    let command: Promise<void> | undefined;
    let flush: ReturnType<NonNullable<FlushHook>> | undefined;
    try {
      if (phase === 'confirmed') {
        scenario.release();
        await scenario.published;
      }
      const refs = harness.refs();
      const active = refs.activeSaveAttemptRef.current;
      const receipt = refs.confirmedSaveReceiptRef.current;
      const generation = refs.saveAttemptGenerationRef.current;
      const args = {
        ...scenario.args,
        graphDraftQuery: { data: scenario.args.graphDraftState, isPending: false, isError: false },
        lastSavedSignatureRef: refs.lastSavedSignatureRef,
        invalidateInFlightSaveAttempt: harness.invalidate,
      };
      command =
        operation === 'blocked Create'
          ? executeCreateCanvasDocumentCommand({
              ...args,
              command: { kind: 'transformation', title: 'Already exists', mode: 'create_first' },
            })
          : executeSelectCanvasDocumentCommand({
              ...args,
              canvasId: 'missing-canvas',
            });
      expect(refs.saveAttemptGenerationRef.current).toBe(generation);
      expect(refs.activeSaveAttemptRef.current).toBe(active);
      expect(refs.confirmedSaveReceiptRef.current).toBe(receipt);
      expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
      await command;
      flush = harness.latest()!();
      scenario.release();
      await expect(flush).resolves.toMatchObject({
        ok: true,
        workspaceNodeIds: ['source-node', 'transform-node'],
      });
      expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(1);
    } finally {
      scenario.release();
      await Promise.allSettled([autosave, wire, command, flush]);
      harness.cleanup();
    }
  });

  it.each(['pending', 'confirmed'] as const)(
    'invalidates before an admitted same-target Select write while %s',
    async (phase) => {
      const scenario = buildAutosaveReceiptScenario();
      const harness = renderFlushHook(scenario.args);
      await harness.render();
      const autosave = harness.save();
      const wire = scenario.save.mock.results[0]!.value;
      let command: Promise<void> | undefined;
      try {
        if (phase === 'confirmed') {
          scenario.release();
          await scenario.published;
        }
        const refs = harness.refs();
        const generation = refs.saveAttemptGenerationRef.current;
        const invalidate = vi.fn(harness.invalidate);
        command = executeSelectCanvasDocumentCommand({
          ...scenario.args,
          canvasId: 'main-canvas',
          graphDraftQuery: {
            data: scenario.args.graphDraftState,
            isPending: false,
            isError: false,
          },
          lastSavedSignatureRef: refs.lastSavedSignatureRef,
          invalidateInFlightSaveAttempt: invalidate,
        });
        expect(invalidate).toHaveBeenCalledTimes(1);
        expect(refs.saveAttemptGenerationRef.current).toBe(generation + 1);
        expect(refs.activeSaveAttemptRef.current).toBeNull();
        expect(refs.confirmedSaveReceiptRef.current).toBeNull();
        expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(2);
        expect(invalidate.mock.invocationCallOrder[0]).toBeLessThan(
          vi.mocked(scenario.port.saveGraphDraft).mock.invocationCallOrder[1]!
        );
        expect(scenario.port.saveGraphDraft).toHaveBeenLastCalledWith(
          expect.objectContaining({
            expectedRevision: 'rev-1',
            draft: expect.objectContaining({
              activeCanvasId: 'main-canvas',
              nodeIds: ['source-node', 'transform-node'],
            }),
          })
        );
        scenario.release();
        await command;
        expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(2);
      } finally {
        scenario.release();
        await Promise.allSettled([autosave, wire, command]);
        harness.cleanup();
      }
    }
  );

  it.each(['while waiting', 'after acknowledgement'] as const)(
    'saves the actual new edit once using the confirmed revision %s',
    async (when) => {
      const scenario = buildAutosaveReceiptScenario();
      const harness = renderFlushHook(scenario.args);
      await harness.render();
      const autosave = harness.save();
      let flush: ReturnType<NonNullable<FlushHook>> | undefined;
      try {
        if (when === 'while waiting') flush = harness.latest()!();
        else {
          scenario.release();
          await scenario.published;
        }
        const edited = buildAuthoringDraft();
        await harness.render({
          ...scenario.args,
          currentDraftPayload: edited,
          currentDraftPayloadSignature: 'new-local-edit',
        });
        flush ??= harness.latest()!();
        scenario.release();
        await expect(flush).resolves.toMatchObject({
          ok: true,
          workspaceNodeIds: ['source-node', 'transform-node', 'sink-node'],
        });
        expect(scenario.port.saveGraphDraft).toHaveBeenCalledTimes(2);
        expect(scenario.port.saveGraphDraft).toHaveBeenLastCalledWith(
          expect.objectContaining({ expectedRevision: 'rev-2', draft: edited })
        );
        const calls = vi.mocked(scenario.port.saveGraphDraft).mock.calls;
        expect(calls[0]![0].idempotencyKey).not.toBe(calls[1]![0].idempotencyKey);
        expect(
          harness.refs().confirmedSaveReceiptRef.current?.result.remoteDraftState.record?.revision
        ).toBe('rev-3');
      } finally {
        scenario.release();
        await Promise.allSettled([autosave, flush]);
        harness.cleanup();
      }
    }
  );
});
