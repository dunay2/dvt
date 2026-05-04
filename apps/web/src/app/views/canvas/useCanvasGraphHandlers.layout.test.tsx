// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { canvasViewCopy } from './copy';
import {
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
  toastState,
} from './useCanvasGraphHandlers.test.support';

describe('useCanvasGraphHandlers layout', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('rejects auto-layout when graph edits are gated', async () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: false,
      setNodes,
      setEdges,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleAutoLayout();
    });

    expect(toastState.error).toHaveBeenCalledWith(canvasViewCopy.mutationUnavailableMessage);
    expect(setNodes).not.toHaveBeenCalled();
    expect(setEdges).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('applies layout and reports persisted node positions', async () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const onLayoutComplete = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      setNodes,
      setEdges,
      onLayoutComplete,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleAutoLayout();
    });

    expect(setNodes).toHaveBeenCalledTimes(1);
    expect(setEdges).toHaveBeenCalledTimes(1);
    expect(onLayoutComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        'source-node': expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
        'sink-node': expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      })
    );
    expect(toastState.success).toHaveBeenCalledWith(canvasViewCopy.layoutAppliedMessage);

    harness.cleanup();
  });

  it('snaps auto-layout coordinates to the governed grid when snap is enabled', async () => {
    const setNodes = vi.fn();
    const onLayoutComplete = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canvasSnapToGrid: true,
      gridSize: 24,
      setNodes,
      onLayoutComplete,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleAutoLayout();
    });

    const layoutedNodes = setNodes.mock.calls[0]?.[0] as Array<{
      position: { x: number; y: number };
    }>;
    const layoutPositions = onLayoutComplete.mock.calls[0]?.[0] as Record<
      string,
      { x: number; y: number }
    >;

    expect(
      layoutedNodes.every((node) => node.position.x % 24 === 0 && node.position.y % 24 === 0)
    ).toBe(true);
    expect(
      Object.values(layoutPositions).every(
        (position) => position.x % 24 === 0 && position.y % 24 === 0
      )
    ).toBe(true);

    harness.cleanup();
  });
});
