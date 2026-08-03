// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { createMockRunsService } from '../../../testing/runsPortDoubles';
import type { IRunsPort, RunSnapshot } from '../../ports/runs';
import { queryKeys } from '../../queries/queryKeys';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { useRunControlCommands } from './useRunControlCommands';

function deferred<T>(): Readonly<{ promise: Promise<T>; resolve: (value: T) => void }> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

async function waitForCommandState(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) {
      return;
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  throw new Error('Timed out waiting for run-control command state');
}

function CommandHost({
  onRecoveryAccepted,
}: Readonly<{ onRecoveryAccepted?: (runId: string) => void }>): JSX.Element {
  const commands = useRunControlCommands({ onRecoveryAccepted });

  return (
    <div>
      <button type="button" onClick={() => commands.cancelRun('run_active')}>
        cancel
      </button>
      <button type="button" onClick={() => commands.recoverRun('run_failed')}>
        recover
      </button>
      <output data-testid="activity">
        {commands.activity ? `${commands.activity.action}:${commands.activity.runId}` : 'idle'}
      </output>
      <output data-testid="outcome">
        {commands.outcome ? `${commands.outcome.action}:${commands.outcome.runId}` : 'none'}
      </output>
    </div>
  );
}

describe('useRunControlCommands', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    container?.remove();
    container = null;
    root = null;
  });

  async function renderHost(
    runsService: IRunsPort,
    queryClient: QueryClient,
    onRecoveryAccepted?: (runId: string) => void
  ): Promise<void> {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <AppServicesProvider overrides={{ ...createAppServicesTestOverrides(), runsService }}>
            <CommandHost onRecoveryAccepted={onRecoveryAccepted} />
          </AppServicesProvider>
        </QueryClientProvider>
      );
    });
  }

  it('requests cancellation without mutating cached runtime truth optimistically', async () => {
    const pendingCancel = deferred<Awaited<ReturnType<IRunsPort['cancelRun']>>>();
    const runsService: IRunsPort = {
      ...createMockRunsService(),
      cancelRun: vi.fn(() => pendingCancel.promise),
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const snapshotKey = queryKeys.runs.snapshot('scope-a', 'run_active');
    const snapshot: RunSnapshot = {
      runId: 'run_active',
      status: 'running',
      controls: {
        cancel: { available: true },
        recover: { available: false, reason: 'run_active' },
      },
    };
    queryClient.setQueryData(snapshotKey, snapshot);
    await renderHost(runsService, queryClient);

    await act(async () => {
      container?.querySelectorAll<HTMLButtonElement>('button')[0]?.click();
    });
    await waitForCommandState(
      () =>
        container?.querySelector('[data-testid="activity"]')?.textContent === 'cancel:run_active'
    );

    expect(container?.querySelector('[data-testid="activity"]')?.textContent).toBe(
      'cancel:run_active'
    );
    expect(queryClient.getQueryData(snapshotKey)).toBe(snapshot);

    await act(async () => {
      pendingCancel.resolve({
        contractVersion: 'v1',
        runId: 'run_active',
        signalType: 'CANCEL',
        accepted: true,
        disposition: 'requested',
      });
      await pendingCancel.promise;
    });
    await waitForCommandState(
      () => container?.querySelector('[data-testid="outcome"]')?.textContent !== 'none'
    );

    expect(runsService.cancelRun).toHaveBeenCalledWith('run_active');
    expect(container?.querySelector('[data-testid="outcome"]')?.textContent).toBe(
      'cancel:run_active'
    );
    expect(queryClient.getQueryData<RunSnapshot>(snapshotKey)?.status).toBe('running');
    expect(queryClient.getQueryState(snapshotKey)?.isInvalidated).toBe(true);
  });

  it('publishes the server-created recovery identity and invalidates canonical run queries', async () => {
    const onRecoveryAccepted = vi.fn();
    const runsService: IRunsPort = {
      ...createMockRunsService(),
      recoverRun: vi.fn<IRunsPort['recoverRun']>(async (sourceRunId) => ({
        contractVersion: 'v1' as const,
        sourceRunId,
        recoveryRunId: 'run_recovery',
        accepted: true,
      })),
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const summariesKey = queryKeys.runs.summaries('scope-a');
    queryClient.setQueryData(summariesKey, [{ runId: 'run_failed', status: 'failed' }]);
    await renderHost(runsService, queryClient, onRecoveryAccepted);

    await act(async () => {
      container?.querySelectorAll<HTMLButtonElement>('button')[1]?.click();
    });

    expect(runsService.recoverRun).toHaveBeenCalledWith('run_failed');
    expect(onRecoveryAccepted).toHaveBeenCalledWith('run_recovery');
    expect(queryClient.getQueryState(summariesKey)?.isInvalidated).toBe(true);
  });
});
