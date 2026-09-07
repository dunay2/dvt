import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunSnapshot } from '../ports/runs';
import type { CanvasController } from './Canvas.test.controller';

import {
  createCanvasRouteHarness,
  expectCanvasBootstrapState,
  expectCanvasSurfaceState,
  renderCanvasRouteWithController,
  currentCanvasRouteState,
  type CanvasRouteHarness,
} from './Canvas.test.support';

const runsQueryMocks = vi.hoisted(() => ({
  useRunSnapshotQuery: vi.fn((_workspaceLayoutKey: string, _runId: string | undefined) => ({
    data: null as RunSnapshot | null,
  })),
}));

vi.mock('../queries/runsQueries', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../queries/runsQueries')>()),
  useRunSnapshotQuery: runsQueryMocks.useRunSnapshotQuery,
}));

describe('Canvas route state smoke', () => {
  let harness: CanvasRouteHarness;

  beforeEach(() => {
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it.each([
    {
      name: 'renders a governed loading state inside the canvas workbench',
      overrides: {
        isLoadingGraph: true,
      },
      surface: {
        text: 'Loading canvas',
        slot: 'canvas-loading-state',
        viewportVisible: false,
      },
      bootstrap: {
        routeState: 'loading_graph',
        readinessStatus: 'pending',
        readinessDetail: 'Loading workspace graph for canvas',
      },
    },
    {
      name: 'renders a playground host state when the workspace has no canvas document yet',
      overrides: {
        canvasDocument: null,
      },
      surface: {
        text: 'Canvas',
        slot: 'canvas-playground-empty-state',
        viewportVisible: false,
      },
      bootstrap: {
        routeState: 'needs_canvas',
        readinessStatus: 'complete',
        readinessDetail: 'Canvas playground is ready to create the first canvas',
      },
    },
  ])('$name', async ({ overrides, surface, bootstrap }) => {
    await renderCanvasRouteWithController(harness, overrides);
    expectCanvasSurfaceState({
      harness,
      text: surface.text,
      slot: surface.slot,
      viewportVisible: surface.viewportVisible,
    });
    expectCanvasBootstrapState(bootstrap);
  });
});

describe('Canvas persisted run reference', () => {
  let harness: CanvasRouteHarness;

  beforeEach(() => {
    runsQueryMocks.useRunSnapshotQuery.mockReset();
    runsQueryMocks.useRunSnapshotQuery.mockReturnValue({ data: null });
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('restores the exact completed sink result from the run referenced by the route', async () => {
    runsQueryMocks.useRunSnapshotQuery.mockImplementation((_workspaceLayoutKey, runId) => ({
      data:
        runId === 'run-returned'
          ? {
              runId,
              status: 'completed',
              materialization: {
                executor: 'postgres',
                environmentId: 'dev',
                sinkTable: 'public.sink_1',
                rowsWritten: 3,
                startedAt: '2026-08-18T17:35:00.000Z',
                completedAt: '2026-08-18T17:35:00.016Z',
                durationMs: 16,
              },
            }
          : null,
    }));

    await renderCanvasRouteWithController(
      harness,
      {
        activeRunId: null,
        nodesWithImpact: [
          {
            id: 'sink-1',
            type: 'dbtNode',
            position: { x: 0, y: 0 },
            data: {
              name: 'Sink 1',
              status: 'idle',
              role: 'output',
              pluginKind: 'dvt:sink',
              metadata: { typeLabel: 'Sink' },
            },
          },
        ] as unknown as CanvasController['nodesWithImpact'],
      },
      { initialEntry: '/canvas?runId=run-returned' }
    );

    expect(runsQueryMocks.useRunSnapshotQuery).toHaveBeenCalledWith(
      expect.any(String),
      'run-returned'
    );
    const sink = (
      currentCanvasRouteState().viewportProps?.nodesWithImpact as
        Array<{ data?: { rows?: number } }> | undefined
    )?.find((node) => node.data?.rows === 3);
    expect(sink?.data?.rows).toBe(3);
  });
});
