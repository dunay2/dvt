// @vitest-environment jsdom

import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import { useCanvasExecutionSelectionRecovery } from './useCanvasExecutionSelectionRecovery';

type RecoveryHook = ReturnType<typeof useCanvasExecutionSelectionRecovery>;

type RecoveryHookHarness = Readonly<{
  latest: () => RecoveryHook | null;
  setSelectionIntent: ReturnType<typeof vi.fn>;
  render: () => Promise<void>;
  cleanup: () => void;
}>;

function requireRecovery(hook: RecoveryHook | null): Readonly<{
  model: NonNullable<RecoveryHook['model']>;
  commands: NonNullable<RecoveryHook['commands']>;
}> {
  if (hook?.model == null || hook.commands == null) {
    throw new Error('Expected enabled execution-selection recovery.');
  }
  return { model: hook.model, commands: hook.commands };
}

function createDeferred(): Readonly<{
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}> {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderRecoveryHook(
  refreshAnalysis: () => Promise<void>,
  options: Readonly<{
    workspaceNodeIds?: readonly string[];
    executableNodeIds?: readonly string[];
  }> = {}
): RecoveryHookHarness {
  let latest: RecoveryHook | null = null;
  const setSelectionIntent = vi.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  function HookHost(): null {
    const [selectionIntent, setSelectionIntentState] = useState<CanvasExecutionSelectionIntent>({
      mode: 'explicit',
      nodeIds: ['model.removed', 'model.orders'],
    });
    latest = useCanvasExecutionSelectionRecovery({
      enabled: true,
      selectionIntent,
      workspaceNodeIds: options.workspaceNodeIds ?? ['model.orders'],
      executableNodeIds: options.executableNodeIds ?? ['model.orders'],
      dependencyIdsByNodeId: new Map(),
      lastPreviewRevision: 'analysis-sha-1',
      canRefreshAnalysis: true,
      setSelectionIntent: (nextIntent) => {
        setSelectionIntent(nextIntent);
        setSelectionIntentState(nextIntent);
      },
      refreshAnalysis,
    });
    return null;
  }

  return {
    latest: () => latest,
    setSelectionIntent,
    render: async () => {
      await act(async () => root.render(<HookHost />));
    },
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('useCanvasExecutionSelectionRecovery', () => {
  const cleanups: Array<() => void> = [];

  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  afterEach(() => {
    while (cleanups.length > 0) cleanups.pop()?.();
  });

  it('executes discard as an explicit command and publishes its exact receipt', async () => {
    const harness = renderRecoveryHook(vi.fn().mockResolvedValue(undefined));
    cleanups.push(harness.cleanup);
    await harness.render();

    await act(async () => requireRecovery(harness.latest()).commands.discardUnavailable());

    expect(harness.setSelectionIntent).toHaveBeenCalledWith({
      mode: 'explicit',
      nodeIds: ['model.orders'],
    });
    expect(requireRecovery(harness.latest()).model).toMatchObject({
      status: 'ready',
      requestedRootNodeIds: ['model.orders'],
      receipt: {
        rail: 'RecoverCanvasExecutionSelection',
        strategy: 'discard_unavailable',
        affectedNodeIds: ['model.removed'],
        retainedNodeIds: ['model.orders'],
      },
    });
  });

  it('keeps the selection blocked until authoritative refresh resolves', async () => {
    const deferred = createDeferred();
    const refreshAnalysis = vi.fn(() => deferred.promise);
    const harness = renderRecoveryHook(refreshAnalysis);
    cleanups.push(harness.cleanup);
    await harness.render();

    act(() => requireRecovery(harness.latest()).commands.refreshAnalysis());

    expect(requireRecovery(harness.latest()).model.pendingStrategy).toBe('refresh_analysis');
    expect(requireRecovery(harness.latest()).model.receipt).toBeNull();
    expect(harness.setSelectionIntent).not.toHaveBeenCalled();

    await act(async () => deferred.resolve());

    expect(requireRecovery(harness.latest()).model).toMatchObject({
      status: 'blocked',
      pendingStrategy: null,
      receipt: {
        rail: 'RecoverCanvasExecutionSelection',
        strategy: 'refresh_analysis',
        retainedNodeIds: ['model.removed', 'model.orders'],
      },
    });
  });

  it('reports refresh failure without fabricating a recovery receipt', async () => {
    const deferred = createDeferred();
    const harness = renderRecoveryHook(() => deferred.promise);
    cleanups.push(harness.cleanup);
    await harness.render();

    act(() => requireRecovery(harness.latest()).commands.refreshAnalysis());
    await act(async () => deferred.reject(new Error('Analysis service unavailable')));

    expect(requireRecovery(harness.latest()).model.receipt).toBeNull();
    expect(requireRecovery(harness.latest()).model.failure).toEqual({
      rail: 'RecoverCanvasExecutionSelection',
      strategy: 'refresh_analysis',
      code: 'authority_refresh_failed',
      detail: 'Analysis service unavailable',
    });
  });

  it('rejects workspace replacement when no executable workspace scope exists', async () => {
    const harness = renderRecoveryHook(vi.fn().mockResolvedValue(undefined), {
      workspaceNodeIds: [],
      executableNodeIds: [],
    });
    cleanups.push(harness.cleanup);
    await harness.render();

    await act(async () => requireRecovery(harness.latest()).commands.useWorkspaceScope());

    expect(requireRecovery(harness.latest()).model.canUseWorkspaceScope).toBe(false);
    expect(harness.setSelectionIntent).not.toHaveBeenCalled();
  });

  it('rejects discard when every requested root remains available', async () => {
    const harness = renderRecoveryHook(vi.fn().mockResolvedValue(undefined), {
      workspaceNodeIds: ['model.removed', 'model.orders'],
      executableNodeIds: ['model.removed', 'model.orders'],
    });
    cleanups.push(harness.cleanup);
    await harness.render();

    await act(async () => requireRecovery(harness.latest()).commands.discardUnavailable());

    expect(requireRecovery(harness.latest()).model.canDiscardUnavailable).toBe(false);
    expect(harness.setSelectionIntent).not.toHaveBeenCalled();
  });
});
