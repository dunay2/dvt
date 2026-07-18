import { describe, expect, it } from 'vitest';

import {
  createCanvasNodeContextSurfaceState,
  reduceCanvasNodeContextSurface,
} from './canvasNodeContextSurfaceModel';

const TOOLBAR = {
  nodeId: 'model.orders',
  nodeName: 'Orders',
  position: { x: 20, y: 30 },
  nodeTop: 82,
  contextMenuTrigger: null,
};

const HEALTH = {
  nodeId: 'model.orders',
  detail: {
    title: 'Orders health',
    ariaLabel: 'Open Orders health metrics',
    rows: [{ id: 'rows', label: 'Rows', value: '3' }],
  },
  position: { x: 20, y: 100 },
};

describe('reduceCanvasNodeContextSurface', () => {
  it('replaces the toolbar with health instead of exposing both surfaces', () => {
    const toolbarState = reduceCanvasNodeContextSurface(createCanvasNodeContextSurfaceState(), {
      type: 'open-toolbar',
      anchor: TOOLBAR,
    });

    const healthState = reduceCanvasNodeContextSurface(toolbarState, {
      type: 'open-health',
      model: HEALTH,
    });

    expect(healthState.activeSurface).toEqual({ kind: 'health', model: HEALTH });
  });

  it('closes transient surfaces and blocks reopening while an external workbench is active', () => {
    const toolbarState = reduceCanvasNodeContextSurface(createCanvasNodeContextSurfaceState(), {
      type: 'open-toolbar',
      anchor: TOOLBAR,
    });
    const workbenchState = reduceCanvasNodeContextSurface(toolbarState, {
      type: 'synchronize-external-surface',
      active: true,
    });
    const attemptedReopen = reduceCanvasNodeContextSurface(workbenchState, {
      type: 'open-toolbar',
      anchor: TOOLBAR,
    });

    expect(workbenchState).toEqual({
      externalSurfaceActive: true,
      activeSurface: { kind: 'idle' },
    });
    expect(attemptedReopen).toBe(workbenchState);
  });

  it('removes only a surface owned by the deleted node', () => {
    const toolbarState = reduceCanvasNodeContextSurface(createCanvasNodeContextSurfaceState(), {
      type: 'open-toolbar',
      anchor: TOOLBAR,
    });

    expect(
      reduceCanvasNodeContextSurface(toolbarState, {
        type: 'remove-node',
        nodeId: 'source.orders',
      })
    ).toBe(toolbarState);
    expect(
      reduceCanvasNodeContextSurface(toolbarState, {
        type: 'remove-node',
        nodeId: 'model.orders',
      }).activeSurface
    ).toEqual({ kind: 'idle' });
  });
});
