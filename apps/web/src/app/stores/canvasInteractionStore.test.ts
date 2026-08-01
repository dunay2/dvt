// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCanvasInteractionStore } from './canvasInteractionStore';

const CANVAS_INTERACTION_STORAGE_KEY = 'dvt-web-canvas-interaction';
const WORKSPACE_KEY = 'tenant-a::project-a::dev';

describe('useCanvasInteractionStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useCanvasInteractionStore.setState({
      _hasHydrated: false,
      executionSelectionIntent: { mode: 'workspace', nodeIds: [] },
      impactOverlayEnabled: false,
      columnLevelLineageEnabled: false,
      canvasLayouts: {},
      inspectorNodeId: null,
      inspectorPreferredTabId: null,
      inspectorPreferredTabRequestId: 0,
      contextualWorkbenchId: null,
    });
  });

  it('does not rewrite canvas layout storage when node positions are unchanged', () => {
    const initialPositions = {
      node_1: { x: 40, y: 140 },
      node_2: { x: 320, y: 140 },
    };

    useCanvasInteractionStore.getState().setCanvasNodePositions(WORKSPACE_KEY, initialPositions);
    const firstPersistedValue = localStorage.getItem(CANVAS_INTERACTION_STORAGE_KEY);

    useCanvasInteractionStore.getState().setCanvasNodePositions(WORKSPACE_KEY, {
      node_1: { x: 40, y: 140 },
      node_2: { x: 320, y: 140 },
    });

    expect(useCanvasInteractionStore.getState().canvasLayouts[WORKSPACE_KEY]).toEqual({
      viewport: null,
      nodePositions: initialPositions,
    });
    expect(localStorage.getItem(CANVAS_INTERACTION_STORAGE_KEY)).toBe(firstPersistedValue);
  });

  it('does not publish a new execution selection snapshot when node identities are unchanged', () => {
    useCanvasInteractionStore.getState().setSelectedNodes(['source.orders', 'model.orders']);
    const selection = useCanvasInteractionStore.getState().executionSelectionIntent;
    const subscriber = vi.fn();
    const unsubscribe = useCanvasInteractionStore.subscribe(subscriber);

    useCanvasInteractionStore.getState().setSelectedNodes(['source.orders', 'model.orders']);

    expect(useCanvasInteractionStore.getState().executionSelectionIntent).toBe(selection);
    expect(subscriber).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('preserves explicit execution intent when the requested set becomes empty', () => {
    useCanvasInteractionStore
      .getState()
      .setExecutionSelectionIntent({ mode: 'explicit', nodeIds: ['model.orders'] });
    useCanvasInteractionStore
      .getState()
      .setExecutionSelectionIntent({ mode: 'explicit', nodeIds: [] });

    expect(useCanvasInteractionStore.getState().executionSelectionIntent).toEqual({
      mode: 'explicit',
      nodeIds: [],
    });
  });

  it('keeps workspace and explicit-empty intent as different atomic snapshots', () => {
    const workspaceIntent = useCanvasInteractionStore.getState().executionSelectionIntent;

    useCanvasInteractionStore
      .getState()
      .setExecutionSelectionIntent({ mode: 'explicit', nodeIds: [] });

    expect(workspaceIntent).toEqual({ mode: 'workspace', nodeIds: [] });
    expect(useCanvasInteractionStore.getState().executionSelectionIntent).toEqual({
      mode: 'explicit',
      nodeIds: [],
    });
  });

  it('marks the store hydrated through the persist lifecycle', async () => {
    expect(useCanvasInteractionStore.getState()._hasHydrated).toBe(false);

    await useCanvasInteractionStore.persist.rehydrate();

    expect(useCanvasInteractionStore.getState()._hasHydrated).toBe(true);
  });

  it('marks a freshly created persisted store hydrated without a manual rehydrate call', async () => {
    vi.resetModules();
    const { useCanvasInteractionStore: freshStore } = await import('./canvasInteractionStore');

    expect(freshStore.getState()._hasHydrated).toBe(true);
  });

  it('keeps node workbench tab preference transient and clears it with inspector selection', () => {
    useCanvasInteractionStore.getState().setInspectorNode('source-node', 'inputs-outputs');

    expect(useCanvasInteractionStore.getState().inspectorNodeId).toBe('source-node');
    expect(useCanvasInteractionStore.getState().inspectorPreferredTabId).toBe('inputs-outputs');
    expect(useCanvasInteractionStore.getState().inspectorPreferredTabRequestId).toBe(1);

    useCanvasInteractionStore.getState().setInspectorNode('source-node', 'inputs-outputs');
    expect(useCanvasInteractionStore.getState().inspectorPreferredTabRequestId).toBe(2);

    useCanvasInteractionStore.getState().setInspectorNode('model-node');
    expect(useCanvasInteractionStore.getState().inspectorPreferredTabId).toBeNull();
    expect(useCanvasInteractionStore.getState().inspectorPreferredTabRequestId).toBe(2);

    useCanvasInteractionStore.getState().setInspectorNode(null);
    expect(useCanvasInteractionStore.getState().inspectorPreferredTabId).toBeNull();
  });

  it('owns contextual project Code as transient Canvas interaction state', () => {
    useCanvasInteractionStore.getState().openContextualWorkbench('project-code');

    expect(useCanvasInteractionStore.getState().contextualWorkbenchId).toBe('project-code');
    expect(localStorage.getItem(CANVAS_INTERACTION_STORAGE_KEY)).not.toContain(
      'contextualWorkbenchId'
    );

    useCanvasInteractionStore.getState().closeContextualWorkbench();

    expect(useCanvasInteractionStore.getState().contextualWorkbenchId).toBeNull();
  });

  it('toggles frozen canvas nodes per workspace without changing node positions', () => {
    type FrozenCanvasInteractionState = ReturnType<typeof useCanvasInteractionStore.getState> & {
      toggleFrozenCanvasNode: (workspaceKey: string, nodeId: string) => void;
    };

    useCanvasInteractionStore.getState().setCanvasNodePositions(WORKSPACE_KEY, {
      source_node: { x: 40, y: 140 },
    });

    const state = useCanvasInteractionStore.getState() as FrozenCanvasInteractionState;
    state.toggleFrozenCanvasNode(WORKSPACE_KEY, 'source_node');

    expect(useCanvasInteractionStore.getState().canvasLayouts[WORKSPACE_KEY]).toEqual({
      viewport: null,
      nodePositions: {
        source_node: { x: 40, y: 140 },
      },
      frozenNodeIds: ['source_node'],
    });

    state.toggleFrozenCanvasNode(WORKSPACE_KEY, 'source_node');

    expect(useCanvasInteractionStore.getState().canvasLayouts[WORKSPACE_KEY]).toEqual({
      viewport: null,
      nodePositions: {
        source_node: { x: 40, y: 140 },
      },
      frozenNodeIds: [],
    });
  });
});
