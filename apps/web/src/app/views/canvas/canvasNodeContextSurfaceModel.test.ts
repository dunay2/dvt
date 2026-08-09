import { describe, expect, it } from 'vitest';

import {
  createCanvasNodeContextSurfaceState,
  reduceCanvasNodeContextSurface,
} from './canvasNodeContextSurfaceModel';

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
  it('opens one health detail surface from idle state', () => {
    const healthState = reduceCanvasNodeContextSurface(createCanvasNodeContextSurfaceState(), {
      type: 'open-health',
      model: HEALTH,
    });

    expect(healthState.activeSurface).toEqual({ kind: 'health', model: HEALTH });
  });

  it('closes health detail and blocks reopening while an external node surface is active', () => {
    const healthState = reduceCanvasNodeContextSurface(createCanvasNodeContextSurfaceState(), {
      type: 'open-health',
      model: HEALTH,
    });
    const workbenchState = reduceCanvasNodeContextSurface(healthState, {
      type: 'synchronize-external-surface',
      active: true,
    });
    const attemptedReopen = reduceCanvasNodeContextSurface(workbenchState, {
      type: 'open-health',
      model: HEALTH,
    });

    expect(workbenchState).toEqual({
      externalSurfaceActive: true,
      activeSurface: { kind: 'idle' },
    });
    expect(attemptedReopen).toBe(workbenchState);
  });

  it('removes only health detail owned by the deleted node', () => {
    const healthState = reduceCanvasNodeContextSurface(createCanvasNodeContextSurfaceState(), {
      type: 'open-health',
      model: HEALTH,
    });

    expect(
      reduceCanvasNodeContextSurface(healthState, {
        type: 'remove-node',
        nodeId: 'source.orders',
      })
    ).toBe(healthState);
    expect(
      reduceCanvasNodeContextSurface(healthState, {
        type: 'remove-node',
        nodeId: 'model.orders',
      }).activeSurface
    ).toEqual({ kind: 'idle' });
  });
});
