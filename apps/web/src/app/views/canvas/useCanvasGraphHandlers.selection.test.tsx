// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
} from './useCanvasGraphHandlers.test.support';

type GraphHandlersHarness = ReturnType<typeof renderGraphHandlersHook>;

function renderSelectionHarness(
  args: Partial<Parameters<typeof renderGraphHandlersHook>[0]> = {}
): GraphHandlersHarness {
  return renderGraphHandlersHook({
    canEditEdges: true,
    ...args,
  });
}

describe('useCanvasGraphHandlers selection commands', () => {
  let harness: GraphHandlersHarness | null = null;

  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreGraphHandlersTestDoubles();
  });

  it('opens the inspector panel only through an explicit inspect command', async () => {
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

  it('passes node workbench tab preference through explicit inspect commands', async () => {
    const setInspectorNode = vi.fn();
    const renderedHarness = renderSelectionHarness({
      setInspectorNode,
    });
    harness = renderedHarness;
    await renderedHarness.render();

    act(() => {
      renderedHarness.latest()?.handleInspectNode('source-node', 'inputs-outputs');
    });

    expect(setInspectorNode).toHaveBeenCalledWith('source-node', 'inputs-outputs');
  });

  it('changes execution selection only through the explicit toggle command', async () => {
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
