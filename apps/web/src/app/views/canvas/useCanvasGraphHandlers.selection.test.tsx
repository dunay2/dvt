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

    // A fresh Properties gesture must not reuse the same node's previously selected Code tab.
    expect(setInspectorNode).toHaveBeenCalledWith('source-node', 'general');
    expect(toggleInspectorPanel).toHaveBeenCalledTimes(1);
  });

  it.each(['code', 'columns', 'inputs-outputs'])(
    'preserves the explicit %s inspection preference',
    async (preferredTabId) => {
      const setInspectorNode = vi.fn();
      const renderedHarness = renderSelectionHarness({
        setInspectorNode,
      });
      harness = renderedHarness;
      await renderedHarness.render();

      act(() => {
        renderedHarness.latest()?.handleInspectNode('source-node', preferredTabId);
      });

      // The Overview default must not override an explicit Code or other section intent.
      expect(setInspectorNode).toHaveBeenCalledWith('source-node', preferredTabId);
    }
  );

  it('requests Overview again for repeated Properties gestures and a null preference', async () => {
    const setInspectorNode = vi.fn();
    const renderedHarness = renderSelectionHarness({ setInspectorNode });
    harness = renderedHarness;
    await renderedHarness.render();
    act(() => {
      renderedHarness.latest()?.handleInspectNode('model-node', 'code');
      renderedHarness.latest()?.handleInspectNode('model-node');
      renderedHarness.latest()?.handleInspectNode('model-node', null);
    });
    expect(setInspectorNode.mock.calls).toEqual([
      ['model-node', 'code'],
      ['model-node', 'general'],
      ['model-node', 'general'],
    ]);
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
