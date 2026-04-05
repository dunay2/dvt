// @vitest-environment jsdom

import { fireEvent, waitFor, within } from '@testing-library/dom';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../capabilities/platform-health';
import {
  createHealthzProbe,
  createPlatformHealthSnapshot,
} from '../capabilities/platform-health/testing/platformHealthFixtures';
import { waitForReactQuery, withTestQueryClient } from '../testing/reactQueryHarness';
import Root, { RootShell } from './Root';
import { AppServicesProvider, useAppDataSourceMode } from './services/AppServicesContext';
import { useAppStore } from './stores/appStore';

function createRootShellNode(capability: PlatformHealthCapabilityApi): JSX.Element {
  return (
    <MemoryRouter>
      <Routes>
        <Route element={<RootShell platformHealthCapability={capability} />} path="/">
          <Route element={<div>Workspace route</div>} index />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function resetAppStore(): void {
  useAppStore.setState({
    connectionStatus: { rest: 'ok', liveEvents: 'connected' },
    consolePanelHeight: 0,
    consolePanelVisible: false,
    focusMode: false,
  });
}

function RootServicesProbe(): JSX.Element {
  const mode = useAppDataSourceMode();
  return <div data-testid="root-services-probe">mode:{mode}</div>;
}

describe('RootShell platform health UX', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAppStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not falsely show ok while the first platform health query is still pending', async () => {
    const capability: PlatformHealthCapabilityApi = {
      loadSnapshot: vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            // Intentionally unresolved for the initial pending state.
          })
      ),
    };
    const mounted = await withTestQueryClient(createRootShellNode(capability));

    try {
      const view = within(mounted.container);

      await waitFor(() => {
        expect(view.getByText('Checking')).toBeTruthy();
      });
      expect(view.queryByText('Backend offline')).toBeNull();
      expect(view.queryByText('Backend degraded')).toBeNull();
      expect(mounted.container.textContent).not.toContain('REST API: ok');
    } finally {
      await mounted.cleanup();
    }
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
          mounted.queryClient.getQueryState(['platform-health', 'snapshot'])?.status === 'success',
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

describe('Root integration guard', () => {
  it('keeps service wiring available when Root is mounted under AppServicesProvider', async () => {
    const mounted = await withTestQueryClient(
      <AppServicesProvider overrides={{ mode: 'mock' }}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<Root />} path="/">
              <Route element={<RootServicesProbe />} index />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppServicesProvider>
    );

    try {
      await waitFor(() => {
        expect(within(mounted.container).getByTestId('root-services-probe').textContent).toContain(
          'mode:'
        );
      });
    } finally {
      await mounted.cleanup();
    }
  });
});
