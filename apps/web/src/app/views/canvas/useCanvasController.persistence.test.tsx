import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController persistence guards', () => {
  let harness: ReturnType<typeof setupCanvasControllerHarness>;

  beforeEach(async () => {
    harness = setupCanvasControllerHarness();
    await harness.renderProbe();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('does not persist node positions while graph query is pending', async () => {
    harness.mocks.useQuery.mockReturnValue({
      data: harness.state.graphData,
      isPending: true,
      isError: false,
    });
    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.handleNodeDragStop?.(
        {} as never,
        {} as never,
        [
          { id: 'node_1', position: { x: 10, y: 20 } },
          { id: 'node_2', position: { x: 40, y: 80 } },
        ] as never
      );
    });

    expect(harness.state.store.setCanvasNodePositions).not.toHaveBeenCalled();
  });

  it('does not persist viewport while graph query is pending', async () => {
    harness.mocks.useQuery.mockReturnValue({
      data: harness.state.graphData,
      isPending: true,
      isError: false,
    });
    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.handleViewportChange({ x: 1, y: 2, zoom: 1.2 });
    });

    expect(harness.state.store.setCanvasViewport).not.toHaveBeenCalled();
  });

  it('prefers persisted node positions deterministically when syncing nodes', async () => {
    harness.state.store.canvasLayouts = {
      'tenant-a::project-a::dev': {
        viewport: { x: 0, y: 0, zoom: 1 },
        nodePositions: {
          node_1: { x: 320, y: 240 },
        },
      },
    };
    await harness.renderProbe();

    const node = harness.getLatestResult()?.nodesWithImpact.find((candidate) => candidate.id === 'node_1');
    expect(node?.position).toEqual({ x: 320, y: 240 });
  });
});
