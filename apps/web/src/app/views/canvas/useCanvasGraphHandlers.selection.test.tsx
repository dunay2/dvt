// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
} from './useCanvasGraphHandlers.test.support';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';

type GraphHandlersHarness = ReturnType<typeof renderGraphHandlersHook>;

function renderSelectionHarness(
  args: Partial<Parameters<typeof renderGraphHandlersHook>[0]> = {}
): GraphHandlersHarness {
  return renderGraphHandlersHook({
    canEditEdges: true,
    ...args,
  });
}

describe('useCanvasGraphHandlers explicit selection intents', () => {
  let harness: GraphHandlersHarness | null = null;

  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    useUiLayoutStore.setState({ focusMode: false });
    restoreGraphHandlersTestDoubles();
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

  it('passes node workbench tab preference through explicit inspect gestures', async () => {
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

  it('leaves focus mode and reveals Properties on an explicit inspect gesture', async () => {
    useUiLayoutStore.setState({ focusMode: true });
    const setInspectorNode = vi.fn();
    const toggleInspectorPanel = vi.fn();
    const renderedHarness = renderSelectionHarness({
      focusMode: true,
      inspectorPanelVisible: false,
      setInspectorNode,
      toggleInspectorPanel,
    });
    harness = renderedHarness;
    await renderedHarness.render();

    act(() => renderedHarness.latest()?.handleInspectNode('source-node', 'general'));

    expect(setInspectorNode).toHaveBeenCalledWith('source-node', 'general');
    expect(useUiLayoutStore.getState().focusMode).toBe(false);
    expect(toggleInspectorPanel).toHaveBeenCalledOnce();
  });

  it('adds and removes ids only through explicit execution-selection toggles', async () => {
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
