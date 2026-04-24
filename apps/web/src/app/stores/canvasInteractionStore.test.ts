// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { useCanvasInteractionStore } from './canvasInteractionStore';

const CANVAS_INTERACTION_STORAGE_KEY = 'dvt-web-canvas-interaction';
const WORKSPACE_KEY = 'tenant-a::project-a::dev';

describe('useCanvasInteractionStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useCanvasInteractionStore.setState({
      _hasHydrated: false,
      selectedNodes: [],
      impactOverlayEnabled: false,
      columnLevelLineageEnabled: false,
      canvasLayouts: {},
      inspectorNodeId: null,
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
});
