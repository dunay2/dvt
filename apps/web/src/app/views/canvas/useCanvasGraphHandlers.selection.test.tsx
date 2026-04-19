// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
} from './useCanvasGraphHandlers.test.support';

type GraphHandlersHarness = ReturnType<typeof renderGraphHandlersHook>;
type GraphHandlersResult = NonNullable<ReturnType<GraphHandlersHarness['latest']>>;
type NodeClickHandler = NonNullable<GraphHandlersResult['handleNodeClick']>;

function renderSelectionHarness(
  args: Partial<Parameters<typeof renderGraphHandlersHook>[0]> = {}
): GraphHandlersHarness {
  return renderGraphHandlersHook({
    canEditEdges: true,
    ...args,
  });
}

function clickNode(harness: GraphHandlersHarness, nodeId: string): void {
  act(() => {
    harness.latest()?.handleNodeClick(
      {} as Parameters<NodeClickHandler>[0],
      {
        id: nodeId,
      } as Parameters<NodeClickHandler>[1]
    );
  });
}

describe('useCanvasGraphHandlers selection', () => {
  let harness: GraphHandlersHarness | null = null;

  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreGraphHandlersTestDoubles();
  });

  it('ignores stale node clicks that no longer resolve into the canonical map', async () => {
    const setInspectorNode = vi.fn();
    harness = renderSelectionHarness({
      setInspectorNode,
    });
    await harness.render();

    clickNode(harness, 'stale-node');

    expect(setInspectorNode).not.toHaveBeenCalled();
  });

  it('sets inspector node when an existing canonical node is clicked', async () => {
    const setInspectorNode = vi.fn();
    harness = renderSelectionHarness({
      setInspectorNode,
    });
    await harness.render();

    clickNode(harness, 'source-node');

    expect(setInspectorNode).toHaveBeenCalledWith('source-node');
  });

  it('projects React Flow selection payloads into selected node ids', async () => {
    const setSelectedNodes = vi.fn();
    const renderedHarness = renderSelectionHarness({
      setSelectedNodes,
    });
    harness = renderedHarness;
    await renderedHarness.render();

    act(() => {
      renderedHarness.latest()?.onSelectionChange({
        nodes: [
          { id: 'source-node', data: {}, position: { x: 0, y: 0 } },
          { id: 'sink-node', data: {}, position: { x: 1, y: 1 } },
        ],
        edges: [],
      });
    });

    expect(setSelectedNodes).toHaveBeenCalledWith(['source-node', 'sink-node']);
  });

  it('opens the inspector panel when explicitly inspecting a node outside focus mode', async () => {
    const setInspectorNode = vi.fn();
    const toggleInspectorPanel = vi.fn();
    const renderedHarness = renderSelectionHarness({
      inspectorPanelVisible: false,
      setInspectorNode,
      toggleInspectorPanel,
    });
    harness = renderedHarness;
    await renderedHarness.render();

    act(() => {
      renderedHarness.latest()?.handleInspectNode('source-node');
    });

    expect(setInspectorNode).toHaveBeenCalledWith('source-node');
    expect(toggleInspectorPanel).toHaveBeenCalledTimes(1);
  });

  it('adds and removes ids through toggle node selection', async () => {
    const setSelectedNodes = vi.fn();
    const renderedHarness = renderSelectionHarness({
      selectedNodeIds: ['source-node'],
      setSelectedNodes,
    });
    harness = renderedHarness;
    await renderedHarness.render();

    act(() => {
      renderedHarness.latest()?.handleToggleNodeSelection('sink-node', true);
      renderedHarness.latest()?.handleToggleNodeSelection('source-node', false);
    });

    expect(setSelectedNodes).toHaveBeenNthCalledWith(1, ['source-node', 'sink-node']);
    expect(setSelectedNodes).toHaveBeenNthCalledWith(2, []);
  });
});
