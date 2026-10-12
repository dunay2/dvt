import { describe, expect, it } from 'vitest';

import { calculateCanvasRelationalTreeFit } from './canvasRelationalTreeViewport';

describe('relational-tree viewport fit', () => {
  it('keeps small trees at their natural size', () => {
    expect(
      calculateCanvasRelationalTreeFit({
        viewportWidth: 960,
        viewportHeight: 480,
        contentWidth: 520,
        contentHeight: 260,
      })
    ).toBe(1);
  });

  it('fits wide and deep trees from measured content instead of a fixed zoom', () => {
    expect(
      calculateCanvasRelationalTreeFit({
        viewportWidth: 800,
        viewportHeight: 400,
        contentWidth: 1_200,
        contentHeight: 800,
        padding: 32,
      })
    ).toBeCloseTo(0.42, 2);
  });

  it('frames every node of a large tree even below the manual zoom minimum', () => {
    const zoom = calculateCanvasRelationalTreeFit({
      viewportWidth: 800,
      viewportHeight: 400,
      contentWidth: 8_000,
      contentHeight: 4_000,
    });
    expect(8_000 * zoom).toBeLessThanOrEqual(800 - 64);
    expect(4_000 * zoom).toBeLessThanOrEqual(400 - 64);
    expect(zoom).toBeGreaterThan(0);
  });
});
