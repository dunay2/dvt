// @vitest-environment jsdom

import { fireEvent, waitFor, within } from '@testing-library/dom';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../capabilities/platform-health';
import {
  createHealthzProbe,
  createPlatformHealthSnapshot,
} from '../capabilities/platform-health/testing/platformHealthFixtures';
import { queryKeys } from './queries/queryKeys';
import { waitForReactQuery, withTestQueryClient } from '../testing/reactQueryHarness';
import { createRootShellNode } from './Root.bootstrapRoute.test.support';
import { resetRootShellStores } from './Root.test.support';

describe('RootShell platform health banner', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRootShellStores();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a persistent offline banner with retry action when the query fails', async () => {
    vi.useFakeTimers();
    const loadSnapshot = vi.fn().mockRejectedValue(new Error('Unable to reach /healthz'));
    const capability: PlatformHealthCapabilityApi = { loadSnapshot };
    const mounted = await withTestQueryClient(createRootShellNode(capability));

    try {
      const view = within(mounted.container);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_200);
      });

      await waitFor(() => {
        expect(view.getByText('Backend offline')).toBeTruthy();
      });
      expect(view.getByText('Offline')).toBeTruthy();

      const retryButton = view.getByRole('button', { name: /retry now/i });
      const initialCallCount = loadSnapshot.mock.calls.length;

      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(loadSnapshot.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it('shows a persistent degraded banner when the health snapshot reports degraded state', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(
        createPlatformHealthSnapshot({
          healthz: createHealthzProbe({
            data: {
              ok: true,
              status: 'degraded',
              components: {
                intentReconciler: {
                  status: 'degraded',
                  reasonCode: 'runtime_unavailable',
                },
              },
            },
          }),
        })
      ),
    };
    const mounted = await withTestQueryClient(createRootShellNode(capability));

    try {
      const view = within(mounted.container);

      await waitForReactQuery(
        () => mounted.container.textContent?.includes('Backend degraded') === true,
        {
          description: 'degraded shell banner',
        }
      );

      expect(view.getByText('Degraded')).toBeTruthy();
      expect(view.getByText('Intent reconciler degraded: runtime_unavailable.')).toBeTruthy();
      expect(view.getByRole('button', { name: /retry now/i })).toBeTruthy();
    } finally {
      await mounted.cleanup();
    }
  });

  it('hides the persistent banner when the health snapshot is healthy', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(createPlatformHealthSnapshot()),
    };
    const mounted = await withTestQueryClient(createRootShellNode(capability));

    try {
      await waitForReactQuery(
        () =>
          mounted.queryClient.getQueryState(queryKeys.shell.platformHealthSnapshot())?.status ===
          'success',
        {
          description: 'healthy platform health query',
        }
      );

      expect(mounted.container.querySelector('[data-testid="shell-health-banner"]')).toBeNull();
    } finally {
      await mounted.cleanup();
    }
  });

  it('updates the visible countdown using the existing auto-refresh cadence', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-02T12:00:00.000Z'));
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockResolvedValue(
        createPlatformHealthSnapshot({
          healthz: createHealthzProbe({
            data: {
              ok: true,
              status: 'degraded',
              components: {
                intentReconciler: {
                  status: 'degraded',
                  reasonCode: 'runtime_unavailable',
                },
              },
            },
          }),
        })
      ),
    };
    const mounted = await withTestQueryClient(createRootShellNode(capability));

    try {
      const view = within(mounted.container);

      await waitForReactQuery(
        () => mounted.container.textContent?.includes('Auto-refresh in 15s.') === true,
        {
          description: 'initial auto-refresh countdown',
          intervalMs: 1,
          timeoutMs: 500,
          tick: async () => {
            await vi.advanceTimersByTimeAsync(1);
          },
        }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });

      await waitForReactQuery(
        () => mounted.container.textContent?.includes('Auto-refresh in 10s.') === true,
        {
          description: 'updated auto-refresh countdown',
          intervalMs: 1,
          timeoutMs: 500,
          tick: async () => {
            await vi.advanceTimersByTimeAsync(1);
          },
        }
      );

      expect(view.getByText('Auto-refresh in 10s.')).toBeTruthy();
    } finally {
      await mounted.cleanup();
    }
  });
});
