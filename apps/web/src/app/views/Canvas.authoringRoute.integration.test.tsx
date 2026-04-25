// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

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
        dataSourceMode: 'api',
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
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let toolbarPortalHost: HTMLDivElement | null = null;
  let harness: ReturnType<typeof setupCanvasControllerHarness> | null = null;
  let queryClient: QueryClient | null = null;

  beforeEach(() => {
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

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    harness?.cleanup();
    resetCanvasDraftPresentationState();
    resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
    toolbarPortalHost?.remove();
    container?.remove();
    queryClient?.clear();
    root = null;
    container = null;
    toolbarPortalHost = null;
    harness = null;
    queryClient = null;
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
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

    toolbarPortalHost = document.createElement('div');
    toolbarPortalHost.id = 'shell-top-bar-canvas-controls';
    document.body.appendChild(toolbarPortalHost);

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

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
                mode: 'api',
                workspaceService: harness.state.services.workspaceService,
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

    await act(async () => {
      root?.render(<RouterProvider router={router} />);
    });
    await waitFor(() => {
      expect(getCanvasDraftPresentationState().routeState).toBe('ready');
    });

    expect(getCanvasDraftPresentationState()).toMatchObject({
      routeState: 'ready',
      bootstrapStatus: 'complete',
      canCompleteBootstrap: true,
    });
    expect(getPublishedRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION)).toMatchObject({
      status: 'complete',
      canComplete: true,
    });
    expect(container.textContent).not.toContain('The application hit an unexpected error.');
  });
});
