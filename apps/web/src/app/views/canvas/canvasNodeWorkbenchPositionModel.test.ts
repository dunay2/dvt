import { describe, expect, it } from 'vitest';

import {
  clampCanvasNodeWorkbenchPosition,
  moveCanvasNodeWorkbenchPosition,
  resolveDefaultCanvasNodeWorkbenchPosition,
} from './canvasNodeWorkbenchPositionModel';

const BOUNDS = {
  containerWidth: 1000,
  containerHeight: 700,
  surfaceWidth: 400,
  surfaceHeight: 500,
};

describe('Canvas node workbench position model', () => {
  it('places the default surface at the governed top-right inset', () => {
    expect(resolveDefaultCanvasNodeWorkbenchPosition(BOUNDS)).toEqual({ left: 584, top: 64 });
  });

  it('clamps every edge so the workbench remains reachable', () => {
    expect(clampCanvasNodeWorkbenchPosition({ left: -200, top: -100 }, BOUNDS)).toEqual({
      left: 16,
      top: 16,
    });
    expect(clampCanvasNodeWorkbenchPosition({ left: 900, top: 600 }, BOUNDS)).toEqual({
      left: 584,
      top: 184,
    });
  });

  it('applies pointer and keyboard deltas through the same bounded operation', () => {
    expect(
      moveCanvasNodeWorkbenchPosition({ left: 200, top: 100 }, { x: -32, y: 24 }, BOUNDS)
    ).toEqual({ left: 168, top: 124 });
  });
});
