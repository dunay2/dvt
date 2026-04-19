// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
} from './useCanvasGraphHandlers.test.support';

describe('useCanvasGraphHandlers selection', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('ignores stale node clicks that no longer resolve into the canonical map', async () => {
    const setInspectorNode = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      setInspectorNode,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleNodeClick(
        {} as Parameters<NonNullable<ReturnType<typeof harness.latest>>['handleNodeClick']>[0],
        {
          id: 'stale-node',
        } as Parameters<NonNullable<ReturnType<typeof harness.latest>>['handleNodeClick']>[1]
      );
    });

    expect(setInspectorNode).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('projects React Flow selection payloads into selected node ids', async () => {
    const setSelectedNodes = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      setSelectedNodes,
    });
    await harness.render();

    act(() => {
      harness.latest()?.onSelectionChange({
        nodes: [
          { id: 'source-node', data: {}, position: { x: 0, y: 0 } },
          { id: 'sink-node', data: {}, position: { x: 1, y: 1 } },
        ],
        edges: [],
      });
    });

    expect(setSelectedNodes).toHaveBeenCalledWith(['source-node', 'sink-node']);

    harness.cleanup();
  });

  it('opens the inspector panel when explicitly inspecting a node outside focus mode', async () => {
    const setInspectorNode = vi.fn();
    const toggleInspectorPanel = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      inspectorPanelVisible: false,
      setInspectorNode,
      toggleInspectorPanel,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleInspectNode('source-node');
    });

    expect(setInspectorNode).toHaveBeenCalledWith('source-node');
    expect(toggleInspectorPanel).toHaveBeenCalledTimes(1);

    harness.cleanup();
  });

  it('adds and removes ids through toggle node selection', async () => {
    const setSelectedNodes = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      selectedNodeIds: ['source-node'],
      setSelectedNodes,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleToggleNodeSelection('sink-node', true);
      harness.latest()?.handleToggleNodeSelection('source-node', false);
    });

    expect(setSelectedNodes).toHaveBeenNthCalledWith(1, ['source-node', 'sink-node']);
    expect(setSelectedNodes).toHaveBeenNthCalledWith(2, []);

    harness.cleanup();
  });
});
