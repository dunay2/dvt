// @vitest-environment jsdom

import React from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';

import AppProviders from '../AppProviders';
import Canvas from './Canvas';
import {
  CANVAS_ROUTE_BOOTSTRAP_HANDLE,
  getCanvasDraftPresentationState,
  resetCanvasDraftPresentationState,
} from './canvas/canvasDraftPresentationStore';
import {
  getPublishedRouteBootstrapPresentation,
  resetRouteBootstrapPresentation,
} from '../bootstrap/routeBootstrapRegistry';
import { getRouteBootstrapRegistration } from '../bootstrap/routeBootstrapRegistration';
import { setupCanvasControllerHarness } from './canvas/useCanvasController.test.harness';
import { buildRemoteDraftRecord } from './canvas/useCanvasController.draftLifecycle.test.support';

vi.mock('../../capabilities/platform-health', async () => {
  const actual = await vi.importActual<typeof import('../../capabilities/platform-health')>(
    '../../capabilities/platform-health'
  );

  return {
    ...actual,
    usePlatformHealthSnapshotQuery: vi.fn(() => ({
      data: {
        fetchedAt: '2026-04-24T00:00:00.000Z',
        apiBaseUrl: 'http://localhost:3000',
        healthz: {
          endpoint: '/healthz',
          availability: 'available',
          statusCode: 200,
          latencyMs: 5,
          data: {
            ok: true,
            status: 'healthy',
            components: {
              intentReconciler: {
                status: 'healthy',
              },
            },
          },
          error: null,
        },
        readyz: {
          endpoint: '/readyz',
          availability: 'available',
          statusCode: 200,
          latencyMs: 5,
          data: {
            ok: true,
            status: 'ready',
          },
          error: null,
        },
        version: {
          endpoint: '/version',
          availability: 'available',
          statusCode: 200,
          latencyMs: 5,
          data: {
            name: 'dvt-api',
            version: '1.0.0',
          },
          error: null,
        },
        dbReady: {
          endpoint: '/db/ready',
          availability: 'available',
          statusCode: 200,
          latencyMs: 5,
          data: {
            ok: true,
            reason: null,
          },
          error: null,
        },
      },
      isPending: false,
      isError: false,
      error: null,
    })),
  };
});

const CANVAS_ROUTE_BOOTSTRAP_REGISTRATION = getRouteBootstrapRegistration('dbt.canvas', {
  routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
})!;

describe('Canvas route authoring bootstrap integration', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null = null;
  let harness: ReturnType<typeof setupCanvasControllerHarness> | null = null;
  let queryClient: QueryClient | null = null;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    (
      globalThis as typeof globalThis & {
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as new (callback: ResizeObserverCallback) => ResizeObserver;
  });

  afterEach(async () => {
    await mounted?.cleanup();
    harness?.cleanup();
    resetCanvasDraftPresentationState();
    resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
    mounted = null;
    harness = null;
    queryClient = null;
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
    vi.useRealTimers();
  });

  it('publishes a complete route bootstrap state when hydrating a graph-ready protected draft', async () => {
    harness = setupCanvasControllerHarness();
    harness.state.remoteDraftRecord = buildRemoteDraftRecord({
      nodeIds: ['node_1', 'node_2'],
      nodePositions: {
        node_1: { x: 0, y: 0 },
        node_2: { x: 240, y: 0 },
      },
      edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
    });
    harness.state.graphDraftQueryData = undefined;

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });

    const router = createMemoryRouter(
      [
        {
          id: 'dbt.canvas',
          path: '/canvas',
          handle: {
            routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
          },
          element: (
            <AppProviders
              queryClient={queryClient}
              overrides={{
                workspaceFilesQuery: harness.state.services.workspaceFilesQuery,
                workspaceFileContentCommand: harness.state.services.workspaceFileContentCommand,
                workspaceGraphDraftAuthoringPort:
                  harness.state.services.workspaceGraphDraftAuthoringPort,
                plansService: harness.state.services.plansService,
                runsService: harness.state.services.runsService,
                capabilitiesPort: {
                  loadCapabilities: async () => ({
                    apiVersion: '1.0.0',
                    minFrontendVersion: '0.0.1',
                    plugins: {
                      dbt: { available: true },
                      dvt: { available: true },
                    },
                  }),
                },
                sessionContext: harness.state.services.sessionContext,
                shellFeedback: harness.state.services.shellFeedback,
              }}
            >
              <Canvas />
            </AppProviders>
          ),
        },
      ],
      {
        initialEntries: ['/canvas'],
      }
    );

    mounted = await withTestQueryClient(<RouterProvider router={router} />, queryClient);
    await waitForReactQuery(() => getCanvasDraftPresentationState().routeState === 'ready', {
      description: 'Canvas authoring bootstrap readiness',
      timeoutMs: 1_000,
      tick: () => vi.advanceTimersByTimeAsync(20),
    });

    expect(getCanvasDraftPresentationState()).toMatchObject({
      routeState: 'ready',
      routeReadiness: { status: 'complete' },
    });
    expect(
      getPublishedRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION)
    ).toMatchObject({
      status: 'complete',
    });
    expect(mounted.container.textContent).not.toContain('The application hit an unexpected error.');
    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.readGraphDraft
    ).toHaveBeenCalledOnce();
    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).not.toHaveBeenCalled();
  });
});
