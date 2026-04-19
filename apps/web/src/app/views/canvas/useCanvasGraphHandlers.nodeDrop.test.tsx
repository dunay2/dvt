// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildCanonicalNode,
  buildDraftSession,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
  toastState,
} from './useCanvasGraphHandlers.test.support';

describe('useCanvasGraphHandlers node drop', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('rejects node drops when graph edits are gated', async () => {
    const setNodes = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: false,
      setNodes,
    });
    await harness.render();

    const dragEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: vi.fn(() => ''),
      },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      harness.latest()?.handleDrop(dragEvent);
    });

    expect(toastState.error).toHaveBeenCalledWith('Graph edits are unavailable in this context.');
    expect(setNodes).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('uses a functional node updater when dropping a canonical node', async () => {
    const setNodes = vi.fn();
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      setNodes,
      setDraftSession,
    });
    await harness.render();

    const payload = JSON.stringify(buildCanonicalNode('transform-node', 'transform'));
    const dragEvent = {
      preventDefault: vi.fn(),
      target: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      },
      clientX: 120,
      clientY: 80,
      dataTransfer: {
        getData: vi.fn(() => payload),
      },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      harness.latest()?.handleDrop(dragEvent);
    });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const nodeUpdater = setNodes.mock.calls[0]?.[0];
    expect(typeof nodeUpdater).toBe('function');
    const nextNodes = nodeUpdater([
      { id: 'source-node', data: { name: 'source-node' }, position: { x: 0, y: 0 } },
      { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
    ]);
    expect(nextNodes.map((node: { id: string }) => node.id)).toContain('transform-node');
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const nextDraftSession = setDraftSession.mock.calls[0]?.[0](buildDraftSession());
    expect(nextDraftSession.workingSet.visibleNodeIds).toContain('transform-node');

    harness.cleanup();
  });

  it('marks drag-over events as movable drop targets', async () => {
    const harness = renderGraphHandlersHook({ canEditEdges: true });
    await harness.render();

    const dragEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        dropEffect: 'copy',
      },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      harness.latest()?.handleDragOver(dragEvent);
    });

    expect(dragEvent.preventDefault).toHaveBeenCalled();
    expect(dragEvent.dataTransfer.dropEffect).toBe('move');

    harness.cleanup();
  });
});
